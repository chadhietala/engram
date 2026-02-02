#!/usr/bin/env bun

import { parseArgs } from "util";
import { join, relative } from "path";
import { existsSync } from "fs";

const args = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    depth: { type: "string", short: "d", default: "2" },
    extensions: { type: "string", short: "e", default: "ts,tsx,js,jsx" },
    "show-content": { type: "boolean", default: false },
    "max-files": { type: "string", default: "50" },
  },
  allowPositionals: true,
});

if (args.values.help) {
  console.log(`
🔍 Codebase Explorer - Systematic code understanding tool

USAGE:
  explore-codebase [directory] [options]

ARGUMENTS:
  directory         Target directory to explore (default: current directory)

OPTIONS:
  -h, --help           Show this help message
  -d, --depth <n>      Directory depth for structure analysis (default: 2)
  -e, --extensions     Comma-separated file extensions (default: ts,tsx,js,jsx)
  --show-content       Show code snippets from key files
  --max-files <n>      Maximum files to analyze in detail (default: 50)

EXAMPLE:
  explore-codebase ./my-project --depth 3 --show-content
`);
  process.exit(0);
}

const targetDir = args.positionals[0] || process.cwd();
const maxDepth = parseInt(args.values.depth as string);
const extensions = (args.values.extensions as string).split(",");
const showContent = args.values["show-content"] as boolean;
const maxFiles = parseInt(args.values["max-files"] as string);

if (!existsSync(targetDir)) {
  console.error(`❌ Error: Directory '${targetDir}' does not exist`);
  process.exit(1);
}

console.log(`\n🔍 Exploring codebase: ${targetDir}\n`);

// Phase 1: Documentation Discovery
console.log("📚 PHASE 1: DOCUMENTATION SURVEY");
console.log("═".repeat(50));

const docPatterns = ["README*", "CONTRIBUTING*", "ARCHITECTURE*", "docs/**/*"];
const docFiles: string[] = [];

for (const pattern of docPatterns) {
  const glob = new Bun.Glob(pattern);
  for await (const file of glob.scan({ cwd: targetDir, onlyFiles: true })) {
    docFiles.push(file);
  }
}

if (docFiles.length > 0) {
  console.log(`\n✅ Found ${docFiles.length} documentation file(s):\n`);
  for (const doc of docFiles.slice(0, 10)) {
    const file = Bun.file(join(targetDir, doc));
    const size = file.size;
    const lines = (await file.text()).split("\n").length;
    console.log(`  📄 ${doc} (${lines} lines, ${(size / 1024).toFixed(1)}KB)`);
  }
} else {
  console.log("\n⚠️  No documentation files found");
}

// Phase 2: Structure Analysis
console.log(`\n\n📁 PHASE 2: PROJECT STRUCTURE`);
console.log("═".repeat(50));

interface DirStats {
  path: string;
  fileCount: number;
  dirs: Set<string>;
}

const dirMap = new Map<string, DirStats>();

const patterns = extensions.map((ext) => `**/*.${ext}`);
const allFiles: string[] = [];

for (const pattern of patterns) {
  const glob = new Bun.Glob(pattern);
  for await (const file of glob.scan({ cwd: targetDir, onlyFiles: true })) {
    if (!file.includes("node_modules") && !file.includes(".git")) {
      allFiles.push(file);

      const parts = file.split("/");
      for (let i = 0; i <= Math.min(maxDepth, parts.length - 1); i++) {
        const dirPath = parts.slice(0, i).join("/") || ".";
        if (!dirMap.has(dirPath)) {
          dirMap.set(dirPath, { path: dirPath, fileCount: 0, dirs: new Set() });
        }
        const stats = dirMap.get(dirPath)!;
        if (i === parts.length - 1) {
          stats.fileCount++;
        }
        if (i < parts.length - 1) {
          stats.dirs.add(parts.slice(0, i + 1).join("/"));
        }
      }
    }
  }
}

console.log(`\n📊 Total files found: ${allFiles.length}\n`);

const topDirs = Array.from(dirMap.entries())
  .filter(([path]) => !path.includes("/") || path.split("/").length <= maxDepth)
  .sort((a, b) => b[1].fileCount - a[1].fileCount)
  .slice(0, 15);

for (const [path, stats] of topDirs) {
  const indent = "  ".repeat(path.split("/").filter(Boolean).length);
  console.log(`${indent}📂 ${path || "."} (${stats.fileCount} files)`);
}

// Phase 3: Entry Point Detection
console.log(`\n\n🎯 PHASE 3: ENTRY POINTS & KEY FILES`);
console.log("═".repeat(50));

const entryPatterns = [
  /^(index|main|app|server|client)\.(ts|tsx|js|jsx)$/,
  /^src\/(index|main|app)\.(ts|tsx|js|jsx)$/,
  /package\.json$/,
  /tsconfig\.json$/,
];

const keyFiles: { file: string; type: string; priority: number }[] = [];

