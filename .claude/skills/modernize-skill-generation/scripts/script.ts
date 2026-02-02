#!/usr/bin/env bun

import { parseArgs } from "util";
import { resolve, relative, join, extname, basename } from "path";
import { intelligence, intelligenceWithSchema, z } from "engram/skill-runtime";

const args = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    extensions: { type: "string", short: "e", default: "ts,tsx,js,jsx" },
    depth: { type: "string", short: "d", default: "3" },
    report: { type: "string", short: "r" },
  },
  allowPositionals: true,
});

if (args.values.help) {
  console.log(`
🔍 Codebase Architecture Reconnaissance Tool

Usage: modernize-recon [directory] [options]

Arguments:
  directory          Target directory to analyze (default: current directory)

Options:
  -h, --help         Show this help message
  -e, --extensions   File extensions to analyze (default: ts,tsx,js,jsx)
  -d, --depth        Module depth for clustering (default: 3)
  -r, --report       Output report to file (markdown format)

Examples:
  modernize-recon                    # Analyze current directory
  modernize-recon ./src              # Analyze src directory
  modernize-recon -e "ts,js" -d 2    # Custom extensions and depth
  modernize-recon -r recon.md        # Save report to file
`);
  process.exit(0);
}

const targetDir = resolve(args.positionals[0] || process.cwd());
const extensions = args.values.extensions!.split(",").map(e => e.trim());
const moduleDepth = parseInt(args.values.depth!, 10);
const reportFile = args.values.report;

console.log(`\n🔍 Starting Architectural Reconnaissance\n`);
console.log(`📁 Target: ${targetDir}`);
console.log(`📝 Extensions: ${extensions.join(", ")}`);
console.log(`📊 Module Depth: ${moduleDepth}\n`);

// Phase 1: Breadth-First Discovery
console.log("━".repeat(60));
console.log("📡 PHASE 1: BREADTH-FIRST DISCOVERY");
console.log("━".repeat(60) + "\n");

interface FileInfo {
  path: string;
  relativePath: string;
  size: number;
  lines: number;
  module: string;
  exports: number;
  imports: number;
}

const filesByModule = new Map<string, FileInfo[]>();
const entryPoints: FileInfo[] = [];
const configFiles: FileInfo[] = [];

// Scan for all relevant files
const patterns = extensions.map(ext => `**/*.${ext}`);
let totalFiles = 0;

for (const pattern of patterns) {
  const glob = new Bun.Glob(pattern);
  for await (const filePath of glob.scan({ cwd: targetDir, onlyFiles: true })) {
    const fullPath = join(targetDir, filePath);
    
    try {
      const content = await Bun.file(fullPath).text();
      const lines = content.split("\n").length;
      
      // Extract module path (first N segments)
      const segments = filePath.split("/");
      const module = segments.slice(0, Math.min(moduleDepth, segments.length - 1)).join("/") || "root";
      
      // Count exports and imports (simple heuristic)
      const exports = (content.match(/^export\s+/gm) || []).length;
      const imports = (content.match(/^import\s+/gm) || []).length;
      
      const fileInfo: FileInfo = {
        path: fullPath,
        relativePath: filePath,
        size: content.length,
        lines,
        module,
        exports,
        imports,
      };
      
      // Categorize files
      if (!filesByModule.has(module)) {
        filesByModule.set(module, []);
      }
      filesByModule.get(module)!.push(fileInfo);
      
      // Identify entry points
      const fileName = basename(filePath);
      if (fileName.match(/^(index|main|app|entry)\.[jt]sx?$/)) {
        entryPoints.push(fileInfo);
      }
      
      // Identify config files
      if (fileName.match(/\.(config|rc)\.[jt]s$/) || fileName === "package.json" || fileName === "tsconfig.json") {
        configFiles.push(fileInfo);
      }
      
      totalFiles++;
    } catch (error) {
      // Skip unreadable files
    }
  }
}

console.log(`✅ Discovered ${totalFiles} files across ${filesByModule.size} modules\n`);

// Module Overview
console.log("📦 MODULE STRUCTURE:\n");
const sortedModules = Array.from(filesByModule.entries())
  .sort((a, b) => b[1].length - a[1].length);

for (const [module, files] of sortedModules.slice(0, 15)) {
  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
  const avgExports = (files.reduce((sum, f) => sum + f.exports, 0) / files.length).toFixed(1);
  console.log(`  ${module.padEnd(30)} │ ${files.length.toString().padStart(3)} files │ ${totalLines.toString().padStart(6)} lines │ ~${avgExports} exports/file`);
}

if (sortedModules.length > 15) {
  console.log(`  ... and ${sortedModules.length - 15} more modules`);
}

