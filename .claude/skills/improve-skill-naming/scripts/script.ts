#!/usr/bin/env bun

/**
 * improve-skill-naming: Analyze and improve naming conventions in a codebase
 * 
 * This skill intelligently reads known files when paths are provided, and uses
 * pattern-matching to discover files when paths are unknown.
 */

import { resolve, relative, basename, dirname, extname } from "path";

interface NamingIssue {
  file: string;
  line: number;
  type: "variable" | "function" | "class" | "file" | "constant";
  current: string;
  suggestion: string;
  reason: string;
  severity: "low" | "medium" | "high";
}

// Naming convention rules
const CONVENTIONS = {
  // Variables and functions should be camelCase
  camelCase: /^[a-z][a-zA-Z0-9]*$/,
  // Classes should be PascalCase
  PascalCase: /^[A-Z][a-zA-Z0-9]*$/,
  // Constants should be UPPER_SNAKE_CASE
  UPPER_SNAKE_CASE: /^[A-Z][A-Z0-9_]*$/,
  // Private properties/methods should start with _
  private: /^_[a-z][a-zA-Z0-9]*$/,
  // Files should be kebab-case or camelCase
  kebabCase: /^[a-z][a-z0-9-]*$/,
};

const targetDir = resolve(process.argv[2] || ".");

console.log(`🔍 Analyzing naming conventions in: ${targetDir}\n`);

// Check if directory exists
try {
  await Bun.file(`${targetDir}/package.json`).exists();
} catch (error) {
  console.error(`❌ Directory not found: ${targetDir}`);
  process.exit(1);
}

const issues: NamingIssue[] = [];

