#!/usr/bin/env bun

import { parseArgs } from "util";
import { intelligence, intelligenceWithSchema, z } from "engram/skill-runtime";

const args = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    extensions: { type: "string", short: "e", default: "ts,tsx,js,jsx" },
    "max-depth": { type: "string", short: "d", default: "3" },
    output: { type: "string", short: "o" },
  },
  allowPositionals: true,
});

if (args.values.help) {
  console.log(`
🔍 Architectural Reconnaissance Tool

Performs breadth-first exploration to map system architecture,
then depth-first analysis of critical components.

Usage: archmap [directory] [options]

Options:
  -h, --help              Show this help message
  -e, --extensions        File extensions to analyze (default: ts,tsx,js,jsx)
  -d, --max-depth         Max directory depth for breadth scan (default: 3)
  -o, --output            Save report to file (default: stdout)

Example:
  archmap ./src
  archmap . -e "ts,go" -d 5
  `);
  process.exit(0);
}

const targetDir = args.positionals[0] || process.cwd();
const extensions = (args.values.extensions as string).split(",");
const maxDepth = parseInt(args.values["max-depth"] as string);

console.log(`🗺️  Architectural Reconnaissance: ${targetDir}\n`);

// ============================================================================
// PHASE 1: BREADTH-FIRST EXPLORATION
// ============================================================================

console.log("📊 Phase 1: Breadth-First Architecture Mapping...\n");

type FileInfo = {
  path: string;
  depth: number;
  size: number;
  exports: number;
  imports: number;
  lines: number;
};

const filesByDir = new Map<string, FileInfo[]>();
const allFiles: FileInfo[] = [];

// Scan files with depth awareness
for (const ext of extensions) {
  const glob = new Bun.Glob(`**/*.${ext}`);
  for await (const file of glob.scan({ cwd: targetDir, absolute: false })) {
    const depth = file.split("/").length - 1;
    if (depth > maxDepth) continue;

    const fullPath = `${targetDir}/${file}`;
    const content = await Bun.file(fullPath).text();
    const lines = content.split("\n").length;
    
    // Quick surface-level analysis
    const exports = (content.match(/export\s+(const|function|class|interface|type|default)/g) || []).length;
    const imports = (content.match(/^import\s+/gm) || []).length;
    const size = content.length;

    const dir = file.substring(0, file.lastIndexOf("/")) || "(root)";
    const fileInfo: FileInfo = { path: file, depth, size, exports, imports, lines };
    
    if (!filesByDir.has(dir)) filesByDir.set(dir, []);
    filesByDir.get(dir)!.push(fileInfo);
    allFiles.push(fileInfo);
  }
}

console.log(`✅ Discovered ${allFiles.length} files across ${filesByDir.size} directories\n`);

// Calculate architectural metrics
const architecturalMetrics = {
  totalFiles: allFiles.length,
  totalLines: allFiles.reduce((sum, f) => sum + f.lines, 0),
  avgFileSize: Math.round(allFiles.reduce((sum, f) => sum + f.size, 0) / allFiles.length),
  avgExports: (allFiles.reduce((sum, f) => sum + f.exports, 0) / allFiles.length).toFixed(1),
  avgImports: (allFiles.reduce((sum, f) => sum + f.imports, 0) / allFiles.length).toFixed(1),
  directories: Array.from(filesByDir.keys()),
};

console.log("📈 Architectural Metrics:");
console.log(`  Total Files: ${architecturalMetrics.totalFiles}`);
console.log(`  Total Lines: ${architecturalMetrics.totalLines.toLocaleString()}`);
console.log(`  Avg File Size: ${architecturalMetrics.avgFileSize} bytes`);
console.log(`  Avg Exports/File: ${architecturalMetrics.avgExports}`);
console.log(`  Avg Imports/File: ${architecturalMetrics.avgImports}\n`);

// ============================================================================
// PHASE 2: IDENTIFY CRITICAL COMPONENTS
// ============================================================================

console.log("🎯 Phase 2: Identifying Critical Components...\n");