// Entry Points
console.log(`\n🚪 ENTRY POINTS (${entryPoints.length}):\n`);
for (const entry of entryPoints.slice(0, 10)) {
  console.log(`  ${entry.relativePath.padEnd(40)} │ ${entry.exports} exports │ ${entry.imports} imports`);
}
if (entryPoints.length > 10) {
  console.log(`  ... and ${entryPoints.length - 10} more`);
}

// Config Files
console.log(`\n⚙️  CONFIGURATION (${configFiles.length}):\n`);
for (const config of configFiles) {
  console.log(`  ${config.relativePath}`);
}

// Phase 2: Depth-First Analysis
console.log("\n" + "━".repeat(60));
console.log("🔬 PHASE 2: DEPTH-FIRST ANALYSIS");
console.log("━".repeat(60) + "\n");

// Identify largest modules for focused analysis
const topModules = sortedModules.slice(0, 5).map(([name, files]) => ({
  name,
  files,
  totalLines: files.reduce((sum, f) => sum + f.lines, 0),
  totalExports: files.reduce((sum, f) => sum + f.exports, 0),
}));

console.log("🎯 TOP MODULES FOR MODERNIZATION:\n");

interface ModuleAnalysis {
  name: string;
  complexity: string;
  dependencies: string;
  modernizationPriority: "high" | "medium" | "low";
  suggestedActions: string[];
  risks: string[];
}

const ModuleAnalysisSchema = z.object({
  complexity: z.string().describe("Brief assessment of module complexity"),
  dependencies: z.string().describe("Dependencies and coupling assessment"),
  modernizationPriority: z.enum(["high", "medium", "low"]),
  suggestedActions: z.array(z.string()).describe("Specific modernization actions"),
  risks: z.array(z.string()).describe("Potential risks or challenges"),
});

const moduleAnalyses: ModuleAnalysis[] = [];

for (const module of topModules) {
  // Sample files from the module for analysis
  const sampleFiles = module.files.slice(0, 3);
  const sampleContent = await Promise.all(
    sampleFiles.map(async f => ({
      path: f.relativePath,
      preview: (await Bun.file(f.path).text()).slice(0, 1000),
    }))
  );
  
  const analysis = await intelligenceWithSchema(
    `Analyze this codebase module for modernization potential. Consider: code patterns, dependencies, test coverage indicators, documentation, complexity.`,
    ModuleAnalysisSchema,
    {
      module: module.name,
      fileCount: module.files.length,
      totalLines: module.totalLines,
      averageFileSize: Math.round(module.totalLines / module.files.length),
      sampleFiles: JSON.stringify(sampleContent, null, 2),
    }
  );
  
  moduleAnalyses.push({
    name: module.name,
    ...analysis,
  });
  
  const priorityIcon = { high: "🔴", medium: "🟡", low: "🟢" }[analysis.modernizationPriority];
  
  console.log(`${priorityIcon} ${module.name}`);
  console.log(`   Files: ${module.files.length} | Lines: ${module.totalLines} | Exports: ${module.totalExports}`);
  console.log(`   Complexity: ${analysis.complexity}`);
  console.log(`   Dependencies: ${analysis.dependencies}`);
  console.log(`   Priority: ${analysis.modernizationPriority.toUpperCase()}`);
  console.log(`   Actions:`);
  analysis.suggestedActions.forEach(action => console.log(`     • ${action}`));
  if (analysis.risks.length > 0) {
    console.log(`   ⚠️  Risks:`);
    analysis.risks.forEach(risk => console.log(`     • ${risk}`));
  }
  console.log();
}

// Phase 3: Pattern Detection
console.log("━".repeat(60));
console.log("🔎 PHASE 3: PATTERN DETECTION");
console.log("━".repeat(60) + "\n");

interface PatternStats {
  typescript: number;
  javascript: number;
  hasTests: boolean;
  testFiles: number;
  hasTypes: boolean;
  hasLinter: boolean;
  hasBundler: boolean;
  packageManager: string | null;
}

const patterns: PatternStats = {
  typescript: 0,
  javascript: 0,
  hasTests: false,
  testFiles: 0,
  hasTypes: false,
  hasLinter: false,
  hasBundler: false,
  packageManager: null,
};

// Detect patterns
for (const [_, files] of filesByModule) {
  for (const file of files) {
    if (file.relativePath.endsWith(".ts") || file.relativePath.endsWith(".tsx")) {
      patterns.typescript++;
    } else if (file.relativePath.endsWith(".js") || file.relativePath.endsWith(".jsx")) {
      patterns.javascript++;
    }
    
    if (file.relativePath.match(/\.(test|spec)\.[jt]sx?$/)) {
      patterns.hasTests = true;
      patterns.testFiles++;
    }
  }
}

// Check for tooling
try {
  await Bun.file(join(targetDir, "tsconfig.json")).text();
  patterns.hasTypes = true;
} catch {}

