#!/usr/bin/env bun

import { parseArgs } from "util";
import { join, relative } from "path";

const HELP_TEXT = `
🔍 Code Search Strategies Tool

A systematic codebase exploration tool that implements a two-phase search strategy:
  1. Discovery Phase - Find relevant files using broad search patterns
  2. Inspection Phase - Analyze implementation details with targeted queries

USAGE:
  search-strategies [options] <search-term>

ARGUMENTS:
  <search-term>     Function name, class, or keyword to search for

OPTIONS:
  --dir <path>      Target directory (default: current directory)
  --ext <exts>      File extensions to search (default: ts,tsx,js,jsx)
  --deep            Show detailed code snippets in inspection phase
  --help            Show this help message

EXAMPLES:
  search-strategies useState --dir ./src
  search-strategies Authentication --ext ts,tsx --deep
  search-strategies "error handling" --deep
`;

// Parse arguments
const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    dir: { type: "string", default: process.cwd() },
    ext: { type: "string", default: "ts,tsx,js,jsx" },
    deep: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
  allowPositionals: true,
});

if (values.help || positionals.length === 0) {
  console.log(HELP_TEXT);
  process.exit(values.help ? 0 : 1);
}

const searchTerm = positionals.join(" ");
const targetDir = values.dir as string;
const extensions = (values.ext as string).split(",");
const deepInspection = values.deep as boolean;

console.log(`\n🎯 Searching for: "${searchTerm}"`);
console.log(`📂 Target: ${targetDir}\n`);

// ====================
// PHASE 1: DISCOVERY
// ====================
console.log("═".repeat(60));
console.log("📍 PHASE 1: DISCOVERY");
console.log("═".repeat(60));

interface DiscoveryResult {
  filePath: string;
  matchCount: number;
  matchType: "filename" | "export" | "keyword";
}

const discoveryResults: DiscoveryResult[] = [];

// Strategy 1: Search by filename pattern
console.log("\n🔎 Strategy 1: Searching filenames...");
const patterns = extensions.map((ext) => `**/*.${ext.trim()}`);

for (const pattern of patterns) {
  const glob = new Bun.Glob(pattern);
  for await (const file of glob.scan({ cwd: targetDir, onlyFiles: true })) {
    const filename = file.toLowerCase();
    const term = searchTerm.toLowerCase();
    if (filename.includes(term.replace(/\s+/g, ""))) {
      discoveryResults.push({
        filePath: file,
        matchCount: 1,
        matchType: "filename",
      });
    }
  }
}

console.log(`   Found ${discoveryResults.length} files matching filename pattern`);

// Strategy 2: Search for exports
console.log("\n🔎 Strategy 2: Searching exports...");
const exportMatches: DiscoveryResult[] = [];

for (const pattern of patterns) {
  const glob = new Bun.Glob(pattern);
  for await (const file of glob.scan({ cwd: targetDir, onlyFiles: true })) {
    try {
      const content = await Bun.file(join(targetDir, file)).text();
      const exportRegex = new RegExp(
        `export\\s+(?:default\\s+)?(?:class|function|const|let|var|interface|type|enum)\\s+\\w*${searchTerm}\\w*`,
        "gi"
      );
      const matches = content.match(exportRegex);
      if (matches && matches.length > 0) {
        exportMatches.push({
          filePath: file,
          matchCount: matches.length,
          matchType: "export",
        });
      }
    } catch (err) {
      // Skip files that can't be read
    }
  }
}

console.log(`   Found ${exportMatches.length} files with matching exports`);
discoveryResults.push(...exportMatches);

// Strategy 3: Broad keyword search
console.log("\n🔎 Strategy 3: Searching all occurrences...");
const keywordMatches: DiscoveryResult[] = [];
const alreadyFound = new Set(discoveryResults.map((r) => r.filePath));

for (const pattern of patterns) {
  const glob = new Bun.Glob(pattern);
  for await (const file of glob.scan({ cwd: targetDir, onlyFiles: true })) {
    if (alreadyFound.has(file)) continue;

    try {
      const content = await Bun.file(join(targetDir, file)).text();
      const regex = new RegExp(searchTerm, "gi");
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        keywordMatches.push({
          filePath: file,
          matchCount: matches.length,
          matchType: "keyword",
        });
      }
    } catch (err) {
      // Skip files that can't be read
    }
  }
}

console.log(`   Found ${keywordMatches.length} additional files with keyword matches`);
discoveryResults.push(...keywordMatches);

// Sort by relevance (filename > export > keyword, then by match count)
const typeOrder = { filename: 0, export: 1, keyword: 2 };
discoveryResults.sort((a, b) => {
  if (a.matchType !== b.matchType) {
    return typeOrder[a.matchType] - typeOrder[b.matchType];
  }
  return b.matchCount - a.matchCount;
});