// Score files by architectural importance
type ScoredFile = FileInfo & { score: number; reasons: string[] };
const scoredFiles: ScoredFile[] = allFiles.map(file => {
  const reasons: string[] = [];
  let score = 0;

  // High export count suggests central component
  if (file.exports > 5) {
    score += file.exports * 2;
    reasons.push(`High exports (${file.exports})`);
  }

  // Entry points and index files
  if (file.path.includes("index.") || file.path.includes("main.") || file.path.includes("app.")) {
    score += 20;
    reasons.push("Entry point");
  }

  // Type definitions are architecturally important
  if (file.path.includes("type") || file.path.includes("interface") || file.path.includes("schema")) {
    score += 15;
    reasons.push("Type definitions");
  }

  // Config files
  if (file.path.includes("config") || file.path.includes("setup")) {
    score += 10;
    reasons.push("Configuration");
  }

  // Router/controller files
  if (file.path.match(/router|route|controller|handler|endpoint/i)) {
    score += 12;
    reasons.push("API/Routing");
  }

  // Core/lib files
  if (file.path.includes("/core/") || file.path.includes("/lib/")) {
    score += 8;
    reasons.push("Core library");
  }

  // Large files might be complex
  if (file.lines > 200) {
    score += Math.floor(file.lines / 100);
    reasons.push(`Large file (${file.lines} lines)`);
  }

  return { ...file, score, reasons };
});

// Get top critical files
const criticalFiles = scoredFiles
  .filter(f => f.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 10);

console.log("🔥 Top 10 Critical Components:");
for (const file of criticalFiles) {
  console.log(`  ${file.score.toString().padStart(3)} pts - ${file.path}`);
  console.log(`       ${file.reasons.join(", ")}`);
}
console.log();

// ============================================================================
// PHASE 3: DEPTH-FIRST ANALYSIS OF CRITICAL COMPONENTS
// ============================================================================

console.log("🔬 Phase 3: Deep Analysis of Critical Components...\n");

type DeepAnalysis = {
  path: string;
  complexity: number;
  functions: number;
  classes: number;
  dependencies: string[];
  cyclomaticHints: number;
};

const deepAnalyses: DeepAnalysis[] = [];

for (const criticalFile of criticalFiles.slice(0, 5)) {
  const fullPath = `${targetDir}/${criticalFile.path}`;
  const content = await Bun.file(fullPath).text();

  // Deep analysis
  const functions = (content.match(/function\s+\w+|const\s+\w+\s*=\s*(\([^)]*\)|async\s*\([^)]*\))\s*=>/g) || []).length;
  const classes = (content.match(/class\s+\w+/g) || []).length;
  const dependencies = Array.from(new Set(
    (content.match(/from\s+['"]([^'"]+)['"]/g) || [])
      .map(m => m.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[]
  ));
  
  // Cyclomatic complexity hints (if/for/while/catch/case)
  const cyclomaticHints = (content.match(/\b(if|for|while|catch|case)\b/g) || []).length;
  
  const complexity = cyclomaticHints + functions + classes * 2;

  deepAnalyses.push({
    path: criticalFile.path,
    complexity,
    functions,
    classes,
    dependencies,
    cyclomaticHints,
  });

  console.log(`📄 ${criticalFile.path}`);
  console.log(`   Functions: ${functions}, Classes: ${classes}`);
  console.log(`   Complexity Score: ${complexity}`);
  console.log(`   Dependencies: ${dependencies.length}`);
  if (dependencies.length > 0) {
    console.log(`   Top deps: ${dependencies.slice(0, 3).join(", ")}${dependencies.length > 3 ? "..." : ""}`);
  }
  console.log();
}

// ============================================================================
// PHASE 4: LLM-POWERED ARCHITECTURAL INSIGHTS
// ============================================================================

console.log("🧠 Phase 4: Generating Architectural Insights...\n");