for (const file of allFiles) {
  const basename = file.split("/").pop() || "";
  if (entryPatterns[0].test(basename)) {
    keyFiles.push({ file, type: "entry-point", priority: 1 });
  } else if (file === "package.json") {
    keyFiles.push({ file, type: "config", priority: 0 });
  } else if (file === "tsconfig.json") {
    keyFiles.push({ file, type: "config", priority: 0 });
  }
}

keyFiles.sort((a, b) => a.priority - b.priority);

console.log(`\n🔑 Key files identified:\n`);
for (const { file, type } of keyFiles.slice(0, 10)) {
  console.log(`  ${{ config: "⚙️", "entry-point": "🚀" }[type]} ${file}`);
}

// Phase 4: Code Analysis
console.log(`\n\n🔬 PHASE 4: CODE ANALYSIS`);
console.log("═".repeat(50));

const analyzedFiles = allFiles.slice(0, maxFiles);
const analysis = {
  totalLines: 0,
  exports: 0,
  imports: 0,
  functions: 0,
  classes: 0,
  interfaces: 0,
  types: 0,
  components: 0,
};

const importGraph = new Map<string, Set<string>>();
const exportedItems = new Map<string, string[]>();

for (const file of analyzedFiles) {
  try {
    const content = await Bun.file(join(targetDir, file)).text();
    const lines = content.split("\n");
    analysis.totalLines += lines.length;

    const imports = content.match(/^import .+ from ['"].+['"]/gm) || [];
    const exports = content.match(/^export (const|function|class|interface|type|default)/gm) || [];
    const functions = content.match(/(?:^|\s)(?:export\s+)?(?:async\s+)?function\s+\w+/gm) || [];
    const classes = content.match(/(?:^|\s)(?:export\s+)?class\s+\w+/gm) || [];
    const interfaces = content.match(/(?:^|\s)(?:export\s+)?interface\s+\w+/gm) || [];
    const types = content.match(/(?:^|\s)(?:export\s+)?type\s+\w+/gm) || [];
    const components = content.match(/(?:export\s+)?(?:const|function)\s+[A-Z]\w+.*(?:React\.FC|JSX\.Element|\(.*\):\s*JSX)/gm) || [];

    analysis.imports += imports.length;
    analysis.exports += exports.length;
    analysis.functions += functions.length;
    analysis.classes += classes.length;
    analysis.interfaces += interfaces.length;
    analysis.types += types.length;
    analysis.components += components.length;

    if (exports.length > 0) {
      exportedItems.set(file, exports);
    }

    const importedFiles = new Set<string>();
    for (const imp of imports) {
      const match = imp.match(/from ['"](.+)['"]/);
      if (match && match[1].startsWith(".")) {
        importedFiles.add(match[1]);
      }
    }
    if (importedFiles.size > 0) {
      importGraph.set(file, importedFiles);
    }
  } catch (e) {
    // Skip files that can't be read
  }
}

console.log(`\n📈 Codebase Statistics (${analyzedFiles.length} files analyzed):\n`);
console.log(`  📝 Total Lines:      ${analysis.totalLines.toLocaleString()}`);
console.log(`  📤 Exports:          ${analysis.exports}`);
console.log(`  📥 Imports:          ${analysis.imports}`);
console.log(`  ⚡ Functions:        ${analysis.functions}`);
console.log(`  🏛️  Classes:          ${analysis.classes}`);
console.log(`  📋 Interfaces:       ${analysis.interfaces}`);
console.log(`  🏷️  Type Aliases:     ${analysis.types}`);
console.log(`  ⚛️  React Components: ${analysis.components}`);

// Phase 5: Export Analysis
console.log(`\n\n📦 PHASE 5: EXPORT ANALYSIS`);
console.log("═".repeat(50));

const topExporters = Array.from(exportedItems.entries())
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 10);

console.log(`\n🎁 Top files by exports:\n`);
for (const [file, exports] of topExporters) {
  console.log(`  📄 ${file} (${exports.length} exports)`);
  if (showContent) {
    for (const exp of exports.slice(0, 3)) {
      console.log(`     → ${exp.trim()}`);
    }
    if (exports.length > 3) {
      console.log(`     ... and ${exports.length - 3} more`);
    }
  }
}

// Phase 6: Recommendations
console.log(`\n\n💡 PHASE 6: EXPLORATION RECOMMENDATIONS`);
console.log("═".repeat(50));

console.log(`\n🎯 Suggested next steps:\n`);

if (docFiles.length > 0) {
  console.log(`  1. Start by reading: ${docFiles[0]}`);
}

if (keyFiles.length > 0) {
  const entryPoint = keyFiles.find((f) => f.type === "entry-point");
  if (entryPoint) {
    console.log(`  2. Examine entry point: ${entryPoint.file}`);
  }
}

if (topExporters.length > 0) {
  console.log(`  3. Study core modules: ${topExporters[0][0]}`);
}

const coreDirs = topDirs.filter(([path]) => path.includes("src") || path.includes("lib"));
if (coreDirs.length > 0) {
  console.log(`  4. Explore core directory: ${coreDirs[0][0]}/`);
}

console.log(`\n✨ Exploration complete!\n`);