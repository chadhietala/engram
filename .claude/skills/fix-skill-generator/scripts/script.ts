#!/usr/bin/env bun

/**
 * fix-skill-generator - Validates and fixes skill generation logic
 * 
 * This tool scans skill generation code, identifies validation issues,
 * and suggests or applies fixes to ensure generated skills are valid.
 */

import { parseArgs } from "util";
import { intelligence, intelligenceWithSchema, z } from "engram/skill-runtime";

const HELP = `
fix-skill-generator - Validate and fix skill generation logic

USAGE:
  fix-skill-generator [options] [directory]

OPTIONS:
  --help              Show this help message
  --check-only        Only validate, don't suggest fixes
  --auto-fix          Automatically apply fixes (default: suggest only)
  --verbose           Show detailed analysis

ARGUMENTS:
  directory           Directory to scan (default: current directory)

EXAMPLES:
  fix-skill-generator                    # Validate current directory
  fix-skill-generator --check-only src   # Check src/ without fixes
  fix-skill-generator --auto-fix         # Validate and auto-apply fixes
`;

interface SkillFile {
  path: string;
  content: string;
  issues: ValidationIssue[];
}

interface ValidationIssue {
  type: "missing-field" | "invalid-schema" | "logic-error" | "runtime-error";
  severity: "error" | "warning";
  message: string;
  line?: number;
}

const FixSuggestionSchema = z.object({
  canAutoFix: z.boolean(),
  explanation: z.string(),
  suggestedFix: z.string().optional(),
  modifiedContent: z.string().optional(),
});

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      help: { type: "boolean" },
      "check-only": { type: "boolean" },
      "auto-fix": { type: "boolean" },
      verbose: { type: "boolean" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }

  const targetDir = positionals[0] || process.cwd();
  const checkOnly = values["check-only"] || false;
  const autoFix = values["auto-fix"] || false;
  const verbose = values.verbose || false;

  console.log("🔍 Scanning for skill generation code...\n");

  // Find skill-related TypeScript files
  const glob = new Bun.Glob("**/*.{ts,js}");
  const allFiles = Array.from(glob.scanSync({ cwd: targetDir }));
  
  const skillFiles: string[] = [];
  for (const file of allFiles) {
    if (file.includes("node_modules") || file.includes(".git")) continue;
    
    const content = await Bun.file(`${targetDir}/${file}`).text();
    // Look for skill generation patterns
    if (
      content.includes("skill") &&
      (content.includes("generate") || 
       content.includes("validation") || 
       content.includes("schema") ||
       content.includes("export"))
    ) {
      skillFiles.push(file);
    }
  }

  if (skillFiles.length === 0) {
    console.log("⚠️  No skill generation files found");
    process.exit(0);
  }

  console.log(`📁 Found ${skillFiles.length} skill-related files:\n`);

  const results: SkillFile[] = [];

  // Validate each file
  for (const file of skillFiles) {
    const fullPath = `${targetDir}/${file}`;
    const content = await Bun.file(fullPath).text();
    const issues = await validateSkillFile(content, verbose);

    results.push({ path: file, content, issues });

    const errorCount = issues.filter(i => i.severity === "error").length;
    const warningCount = issues.filter(i => i.severity === "warning").length;

    if (issues.length === 0) {
      console.log(`  ✅ ${file} - No issues`);
    } else {
      console.log(`  ⚠️  ${file} - ${errorCount} errors, ${warningCount} warnings`);
      if (verbose) {
        issues.forEach(issue => {
          const icon = issue.severity === "error" ? "❌" : "⚠️ ";
          console.log(`      ${icon} ${issue.message}${issue.line ? ` (line ${issue.line})` : ""}`);
        });
      }
    }
  }

  console.log();

  const filesWithIssues = results.filter(f => f.issues.length > 0);
  
  if (filesWithIssues.length === 0) {
    console.log("✨ All skill generation files are valid!\n");
    process.exit(0);
  }

  console.log(`\n📋 Summary: ${filesWithIssues.length} files need attention\n`);

  if (checkOnly) {
    console.log("🔍 Check-only mode: exiting without fixes\n");
    process.exit(filesWithIssues.length > 0 ? 1 : 0);
  }

  // Generate fixes using intelligence
  console.log("🤖 Analyzing issues and generating fixes...\n");

  for (const fileResult of filesWithIssues) {
    console.log(`\n📝 ${fileResult.path}:\n`);

    for (const issue of fileResult.issues) {
      console.log(`  ${issue.severity === "error" ? "❌" : "⚠️ "} ${issue.message}`);

      // Use intelligence to suggest fixes
      const fixAnalysis = await intelligenceWithSchema(
        `Analyze this validation issue in skill generation code and suggest a fix.
        
Issue: ${issue.message}
Type: ${issue.type}
Severity: ${issue.severity}

File content (relevant section):
${getRelevantSection(fileResult.content, issue.line)}

Determine if this can be automatically fixed and provide a fix if possible.`,
        FixSuggestionSchema,
        {
          issueType: issue.type,
          fileContent: fileResult.content,
        }
      );

      console.log(`\n    💡 ${fixAnalysis.explanation}\n`);

      if (fixAnalysis.canAutoFix && fixAnalysis.suggestedFix) {
        console.log(`    🔧 Suggested fix:\n`);
        console.log(indentCode(fixAnalysis.suggestedFix));

        if (autoFix && fixAnalysis.modifiedContent) {
          console.log(`\n    ✨ Applying fix...`);
          await Bun.write(`${targetDir}/${fileResult.path}`, fixAnalysis.modifiedContent);
          console.log(`    ✅ Fix applied to ${fileResult.path}`);
        } else if (!autoFix) {
          console.log(`\n    ℹ️  Run with --auto-fix to apply this fix automatically`);
        }
      } else {
        console.log(`    ℹ️  Manual intervention required`);
      }
    }
  }

  console.log("\n\n📊 Final Report:\n");
  const totalIssues = results.reduce((sum, f) => sum + f.issues.length, 0);
  const totalErrors = results.reduce((sum, f) => sum + f.issues.filter(i => i.severity === "error").length, 0);
  const totalWarnings = results.reduce((sum, f) => sum + f.issues.filter(i => i.severity === "warning").length, 0);

  console.log(`  Total files scanned: ${results.length}`);
  console.log(`  Files with issues: ${filesWithIssues.length}`);
  console.log(`  Total errors: ${totalErrors}`);
  console.log(`  Total warnings: ${totalWarnings}`);

  if (autoFix) {
    console.log(`\n  ✅ Auto-fix mode: fixes have been applied`);
    console.log(`  ⚠️  Please review changes and test thoroughly\n`);
  }
}

