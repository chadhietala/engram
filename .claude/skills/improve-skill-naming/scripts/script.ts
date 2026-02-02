#!/usr/bin/env bun

/**
 * improve-skill-naming - Analyzes codebase patterns to suggest better naming conventions
 * 
 * This tool examines your codebase to understand architectural patterns, naming conventions,
 * and file organization, then provides intelligent suggestions for improving consistency.
 */

import { parseArgs } from "util";
import { intelligence, intelligenceWithSchema, z } from "engram/skill-runtime";

const args = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    pattern: { type: "string", short: "p", default: "**/*.{ts,tsx,js,jsx}" },
    depth: { type: "string", short: "d", default: "3" },
    focus: { type: "string", short: "f" },
  },
  allowPositionals: true,
});

if (args.values.help) {
  console.log(`
🎯 improve-skill-naming - Analyze and improve codebase naming conventions

Usage: improve-skill-naming [directory] [options]

Arguments:
  directory              Target directory to analyze (default: current directory)

Options:
  -p, --pattern <glob>   File pattern to analyze (default: **/*.{ts,tsx,js,jsx})
  -d, --depth <number>   Max directory depth to analyze (default: 3)
  -f, --focus <path>     Focus analysis on specific file or directory
  --help, -h            Show this help message

Examples:
  improve-skill-naming                    # Analyze current directory
  improve-skill-naming ./src              # Analyze src directory
  improve-skill-naming -f ./api          # Focus on API directory
  improve-skill-naming -p "**/*.test.ts" # Analyze only test files
`);
  process.exit(0);
}

const targetDir = args.positionals[0] || process.cwd();
const pattern = args.values.pattern as string;
const maxDepth = parseInt(args.values.depth as string);
const focusPath = args.values.focus as string;

console.log("🔍 Analyzing codebase patterns...\n");

// Step 1: Discover files
const glob = new Bun.Glob(pattern);
const files = await Array.fromAsync(glob.scan({ cwd: targetDir, absolute: false }));

if (files.length === 0) {
  console.error("❌ No files found matching pattern:", pattern);
  process.exit(1);
}

// Filter by depth and focus
const filteredFiles = files.filter((file) => {
  const depth = file.split("/").length;
  const matchesDepth = depth <= maxDepth;
  const matchesFocus = !focusPath || file.startsWith(focusPath);
  return matchesDepth && matchesFocus;
});

console.log(`📁 Found ${filteredFiles.length} files to analyze\n`);

// Step 2: Analyze file structure and patterns
interface FileAnalysis {
  path: string;
  directory: string;
  filename: string;
  extension: string;
  exports: string[];
  imports: string[];
  classNames: string[];
  functionNames: string[];
  interfaceNames: string[];
  typeNames: string[];
}

const analyses: FileAnalysis[] = [];

