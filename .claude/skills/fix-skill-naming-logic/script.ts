#!/usr/bin/env bun
/**
 * fix-skill-naming-logic - Intelligent file reading workflow
 * 
 * This skill demonstrates the pattern of reading files directly when paths are known,
 * and using discovery tools (Glob/Grep) when paths are unknown.
 */

import { $ } from "bun";
import { join, relative } from "path";

// Parse arguments
const targetDir = process.argv[2] || process.cwd();

interface FileToRead {
  path: string;
  reason: string;
  required: boolean;
}

/**
 * Determine which files should be read based on project structure
 */
async function discoverFilesToRead(): Promise<FileToRead[]> {
  const files: FileToRead[] = [];
  
  console.log("\n🔍 Discovering project structure...\n");
  
  // Check for common project types and their key files
  const projectIndicators = [
    { file: "package.json", type: "Node.js/Bun project" },
    { file: "tsconfig.json", type: "TypeScript project" },
    { file: "Cargo.toml", type: "Rust project" },
    { file: "go.mod", type: "Go project" },
    { file: "pyproject.toml", type: "Python project" },
    { file: "composer.json", type: "PHP project" },
  ];
  
  for (const indicator of projectIndicators) {
    const filePath = join(targetDir, indicator.file);
    const exists = await Bun.file(filePath).exists();
    if (exists) {
      console.log(`✓ Detected ${indicator.type} (found ${indicator.file})`);
      files.push({
        path: filePath,
        reason: `Project configuration for ${indicator.type}`,
        required: true,
      });
    }
  }
  
  // For TypeScript/JavaScript projects, discover source structure
  if (files.some(f => f.path.endsWith("package.json"))) {
    await discoverJavaScriptStructure(files);
  }
  
  // Find README files
  const readmePatterns = ["README.md", "README.txt", "README"];
  for (const pattern of readmePatterns) {
    const filePath = join(targetDir, pattern);
    if (await Bun.file(filePath).exists()) {
      files.push({
        path: filePath,
        reason: "Project documentation",
        required: false,
      });
      break;
    }
  }
  
  return files;
}

/**
 * Discover JavaScript/TypeScript project structure
 */
async function discoverJavaScriptStructure(files: FileToRead[]): Promise<void> {
  // Read package.json to find entry points
  const packageJsonPath = join(targetDir, "package.json");
  try {
    const packageJson = await Bun.file(packageJsonPath).json();
    
    // Find main entry point
    if (packageJson.main) {
      const mainPath = join(targetDir, packageJson.main);
      if (await Bun.file(mainPath).exists()) {
        files.push({
          path: mainPath,
          reason: "Main entry point from package.json",
          required: true,
        });
      }
    }
    
    // Find TypeScript types entry
    if (packageJson.types || packageJson.typings) {
      const typesPath = join(targetDir, packageJson.types || packageJson.typings);
      if (await Bun.file(typesPath).exists()) {
        files.push({
          path: typesPath,
          reason: "TypeScript type definitions",
          required: false,
        });
      }
    }
    
  } catch (error) {
    console.warn(`⚠ Could not parse package.json: ${error}`);
  }
  
  // Use Glob to discover source directories
  const commonSrcPatterns = [
    "src/index.{ts,js}",
    "src/main.{ts,js}",
    "index.{ts,js}",
    "src/types/**/*.ts",
    "src/**/*types.ts",
  ];
  
  for (const pattern of commonSrcPatterns) {
    const glob = new Bun.Glob(pattern);
    const matches = Array.from(glob.scanSync(targetDir));
    
    for (const match of matches.slice(0, 3)) { // Limit to first 3 matches per pattern
      const fullPath = join(targetDir, match);
      if (!files.some(f => f.path === fullPath)) {
        files.push({
          path: fullPath,
          reason: `Discovered via pattern: ${pattern}`,
          required: false,
        });
      }
    }
  }
}

/**
 * Read a file and display its key information
 */
