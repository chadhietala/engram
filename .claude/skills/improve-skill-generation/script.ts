#!/usr/bin/env bun

import { readdir, stat } from "fs/promises";
import { join, relative, extname, basename } from "path";

interface HeuristicPattern {
  file: string;
  line: number;
  pattern: string;
  context: string;
  type: "hardcoded-path" | "magic-string" | "repeated-logic" | "obsolete-check";
}

interface RefactoringOpportunity {
  category: string;
  occurrences: HeuristicPattern[];
  suggestion: string;
  impact: "high" | "medium" | "low";
}

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
};

async function findCodeGenerationFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const ignorePatterns = ["node_modules", ".git", "dist", "build", ".next", "coverage"];

  async function traverse(currentDir: string) {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          if (!ignorePatterns.some((p) => entry.name.includes(p))) {
            await traverse(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name);
          const name = basename(entry.name).toLowerCase();

          // Focus on files likely involved in code generation
          if (
            [".ts", ".js", ".tsx", ".jsx"].includes(ext) &&
            (name.includes("generat") ||
              name.includes("scaffold") ||
              name.includes("template") ||
              name.includes("builder") ||
              name.includes("transform") ||
              name.includes("compiler") ||
              name.includes("skill"))
          ) {
            files.push(fullPath);
          }
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }

  await traverse(dir);
  return files;
}

