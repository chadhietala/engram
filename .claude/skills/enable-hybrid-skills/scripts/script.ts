#!/usr/bin/env bun

/**
 * Codebase Architecture Explorer
 * 
 * Performs hybrid reconnaissance on a codebase:
 * 1. Breadth-first: discovers and maps architectural components
 * 2. Depth-first: analyzes key implementation details
 * 3. Intelligence-driven: synthesizes findings into actionable insights
 */

import { parseArgs } from "util";
import { intelligence, intelligenceWithSchema, z } from "engram/skill-runtime";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    depth: { type: "string", short: "d", default: "3" },
    extensions: { type: "string", short: "e", default: "ts,js,tsx,jsx" },
    "max-files": { type: "string", default: "50" },
    "focus-pattern": { type: "string", short: "f" },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`
🔍 Codebase Architecture Explorer

Usage: explore-codebase [directory] [options]

Arguments:
  directory              Target directory (default: current directory)

Options:
  -h, --help            Show this help message
  -d, --depth <n>       Directory depth to scan (default: 3)
  -e, --extensions      File extensions to scan (default: ts,js,tsx,jsx)
  --max-files <n>       Maximum files to analyze (default: 50)
  -f, --focus-pattern   Focus on files matching pattern (e.g., "api,route")

Examples:
  explore-codebase                    # Explore current directory
  explore-codebase ./src              # Explore src directory
  explore-codebase --focus-pattern=api --depth=5
`);
  process.exit(0);
}

const targetDir = positionals[0] || process.cwd();
const maxDepth = parseInt(values.depth as string);
const extensions = (values.extensions as string).split(",");
const maxFiles = parseInt(values["max-files"] as string);
const focusPattern = values["focus-pattern"] as string | undefined;

// Validate directory
try {
  const stat = await Bun.file(`${targetDir}/package.json`).exists();
} catch {
  console.error(`❌ Error: Directory "${targetDir}" not accessible`);
  process.exit(1);
}

console.log(`\n🔍 Starting Architecture Reconnaissance\n`);
console.log(`📂 Target: ${targetDir}`);
console.log(`📊 Config: depth=${maxDepth}, extensions=${extensions.join(",")}, max=${maxFiles}\n`);

// ============================================================================
// PHASE 1: BREADTH-FIRST RECONNAISSANCE
// ============================================================================

console.log(`\n${"=".repeat(60)}`);
console.log(`📡 PHASE 1: BREADTH-FIRST RECONNAISSANCE`);
console.log(`${"=".repeat(60)}\n`);

interface FileMetadata {
  path: string;
  size: number;
  lines: number;
  depth: number;
  exports?: number;
  imports?: number;
  classes?: number;
  functions?: number;
}

const fileMetadata: FileMetadata[] = [];
const directoryStructure: Map<string, string[]> = new Map();

// Discover files
const pattern = `**/*.{${extensions.join(",")}}`;
const glob = new Bun.Glob(pattern);

let scannedCount = 0;
for await (const file of glob.scan({ cwd: targetDir, onlyFiles: true })) {
  const depth = file.split("/").length - 1;
  if (depth > maxDepth) continue;
  
  // Apply focus pattern if specified
  if (focusPattern && !file.toLowerCase().includes(focusPattern.toLowerCase())) {
    continue;
  }
  
  const fullPath = `${targetDir}/${file}`;
  const stat = await Bun.file(fullPath).stat();
  const content = await Bun.file(fullPath).text();
  
  const lines = content.split("\n").length;
  const exports = (content.match(/export\s+(default\s+)?(class|function|const|let|var|interface|type|enum)/g) || []).length;
  const imports = (content.match(/import\s+.*from/g) || []).length;
  const classes = (content.match(/class\s+\w+/g) || []).length;
  const functions = (content.match(/(function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>)/g) || []).length;
  
  fileMetadata.push({
    path: file,
    size: stat.size,
    lines,
    depth,
    exports,
    imports,
    classes,
    functions,
  });
  
  // Track directory structure
  const dir = file.substring(0, file.lastIndexOf("/")) || ".";
  if (!directoryStructure.has(dir)) {
    directoryStructure.set(dir, []);
  }
  directoryStructure.get(dir)!.push(file);
  
  scannedCount++;
  if (scannedCount >= maxFiles) break;
}

