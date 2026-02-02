#!/usr/bin/env bun

import { parseArgs } from "util";
import { intelligence, intelligenceWithSchema, z } from "engram/skill-runtime";

const HELP = `
🧹 remove-legacy-heuristics - Find and remove legacy heuristic code superseded by LLMs

USAGE:
  remove-legacy-heuristics [directory] [options]

OPTIONS:
  --help          Show this help message
  --dry-run       Show what would be removed without making changes
  --auto-remove   Automatically remove identified legacy code (use with caution)

EXAMPLES:
  remove-legacy-heuristics                    # Analyze current directory
  remove-legacy-heuristics ./src --dry-run    # Preview changes in src/
  remove-legacy-heuristics . --auto-remove    # Remove legacy code automatically
`;

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    help: { type: "boolean" },
    "dry-run": { type: "boolean", default: false },
    "auto-remove": { type: "boolean", default: false },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(HELP);
  process.exit(0);
}

const targetDir = positionals[0] || process.cwd();
const dryRun = values["dry-run"];
const autoRemove = values["auto-remove"];

console.log("🔍 Scanning for legacy heuristic-based code...\n");

// Step 1: Discover TypeScript/JavaScript files
const glob = new Bun.Glob("**/*.{ts,tsx,js,jsx}");
const files = Array.from(
  glob.scanSync({
    cwd: targetDir,
    onlyFiles: true,
  })
).filter(
  (f) =>
    !f.includes("node_modules") &&
    !f.includes(".git") &&
    !f.includes("dist") &&
    !f.includes("build")
);

console.log(`📁 Found ${files.length} source files to analyze\n`);

if (files.length === 0) {
  console.log("❌ No source files found in target directory");
  process.exit(1);
}