// Discover TypeScript/JavaScript files
const patterns = ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"];
const excludePatterns = ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.next/**"];

async function shouldAnalyzeFile(filePath: string): Promise<boolean> {
  for (const exclude of excludePatterns) {
    const excludePattern = exclude.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
    if (new RegExp(excludePattern).test(filePath)) {
      return false;
    }
  }
  return true;
}

async function discoverFiles(): Promise<string[]> {
  const files: string[] = [];
  
  for (const pattern of patterns) {
    const glob = new Bun.Glob(pattern);
    for await (const file of glob.scan({ cwd: targetDir, absolute: false })) {
      const fullPath = resolve(targetDir, file);
      if (await shouldAnalyzeFile(file)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

function toCamelCase(str: string): string {
  return str.replace(/[-_](\w)/g, (_, c) => c.toUpperCase()).replace(/^[A-Z]/, c => c.toLowerCase());
}

function toPascalCase(str: string): string {
  return str.replace(/[-_](\w)/g, (_, c) => c.toUpperCase()).replace(/^[a-z]/, c => c.toUpperCase());
}

function toUpperSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, "_$1").replace(/[-\s]/g, "_").toUpperCase().replace(/^_/, "");
}

function toKebabCase(str: string): string {
  return str.replace(/([A-Z])/g, "-$1").replace(/[_\s]/g, "-").toLowerCase().replace(/^-/, "");
}

async function analyzeFile(filePath: string): Promise<void> {
  const file = Bun.file(filePath);
  const content = await file.text();
  const lines = content.split("\n");
  const relativePath = relative(targetDir, filePath);
  
  // Check filename conventions
  const fileName = basename(filePath, extname(filePath));
  if (!CONVENTIONS.kebabCase.test(fileName) && !CONVENTIONS.camelCase.test(fileName)) {
    if (fileName.includes("_") || /[A-Z]/.test(fileName.charAt(0))) {
      issues.push({
        file: relativePath,
        line: 0,
        type: "file",
        current: fileName,
        suggestion: toKebabCase(fileName),
        reason: "File names should use kebab-case or camelCase",
        severity: "low",
      });
    }
  }
  
  // Analyze code content
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check class declarations
    const classMatch = line.match(/class\s+([a-z_][a-zA-Z0-9_]*)/);
    if (classMatch) {
      const className = classMatch[1];
      if (!CONVENTIONS.PascalCase.test(className)) {
        issues.push({
          file: relativePath,
          line: lineNum,
          type: "class",
          current: className,
          suggestion: toPascalCase(className),
          reason: "Class names should use PascalCase",
          severity: "high",
        });
      }
    }
    
    // Check constant declarations (const with UPPER naming)
    const constMatch = line.match(/(?:export\s+)?const\s+([A-Z_][A-Z0-9_]*)\s*[:=]/);
    if (constMatch) {
      const constName = constMatch[1];
      if (!CONVENTIONS.UPPER_SNAKE_CASE.test(constName) && constName === constName.toUpperCase()) {
        issues.push({
          file: relativePath,
          line: lineNum,
          type: "constant",
          current: constName,
          suggestion: toUpperSnakeCase(constName),
          reason: "Constants should use UPPER_SNAKE_CASE",
          severity: "medium",
        });
      }
    }
    
    // Check function declarations
    const funcMatch = line.match(/(?:function|const|let|var)\s+([A-Z][a-zA-Z0-9]*)\s*[=(:]/);
    if (funcMatch && !line.includes("class ")) {
      const funcName = funcMatch[1];
      if (/^[A-Z]/.test(funcName) && !line.match(/class\s+/)) {
        issues.push({
          file: relativePath,
          line: lineNum,
          type: "function",
          current: funcName,
          suggestion: toCamelCase(funcName),
          reason: "Function names should use camelCase (unless it's a constructor/component)",
          severity: "medium",
        });
      }
    }
    
    // Check snake_case variables (common anti-pattern in JS/TS)
    const varMatch = line.match(/(?:const|let|var)\s+([a-z][a-z0-9_]*[_][a-z0-9_]*)\s*[:=]/);
    if (varMatch) {
      const varName = varMatch[1];
      if (varName.includes("_") && varName !== varName.toUpperCase()) {
        issues.push({
          file: relativePath,
          line: lineNum,
          type: "variable",
          current: varName,
          suggestion: toCamelCase(varName),
          reason: "Variable names should use camelCase, not snake_case",
          severity: "medium",
        });
      }
    }
  });
}

// Main workflow
try {
  console.log("📂 Discovering files...");
  const files = await discoverFiles();
  console.log(`   Found ${files.length} files to analyze\n`);
  
  if (files.length === 0) {
    console.log("✅ No TypeScript/JavaScript files found to analyze.");
    process.exit(0);
  }
  
  console.log("🔬 Analyzing naming conventions...");
  let analyzed = 0;
  for (const file of files) {
    await analyzeFile(file);
    analyzed++;
    if (analyzed % 10 === 0) {
      process.stdout.write(`\r   Analyzed ${analyzed}/${files.length} files...`);
    }
  }
  console.log(`\r   Analyzed ${analyzed}/${files.length} files ✓\n`);
  
  // Sort issues by severity and file
  issues.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return a.file.localeCompare(b.file);
  });
  
  // Display results
  if (issues.length === 0) {
    console.log("✅ No naming convention issues found! Your codebase follows good naming practices.");
  } else {
    console.log(`⚠️  Found ${issues.length} naming convention issues:\n`);
    
    const groupedByFile = issues.reduce((acc, issue) => {
      if (!acc[issue.file]) acc[issue.file] = [];
      acc[issue.file].push(issue);
      return acc;
    }, {} as Record<string, NamingIssue[]>);
    
    for (const [file, fileIssues] of Object.entries(groupedByFile)) {
      console.log(`📄 ${file}`);
      for (const issue of fileIssues) {
        const severityIcon = issue.severity === "high" ? "🔴" : issue.severity === "medium" ? "🟡" : "🔵";
        const location = issue.line > 0 ? `:${issue.line}` : "";
        console.log(`   ${severityIcon} ${issue.type}${location}`);
        console.log(`      Current:    ${issue.current}`);
        console.log(`      Suggestion: ${issue.suggestion}`);
        console.log(`      Reason:     ${issue.reason}`);
      }
      console.log();
    }
    
    // Summary statistics
    const bySeverity = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log("📊 Summary:");
    console.log(`   🔴 High:   ${bySeverity.high || 0}`);
    console.log(`   🟡 Medium: ${bySeverity.medium || 0}`);
    console.log(`   🔵 Low:    ${bySeverity.low || 0}`);
    console.log(`   Total:     ${issues.length}`);
  }
  
} catch (error) {
  console.error("❌ Error during analysis:", error);
  process.exit(1);
}