async function analyzeFile(filePath: string, baseDir: string): Promise<HeuristicPattern[]> {
  const patterns: HeuristicPattern[] = [];

  try {
    const content = await Bun.file(filePath).text();
    const lines = content.split("\n");
    const relPath = relative(baseDir, filePath);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Detect hardcoded file paths
      const pathRegex = /['"`](\/[^'"`\s]+\/[^'"`\s]+|[A-Z]:\\[^'"`\s]+)['"`]/g;
      let match;
      while ((match = pathRegex.exec(line)) !== null) {
        if (!line.includes("file_path") && !line.includes("example")) {
          patterns.push({
            file: relPath,
            line: lineNum,
            pattern: match[1],
            context: line.trim(),
            type: "hardcoded-path",
          });
        }
      }

      // Detect magic strings in conditionals
      const magicStringRegex = /if\s*\([^)]*['"`]([^'"`]+)['"`][^)]*\)/g;
      while ((match = magicStringRegex.exec(line)) !== null) {
        if (match[1].length > 2 && !match[1].includes(" ")) {
          patterns.push({
            file: relPath,
            line: lineNum,
            pattern: match[1],
            context: line.trim(),
            type: "magic-string",
          });
        }
      }

      // Detect file extension checks (potential obsolete heuristics)
      if (/\.(endsWith|includes)\s*\(\s*['"`]\.(ts|js|tsx|jsx|json|md)['"`]\s*\)/.test(line)) {
        patterns.push({
          file: relPath,
          line: lineNum,
          pattern: line.match(/['"`]\.(\w+)['"`]/)?.[1] || "",
          context: line.trim(),
          type: "obsolete-check",
        });
      }

      // Detect repeated directory name checks
      if (/\.(includes|indexOf|match)\s*\(\s*['"`](node_modules|dist|build|src)['"`]\s*\)/.test(line)) {
        patterns.push({
          file: relPath,
          line: lineNum,
          pattern: line.match(/['"`](node_modules|dist|build|src)['"`]/)?.[1] || "",
          context: line.trim(),
          type: "repeated-logic",
        });
      }
    }
  } catch (err) {
    console.error(`${colors.red}Error analyzing ${filePath}: ${err}${colors.reset}`);
  }

  return patterns;
}

function groupAndAnalyzePatterns(allPatterns: HeuristicPattern[]): RefactoringOpportunity[] {
  const opportunities: RefactoringOpportunity[] = [];

  // Group hardcoded paths
  const hardcodedPaths = allPatterns.filter((p) => p.type === "hardcoded-path");
  if (hardcodedPaths.length > 0) {
    opportunities.push({
      category: "Hardcoded File Paths",
      occurrences: hardcodedPaths,
      suggestion:
        "Replace hardcoded paths with dynamic path resolution using glob patterns or configuration files",
      impact: "high",
    });
  }

  // Group magic strings by frequency
  const magicStrings = allPatterns.filter((p) => p.type === "magic-string");
  const magicStringCounts = new Map<string, HeuristicPattern[]>();
  for (const pattern of magicStrings) {
    const existing = magicStringCounts.get(pattern.pattern) || [];
    existing.push(pattern);
    magicStringCounts.set(pattern.pattern, existing);
  }

  for (const [str, occurrences] of magicStringCounts.entries()) {
    if (occurrences.length >= 2) {
      opportunities.push({
        category: `Repeated Magic String: "${str}"`,
        occurrences,
        suggestion: `Extract "${str}" into a named constant or configuration`,
        impact: occurrences.length >= 3 ? "high" : "medium",
      });
    }
  }

  // Group file extension checks
  const extensionChecks = allPatterns.filter((p) => p.type === "obsolete-check");
  const extensionGroups = new Map<string, HeuristicPattern[]>();
  for (const pattern of extensionChecks) {
    const existing = extensionGroups.get(pattern.pattern) || [];
    existing.push(pattern);
    extensionGroups.set(pattern.pattern, existing);
  }

  for (const [ext, occurrences] of extensionGroups.entries()) {
    if (occurrences.length >= 2) {
      opportunities.push({
        category: `File Extension Heuristic: .${ext}`,
        occurrences,
        suggestion: `Consider creating a centralized file type registry or using MIME type detection instead of extension checks`,
        impact: "medium",
      });
    }
  }

  // Group repeated directory checks
  const dirChecks = allPatterns.filter((p) => p.type === "repeated-logic");
  const dirGroups = new Map<string, HeuristicPattern[]>();
  for (const pattern of dirChecks) {
    const existing = dirGroups.get(pattern.pattern) || [];
    existing.push(pattern);
    dirGroups.set(pattern.pattern, existing);
  }

  for (const [dir, occurrences] of dirGroups.entries()) {
    if (occurrences.length >= 2) {
      opportunities.push({
        category: `Repeated Directory Check: "${dir}"`,
        occurrences,
        suggestion: `Extract directory ignore/include patterns into a shared configuration array`,
        impact: "medium",
      });
    }
  }

  return opportunities;
}

function generateRefactoringReport(opportunities: RefactoringOpportunity[]): string {
  let report = `\n${colors.bright}${colors.cyan}=== Code Generation Refactoring Analysis ===${colors.reset}\n\n`;

  if (opportunities.length === 0) {
    report += `${colors.green}✓ No obvious refactoring opportunities found!${colors.reset}\n`;
    report += `Your code generation logic appears to be well-abstracted.\n`;
    return report;
  }

  // Sort by impact
  const sorted = opportunities.sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    return impactOrder[a.impact] - impactOrder[b.impact];
  });

  for (const opp of sorted) {
    const impactColor = opp.impact === "high" ? colors.red : opp.impact === "medium" ? colors.yellow : colors.green;
    report += `${colors.bright}${opp.category}${colors.reset}\n`;
    report += `${impactColor}Impact: ${opp.impact.toUpperCase()}${colors.reset}\n`;
    report += `${colors.magenta}Suggestion: ${opp.suggestion}${colors.reset}\n\n`;

    report += `Found in ${opp.occurrences.length} location(s):\n`;
    for (const occurrence of opp.occurrences.slice(0, 5)) {
      report += `  ${colors.cyan}${occurrence.file}:${occurrence.line}${colors.reset}\n`;
      report += `    ${occurrence.context}\n`;
    }

    if (opp.occurrences.length > 5) {
      report += `  ... and ${opp.occurrences.length - 5} more\n`;
    }

    report += "\n";
  }

  // Summary
  const highImpact = sorted.filter((o) => o.impact === "high").length;
  const mediumImpact = sorted.filter((o) => o.impact === "medium").length;

  report += `${colors.bright}Summary:${colors.reset}\n`;
  report += `  Total opportunities: ${opportunities.length}\n`;
  if (highImpact > 0) report += `  ${colors.red}High impact: ${highImpact}${colors.reset}\n`;
  if (mediumImpact > 0) report += `  ${colors.yellow}Medium impact: ${mediumImpact}${colors.reset}\n`;

  return report;
}

async function generateRefactoringScript(
  opportunities: RefactoringOpportunity[],
  baseDir: string
): Promise<string> {
  let script = `#!/usr/bin/env bun\n\n`;
  script += `// Auto-generated refactoring suggestions\n`;
  script += `// Run this script to see specific refactoring recommendations\n\n`;

  for (const opp of opportunities.filter((o) => o.impact === "high")) {
    script += `// ${opp.category}\n`;
    script += `// ${opp.suggestion}\n`;
    script += `// Affected files:\n`;
    for (const occurrence of opp.occurrences) {
      script += `//   - ${occurrence.file}:${occurrence.line}\n`;
    }
    script += `\n`;
  }

  return script;
}

// Main execution
const targetDir = process.argv[2] || process.cwd();

console.log(`${colors.cyan}Analyzing code generation patterns in: ${targetDir}${colors.reset}\n`);

try {
  await stat(targetDir);
} catch {
  console.error(`${colors.red}Error: Directory "${targetDir}" does not exist${colors.reset}`);
  process.exit(1);
}

console.log(`${colors.yellow}Finding code generation files...${colors.reset}`);
const files = await findCodeGenerationFiles(targetDir);

if (files.length === 0) {
  console.log(`${colors.yellow}No code generation files found.${colors.reset}`);
  process.exit(0);
}

console.log(`${colors.green}Found ${files.length} file(s) to analyze${colors.reset}\n`);

console.log(`${colors.yellow}Analyzing patterns...${colors.reset}`);
const allPatterns: HeuristicPattern[] = [];

for (const file of files) {
  const patterns = await analyzeFile(file, targetDir);
  allPatterns.push(...patterns);
}

console.log(`${colors.green}Found ${allPatterns.length} potential heuristic(s)${colors.reset}`);

const opportunities = groupAndAnalyzePatterns(allPatterns);
const report = generateRefactoringReport(opportunities);

console.log(report);

// Optionally generate a refactoring script
if (opportunities.some((o) => o.impact === "high")) {
  const scriptPath = join(targetDir, "refactor-suggestions.ts");
  const script = await generateRefactoringScript(opportunities, targetDir);

  await Bun.write(scriptPath, script);
  console.log(`${colors.green}Generated refactoring script: ${scriptPath}${colors.reset}`);
}

process.exit(0);