try {
  await Bun.file(join(targetDir, ".eslintrc")).text();
  patterns.hasLinter = true;
} catch {
  try {
    await Bun.file(join(targetDir, ".eslintrc.json")).text();
    patterns.hasLinter = true;
  } catch {}
}

try {
  const pkg = await Bun.file(join(targetDir, "package.json")).json();
  if (pkg.dependencies?.webpack || pkg.devDependencies?.webpack) patterns.hasBundler = true;
  if (pkg.dependencies?.vite || pkg.devDependencies?.vite) patterns.hasBundler = true;
  
  // Detect package manager
  try {
    await Bun.file(join(targetDir, "package-lock.json")).text();
    patterns.packageManager = "npm";
  } catch {}
  try {
    await Bun.file(join(targetDir, "yarn.lock")).text();
    patterns.packageManager = "yarn";
  } catch {}
  try {
    await Bun.file(join(targetDir, "pnpm-lock.yaml")).text();
    patterns.packageManager = "pnpm";
  } catch {}
  try {
    await Bun.file(join(targetDir, "bun.lockb")).text();
    patterns.packageManager = "bun";
  } catch {}
} catch {}

console.log("📊 CODEBASE PATTERNS:\n");
console.log(`  Language Distribution:`);
console.log(`    TypeScript: ${patterns.typescript} files (${((patterns.typescript / totalFiles) * 100).toFixed(1)}%)`);
console.log(`    JavaScript: ${patterns.javascript} files (${((patterns.javascript / totalFiles) * 100).toFixed(1)}%)`);
console.log();
console.log(`  Testing: ${patterns.hasTests ? "✅" : "❌"} (${patterns.testFiles} test files)`);
console.log(`  Type System: ${patterns.hasTypes ? "✅" : "❌"}`);
console.log(`  Linting: ${patterns.hasLinter ? "✅" : "❌"}`);
console.log(`  Bundler: ${patterns.hasBundler ? "✅" : "❌"}`);
console.log(`  Package Manager: ${patterns.packageManager || "❓"}`);

// Phase 4: Recommendations
console.log("\n" + "━".repeat(60));
console.log("💡 MODERNIZATION RECOMMENDATIONS");
console.log("━".repeat(60) + "\n");

const recommendations = await intelligence(
  `Based on the codebase analysis, provide 5-7 prioritized, specific recommendations for modernizing this codebase. Consider: architecture, tooling, testing, dependencies, code quality.`,
  {
    totalFiles,
    modules: filesByModule.size,
    patterns: JSON.stringify(patterns),
    topModules: JSON.stringify(moduleAnalyses),
  }
);

console.log(recommendations);

// Generate Report
if (reportFile) {
  console.log(`\n📄 Generating report: ${reportFile}\n`);
  
  const report = `# Codebase Modernization Reconnaissance Report

Generated: ${new Date().toISOString()}
Target: \`${targetDir}\`

## Executive Summary

- **Total Files**: ${totalFiles}
- **Modules**: ${filesByModule.size}
- **Entry Points**: ${entryPoints.length}
- **TypeScript Coverage**: ${((patterns.typescript / totalFiles) * 100).toFixed(1)}%
- **Test Files**: ${patterns.testFiles}

## Module Structure

${sortedModules.map(([name, files]) => {
  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
  return `- **${name}**: ${files.length} files, ${totalLines} lines`;
}).join("\n")}

## Priority Modules for Modernization

${moduleAnalyses.map(m => `### ${m.name}

**Priority**: ${m.modernizationPriority.toUpperCase()}

**Complexity**: ${m.complexity}

**Dependencies**: ${m.dependencies}

**Suggested Actions**:
${m.suggestedActions.map(a => `- ${a}`).join("\n")}

${m.risks.length > 0 ? `**Risks**:\n${m.risks.map(r => `- ${r}`).join("\n")}` : ""}
`).join("\n")}

## Codebase Patterns

- **TypeScript**: ${patterns.typescript} files (${((patterns.typescript / totalFiles) * 100).toFixed(1)}%)
- **JavaScript**: ${patterns.javascript} files (${((patterns.javascript / totalFiles) * 100).toFixed(1)}%)
- **Testing**: ${patterns.hasTests ? "✅" : "❌"} (${patterns.testFiles} files)
- **Type System**: ${patterns.hasTypes ? "✅" : "❌"}
- **Linting**: ${patterns.hasLinter ? "✅" : "❌"}
- **Bundler**: ${patterns.hasBundler ? "✅" : "❌"}
- **Package Manager**: ${patterns.packageManager || "Unknown"}

## Recommendations

${recommendations}

---

*Generated by modernize-recon*
`;

  await Bun.write(reportFile, report);
  console.log(`✅ Report saved to ${reportFile}`);
}

console.log("\n" + "━".repeat(60));
console.log("✨ Reconnaissance Complete!");
console.log("━".repeat(60) + "\n");