console.log(`✅ Discovered ${fileMetadata.length} files across ${directoryStructure.size} directories\n`);

// Identify architectural patterns
const entryPoints = fileMetadata.filter(f => 
  f.path.includes("index.") || 
  f.path.includes("main.") || 
  f.path.includes("app.") ||
  f.path === "server.ts" ||
  f.path === "server.js"
);

const configFiles = fileMetadata.filter(f =>
  f.path.includes("config") ||
  f.path.endsWith(".config.ts") ||
  f.path.endsWith(".config.js") ||
  f.path === "package.json"
);

const testFiles = fileMetadata.filter(f =>
  f.path.includes("test") ||
  f.path.includes("spec") ||
  f.path.includes("__tests__")
);

// Find hub files (files with many imports/exports)
const hubFiles = fileMetadata
  .filter(f => (f.exports || 0) + (f.imports || 0) > 10)
  .sort((a, b) => ((b.exports || 0) + (b.imports || 0)) - ((a.exports || 0) + (a.imports || 0)))
  .slice(0, 10);

console.log(`📋 Architectural Components Found:\n`);
console.log(`  🚀 Entry Points: ${entryPoints.length}`);
entryPoints.forEach(f => console.log(`     - ${f.path} (${f.lines} lines, ${f.exports} exports)`));

console.log(`\n  ⚙️  Config Files: ${configFiles.length}`);
configFiles.slice(0, 5).forEach(f => console.log(`     - ${f.path}`));

console.log(`\n  🧪 Test Files: ${testFiles.length}`);
console.log(`\n  🔗 Hub Files (high connectivity):`);
hubFiles.forEach(f => console.log(`     - ${f.path} (${f.imports} imports, ${f.exports} exports)`));

// Directory heat map (by file count and size)
const dirMetrics = Array.from(directoryStructure.entries()).map(([dir, files]) => {
  const totalLines = files.reduce((sum, file) => {
    const meta = fileMetadata.find(m => m.path === file);
    return sum + (meta?.lines || 0);
  }, 0);
  return { dir, fileCount: files.length, totalLines };
}).sort((a, b) => b.totalLines - a.totalLines).slice(0, 10);

console.log(`\n  🗂️  Largest Directories:`);
dirMetrics.forEach(d => console.log(`     - ${d.dir}: ${d.fileCount} files, ${d.totalLines} lines`));

// ============================================================================
// PHASE 2: DEPTH-FIRST INVESTIGATION
// ============================================================================

console.log(`\n\n${"=".repeat(60)}`);
console.log(`🔬 PHASE 2: DEPTH-FIRST INVESTIGATION`);
console.log(`${"=".repeat(60)}\n`);

// Select critical files for deep analysis
const criticalFiles = [
  ...entryPoints.slice(0, 2),
  ...hubFiles.slice(0, 3),
].filter((f, i, arr) => arr.findIndex(x => x.path === f.path) === i).slice(0, 5);

console.log(`🎯 Analyzing ${criticalFiles.length} critical files in depth...\n`);

interface DetailedAnalysis {
  path: string;
  keyExports: string[];
  dependencies: string[];
  complexity: string;
}

const detailedAnalyses: DetailedAnalysis[] = [];

for (const file of criticalFiles) {
  const fullPath = `${targetDir}/${file.path}`;
  const content = await Bun.file(fullPath).text();
  
  // Extract exports
  const exportMatches = content.matchAll(/export\s+(default\s+)?(class|function|const|interface|type)\s+(\w+)/g);
  const keyExports = Array.from(exportMatches).map(m => m[3]).slice(0, 10);
  
  // Extract import sources
  const importMatches = content.matchAll(/import\s+.*from\s+['"]([^'"]+)['"]/g);
  const dependencies = Array.from(importMatches).map(m => m[1])
    .filter(dep => dep.startsWith(".") || dep.startsWith("@")) // Local or scoped imports
    .slice(0, 10);
  
  // Calculate cyclomatic complexity indicator
  const branches = (content.match(/\b(if|else|switch|case|for|while|catch|\?)\b/g) || []).length;
  const complexity = branches < 10 ? "Low" : branches < 30 ? "Medium" : "High";
  
  detailedAnalyses.push({
    path: file.path,
    keyExports,
    dependencies,
    complexity,
  });
  
  console.log(`  📄 ${file.path}`);
  console.log(`     Complexity: ${complexity} (${branches} branch points)`);
  console.log(`     Key Exports: ${keyExports.slice(0, 5).join(", ") || "none"}`);
  console.log(`     Dependencies: ${dependencies.slice(0, 3).join(", ") || "none"}`);
  console.log();
}