console.log(`\n✅ Discovery complete: ${discoveryResults.length} files found`);

if (discoveryResults.length === 0) {
  console.log("\n❌ No matches found. Try broadening your search term.\n");
  process.exit(0);
}

// Show discovery summary
console.log("\n📊 Discovery Summary:");
const top10 = discoveryResults.slice(0, 10);
for (const result of top10) {
  const icon =
    result.matchType === "filename"
      ? "📄"
      : result.matchType === "export"
      ? "📤"
      : "🔤";
  console.log(
    `   ${icon} ${result.filePath} (${result.matchCount} matches, ${result.matchType})`
  );
}

if (discoveryResults.length > 10) {
  console.log(`   ... and ${discoveryResults.length - 10} more files`);
}

// ====================
// PHASE 2: INSPECTION
// ====================
console.log("\n" + "═".repeat(60));
console.log("🔬 PHASE 2: INSPECTION");
console.log("═".repeat(60));

// Focus on top 5 most relevant files
const topFiles = discoveryResults.slice(0, 5);

interface InspectionResult {
  filePath: string;
  exports: string[];
  imports: string[];
  usages: Array<{ line: number; context: string }>;
  types: string[];
}

console.log("\n🔍 Analyzing top candidates in detail...\n");

const inspectionResults: InspectionResult[] = [];

for (const { filePath } of topFiles) {
  const fullPath = join(targetDir, filePath);
  const content = await Bun.file(fullPath).text();
  const lines = content.split("\n");

  // Extract exports
  const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)/g;
  const exports: string[] = [];
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    if (match[1].toLowerCase().includes(searchTerm.toLowerCase())) {
      exports.push(match[1]);
    }
  }

  // Extract imports related to search term
  const importRegex = new RegExp(
    `import\\s+.*${searchTerm}.*\\s+from\\s+['"]([^'"]+)['"]`,
    "gi"
  );
  const imports: string[] = [];
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[0].trim());
  }

  // Find usage contexts
  const usages: Array<{ line: number; context: string }> = [];
  const searchRegex = new RegExp(searchTerm, "gi");
  lines.forEach((line, idx) => {
    if (searchRegex.test(line)) {
      usages.push({
        line: idx + 1,
        context: line.trim(),
      });
    }
  });

  // Extract type definitions
  const typeRegex = new RegExp(
    `(?:interface|type|class)\\s+(\\w*${searchTerm}\\w*)`,
    "gi"
  );
  const types: string[] = [];
  while ((match = typeRegex.exec(content)) !== null) {
    types.push(match[1]);
  }

  inspectionResults.push({
    filePath,
    exports,
    imports,
    usages: usages.slice(0, deepInspection ? 20 : 5),
    types,
  });
}

// Display inspection results
for (const result of inspectionResults) {
  console.log(`\n📁 ${result.filePath}`);
  console.log("─".repeat(60));

  if (result.exports.length > 0) {
    console.log(`\n  📤 Exports (${result.exports.length}):`);
    result.exports.forEach((exp) => console.log(`     • ${exp}`));
  }

  if (result.types.length > 0) {
    console.log(`\n  🏷️  Types (${result.types.length}):`);
    result.types.forEach((type) => console.log(`     • ${type}`));
  }

  if (result.imports.length > 0) {
    console.log(`\n  📥 Related imports (${result.imports.length}):`);
    result.imports.slice(0, 3).forEach((imp) => console.log(`     • ${imp}`));
  }

  if (result.usages.length > 0) {
    console.log(
      `\n  💡 Usage examples (${result.usages.length}${deepInspection ? "" : " shown, use --deep for more"}):`
    );
    result.usages.forEach(({ line, context }) => {
      const preview =
        context.length > 70 ? context.slice(0, 67) + "..." : context;
      console.log(`     L${line}: ${preview}`);
    });
  }
}

// ====================
// RECOMMENDATIONS
// ====================
console.log("\n" + "═".repeat(60));
console.log("💡 RECOMMENDATIONS");
console.log("═".repeat(60));

const primaryFiles = inspectionResults.filter(
  (r) => r.exports.length > 0 || r.types.length > 0
);
const usageFiles = inspectionResults.filter(
  (r) => r.usages.length > 5 && r.exports.length === 0
);

console.log("\n📌 Key files to examine:");
if (primaryFiles.length > 0) {
  console.log("\n  Primary definitions:");
  primaryFiles.forEach((r) => console.log(`    • ${r.filePath}`));
}

if (usageFiles.length > 0) {
  console.log("\n  Heavy usage locations:");
  usageFiles.forEach((r) => console.log(`    • ${r.filePath} (${r.usages.length} occurrences)`));
}

console.log("\n🚀 Next steps:");
console.log("  1. Review primary definition files for API surface");
console.log("  2. Check usage files for implementation patterns");
console.log("  3. Look for related tests in discovered files");
console.log("\n");