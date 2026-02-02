#!/usr/bin/env bun

import { parseArgs } from "util";
import { intelligence, decide } from "engram/skill-runtime";

const args = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    dryRun: { type: "boolean", short: "d", default: false },
    pattern: { type: "string", short: "p", default: "**/*.{ts,tsx,js,jsx}" },
    interactive: { type: "boolean", short: "i", default: false },
  },
  allowPositionals: true,
});

if (args.values.help) {
  console.log(`
🧹 Remove Deprecated Heuristics

Systematically finds and removes outdated heuristic-based code that has been
replaced by modern LLM-based implementations.

Usage:
  remove-deprecated-heuristics [directory] [options]

Arguments:
  directory           Target directory to scan (default: current directory)

Options:
  -h, --help         Show this help message
  -d, --dry-run      Show what would be removed without making changes
  -p, --pattern      File pattern to search (default: **/*.{ts,tsx,js,jsx})
  -i, --interactive  Ask before removing each instance

Examples:
  remove-deprecated-heuristics ./src
  remove-deprecated-heuristics --dry-run
  remove-deprecated-heuristics --pattern "**/*.ts" --interactive
`);
  process.exit(0);
}

const targetDir = args.positionals[0] || process.cwd();
const isDryRun = args.values.dryRun;
const isInteractive = args.values.interactive;
const pattern = args.values.pattern as string;

console.log("🔍 Scanning for deprecated heuristic code...\n");

// Phase 1: Discover files
const glob = new Bun.Glob(pattern);
const files = Array.from(glob.scanSync({ cwd: targetDir, absolute: true }));

console.log(`📁 Found ${files.length} files to analyze\n`);

if (files.length === 0) {
  console.log("✨ No files found matching pattern");
  process.exit(0);
}

// Heuristic indicators to search for
const heuristicIndicators = [
  /\/\/.*heuristic/i,
  /\/\*.*heuristic.*\*\//i,
  /function.*heuristic/i,
  /const.*heuristic/i,
  /class.*Heuristic/,
  /@deprecated.*heuristic/i,
  /\/\/.*TODO.*replace.*LLM/i,
  /\/\/.*FIXME.*migrate.*LLM/i,
  /\/\/.*old.*logic/i,
  /calculateScore|matchScore|similarityScore/,
];

interface HeuristicInstance {
  file: string;
  lineNumber: number;
  line: string;
  context: string[];
  isDeprecated: boolean;
  reason: string;
}

const findings: HeuristicInstance[] = [];

// Phase 2: Read and analyze files in parallel (batched for performance)
const BATCH_SIZE = 10;
for (let i = 0; i < files.length; i += BATCH_SIZE) {
  const batch = files.slice(i, i + BATCH_SIZE);
  
  await Promise.all(
    batch.map(async (file) => {
      try {
        const content = await Bun.file(file).text();
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Check if line matches any heuristic indicator
          const matches = heuristicIndicators.some(regex => regex.test(line));
          
          if (matches) {
            // Gather context (5 lines before and after)
            const contextStart = Math.max(0, i - 5);
            const contextEnd = Math.min(lines.length, i + 6);
            const context = lines.slice(contextStart, contextEnd);

            findings.push({
              file: file.replace(targetDir + "/", ""),
              lineNumber: i + 1,
              line: line.trim(),
              context,
              isDeprecated: false, // Will be determined by LLM
              reason: "",
            });
          }
        }
      } catch (error) {
        console.error(`⚠️  Error reading ${file}: ${error}`);
      }
    })
  );
}

console.log(`🎯 Found ${findings.length} potential heuristic instances\n`);

if (findings.length === 0) {
  console.log("✨ No deprecated heuristics found!");
  process.exit(0);
}

// Phase 3: Use LLM to analyze each finding
console.log("🤖 Analyzing findings with AI...\n");

interface AnalysisResult {
  isDeprecated: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
  suggestion: string;
}

const analyzed: (HeuristicInstance & AnalysisResult)[] = [];

