#!/usr/bin/env bun

import { parseArgs } from "util";
import { Glob } from "bun";
import { intelligence } from "engram/skill-runtime";

const args = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    query: { type: "string", short: "q" },
    include: { type: "string", short: "i", default: "**/*.{ts,tsx,js,jsx}" },
    exclude: { type: "string", short: "e", default: "**/node_modules/**,**/dist/**,**/.git/**" },
    deep: { type: "boolean", short: "d", default: false },
  },
  allowPositionals: true,
});

if (args.values.help) {
  console.log(`
🔍 Codebase Explorer - Systematically discover and understand functionality

Usage: explore-codebase [directory] [options]

Options:
  -q, --query <text>     What functionality to explore (e.g., "authentication", "API routes")
  -i, --include <glob>   File pattern to include (default: **/*.{ts,tsx,js,jsx})
  -e, --exclude <glob>   File pattern to exclude (default: node_modules, dist, .git)
  -d, --deep             Perform deep analysis with implementation details
  -h, --help             Show this help message

Examples:
  explore-codebase . --query "user authentication"
  explore-codebase ./src --query "database queries" --deep
  explore-codebase . -q "API endpoints" -i "**/*.ts"
`);
  process.exit(0);
}

if (!args.values.query) {
  console.error("❌ Error: --query is required. Use --help for usage information.");
  process.exit(1);
}

const targetDir = args.positionals[0] || process.cwd();
const query = args.values.query as string;
const includePattern = args.values.include as string;
const excludePattern = args.values.exclude as string;
const deepAnalysis = args.values.deep as boolean;

console.log(`\n🔍 Exploring codebase for: "${query}"\n`);

// ============================================================================
// PHASE 1: DISCOVERY - Find relevant files
// ============================================================================

console.log("📂 Phase 1: Discovery\n");

const glob = new Glob(includePattern);
const excludeGlob = new Glob(excludePattern);
const allFiles: string[] = [];

for await (const file of glob.scan({ cwd: targetDir, absolute: false })) {
  let isExcluded = false;
  for await (const _ of excludeGlob.scan({ cwd: targetDir, absolute: false, onlyFiles: false })) {
    if (file.startsWith(_) || excludeGlob.match(file)) {
      isExcluded = true;
      break;
    }
  }
  if (!isExcluded) {
    allFiles.push(file);
  }
}

console.log(`   Found ${allFiles.length} files to analyze\n`);

// Read file contents in parallel
const fileContents = await Promise.all(
  allFiles.map(async (file) => {
    try {
      const content = await Bun.file(`${targetDir}/${file}`).text();
      return { file, content, lines: content.split("\n").length };
    } catch {
      return null;
    }
  })
);

const validFiles = fileContents.filter((f) => f !== null) as Array<{
  file: string;
  content: string;
  lines: number;
}>;

// Intelligence Point: Identify relevant files based on query
console.log("🤖 Analyzing files for relevance...\n");

const relevanceAnalysis = await intelligence(
  `Analyze these files and identify which ones are most relevant to: "${query}". 
  
Return a JSON array of objects with this structure:
[
  {
    "file": "path/to/file.ts",
    "relevance": "high" | "medium" | "low",
    "reason": "Brief explanation of why this file is relevant"
  }
]

Focus on:
- Files that implement or define the functionality
- Configuration files
- Type definitions
- Entry points and exports

Return ONLY the JSON array, no additional text.`,
  {
    files: validFiles.map((f) => ({
      path: f.file,
      size: f.lines,
      preview: f.content.slice(0, 500),
    })),
  }
);

let relevantFiles: Array<{ file: string; relevance: string; reason: string }> = [];
try {
  relevantFiles = JSON.parse(relevanceAnalysis);
} catch (e) {
  console.error("❌ Failed to parse relevance analysis");
  process.exit(1);
}

const highRelevance = relevantFiles.filter((f) => f.relevance === "high");
const mediumRelevance = relevantFiles.filter((f) => f.relevance === "medium");

console.log(`✅ Discovery Results:\n`);
console.log(`   🎯 High relevance: ${highRelevance.length} files`);
console.log(`   📌 Medium relevance: ${mediumRelevance.length} files\n`);

if (highRelevance.length === 0) {
  console.log("⚠️  No highly relevant files found. Try a different query or check your include/exclude patterns.\n");
  process.exit(0);
}

console.log("📋 High Relevance Files:\n");
highRelevance.forEach((f) => {
  console.log(`   • ${f.file}`);
  console.log(`     ${f.reason}\n`);
});

// ============================================================================
// PHASE 2: INSPECTION - Understand implementation details
// ============================================================================

if (deepAnalysis) {
  console.log("\n🔬 Phase 2: Deep Inspection\n");

  const inspectionFiles = highRelevance.slice(0, 5); // Limit to top 5 to avoid overwhelming output
  const detailedContents = inspectionFiles.map((rf) => {
    const fileData = validFiles.find((f) => f.file === rf.file);
    return {
      file: rf.file,
      content: fileData?.content || "",
    };
  });

  console.log("🤖 Analyzing implementation patterns...\n");

  const implementationAnalysis = await intelligence(
    `Analyze how "${query}" is implemented in these files. Provide:

1. **Key Components/Functions**: List the main functions, classes, or components
2. **Data Flow**: How does data move through the system?
3. **External Dependencies**: What libraries or APIs are used?
4. **Patterns**: What design patterns or architectural approaches are employed?
5. **Entry Points**: Where should someone start reading to understand this?

Format your response in clear sections with bullet points.`,
    {
      query,
      files: detailedContents,
    }
  );

  console.log(implementationAnalysis);
  console.log("\n");
}

// ============================================================================
// Summary & Next Steps
// ============================================================================

console.log("📊 Exploration Summary:\n");
console.log(`   Total files scanned: ${allFiles.length}`);
console.log(`   Relevant files found: ${highRelevance.length + mediumRelevance.length}`);
console.log(`   Primary files: ${highRelevance.length}\n`);

console.log("🎯 Next Steps:\n");
console.log(`   1. Review the high relevance files listed above`);
console.log(`   2. Start with: ${highRelevance[0]?.file || "the first listed file"}`);
if (!deepAnalysis) {
  console.log(`   3. Run with --deep flag for detailed implementation analysis`);
}
console.log(`   4. Use your code editor to examine the full implementation\n`);

// Export results to JSON for programmatic use
const outputFile = `${targetDir}/codebase-exploration-results.json`;
await Bun.write(
  outputFile,
  JSON.stringify(
    {
      query,
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: allFiles.length,
        relevantFiles: highRelevance.length + mediumRelevance.length,
      },
      highRelevance,
      mediumRelevance,
    },
    null,
    2
  )
);

console.log(`💾 Results saved to: ${outputFile}\n`);