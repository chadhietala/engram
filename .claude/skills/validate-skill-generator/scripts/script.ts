#!/usr/bin/env bun
/**
 * validate-skill-generator - Validates generated skills against specification
 * 
 * Scans skill files and validates their structure, format, and completeness
 * according to the agentskills specification.
 * 
 * Usage: bun validate-skill-generator [skills-directory] [--fix] [--verbose]
 */

import { parseArgs } from "util";
import { intelligence, intelligenceWithSchema, z } from "engram/skill-runtime";

// Parse arguments
const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    fix: { type: "boolean", short: "f" },
    verbose: { type: "boolean", short: "v" },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`
validate-skill-generator - Validates generated skills against specification

Usage: bun validate-skill-generator [skills-directory] [--fix] [--verbose]

Options:
  -h, --help      Show this help message
  -f, --fix       Automatically fix issues where possible
  -v, --verbose   Show detailed validation output

Examples:
  bun validate-skill-generator                    # Validate .claude/skills
  bun validate-skill-generator ./my-skills --fix  # Validate and auto-fix
  bun validate-skill-generator . --verbose        # Detailed output
`);
  process.exit(0);
}

const skillsDir = positionals[0] || "./.claude/skills";
const shouldFix = values.fix || false;
const verbose = values.verbose || false;

interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
  location?: string;
  fixable?: boolean;
}

interface SkillValidationReport {
  filePath: string;
  skillName: string;
  valid: boolean;
  issues: ValidationIssue[];
  content?: string;
}

/**
 * Validate skill name format
 */
function validateSkillName(name: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!name || name.length === 0) {
    issues.push({ severity: "error", message: "Name cannot be empty" });
    return issues;
  }

  if (name.length > 64) {
    issues.push({ severity: "error", message: "Name exceeds 64 characters", fixable: true });
  }

  if (!/^[a-z]/.test(name)) {
    issues.push({ severity: "error", message: "Name must start with lowercase letter", fixable: true });
  }

  if (!/^[a-z0-9-]+$/.test(name)) {
    issues.push({ severity: "error", message: "Name contains invalid characters (only a-z, 0-9, - allowed)", fixable: true });
  }

  if (name.includes("--")) {
    issues.push({ severity: "error", message: "Name contains consecutive hyphens", fixable: true });
  }

  if (name.endsWith("-")) {
    issues.push({ severity: "error", message: "Name ends with hyphen", fixable: true });
  }

  return issues;
}

/**
 * Validate description format
 */
function validateDescription(description: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!description || description.length === 0) {
    issues.push({ severity: "error", message: "Description cannot be empty" });
    return issues;
  }

  if (description.length > 1024) {
    issues.push({ severity: "warning", message: "Description exceeds 1024 characters" });
  }

  if (!/[.!?]$/.test(description.trim())) {
    issues.push({ severity: "warning", message: "Description should end with punctuation", fixable: true });
  }

  return issues;
}

/**
 * Parse frontmatter from skill file
 */
function parseFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatter: Record<string, any> = {};
  const lines = match[1]?.split("\n") || [];

  let currentKey: string | null = null;
  let indent = 0;

  for (const line of lines) {
    const keyMatch = line.match(/^(\s*)([a-zA-Z]+):\s*(.*)$/);
    if (keyMatch) {
      const lineIndent = keyMatch[1]?.length || 0;
      const key = keyMatch[2];
      const value = keyMatch[3];

      if (lineIndent === 0) {
        currentKey = key;
        frontmatter[key] = value || {};
        indent = 0;
      } else if (currentKey && typeof frontmatter[currentKey] === "object") {
        frontmatter[currentKey][key] = value;
      }
    }
  }

  return frontmatter;
}

/**
 * Validate a single skill file
 */
