#!/usr/bin/env bun

/**
 * remove-deprecated-heuristics - Systematically identify and remove deprecated heuristic-based code
 * that has been superseded by LLM-based implementations
 */

import { parseArgs } from "util";
import { join, relative, dirname } from "path";
import { existsSync, statSync } from "fs";

interface DeprecatedPattern {
  name: string;
  patterns: string[];
  context: string[];
  replacement?: string;
}

// Common patterns that indicate deprecated heuristic code
const DEPRECATED_PATTERNS: DeprecatedPattern[] = [
  {
    name: "Heuristic function definitions",
    patterns: [
      /function\s+.*heuristic/i,
      /const\s+.*heuristic\s*=/i,
      /class\s+.*heuristic/i,
    ],
    context: ["@deprecated", "// TODO: replace with LLM", "legacy"],
  },
  {
    name: "Pattern matching logic",
    patterns: [
      /\/\*\*?\s*heuristic/i,
      /\/\/.*heuristic.*deprecated/i,
      /\/\/.*replace.*with.*llm/i,
    ],
    context: ["pattern", "match", "rule-based"],
  },
  {
    name: "Rule-based implementations",
    patterns: [
      /rule-?based/i,
      /pattern-?based/i,
      /heuristic-?based/i,
    ],
    context: ["@deprecated", "superseded", "replaced"],
  },
];

interface Finding {
  file: string;
  line: number;
  content: string;
  pattern: string;
  severity: "high" | "medium" | "low";
  hasLLMReplacement: boolean;
}

interface RemovalCandidate {
  file: string;
  startLine: number;
  endLine: number;
  reason: string;
  content: string;
}

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message: string, color?: keyof typeof colors) {
  const colorCode = color ? colors[color] : "";
  console.log(`${colorCode}${message}${colors.reset}`);
}

async function findSourceFiles(targetDir: string): Promise<string[]> {
  const extensions = [".ts", ".tsx", ".js", ".jsx"];
  const files: string[] = [];

  const glob = new Bun.Glob("**/*{.ts,.tsx,.js,.jsx}");
  
  for await (const file of glob.scan({ cwd: targetDir, dot: false })) {
    const fullPath = join(targetDir, file);
    
    // Skip node_modules, dist, build, etc.
    if (
      file.includes("node_modules") ||
      file.includes("/dist/") ||
      file.includes("/build/") ||
      file.includes("/.next/") ||
      file.includes("/coverage/")
    ) {
      continue;
    }
    
    files.push(fullPath);
  }

  return files;
}

