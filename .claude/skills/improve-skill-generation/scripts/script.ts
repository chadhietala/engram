#!/usr/bin/env bun

/**
 * System Pattern Mapper
 * Maps implementation patterns across multiple interconnected files to understand complex systems
 */

import { readdir, stat } from "fs/promises";
import { join, relative, extname, basename, dirname } from "path";

interface FileNode {
  path: string;
  relativePath: string;
  extension: string;
  directory: string;
  imports: string[];
  exports: string[];
  patterns: Pattern[];
  connections: string[];
}

interface Pattern {
  type: "class" | "function" | "interface" | "type" | "constant";
  name: string;
  lineNumber: number;
  complexity?: number;
  dependencies: string[];
}

interface SystemMap {
  entryPoints: FileNode[];
  coreModules: FileNode[];
  utilities: FileNode[];
  types: FileNode[];
  connections: Map<string, string[]>;
  patterns: Map<string, Pattern[]>;
}

const TARGET_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const PREVIEW_LINES = 100;

async function discoverFiles(
  dir: string,
  baseDir: string,
  extensions: string[] = TARGET_EXTENSIONS
): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip node_modules, .git, dist, build, etc.
      if (
        entry.isDirectory() &&
        !["node_modules", ".git", "dist", "build", ".next", "coverage"].includes(
          entry.name
        )
      ) {
        files.push(...(await discoverFiles(fullPath, baseDir, extensions)));
      } else if (entry.isFile() && extensions.includes(extname(entry.name))) {
        const stats = await stat(fullPath);
        if (stats.size <= MAX_FILE_SIZE) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }

  return files;
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /(?:import|require)\s*\(?\s*['"]([@\w\-\/\.]+)['"]\)?/g;
  const dynamicImportRegex = /import\s*\(['"]([@\w\-\/\.]+)['"]\)/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return [...new Set(imports)];
}

function extractExports(content: string): string[] {
  const exports: string[] = [];
  const exportRegex =
    /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)/g;

  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }

  return exports;
}

function extractPatterns(content: string): Pattern[] {
  const patterns: Pattern[] = [];
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    // Classes
    const classMatch = line.match(/class\s+(\w+)/);
    if (classMatch) {
      patterns.push({
        type: "class",
        name: classMatch[1],
        lineNumber: index + 1,
        dependencies: extractImports(content),
      });
    }

    // Functions
    const functionMatch = line.match(
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)/
    );
    if (functionMatch) {
      patterns.push({
        type: "function",
        name: functionMatch[1],
        lineNumber: index + 1,
        dependencies: [],
      });
    }

    // Interfaces
    const interfaceMatch = line.match(/interface\s+(\w+)/);
    if (interfaceMatch) {
      patterns.push({
        type: "interface",
        name: interfaceMatch[1],
        lineNumber: index + 1,
        dependencies: [],
      });
    }

    // Type aliases
    const typeMatch = line.match(/type\s+(\w+)/);
    if (typeMatch) {
      patterns.push({
        type: "type",
        name: typeMatch[1],
        lineNumber: index + 1,
        dependencies: [],
      });
    }

    // Constants
    const constMatch = line.match(/const\s+([A-Z_][A-Z0-9_]*)\s*=/);
    if (constMatch) {
      patterns.push({
        type: "constant",
        name: constMatch[1],
        lineNumber: index + 1,
        dependencies: [],
      });
    }
  });

  return patterns;
}

async function analyzeFile(
  filePath: string,
  baseDir: string
): Promise<FileNode> {
  const file = Bun.file(filePath);
  const content = await file.text();

  return {
    path: filePath,
    relativePath: relative(baseDir, filePath),
    extension: extname(filePath),
    directory: relative(baseDir, dirname(filePath)),
    imports: extractImports(content),
    exports: extractExports(content),
    patterns: extractPatterns(content),
    connections: [],
  };
}

function categorizeFiles(nodes: FileNode[]): SystemMap {
  const map: SystemMap = {
    entryPoints: [],
    coreModules: [],
    utilities: [],
    types: [],
    connections: new Map(),
    patterns: new Map(),
  };

  for (const node of nodes) {
    // Categorize by directory and naming patterns
    const pathLower = node.relativePath.toLowerCase();

    if (
      pathLower.includes("index.") ||
      pathLower.includes("main.") ||
      pathLower.includes("app.")
    ) {
      map.entryPoints.push(node);
    } else if (
      pathLower.includes("type") ||
      pathLower.includes("interface") ||
      node.directory.includes("types")
    ) {
      map.types.push(node);
    } else if (
      pathLower.includes("util") ||
      pathLower.includes("helper") ||
      node.directory.includes("utils")
    ) {
      map.utilities.push(node);
    } else {
      map.coreModules.push(node);
    }

    // Build connection map
    if (node.imports.length > 0) {
      map.connections.set(node.relativePath, node.imports);
    }

    // Collect patterns
    if (node.patterns.length > 0) {
      map.patterns.set(node.relativePath, node.patterns);
    }
  }

  return map;
}

function findCommonPatterns(map: SystemMap): Record<string, number> {
  const patternCounts: Record<string, number> = {};

  for (const patterns of map.patterns.values()) {
    for (const pattern of patterns) {
      const key = `${pattern.type}:${pattern.name}`;
      patternCounts[key] = (patternCounts[key] || 0) + 1;
    }
  }

  return patternCounts;
}