console.log("📖 Reading and parsing files...");
for (const file of filteredFiles.slice(0, 50)) { // Limit to first 50 files for performance
  try {
    const fullPath = `${targetDir}/${file}`;
    const content = await Bun.file(fullPath).text();
    const parts = file.split("/");
    const filename = parts[parts.length - 1];
    const directory = parts.slice(0, -1).join("/");
    const extension = filename.split(".").pop() || "";

    // Extract code elements using regex
    const exports = Array.from(content.matchAll(/export\s+(?:default\s+)?(?:class|function|const|let|interface|type)\s+(\w+)/g)).map(m => m[1]);
    const imports = Array.from(content.matchAll(/import.*from\s+['"](.+)['"]/g)).map(m => m[1]);
    const classNames = Array.from(content.matchAll(/class\s+(\w+)/g)).map(m => m[1]);
    const functionNames = Array.from(content.matchAll(/(?:function|const)\s+(\w+)\s*[=(:]/g)).map(m => m[1]);
    const interfaceNames = Array.from(content.matchAll(/interface\s+(\w+)/g)).map(m => m[1]);
    const typeNames = Array.from(content.matchAll(/type\s+(\w+)\s*=/g)).map(m => m[1]);

    analyses.push({
      path: file,
      directory,
      filename,
      extension,
      exports,
      imports,
      classNames,
      functionNames,
      interfaceNames,
      typeNames,
    });
  } catch (error) {
    console.error(`⚠️  Failed to read ${file}`);
  }
}

// Step 3: Aggregate patterns
const directoryGroups = new Map<string, FileAnalysis[]>();
const extensionGroups = new Map<string, FileAnalysis[]>();
const allExports = analyses.flatMap(a => a.exports);
const allFunctions = analyses.flatMap(a => a.functionNames);
const allClasses = analyses.flatMap(a => a.classNames);
const allInterfaces = analyses.flatMap(a => a.interfaceNames);
const allTypes = analyses.flatMap(a => a.typeNames);

for (const analysis of analyses) {
  const dirFiles = directoryGroups.get(analysis.directory) || [];
  dirFiles.push(analysis);
  directoryGroups.set(analysis.directory, dirFiles);

  const extFiles = extensionGroups.get(analysis.extension) || [];
  extFiles.push(analysis);
  extensionGroups.set(analysis.extension, extFiles);
}

// Step 4: Display patterns found
console.log("\n📊 Pattern Analysis Results\n");
console.log("━".repeat(60));

console.log("\n📂 Directory Structure:");
const sortedDirs = Array.from(directoryGroups.entries()).sort((a, b) => b[1].length - a[1].length);
for (const [dir, files] of sortedDirs.slice(0, 10)) {
  console.log(`  ${dir || "(root)"}: ${files.length} files`);
}

console.log("\n🏷️  File Extensions:");
for (const [ext, files] of Array.from(extensionGroups.entries()).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  .${ext}: ${files.length} files`);
}

console.log("\n📤 Naming Conventions Detected:");
console.log(`  Exports: ${allExports.length}`);
console.log(`  Functions: ${allFunctions.length}`);
console.log(`  Classes: ${allClasses.length}`);
console.log(`  Interfaces: ${allInterfaces.length}`);
console.log(`  Types: ${allTypes.length}`);

// Step 5: Detect naming patterns
const camelCaseCount = allFunctions.filter(n => /^[a-z][a-zA-Z0-9]*$/.test(n)).length;
const PascalCaseCount = [...allClasses, ...allInterfaces, ...allTypes].filter(n => /^[A-Z][a-zA-Z0-9]*$/.test(n)).length;
const kebabCaseFiles = analyses.filter(a => /^[a-z-]+\.[a-z]+$/.test(a.filename)).length;
const camelCaseFiles = analyses.filter(a => /^[a-z][a-zA-Z0-9]*\.[a-z]+$/.test(a.filename)).length;

console.log("\n🎨 Convention Usage:");
console.log(`  Functions (camelCase): ${camelCaseCount}/${allFunctions.length}`);
console.log(`  Classes/Types (PascalCase): ${PascalCaseCount}/${allClasses.length + allInterfaces.length + allTypes.length}`);
console.log(`  Files (kebab-case): ${kebabCaseFiles}/${analyses.length}`);
console.log(`  Files (camelCase): ${camelCaseFiles}/${analyses.length}`);

// Step 6: Use intelligence to analyze and suggest improvements
console.log("\n🤖 Generating intelligent recommendations...\n");

const AnalysisSchema = z.object({
  strengths: z.array(z.string()).describe("What naming conventions are working well"),
  inconsistencies: z.array(z.object({
    issue: z.string(),
    examples: z.array(z.string()),
    suggestion: z.string(),
  })).describe("Naming inconsistencies found"),
  recommendations: z.array(z.object({
    category: z.string(),
    recommendation: z.string(),
    priority: z.enum(["high", "medium", "low"]),
  })).describe("Specific actionable recommendations"),
  architecturalInsights: z.array(z.string()).describe("Insights about code organization"),
});

const analysisData = {
  directoryStructure: Array.from(directoryGroups.keys()),
  fileCount: analyses.length,
  sampleFiles: analyses.slice(0, 20).map(a => ({
    path: a.path,
    exports: a.exports,
    classes: a.classNames,
    functions: a.functionNames.slice(0, 5),
  })),
  namingStats: {
    camelCaseCount,
    PascalCaseCount,
    kebabCaseFiles,
    camelCaseFiles,
  },
  focusArea: focusPath || "entire codebase",
};

const suggestions = await intelligenceWithSchema(
  `Analyze this codebase's naming conventions and architectural patterns. 
   Identify inconsistencies, suggest improvements, and provide architectural insights.
   Be specific and actionable. Consider: file naming, function naming, class naming, 
   directory organization, and import patterns.`,
  AnalysisSchema,
  { analysis: JSON.stringify(analysisData, null, 2) }
);

// Step 7: Display recommendations
console.log("━".repeat(60));
console.log("\n✅ Strengths:");
for (const strength of suggestions.strengths) {
  console.log(`  • ${strength}`);
}

console.log("\n⚠️  Inconsistencies Found:");
for (const inconsistency of suggestions.inconsistencies) {
  console.log(`\n  ❗ ${inconsistency.issue}`);
  console.log(`     Examples: ${inconsistency.examples.join(", ")}`);
  console.log(`     💡 ${inconsistency.suggestion}`);
}

console.log("\n🎯 Recommendations:");
const priorityEmoji = { high: "🔴", medium: "🟡", low: "🟢" };
for (const rec of suggestions.recommendations) {
  console.log(`\n  ${priorityEmoji[rec.priority]} [${rec.priority.toUpperCase()}] ${rec.category}`);
  console.log(`     ${rec.recommendation}`);
}

console.log("\n🏗️  Architectural Insights:");
for (const insight of suggestions.architecturalInsights) {
  console.log(`  • ${insight}`);
}

console.log("\n" + "━".repeat(60));
console.log("\n✨ Analysis complete! Use these insights to improve your codebase consistency.\n");