async function analyzeFile(filePath: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  
  try {
    const file = Bun.file(filePath);
    const content = await file.text();
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for deprecated patterns
      for (const pattern of DEPRECATED_PATTERNS) {
        for (const regex of pattern.patterns) {
          if (regex.test(line)) {
            // Check surrounding context for confirmation
            const contextWindow = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 4)).join("\n");
            const hasContext = pattern.context.some(ctx => 
              contextWindow.toLowerCase().includes(ctx.toLowerCase())
            );

            // Check if there's mention of LLM replacement
            const hasLLMReplacement = /llm|language model|gpt|claude|ai-based/i.test(contextWindow);

            const severity = hasContext && line.includes("@deprecated") ? "high" :
                           hasContext ? "medium" : "low";

            findings.push({
              file: filePath,
              line: lineNum,
              content: line.trim(),
              pattern: pattern.name,
              severity,
              hasLLMReplacement,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error analyzing ${filePath}: ${error}`);
  }

  return findings;
}

function identifyRemovalCandidates(findings: Finding[]): RemovalCandidate[] {
  const candidates: RemovalCandidate[] = [];
  const fileGroups = new Map<string, Finding[]>();

  // Group findings by file
  for (const finding of findings) {
    if (!fileGroups.has(finding.file)) {
      fileGroups.set(finding.file, []);
    }
    fileGroups.get(finding.file)!.push(finding);
  }

  // For each file, identify removal candidates
  for (const [file, fileFindings] of fileGroups) {
    // High severity findings with LLM replacements are strong candidates
    const highPriority = fileFindings.filter(
      f => f.severity === "high" && f.hasLLMReplacement
    );

    for (const finding of highPriority) {
      candidates.push({
        file,
        startLine: finding.line,
        endLine: finding.line, // Will expand this with actual analysis
        reason: `Deprecated ${finding.pattern} with LLM replacement available`,
        content: finding.content,
      });
    }
  }

  return candidates;
}

async function expandRemovalBlock(
  filePath: string,
  lineNum: number
): Promise<{ start: number; end: number; content: string }> {
  const file = Bun.file(filePath);
  const content = await file.text();
  const lines = content.split("\n");

  let start = lineNum - 1;
  let end = lineNum - 1;

  // Find the start of the function/class/block
  while (start > 0) {
    const line = lines[start - 1].trim();
    if (
      line.startsWith("export") ||
      line.startsWith("function") ||
      line.startsWith("class") ||
      line.startsWith("const") ||
      line.startsWith("let") ||
      line.startsWith("var") ||
      /^\/\*\*/.test(line) // JSDoc comment
    ) {
      start--;
    } else {
      break;
    }
  }

  // Find the end of the function/class/block
  let braceCount = 0;
  let foundStart = false;
  
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    for (const char of line) {
      if (char === "{") {
        braceCount++;
        foundStart = true;
      } else if (char === "}") {
        braceCount--;
      }
    }
    
    if (foundStart && braceCount === 0) {
      end = i;
      break;
    }
  }

  const blockContent = lines.slice(start, end + 1).join("\n");
  
  return {
    start: start + 1,
    end: end + 1,
    content: blockContent,
  };
}

async function removeDeprecatedCode(
  candidates: RemovalCandidate[],
  dryRun: boolean
): Promise<void> {
  const fileGroups = new Map<string, RemovalCandidate[]>();

  for (const candidate of candidates) {
    if (!fileGroups.has(candidate.file)) {
      fileGroups.set(candidate.file, []);
    }
    fileGroups.get(candidate.file)!.push(candidate);
  }

  for (const [file, fileCandidates] of fileGroups) {
    const fileContent = await Bun.file(file).text();
    const lines = fileContent.split("\n");

    // Expand each candidate to full block
    const expandedCandidates = await Promise.all(
      fileCandidates.map(async c => {
        const block = await expandRemovalBlock(file, c.startLine);
        return { ...c, ...block };
      })
    );

    // Sort by start line descending to remove from bottom up
    expandedCandidates.sort((a, b) => b.startLine - a.startLine);

    let newLines = [...lines];

    for (const candidate of expandedCandidates) {
      log(`\n${relative(process.cwd(), file)}:${candidate.startLine}-${candidate.endLine}`, "cyan");
      log(`Reason: ${candidate.reason}`, "yellow");
      log("Code to remove:", "red");
      console.log(candidate.content);

      if (!dryRun) {
        // Remove the lines
        newLines.splice(candidate.startLine - 1, candidate.endLine - candidate.startLine + 1);
      }
    }

    if (!dryRun && expandedCandidates.length > 0) {
      await Bun.write(file, newLines.join("\n"));
      log(`✓ Removed ${expandedCandidates.length} deprecated block(s) from ${relative(process.cwd(), file)}`, "green");
    }
  }
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      dir: { type: "string", short: "d" },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h" },
      interactive: { type: "boolean", short: "i", default: false },
    },
  });

  if (values.help) {
    console.log(`
${colors.bright}remove-deprecated-heuristics${colors.reset}

Systematically identify and remove deprecated heuristic-based code that has been
superseded by LLM-based implementations.

${colors.bright}Usage:${colors.reset}
  remove-deprecated-heuristics [options] [directory]

${colors.bright}Options:${colors.reset}
  -d, --dir <path>      Target directory (default: current directory)
  --dry-run             Show what would be removed without making changes
  -i, --interactive     Prompt before removing each block
  -h, --help            Show this help message

${colors.bright}Examples:${colors.reset}
  remove-deprecated-heuristics --dry-run
  remove-deprecated-heuristics --dir ./src
  remove-deprecated-heuristics --interactive
    `);
    process.exit(0);
  }

  const targetDir = (values.dir as string) || process.argv[2] || process.cwd();
  const dryRun = values["dry-run"] as boolean;
  const interactive = values.interactive as boolean;

  if (!existsSync(targetDir)) {
    log(`Error: Directory '${targetDir}' does not exist`, "red");
    process.exit(1);
  }

  if (!statSync(targetDir).isDirectory()) {
    log(`Error: '${targetDir}' is not a directory`, "red");
    process.exit(1);
  }

  log(`\n🔍 Scanning for deprecated heuristic code in: ${targetDir}`, "bright");
  
  if (dryRun) {
    log("(Dry run mode - no changes will be made)\n", "yellow");
  }

  // Find all source files
  log("Finding source files...", "blue");
  const files = await findSourceFiles(targetDir);
  log(`Found ${files.length} source files\n`, "green");

  // Analyze each file
  log("Analyzing files for deprecated patterns...", "blue");
  const allFindings: Finding[] = [];
  
  for (const file of files) {
    const findings = await analyzeFile(file);
    allFindings.push(...findings);
  }

  if (allFindings.length === 0) {
    log("✓ No deprecated heuristic code found!", "green");
    process.exit(0);
  }

  log(`\nFound ${allFindings.length} potential deprecated code locations:\n`, "yellow");

  // Group by severity
  const bySeverity = {
    high: allFindings.filter(f => f.severity === "high"),
    medium: allFindings.filter(f => f.severity === "medium"),
    low: allFindings.filter(f => f.severity === "low"),
  };

  log(`  High priority:   ${bySeverity.high.length}`, "red");
  log(`  Medium priority: ${bySeverity.medium.length}`, "yellow");
  log(`  Low priority:    ${bySeverity.low.length}\n`, "blue");

  // Identify removal candidates
  const candidates = identifyRemovalCandidates(allFindings);

  if (candidates.length === 0) {
    log("No strong removal candidates identified.", "yellow");
    log("Consider reviewing medium/low priority findings manually.", "blue");
    
    // Show findings for manual review
    log("\n📋 Findings for manual review:", "cyan");
    for (const finding of allFindings) {
      log(`\n${relative(process.cwd(), finding.file)}:${finding.line}`, "cyan");
      log(`  Pattern: ${finding.pattern}`, "blue");
      log(`  Severity: ${finding.severity}`, "yellow");
      log(`  Code: ${finding.content}`, "reset");
    }
    
    process.exit(0);
  }

  log(`\n🎯 Identified ${candidates.length} strong removal candidates\n`, "bright");

  // Remove deprecated code
  if (interactive) {
    log("Interactive mode not yet implemented. Use --dry-run to preview changes.", "yellow");
    process.exit(0);
  }

  await removeDeprecatedCode(candidates, dryRun);

  if (dryRun) {
    log("\n💡 Run without --dry-run to apply these changes", "cyan");
  } else {
    log("\n✓ Successfully removed deprecated heuristic code!", "green");
    log("\n⚠️  Remember to:", "yellow");
    log("  1. Review the changes with git diff", "reset");
    log("  2. Run tests to ensure nothing broke", "reset");
    log("  3. Update any imports/references", "reset");
  }
}

main().catch((error) => {
  log(`\n❌ Error: ${error.message}`, "red");
  console.error(error);
  process.exit(1);
});