// Step 2: Identify heuristic patterns (deterministic)
const heuristicPatterns = [
  /if\s*\([^)]*\.length\s*[<>]\s*\d+/g, // Length-based heuristics
  /if\s*\([^)]*\.includes\(['"]\w+['"]\)/g, // Simple keyword matching
  /score\s*[+\-*/]=|score\s*=.*[+\-*/]/g, // Score calculations
  /weight\s*\*|priority\s*\*/g, // Weighted scoring
  /threshold\s*=\s*\d+\.?\d*/g, // Hard-coded thresholds
  /complexity\s*[<>=]/g, // Complexity checks
  /switch\s*\([^)]*\)\s*{[\s\S]*?case/g, // Large switch statements (potential rules)
];

interface LegacyCandidate {
  file: string;
  lineNumber: number;
  code: string;
  context: string;
  pattern: string;
}

const candidates: LegacyCandidate[] = [];

for (const file of files) {
  const filePath = `${targetDir}/${file}`;
  try {
    const content = await Bun.file(filePath).text();
    const lines = content.split("\n");

    for (const [idx, line] of lines.entries()) {
      for (const pattern of heuristicPatterns) {
        if (pattern.test(line)) {
          // Get surrounding context (5 lines before and after)
          const startLine = Math.max(0, idx - 5);
          const endLine = Math.min(lines.length, idx + 6);
          const context = lines.slice(startLine, endLine).join("\n");

          candidates.push({
            file,
            lineNumber: idx + 1,
            code: line.trim(),
            context,
            pattern: pattern.source,
          });
        }
      }
    }
  } catch (err) {
    console.error(`⚠️  Error reading ${file}:`, err);
  }
}

console.log(`🎯 Found ${candidates.length} potential heuristic patterns\n`);

if (candidates.length === 0) {
  console.log("✅ No legacy heuristic code detected!");
  process.exit(0);
}

// Step 3: Use LLM to analyze if these are truly legacy heuristics
console.log("🤖 Analyzing candidates with LLM intelligence...\n");

const AnalysisSchema = z.object({
  legacyItems: z.array(
    z.object({
      file: z.string(),
      lineNumber: z.number(),
      isLegacy: z.boolean(),
      confidence: z.enum(["high", "medium", "low"]),
      reason: z.string(),
      modernAlternative: z.string().optional(),
      removalStrategy: z.enum(["delete", "replace", "refactor", "keep"]),
    })
  ),
  summary: z.string(),
});

const analysis = await intelligenceWithSchema(
  `Analyze these code patterns to determine if they are legacy heuristic-based logic that could be replaced with modern LLM-based approaches. Consider:
  
  - Is this simple rule-based logic that requires manual tuning?
  - Could this decision-making benefit from natural language understanding?
  - Is this a hard-coded threshold or scoring system?
  - Would an LLM provide more flexible and accurate results?
  
  Only mark as legacy if there's a clear modern alternative using LLMs.`,
  AnalysisSchema,
  {
    candidates: JSON.stringify(
      candidates.slice(0, 50).map((c) => ({
        file: c.file,
        lineNumber: c.lineNumber,
        code: c.code,
        context: c.context.slice(0, 500), // Limit context to avoid token overflow
      })),
      null,
      2
    ),
  }
);

// Step 4: Report findings
console.log("📊 ANALYSIS RESULTS\n");
console.log("=".repeat(80));
console.log(analysis.summary);
console.log("=".repeat(80) + "\n");

const legacyByConfidence = {
  high: analysis.legacyItems.filter((item) => item.isLegacy && item.confidence === "high"),
  medium: analysis.legacyItems.filter((item) => item.isLegacy && item.confidence === "medium"),
  low: analysis.legacyItems.filter((item) => item.isLegacy && item.confidence === "low"),
};

for (const [level, items] of Object.entries(legacyByConfidence)) {
  if (items.length > 0) {
    console.log(`\n${{ high: "🔴", medium: "🟡", low: "🟢" }[level]} ${level.toUpperCase()} CONFIDENCE (${items.length} items):\n`);

    for (const item of items) {
      console.log(`📄 ${item.file}:${item.lineNumber}`);
      console.log(`   Reason: ${item.reason}`);
      if (item.modernAlternative) {
        console.log(`   💡 Modern approach: ${item.modernAlternative}`);
      }
      console.log(`   Strategy: ${item.removalStrategy}`);
      console.log();
    }
  }
}

// Step 5: Perform removals if requested
const itemsToRemove = analysis.legacyItems.filter(
  (item) => item.isLegacy && item.removalStrategy === "delete" && item.confidence === "high"
);

if (itemsToRemove.length > 0) {
  console.log(`\n🗑️  ${itemsToRemove.length} items recommended for removal\n`);

  if (autoRemove && !dryRun) {
    console.log("⚠️  AUTO-REMOVE MODE: Removing legacy code...\n");

    // Group by file for efficient processing
    const fileGroups = new Map<string, typeof itemsToRemove>();
    for (const item of itemsToRemove) {
      if (!fileGroups.has(item.file)) {
        fileGroups.set(item.file, []);
      }
      fileGroups.get(item.file)!.push(item);
    }

    for (const [file, items] of fileGroups) {
      const filePath = `${targetDir}/${file}`;
      try {
        const content = await Bun.file(filePath).text();
        const lines = content.split("\n");

        // Sort by line number descending to avoid index shifts
        items.sort((a, b) => b.lineNumber - a.lineNumber);

        for (const item of items) {
          // Remove the line (array is 0-indexed, lineNumber is 1-indexed)
          lines.splice(item.lineNumber - 1, 1);
        }

        await Bun.write(filePath, lines.join("\n"));
        console.log(`✅ Removed ${items.length} line(s) from ${file}`);
      } catch (err) {
        console.error(`❌ Error modifying ${file}:`, err);
      }
    }

    console.log("\n✨ Legacy code removal complete!");
  } else if (dryRun) {
    console.log("🔍 DRY RUN MODE: No changes made. Remove --dry-run to apply changes.");
  } else {
    console.log("💡 Run with --auto-remove to automatically remove high-confidence legacy code.");
    console.log("⚠️  WARNING: Always review changes and have backups before using --auto-remove!");
  }
}

// Step 6: Actionable next steps
console.log("\n📋 RECOMMENDED NEXT STEPS:\n");

const itemsToReplace = analysis.legacyItems.filter((item) => item.removalStrategy === "replace");
const itemsToRefactor = analysis.legacyItems.filter((item) => item.removalStrategy === "refactor");

if (itemsToReplace.length > 0) {
  console.log(`🔄 ${itemsToReplace.length} items should be REPLACED with LLM calls`);
  console.log("   Consider using intelligence() or intelligenceWithSchema() functions\n");
}

if (itemsToRefactor.length > 0) {
  console.log(`🔧 ${itemsToRefactor.length} items need REFACTORING`);
  console.log("   These require architectural changes to integrate LLM capabilities\n");
}

if (autoRemove && !dryRun && itemsToRemove.length > 0) {
  console.log("🧪 Run your test suite to ensure nothing broke:");
  console.log("   bun test");
  console.log("\n📝 Consider committing these changes:");
  console.log("   git add -A && git commit -m 'refactor: remove legacy heuristic code'\n");
}

const totalLegacy = analysis.legacyItems.filter((item) => item.isLegacy).length;
console.log(`\n📈 SUMMARY: ${totalLegacy}/${candidates.length} patterns identified as legacy heuristics`);