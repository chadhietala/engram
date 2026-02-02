#!/usr/bin/env bun

import { parseArgs } from "util";
import { join, relative } from "path";
import { intelligence } from "engram/skill-runtime";

const HELP = `
🔍 Sequential File Analyzer - Read and analyze related files in sequence

USAGE:
  sequential-analyze [OPTIONS] <file-paths...>
  sequential-analyze [OPTIONS] --pattern <glob-pattern>

OPTIONS:
  --pattern <glob>     Discover files using a glob pattern (e.g., "src/**/*.ts")
  --search <term>      First search for files containing a term, then analyze them
  --limit <n>          Maximum number of files to analyze (default: 10)
  --context <text>     Additional context about what you're investigating
  --help               Show this help message

EXAMPLES:
  # Analyze specific files in sequence
  sequential-analyze src/index.ts src/types.ts src/utils.ts

  # Discover and analyze files by pattern
  sequential-analyze --pattern "src/**/*.config.ts"

  # Find files containing a term, then analyze them
  sequential-analyze --search "export class.*Service" --pattern "**/*.ts"

  # Investigate with context
  sequential-analyze --pattern "src/auth/**/*.ts" --context "Understanding the authentication flow"
`;

interface Args {
  pattern?: string;
  search?: string;
  limit?: string;
  context?: string;
  help?: boolean;
}

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    pattern: { type: "string" },
    search: { type: "string" },
    limit: { type: "string" },
    context: { type: "string" },
    help: { type: "boolean" },
  },
  allowPositionals: true,
}) as { values: Args; positionals: string[] };

if (values.help) {
  console.log(HELP);
  process.exit(0);
}

const limit = parseInt(values.limit || "10");
const cwd = process.cwd();

async function discoverFiles(): Promise<string[]> {
  if (positionals.length > 0) {
    // Use explicitly provided file paths
    return positionals.map((p) => (p.startsWith("/") ? p : join(cwd, p)));
  }

  if (values.pattern) {
    // Discover files by glob pattern
    console.log(`🔎 Scanning for files matching: ${values.pattern}\n`);
    const glob = new Bun.Glob(values.pattern);
    const files: string[] = [];

    for await (const file of glob.scan({ cwd, onlyFiles: true })) {
      files.push(join(cwd, file));
      if (files.length >= limit) break;
    }

    return files;
  }

  if (values.search) {
    // Search for files containing a term
    const pattern = values.pattern || "**/*.{ts,tsx,js,jsx,py,go,rs,java}";
    console.log(`🔎 Searching for "${values.search}" in ${pattern}\n`);

    const glob = new Bun.Glob(pattern);
    const files: string[] = [];

    for await (const file of glob.scan({ cwd, onlyFiles: true })) {
      const fullPath = join(cwd, file);
      try {
        const content = await Bun.file(fullPath).text();
        const regex = new RegExp(values.search, "i");
        if (regex.test(content)) {
          files.push(fullPath);
          if (files.length >= limit) break;
        }
      } catch (e) {
        // Skip files that can't be read
      }
    }

    return files;
  }

  console.error("❌ Error: Provide file paths, --pattern, or --search");
  console.log(HELP);
  process.exit(1);
}

async function analyzeFiles(files: string[]) {
  if (files.length === 0) {
    console.log("❌ No files found to analyze\n");
    process.exit(1);
  }

  console.log(`📚 Analyzing ${files.length} file(s) in sequence...\n`);

  const fileContents: Array<{ path: string; content: string; lines: number; size: number }> = [];

  // Read all files sequentially and gather metadata
  for (const filepath of files) {
    const relPath = relative(cwd, filepath);
    try {
      const file = Bun.file(filepath);
      const content = await file.text();
      const lines = content.split("\n").length;
      const size = file.size;

      fileContents.push({ path: relPath, content, lines, size });

      console.log(`  ✓ ${relPath}`);
      console.log(`    Lines: ${lines} | Size: ${(size / 1024).toFixed(1)}KB`);
    } catch (e) {
      console.log(`  ✗ ${relPath} (unreadable)`);
    }
  }

  console.log("\n" + "─".repeat(60) + "\n");

  // Use intelligence to analyze the relationships and patterns
  const analysisPrompt = values.context
    ? `Context: ${values.context}\n\nAnalyze these ${fileContents.length} files that were read in sequence. Identify:`
    : `Analyze these ${fileContents.length} files that were read in sequence. Identify:`;

  const filesData = fileContents
    .map(
      (f, idx) =>
        `File ${idx + 1}: ${f.path}\n` +
        `Lines: ${f.lines}\n` +
        `Content preview (first 50 lines):\n${f.content.split("\n").slice(0, 50).join("\n")}\n`
    )
    .join("\n---\n\n");

  console.log("🧠 Analyzing relationships and patterns...\n");

  const analysis = await intelligence(
    analysisPrompt +
      `
1. How these files relate to each other (imports, dependencies, shared types)
2. Common patterns or architectural decisions across the files
3. The overall purpose or responsibility of this group of files
4. Any concerns, inconsistencies, or potential improvements
5. A brief summary of what someone investigating this code should know

Provide a clear, structured analysis with sections and bullet points.`,
    {
      files: filesData,
      filePaths: fileContents.map((f) => f.path),
      totalLines: fileContents.reduce((sum, f) => sum + f.lines, 0),
    }
  );

  console.log("📊 ANALYSIS RESULTS\n");
  console.log(analysis);

  console.log("\n" + "─".repeat(60));
  console.log(`\n✅ Analyzed ${fileContents.length} files (${fileContents.reduce((sum, f) => sum + f.lines, 0)} total lines)\n`);
}

// Main execution
try {
  const files = await discoverFiles();
  await analyzeFiles(files);
} catch (error) {
  console.error("❌ Error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
