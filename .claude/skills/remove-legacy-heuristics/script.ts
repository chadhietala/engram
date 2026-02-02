#!/usr/bin/env bun

/**
 * remove-legacy-heuristics: Systematically analyze and refactor legacy code patterns
 * 
 * This skill demonstrates intelligent file analysis workflow:
 * 1. Discovery phase: Find relevant files using pattern matching
 * 2. Analysis phase: Read files in logical order (dependencies first)
 * 3. Understanding phase: Build dependency graph and identify patterns
 * 4. Action phase: Make informed changes based on comprehensive analysis
 */

import { parseArgs } from "util";
import { resolve, relative, dirname, basename } from "path";
import { exists } from "fs/promises";

interface FileAnalysis {
  path: string;
  imports: string[];
  exports: string[];
  dependencies: string[];
  hasLegacyPatterns: boolean;
  legacyPatterns: string[];
}

interface AnalysisResult {
  files: FileAnalysis[];
  dependencyGraph: Map<string, string[]>;
  affectedFiles: Set<string>;
}

const LEGACY_PATTERNS = [
  /var\s+\w+\s*=/g, // var declarations
  /function\s+\w+\s*\(/g, // function declarations (vs arrow functions)
  /require\s*\(/g, // CommonJS require
  /module\.exports/g, // CommonJS exports
  /callback\s*\(/g, // Callback patterns (vs async/await)
  /\.then\s*\(/g, // Promise chains (vs async/await)
];

const LEGACY_PATTERN_NAMES = [
  "var declaration",
  "function declaration",
  "CommonJS require",
  "CommonJS exports",
  "callback pattern",
  "promise chain",
];

async function discoverFiles(targetDir: string, pattern: string): Promise<string[]> {
  const glob = new Bun.Glob(pattern);
  const files: string[] = [];
  
  for await (const file of glob.scan({ cwd: targetDir, absolute: true })) {
    files.push(file);
  }
  
  return files.sort(); // Sort for deterministic processing
}

async function analyzeFile(filePath: string): Promise<FileAnalysis> {
  const content = await Bun.file(filePath).text();
  
  // Extract imports
  const imports: string[] = [];
  const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // Extract require statements
  const requireRegex = /require\s*\(['"](.+?)['"]\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // Extract exports
  const exports: string[] = [];
  const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type)\s+(\w+)/g;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  
  // Detect legacy patterns
  const legacyPatterns: string[] = [];
  let hasLegacyPatterns = false;
  
  LEGACY_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(content)) {
      hasLegacyPatterns = true;
      legacyPatterns.push(LEGACY_PATTERN_NAMES[index]);
    }
  });
  
  // Resolve dependencies to actual file paths
  const dependencies: string[] = [];
  const dir = dirname(filePath);
  
  for (const imp of imports) {
    if (imp.startsWith('.')) {
      // Local import - resolve to absolute path
      const resolved = resolve(dir, imp);
      // Try common extensions
      for (const ext of ['', '.ts', '.tsx', '.js', '.jsx']) {
        const fullPath = resolved + ext;
        if (await exists(fullPath)) {
          dependencies.push(fullPath);
          break;
        }
      }
    }
  }
  
  return {
    path: filePath,
    imports,
    exports,
    dependencies,
    hasLegacyPatterns,
    legacyPatterns,
  };
}

function buildDependencyGraph(analyses: FileAnalysis[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  
  for (const analysis of analyses) {
    graph.set(analysis.path, analysis.dependencies);
  }
  
  return graph;
}

function topologicalSort(graph: Map<string, string[]>, files: string[]): string[] {
  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  
  function visit(file: string) {
    if (visited.has(file)) return;
    if (visiting.has(file)) {
      // Circular dependency detected - continue anyway
      return;
    }
    
    visiting.add(file);
    const deps = graph.get(file) || [];
    
    for (const dep of deps) {
      if (files.includes(dep)) {
        visit(dep);
      }
    }
    
    visiting.delete(file);
    visited.add(file);
    sorted.push(file);
  }
  
  for (const file of files) {
    visit(file);
  }
  
  return sorted;
}

function findAffectedFiles(
  graph: Map<string, string[]>,
  changedFiles: Set<string>
): Set<string> {
  const affected = new Set<string>(changedFiles);
  
  // Find all files that depend on changed files
  let changed = true;
  while (changed) {
    changed = false;
    for (const [file, deps] of graph.entries()) {
      if (!affected.has(file)) {
        for (const dep of deps) {
          if (affected.has(dep)) {
            affected.add(file);
            changed = true;
            break;
          }
        }
      }
    }
  }
  
  return affected;
}

async function analyzeCodebase(targetDir: string): Promise<AnalysisResult> {
  console.log("🔍 Phase 1: Discovery - Finding TypeScript/JavaScript files...\n");
  
  const patterns = ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"];
  const allFiles: string[] = [];
  
  for (const pattern of patterns) {
    const files = await discoverFiles(targetDir, pattern);
    allFiles.push(...files);
  }
  
  // Filter out node_modules and common build directories
  const filteredFiles = allFiles.filter(
    (f) => !f.includes("node_modules") && !f.includes("dist") && !f.includes("build")
  );
  
  console.log(`   Found ${filteredFiles.length} files to analyze\n`);
  
  console.log("📖 Phase 2: Analysis - Reading files and extracting metadata...\n");
  
  // Analyze all files in parallel
  const analyses = await Promise.all(
    filteredFiles.map((file) => analyzeFile(file))
  );
  
  console.log("🔗 Phase 3: Understanding - Building dependency graph...\n");
  
  const dependencyGraph = buildDependencyGraph(analyses);
  
  // Find files with legacy patterns
  const filesWithLegacy = new Set(
    analyses.filter((a) => a.hasLegacyPatterns).map((a) => a.path)
  );
  
  console.log(`   Found ${filesWithLegacy.size} files with legacy patterns\n`);
  
  // Find all files affected by potential changes
  const affectedFiles = findAffectedFiles(dependencyGraph, filesWithLegacy);
  
  console.log(`   ${affectedFiles.size} files would be affected by changes\n`);
  
  return {
    files: analyses,
    dependencyGraph,
    affectedFiles,
  };
}

function printReport(result: AnalysisResult, targetDir: string) {
  console.log("=" .repeat(80));
  console.log("📊 ANALYSIS REPORT");
  console.log("=".repeat(80));
  console.log();
  
  const filesWithLegacy = result.files.filter((f) => f.hasLegacyPatterns);
  
  if (filesWithLegacy.length === 0) {
    console.log("✅ No legacy patterns found! Codebase is clean.\n");
    return;
  }
  
  // Sort files in dependency order (dependencies first)
  const sortedFiles = topologicalSort(
    result.dependencyGraph,
    filesWithLegacy.map((f) => f.path)
  );
  
  console.log("🔧 Files with legacy patterns (in dependency order):\n");
  
  for (const filePath of sortedFiles) {
    const analysis = result.files.find((f) => f.path === filePath)!;
    const relPath = relative(targetDir, filePath);
    
    console.log(`   📄 ${relPath}`);
    console.log(`      Patterns: ${analysis.legacyPatterns.join(", ")}`);
    console.log(`      Dependencies: ${analysis.dependencies.length}`);
    console.log(`      Exports: ${analysis.exports.length}`);
    console.log();
  }
  
  console.log("=" .repeat(80));
  console.log("💡 RECOMMENDATIONS");
  console.log("=".repeat(80));
  console.log();
  console.log("To refactor these files safely:");
  console.log("1. Start with files at the top (fewest dependencies)");
  console.log("2. Read each file and its dependents before making changes");
  console.log("3. Update imports in dependent files after refactoring");
  console.log("4. Run tests after each file is updated");
  console.log();
  
  const dependentCounts = new Map<string, number>();
  for (const [file, deps] of result.dependencyGraph.entries()) {
    for (const dep of deps) {
      dependentCounts.set(dep, (dependentCounts.get(dep) || 0) + 1);
    }
  }
  
  const highImpactFiles = sortedFiles.filter(
    (f) => (dependentCounts.get(f) || 0) > 3
  );
  
  if (highImpactFiles.length > 0) {
    console.log("⚠️  High-impact files (many dependents):");
    for (const file of highImpactFiles) {
      const relPath = relative(targetDir, file);
      const count = dependentCounts.get(file) || 0;
      console.log(`   • ${relPath} (${count} dependents)`);
    }
    console.log();
  }
}

// Main execution
const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    pattern: { type: "string", short: "p", default: "**/*.{ts,tsx,js,jsx}" },
    json: { type: "boolean", short: "j" },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`
remove-legacy-heuristics - Systematically analyze code before refactoring

Usage: remove-legacy-heuristics [target-dir] [options]

Arguments:
  target-dir    Directory to analyze (default: current directory)

Options:
  -h, --help    Show this help message
  -p, --pattern Custom file pattern (default: **/*.{ts,tsx,js,jsx})
  -j, --json    Output results as JSON

Example:
  remove-legacy-heuristics ./src
  remove-legacy-heuristics ./src --pattern "**/*.ts"
`);
  process.exit(0);
}

const targetDir = resolve(positionals[0] || process.cwd());

console.log(`\n🎯 Target directory: ${targetDir}\n`);

try {
  const result = await analyzeCodebase(targetDir);
  
  if (values.json) {
    console.log(
      JSON.stringify(
        {
          filesAnalyzed: result.files.length,
          filesWithLegacy: result.files.filter((f) => f.hasLegacyPatterns).length,
          affectedFiles: Array.from(result.affectedFiles),
          details: result.files
            .filter((f) => f.hasLegacyPatterns)
            .map((f) => ({
              path: relative(targetDir, f.path),
              patterns: f.legacyPatterns,
              dependencies: f.dependencies.length,
            })),
        },
        null,
        2
      )
    );
  } else {
    printReport(result, targetDir);
  }
  
  process.exit(0);
} catch (error) {
  console.error("❌ Error:", error);
  process.exit(1);
}