async function validateSkillFile(filePath: string): Promise<SkillValidationReport> {
  const issues: ValidationIssue[] = [];
  let content: string;

  try {
    content = await Bun.file(filePath).text();
  } catch (error) {
    return {
      filePath,
      skillName: "unknown",
      valid: false,
      issues: [{ severity: "error", message: `Failed to read file: ${error}` }],
    };
  }

  // Check frontmatter exists
  if (!content.match(/^---\n[\s\S]*?\n---/)) {
    issues.push({ severity: "error", message: "Missing or invalid YAML frontmatter", location: "frontmatter" });
  }

  const frontmatter = parseFrontmatter(content);
  const skillName = frontmatter.name || "unknown";

  // Validate name
  if (!frontmatter.name) {
    issues.push({ severity: "error", message: "Missing 'name' in frontmatter", location: "frontmatter" });
  } else {
    issues.push(...validateSkillName(frontmatter.name).map(i => ({ ...i, location: "frontmatter/name" })));
  }

  // Validate description
  if (!frontmatter.description) {
    issues.push({ severity: "error", message: "Missing 'description' in frontmatter", location: "frontmatter" });
  } else {
    issues.push(...validateDescription(frontmatter.description).map(i => ({ ...i, location: "frontmatter/description" })));
  }

  // Validate metadata
  if (!frontmatter.metadata) {
    issues.push({ severity: "warning", message: "Missing 'metadata' section", location: "frontmatter" });
  } else {
    if (!frontmatter.metadata.version) {
      issues.push({ severity: "warning", message: "Missing 'version' in metadata", location: "frontmatter/metadata" });
    } else if (!/^\d+\.\d+(\.\d+)?$/.test(frontmatter.metadata.version)) {
      issues.push({ severity: "warning", message: "Version should follow semver format", location: "frontmatter/metadata" });
    }

    if (!frontmatter.metadata.author) {
      issues.push({ severity: "warning", message: "Missing 'author' in metadata", location: "frontmatter/metadata" });
    }
  }

  // Validate required sections
  const requiredSections = [
    { pattern: /^## Overview$/m, name: "Overview" },
    { pattern: /^## When to Use$/m, name: "When to Use" },
    { pattern: /^## Steps$/m, name: "Steps" },
  ];

  for (const section of requiredSections) {
    if (!section.pattern.test(content)) {
      issues.push({ 
        severity: section.name === "Overview" ? "error" : "warning", 
        message: `Missing required section: ${section.name}`,
        location: "content"
      });
    }
  }

  // Validate Overview content
  const overviewMatch = content.match(/^## Overview\n+([\s\S]*?)(?=\n## |$)/m);
  if (overviewMatch) {
    const overview = overviewMatch[1]?.trim() || "";
    if (overview.length < 20) {
      issues.push({ severity: "warning", message: "Overview section is too short (< 20 chars)", location: "Overview" });
    }
  }

  // Validate When to Use has bullet points
  const whenToUseMatch = content.match(/^## When to Use\n+([\s\S]*?)(?=\n## |$)/m);
  if (whenToUseMatch) {
    const whenToUse = whenToUseMatch[1]?.trim() || "";
    const bullets = whenToUse.match(/^- /gm);
    if (!bullets || bullets.length === 0) {
      issues.push({ severity: "warning", message: "When to Use section should contain bullet points", location: "When to Use" });
    }
  }

  // Validate Steps are numbered
  const stepsMatch = content.match(/^## Steps\n+([\s\S]*?)(?=\n## |$)/m);
  if (stepsMatch) {
    const steps = stepsMatch[1]?.trim() || "";
    const numberedSteps = steps.match(/^\d+\.\s+\*\*/gm);
    if (!numberedSteps || numberedSteps.length === 0) {
      issues.push({ severity: "warning", message: "Steps section should contain numbered steps with bold actions", location: "Steps" });
    }
  }

  // Check for script file
  const skillDirPath = filePath.replace(/\/SKILL\.md$/, "");
  const scriptPath = `${skillDirPath}/scripts/script.ts`;
  try {
    await Bun.file(scriptPath).text();
  } catch {
    issues.push({ severity: "warning", message: "Missing executable script at scripts/script.ts", location: "files" });
  }

  return {
    filePath,
    skillName,
    valid: issues.filter(i => i.severity === "error").length === 0,
    issues,
    content,
  };
}

/**
 * Fix skill name to make it valid
 */
function fixSkillName(name: string): string {
  let fixed = name.toLowerCase();
  fixed = fixed.replace(/[\s_]+/g, "-");
  fixed = fixed.replace(/[^a-z0-9-]/g, "");
  fixed = fixed.replace(/-+/g, "-");
  fixed = fixed.replace(/^-+|-+$/g, "");
  
  if (!/^[a-z]/.test(fixed)) {
    fixed = "skill-" + fixed;
  }
  
  if (fixed.length > 64) {
    fixed = fixed.substring(0, 64).replace(/-+$/, "");
  }
  
  return fixed || "unnamed-skill";
}

/**
 * Attempt to fix issues in a skill file
 */
async function fixSkillIssues(report: SkillValidationReport): Promise<boolean> {
  if (!report.content) return false;

  let content = report.content;
  let modified = false;

  const fixableIssues = report.issues.filter(i => i.fixable);
  
  if (fixableIssues.length === 0) {
    return false;
  }

  // Use LLM to generate fixes for complex issues
  const FixSchema = z.object({
    shouldFix: z.boolean(),
    fixes: z.array(z.object({
      issue: z.string(),
      fix: z.string(),
    })),
    updatedFrontmatter: z.string().optional(),
  });

  const frontmatter = parseFrontmatter(content);
  const fixResult = await intelligenceWithSchema(
    "Analyze these skill validation issues and suggest fixes. Only fix issues that are clearly fixable without changing meaning.",
    FixSchema,
    {
      skillName: report.skillName,
      issues: fixableIssues.map(i => `${i.severity}: ${i.message} (${i.location})`),
      frontmatter: JSON.stringify(frontmatter, null, 2),
    }
  );

  if (fixResult.shouldFix && fixResult.fixes.length > 0) {
    console.log(`  🔧 Applying ${fixResult.fixes.length} fix(es)...`);
    
    // Apply simple fixes directly
    const nameIssue = report.issues.find(i => i.location === "frontmatter/name" && i.fixable);
    if (nameIssue && frontmatter.name) {
      const fixedName = fixSkillName(frontmatter.name);
      content = content.replace(/^name:\s*.+$/m, `name: ${fixedName}`);
      modified = true;
      console.log(`    ✓ Fixed skill name: ${frontmatter.name} → ${fixedName}`);
    }

    // Fix description punctuation
    const descIssue = report.issues.find(i => i.location === "frontmatter/description" && i.message.includes("punctuation"));
    if (descIssue && frontmatter.description && !/[.!?]$/.test(frontmatter.description)) {
      const fixedDesc = frontmatter.description.trim() + ".";
      content = content.replace(/^description:\s*.+$/m, `description: ${fixedDesc}`);
      modified = true;
      console.log(`    ✓ Added punctuation to description`);
    }
  }

  if (modified) {
    await Bun.write(report.filePath, content);
    return true;
  }

  return false;
}

/**
 * Main validation logic
 */
async function main() {
  console.log(`🔍 Validating skills in: ${skillsDir}\n`);

  // Find all SKILL.md files
  const glob = new Bun.Glob("**/SKILL.md");
  const skillFiles: string[] = [];
  
  for await (const file of glob.scan({ cwd: skillsDir, absolute: true })) {
    skillFiles.push(file);
  }

  if (skillFiles.length === 0) {
    console.log(`❌ No SKILL.md files found in ${skillsDir}`);
    process.exit(1);
  }

  console.log(`📁 Found ${skillFiles.length} skill file(s)\n`);

  // Validate each skill
  const reports: SkillValidationReport[] = [];
  for (const file of skillFiles) {
    const report = await validateSkillFile(file);
    reports.push(report);
  }

  // Apply fixes if requested
  if (shouldFix) {
    console.log(`\n🔧 Attempting to fix issues...\n`);
    for (const report of reports) {
      if (!report.valid && report.issues.some(i => i.fixable)) {
        console.log(`Fixing: ${report.skillName}`);
        const fixed = await fixSkillIssues(report);
        if (fixed) {
          // Re-validate after fixes
          const newReport = await validateSkillFile(report.filePath);
          const index = reports.indexOf(report);
          reports[index] = newReport;
        }
      }
    }
  }

  // Generate summary
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 VALIDATION SUMMARY`);
  console.log(`${"=".repeat(60)}\n`);

  const validSkills = reports.filter(r => r.valid);
  const invalidSkills = reports.filter(r => !r.valid);
  const totalErrors = reports.reduce((sum, r) => sum + r.issues.filter(i => i.severity === "error").length, 0);
  const totalWarnings = reports.reduce((sum, r) => sum + r.issues.filter(i => i.severity === "warning").length, 0);

  console.log(`✅ Valid skills:   ${validSkills.length}/${reports.length}`);
  console.log(`❌ Invalid skills: ${invalidSkills.length}/${reports.length}`);
  console.log(`🔴 Total errors:   ${totalErrors}`);
  console.log(`🟡 Total warnings: ${totalWarnings}\n`);

  // Detailed reports
  for (const report of reports) {
    const statusIcon = report.valid ? "✅" : "❌";
    const errorCount = report.issues.filter(i => i.severity === "error").length;
    const warningCount = report.issues.filter(i => i.severity === "warning").length;

    console.log(`${statusIcon} ${report.skillName}`);
    
    if (verbose || !report.valid) {
      console.log(`   Path: ${report.filePath}`);
      
      if (report.issues.length > 0) {
        console.log(`   Issues: ${errorCount} error(s), ${warningCount} warning(s)`);
        
        for (const issue of report.issues) {
          const icon = issue.severity === "error" ? "🔴" : "🟡";
          const fixable = issue.fixable ? " [fixable]" : "";
          const location = issue.location ? ` (${issue.location})` : "";
          console.log(`     ${icon} ${issue.message}${location}${fixable}`);
        }
      }
      
      console.log();
    }
  }

  // Exit with error if any skills are invalid
  if (invalidSkills.length > 0) {
    console.log(`\n💡 Tip: Use --fix to automatically fix issues where possible`);
    console.log(`💡 Tip: Use --verbose for detailed output\n`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All skills are valid!\n`);
    process.exit(0);
  }
}

main().catch((error) => {
  console.error(`\n❌ Fatal error:`, error);
  process.exit(1);
});