async function validateSkillFile(content: string, verbose: boolean): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  // Check for common validation issues (deterministic)
  const lines = content.split("\n");

  // Check 1: Missing required exports
  const hasExport = content.includes("export");
  if (!hasExport) {
    issues.push({
      type: "missing-field",
      severity: "warning",
      message: "No exports found - skill may not be usable",
    });
  }

  // Check 2: Schema validation
  if (content.includes("schema") || content.includes("Schema")) {
    const hasZod = content.includes("import") && content.includes("zod");
    const hasTypeValidation = content.includes("z.object") || content.includes("z.string");
    
    if (!hasZod && hasTypeValidation) {
      issues.push({
        type: "invalid-schema",
        severity: "error",
        message: "Schema validation used but zod not imported",
      });
    }
  }

  // Check 3: Error handling
  const hasTryCatch = content.includes("try") && content.includes("catch");
  const hasAsyncFunction = /async\s+function/.test(content) || /async\s+\(/.test(content);
  
  if (hasAsyncFunction && !hasTryCatch && !content.includes("throw")) {
    issues.push({
      type: "runtime-error",
      severity: "warning",
      message: "Async functions without error handling detected",
    });
  }

  // Check 4: Skill runtime imports
  if (content.includes("intelligence") && !content.includes("engram/skill-runtime")) {
    issues.push({
      type: "logic-error",
      severity: "error",
      message: "Using intelligence() without importing from engram/skill-runtime",
    });
  }

  // Check 5: Validation logic patterns
  const validationPatterns = [
    { pattern: /validate(?!d)/i, issue: "Validation function may be incomplete" },
    { pattern: /\brequired\b.*\bundefined\b/i, issue: "Required field may allow undefined" },
  ];

  for (const { pattern, issue } of validationPatterns) {
    if (pattern.test(content)) {
      lines.forEach((line, idx) => {
        if (pattern.test(line)) {
          issues.push({
            type: "logic-error",
            severity: "warning",
            message: issue,
            line: idx + 1,
          });
        }
      });
    }
  }

  return issues;
}

function getRelevantSection(content: string, line?: number): string {
  if (!line) return content.slice(0, 500);
  
  const lines = content.split("\n");
  const start = Math.max(0, line - 5);
  const end = Math.min(lines.length, line + 5);
  
  return lines.slice(start, end).join("\n");
}

function indentCode(code: string): string {
  return code.split("\n").map(line => `      ${line}`).join("\n");
}

// Run the tool
main().catch(err => {
  console.error("❌ Error:", err.message);
  if (err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});