for (const finding of findings) {
  try {
    const analysis = await intelligence(
      `Analyze this code snippet to determine if it contains deprecated heuristic logic that should be replaced with LLM-based implementation.

Code context:
${finding.context.join("\n")}

Respond with JSON containing:
- isDeprecated (boolean): true if this is outdated heuristic code
- confidence (string): "high", "medium", or "low"
- reason (string): brief explanation
- suggestion (string): what should replace it

Focus on:
1. Explicit comments mentioning "heuristic", "deprecated", or "TODO: replace with LLM"
2. Score calculation functions that could be replaced by semantic understanding
3. Rule-based logic that could be better handled by AI
4. Pattern matching that could be replaced by natural language processing`,
      {
        file: finding.file,
        line: finding.line,
      }
    );

    // Parse the LLM response
    let result: AnalysisResult;
    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback parsing
        result = {
          isDeprecated: analysis.toLowerCase().includes("true") || analysis.toLowerCase().includes("deprecated"),
          confidence: "low",
          reason: "Could not parse full analysis",
          suggestion: "Manual review recommended",
        };
      }
    } catch {
      result = {
        isDeprecated: false,
        confidence: "low",
        reason: "Analysis parsing failed",
        suggestion: "Manual review required",
      };
    }

    if (result.isDeprecated && result.confidence !== "low") {
      analyzed.push({ ...finding, ...result });
    }
  } catch (error) {
    console.error(`⚠️  Error analyzing finding: ${error}`);
  }
}

console.log(`\n📊 Analysis Results:\n`);
console.log(`   Total instances found: ${findings.length}`);
console.log(`   Deprecated heuristics: ${analyzed.length}`);
console.log(`   High confidence: ${analyzed.filter(a => a.confidence === "high").length}`);
console.log(`   Medium confidence: ${analyzed.filter(a => a.confidence === "medium").length}`);
console.log(`\n${"=".repeat(80)}\n`);

// Phase 4: Display findings
const byFile = analyzed.reduce((acc, item) => {
  if (!acc[item.file]) acc[item.file] = [];
  acc[item.file].push(item);
  return acc;
}, {} as Record<string, typeof analyzed>);

for (const [file, instances] of Object.entries(byFile)) {
  console.log(`📄 ${file}`);
  console.log(`   ${instances.length} deprecated heuristic${instances.length > 1 ? "s" : ""} found\n`);
  
  for (const instance of instances) {
    const confidenceEmoji = instance.confidence === "high" ? "🔴" : "🟡";
    console.log(`   ${confidenceEmoji} Line ${instance.lineNumber} [${instance.confidence} confidence]`);
    console.log(`      Code: ${instance.line}`);
    console.log(`      Reason: ${instance.reason}`);
    console.log(`      💡 Suggestion: ${instance.suggestion}`);
    console.log();
  }
  console.log();
}

// Phase 5: Take action (if not dry-run)
if (!isDryRun && analyzed.length > 0) {
  const shouldProceed = isInteractive
    ? await decide(
        "Would you like to create a TODO file with all findings for manual review?",
        { count: analyzed.length }
      )
    : true;

  if (shouldProceed) {
    // Generate a detailed report file
    const reportContent = `# Deprecated Heuristics Report
Generated: ${new Date().toISOString()}

## Summary
- Total files scanned: ${files.length}
- Deprecated heuristics found: ${analyzed.length}
- High confidence: ${analyzed.filter(a => a.confidence === "high").length}
- Medium confidence: ${analyzed.filter(a => a.confidence === "medium").length}

## Findings by File

${Object.entries(byFile)
  .map(
    ([file, instances]) => `
### ${file}

${instances
  .map(
    (inst) => `
#### Line ${inst.lineNumber} [${inst.confidence.toUpperCase()} confidence]

\`\`\`
${inst.line}
\`\`\`

**Reason:** ${inst.reason}

**Suggestion:** ${inst.suggestion}

**Context:**
\`\`\`
${inst.context.join("\n")}
\`\`\`
`
  )
  .join("\n")}
`
  )
  .join("\n")}

## Next Steps

1. Review each high-confidence finding
2. Plan LLM-based replacement implementations
3. Write tests for new LLM-based logic
4. Gradually migrate from heuristics to LLM calls
5. Monitor performance and accuracy improvements
`;

    const reportPath = `${targetDir}/DEPRECATED_HEURISTICS_REPORT.md`;
    await Bun.write(reportPath, reportContent);
    console.log(`\n✅ Report written to: ${reportPath.replace(targetDir + "/", "")}`);
  }
} else if (isDryRun) {
  console.log("🔍 Dry-run mode: No changes made");
  console.log("💡 Run without --dry-run to generate a detailed report file");
} else {
  console.log("✨ No deprecated heuristics to remove!");
}

console.log("\n✨ Done!\n");