// ============================================================================
// PHASE 3: INTELLIGENCE-DRIVEN SYNTHESIS
// ============================================================================

console.log(`\n${"=".repeat(60)}`);
console.log(`🧠 PHASE 3: INTELLIGENCE-DRIVEN SYNTHESIS`);
console.log(`${"=".repeat(60)}\n`);

console.log(`⏳ Analyzing patterns and generating insights...\n`);

const ArchitectureInsightSchema = z.object({
  architecture_type: z.string().describe("The primary architectural pattern (e.g., MVC, microservices, monolithic, layered)"),
  key_patterns: z.array(z.string()).describe("Notable design patterns or conventions observed"),
  entry_flow: z.string().describe("How the application initializes and processes requests"),
  modularity_score: z.enum(["low", "medium", "high"]).describe("How well-organized and modular the code is"),
  risk_areas: z.array(z.object({
    location: z.string(),
    concern: z.string(),
  })).describe("Areas that may need attention"),
  next_steps: z.array(z.string()).describe("Recommended actions for developers working on this codebase"),
});

const analysisContext = {
  totalFiles: fileMetadata.length,
  entryPoints: entryPoints.map(f => f.path),
  hubFiles: hubFiles.slice(0, 5).map(f => ({ path: f.path, exports: f.exports, imports: f.imports })),
  directories: Array.from(directoryStructure.keys()),
  largestDirs: dirMetrics.slice(0, 5),
  detailedAnalyses,
  testCoverage: `${testFiles.length} test files out of ${fileMetadata.length} total files`,
};

const insights = await intelligenceWithSchema(
  `You are analyzing a codebase reconnaissance report. Based on the structural data provided, 
  determine the architecture type, identify patterns, assess code quality, and provide actionable 
  recommendations for developers who need to modify this codebase.`,
  ArchitectureInsightSchema,
  { reconnaissance: JSON.stringify(analysisContext, null, 2) }
);

console.log(`📊 ARCHITECTURE ANALYSIS\n`);
console.log(`🏗️  Architecture Type: ${insights.architecture_type}`);
console.log(`\n🎨 Key Patterns Observed:`);
insights.key_patterns.forEach(pattern => console.log(`   • ${pattern}`));

console.log(`\n🔄 Entry Flow:\n   ${insights.entry_flow}`);

console.log(`\n📐 Modularity: ${insights.modularity_score.toUpperCase()}`);

if (insights.risk_areas.length > 0) {
  console.log(`\n⚠️  Risk Areas:`);
  insights.risk_areas.forEach(risk => {
    console.log(`   • ${risk.location}: ${risk.concern}`);
  });
}

console.log(`\n✅ Recommended Next Steps:`);
insights.next_steps.forEach((step, i) => console.log(`   ${i + 1}. ${step}`));

// ============================================================================
// SUMMARY REPORT
// ============================================================================

console.log(`\n\n${"=".repeat(60)}`);
console.log(`📈 SUMMARY REPORT`);
console.log(`${"=".repeat(60)}\n`);

const totalLines = fileMetadata.reduce((sum, f) => sum + f.lines, 0);
const avgLinesPerFile = Math.round(totalLines / fileMetadata.length);
const totalExports = fileMetadata.reduce((sum, f) => sum + (f.exports || 0), 0);
const totalImports = fileMetadata.reduce((sum, f) => sum + (f.imports || 0), 0);

console.log(`📊 Codebase Metrics:`);
console.log(`   • Total Files: ${fileMetadata.length}`);
console.log(`   • Total Lines: ${totalLines.toLocaleString()}`);
console.log(`   • Avg Lines/File: ${avgLinesPerFile}`);
console.log(`   • Total Exports: ${totalExports}`);
console.log(`   • Total Imports: ${totalImports}`);
console.log(`   • Test Coverage: ${Math.round((testFiles.length / fileMetadata.length) * 100)}%`);

console.log(`\n✨ Exploration complete! Use the insights above to guide your codebase modifications.\n`);