async function readAndAnalyzeFile(file: FileToRead): Promise<void> {
  try {
    const content = await Bun.file(file.path).text();
    const lines = content.split('\n').length;
    const chars = content.length;
    const relativePath = relative(targetDir, file.path);
    
    console.log(`\n📄 ${relativePath}`);
    console.log(`   Reason: ${file.reason}`);
    console.log(`   Size: ${lines} lines, ${chars} characters`);
    
    // Analyze file type and show relevant snippets
    if (file.path.endsWith('.json')) {
      try {
        const json = JSON.parse(content);
        console.log(`   Type: JSON configuration`);
        console.log(`   Keys: ${Object.keys(json).join(', ')}`);
      } catch {
        console.log(`   Type: JSON (invalid)`);
      }
    } else if (file.path.endsWith('.ts') || file.path.endsWith('.js')) {
      const imports = content.match(/^import .+ from .+$/gm) || [];
      const exports = content.match(/^export .+$/gm) || [];
      console.log(`   Type: ${file.path.endsWith('.ts') ? 'TypeScript' : 'JavaScript'}`);
      console.log(`   Imports: ${imports.length}`);
      console.log(`   Exports: ${exports.length}`);
      
      // Show first few lines (excluding imports)
      const nonImportLines = content
        .split('\n')
        .filter(line => !line.trim().startsWith('import') && line.trim().length > 0)
        .slice(0, 3);
      
      if (nonImportLines.length > 0) {
        console.log(`   Preview:`);
        nonImportLines.forEach(line => {
          console.log(`     ${line.substring(0, 70)}${line.length > 70 ? '...' : ''}`);
        });
      }
    } else if (file.path.endsWith('.md')) {
      const headings = content.match(/^#+\s+.+$/gm) || [];
      console.log(`   Type: Markdown documentation`);
      console.log(`   Headings: ${headings.length}`);
      if (headings.length > 0) {
        console.log(`   Sections: ${headings.slice(0, 5).join(', ')}`);
      }
    }
    
  } catch (error) {
    console.error(`   ❌ Error reading file: ${error}`);
    if (file.required) {
      throw error;
    }
  }
}

/**
 * Search for specific patterns in codebase when path is unknown
 */
async function searchForPattern(searchTerm: string): Promise<string[]> {
  console.log(`\n🔎 Searching for pattern: "${searchTerm}"`);
  
  try {
    // Use grep to find files containing the pattern
    const result = await $`grep -r -l ${searchTerm} ${targetDir} 2>/dev/null || true`.text();
    const files = result
      .split('\n')
      .filter(line => line.trim().length > 0)
      .filter(line => !line.includes('node_modules'))
      .filter(line => !line.includes('.git'));
    
    if (files.length > 0) {
      console.log(`   Found in ${files.length} files`);
      files.slice(0, 5).forEach(file => {
        console.log(`   - ${relative(targetDir, file)}`);
      });
    } else {
      console.log(`   No matches found`);
    }
    
    return files;
  } catch (error) {
    console.warn(`   Search failed: ${error}`);
    return [];
  }
}

/**
 * Main workflow
 */
async function main() {
  console.log(`🎯 fix-skill-naming-logic`);
  console.log(`📂 Target directory: ${targetDir}\n`);
  
  // Validate target directory exists
  try {
    const stat = await Bun.file(join(targetDir, "package.json")).exists();
  } catch (error) {
    console.error(`❌ Invalid target directory: ${targetDir}`);
    process.exit(1);
  }
  
  // PHASE 1: Discover files with known patterns
  const filesToRead = await discoverFilesToRead();
  
  if (filesToRead.length === 0) {
    console.log("⚠ No known project files detected");
    console.log("   This might not be a supported project type");
    process.exit(0);
  }
  
  console.log(`\n📋 Found ${filesToRead.length} files to analyze\n`);
  
  // PHASE 2: Read discovered files directly
  console.log("=" .repeat(60));
  console.log("PHASE 2: Reading Known Files");
  console.log("=" .repeat(60));
  
  for (const file of filesToRead) {
    await readAndAnalyzeFile(file);
  }
  
  // PHASE 3: Search for unknown patterns (example)
  console.log("\n" + "=".repeat(60));
  console.log("PHASE 3: Discovering Unknown Patterns");
  console.log("=" .repeat(60));
  
  // Example: Search for skill-related patterns
  const searchPatterns = ["Skill", "generateSkill", "SkillGenerator"];
  const foundFiles = new Set<string>();
  
  for (const pattern of searchPatterns) {
    const files = await searchForPattern(pattern);
    files.forEach(f => foundFiles.add(f));
  }
  
  // Read newly discovered files
  if (foundFiles.size > 0) {
    console.log(`\n📚 Reading ${foundFiles.size} discovered files:\n`);
    
    for (const filePath of Array.from(foundFiles).slice(0, 5)) {
      await readAndAnalyzeFile({
        path: filePath,
        reason: "Discovered via pattern search",
        required: false,
      });
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ Analysis complete!");
  console.log("=" .repeat(60));
  console.log(`\nSummary:`);
  console.log(`  - Direct reads: ${filesToRead.length} files`);
  console.log(`  - Pattern discoveries: ${foundFiles.size} files`);
  console.log(`  - Total analyzed: ${filesToRead.length + foundFiles.size} files\n`);
}

// Run the workflow
main().catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