function findHubFiles(nodes: FileNode[]): FileNode[] {
  // Files that are imported by many others
  const importCounts = new Map<string, number>();

  for (const node of nodes) {
    for (const imp of node.imports) {
      // Normalize import paths
      const normalized = imp.replace(/^[\.\/]+/, "");
      importCounts.set(normalized, (importCounts.get(normalized) || 0) + 1);
    }
  }

  return nodes
    .filter((node) => {
      const normalized = node.relativePath.replace(/^[\.\/]+/, "");
      return (importCounts.get(normalized) || 0) >= 3;
    })
    .sort((a, b) => {
      const aCount =
        importCounts.get(a.relativePath.replace(/^[\.\/]+/, "")) || 0;
      const bCount =
        importCounts.get(b.relativePath.replace(/^[\.\/]+/, "")) || 0;
      return bCount - aCount;
    });
}

async function main() {
  const targetDir = Bun.argv[2] || process.cwd();

  console.log("🔍 System Pattern Mapper");
  console.log("========================\n");
  console.log(`📂 Analyzing: ${targetDir}\n`);

  // Discover all relevant files
  console.log("⏳ Discovering files...");
  const files = await discoverFiles(targetDir, targetDir);
  console.log(`✓ Found ${files.length} files\n`);

  if (files.length === 0) {
    console.log("❌ No TypeScript/JavaScript files found in directory");
    process.exit(1);
  }

  // Analyze each file
  console.log("⏳ Analyzing file patterns...");
  const nodes = await Promise.all(
    files.map((file) => analyzeFile(file, targetDir))
  );
  console.log(`✓ Analyzed ${nodes.length} files\n`);

  // Build system map
  const systemMap = categorizeFiles(nodes);

  // Display results
  console.log("📊 System Structure");
  console.log("===================\n");

  console.log(`🚪 Entry Points (${systemMap.entryPoints.length}):`);
  systemMap.entryPoints.slice(0, 5).forEach((node) => {
    console.log(`  • ${node.relativePath}`);
    console.log(`    Exports: ${node.exports.length}, Imports: ${node.imports.length}`);
  });
  console.log();

  console.log(`🔧 Core Modules (${systemMap.coreModules.length}):`);
  systemMap.coreModules.slice(0, 5).forEach((node) => {
    console.log(`  • ${node.relativePath}`);
    console.log(`    Patterns: ${node.patterns.length}`);
  });
  console.log();

  console.log(`📝 Type Definitions (${systemMap.types.length}):`);
  systemMap.types.slice(0, 5).forEach((node) => {
    console.log(`  • ${node.relativePath}`);
    console.log(`    Exports: ${node.exports.join(", ")}`);
  });
  console.log();

  console.log(`🛠️  Utilities (${systemMap.utilities.length}):`);
  systemMap.utilities.slice(0, 5).forEach((node) => {
    console.log(`  • ${node.relativePath}`);
  });
  console.log();

  // Find hub files (highly connected)
  const hubFiles = findHubFiles(nodes);
  console.log(`🌐 Hub Files (${hubFiles.length} with 3+ imports):`);
  hubFiles.slice(0, 10).forEach((node) => {
    console.log(`  • ${node.relativePath}`);
    console.log(`    Used by: ${node.imports.length} files`);
  });
  console.log();

  // Common patterns
  const commonPatterns = findCommonPatterns(systemMap);
  const sortedPatterns = Object.entries(commonPatterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log("🔄 Common Patterns:");
  sortedPatterns.forEach(([pattern, count]) => {
    if (count > 1) {
      console.log(`  • ${pattern}: ${count} occurrences`);
    }
  });
  console.log();

  // Connection insights
  const totalConnections = Array.from(systemMap.connections.values()).reduce(
    (sum, imports) => sum + imports.length,
    0
  );
  console.log("🔗 Connection Insights:");
  console.log(`  • Total imports: ${totalConnections}`);
  console.log(`  • Average imports per file: ${(totalConnections / nodes.length).toFixed(2)}`);
  console.log(`  • Files with no imports: ${nodes.filter(n => n.imports.length === 0).length}`);
  console.log(`  • Files with no exports: ${nodes.filter(n => n.exports.length === 0).length}`);
  console.log();

  // Refactoring suggestions
  console.log("💡 Refactoring Suggestions:");
  const filesWithManyImports = nodes.filter((n) => n.imports.length > 10);
  if (filesWithManyImports.length > 0) {
    console.log(`  • ${filesWithManyImports.length} files have >10 imports (consider splitting)`);
  }

  const largeFiles = nodes.filter((n) => n.patterns.length > 20);
  if (largeFiles.length > 0) {
    console.log(`  • ${largeFiles.length} files have >20 patterns (consider refactoring)`);
  }

  const isolatedFiles = nodes.filter(
    (n) => n.imports.length === 0 && n.exports.length === 0
  );
  if (isolatedFiles.length > 0) {
    console.log(`  • ${isolatedFiles.length} isolated files with no imports/exports`);
  }

  console.log("\n✨ Analysis complete!");
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});