const ArchInsightsSchema = z.object({
  architecture_pattern: z.string().describe("The primary architectural pattern detected"),
  module_structure: z.array(z.string()).describe("Key modules or layers identified"),
  refactoring_priorities: z.array(z.object({
    component: z.string(),
    reason: z.string(),
    effort: z.enum(["low", "medium", "high"]),
  })).describe("Top refactoring priorities"),
  coupling_concerns: z.array(z.string()).describe("Areas with tight coupling"),
  recommendations: z.array(z.string()).describe("Actionable recommendations"),
});

const insights = await intelligenceWithSchema(
  `Analyze this codebase architecture and provide refactoring insights.
  
Focus on:
- What architectural pattern is being used?
- How are modules organized?
- Which components should be refactored first and why?
- Where is there tight coupling?
- What are the top 3-5 recommendations?`,
  ArchInsightsSchema,
  {
    metrics: JSON.stringify(architecturalMetrics, null, 2),
    directories: Array.from(filesByDir.keys()).join(", "),
    critical_components: criticalFiles.slice(0, 5).map(f => ({
      path: f.path,
      exports: f.exports,
      imports: f.imports,
      lines: f.lines,
    })),
    deep_analysis: deepAnalyses,
  }
);

console.log("🏗️  Architecture Pattern:");
console.log(`   ${insights.architecture_pattern}\n`);

console.log("📦 Module Structure:");
for (const module of insights.module_structure) {
  console.log(`   • ${module}`);
}
console.log();

console.log("🎯 Refactoring Priorities:");
for (const priority of insights.refactoring_priorities) {
  const effortEmoji = priority.effort === "low" ? "🟢" : priority.effort === "medium" ? "🟡" : "🔴";
  console.log(`   ${effortEmoji} ${priority.component}`);
  console.log(`      ${priority.reason}`);
}
console.log();

if (insights.coupling_concerns.length > 0) {
  console.log("⚠️  Coupling Concerns:");
  for (const concern of insights.coupling_concerns) {
    console.log(`   • ${concern}`);
  }
  console.log();
}

console.log("💡 Recommendations:");
for (let i = 0; i < insights.recommendations.length; i++) {
  console.log(`   ${i + 1}. ${insights.recommendations[i]}`);
}
console.log();

// ============================================================================
// GENERATE REPORT
// ============================================================================

const report = `
# Architectural Reconnaissance Report
Generated: ${new Date().toISOString()}
Target: ${targetDir}

## Overview
- **Files Analyzed:** ${architecturalMetrics.totalFiles}
- **Total Lines of Code:** ${architecturalMetrics.totalLines.toLocaleString()}
- **Directories:** ${filesByDir.size}
- **Architecture Pattern:** ${insights.architecture_pattern}

## Critical Components
${criticalFiles.map((f, i) => `${i + 1}. ${f.path} (${f.score} pts)
   - ${f.reasons.join(", ")}
   - Exports: ${f.exports}, Imports: ${f.imports}, Lines: ${f.lines}`).join("\n\n")}

## Deep Analysis
${deepAnalyses.map(a => `### ${a.path}
- **Complexity Score:** ${a.complexity}
- **Functions:** ${a.functions}, **Classes:** ${a.classes}
- **Dependencies:** ${a.dependencies.length}
- **Cyclomatic Hints:** ${a.cyclomaticHints}`).join("\n\n")}

## Module Structure
${insights.module_structure.map(m => `- ${m}`).join("\n")}

## Refactoring Priorities
${insights.refactoring_priorities.map((p, i) => `${i + 1}. **${p.component}** (${p.effort} effort)
   - ${p.reason}`).join("\n\n")}

## Coupling Concerns
${insights.coupling_concerns.map(c => `- ${c}`).join("\n")}

## Recommendations
${insights.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}
`;

if (args.values.output) {
  await Bun.write(args.values.output as string, report);
  console.log(`📝 Report saved to: ${args.values.output}\n`);
} else {
  console.log("═".repeat(60));
  console.log("✅ Analysis Complete!");
  console.log("   Use -o flag to save full report to file");
  console.log("═".repeat(60));
}
