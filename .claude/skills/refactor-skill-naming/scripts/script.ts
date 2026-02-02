#!/usr/bin/env bun

/**
 * Codebase Architecture Explorer
 * 
 * Performs comprehensive pre-refactor reconnaissance by analyzing file relationships,
 * dependencies, and architectural patterns to help you understand a codebase before
 * making changes.
 */

import { parseArgs } from "util";
import { $ } from "bun";
import { intelligence, intelligenceWithSchema, z } from "engram/skill-runtime";

const args = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    depth: { type: "string", short: "d", default: "standard" },
    focus: { type: "string", short: "f" },
    output: { type: "string", short: "o" },
  },
  allowPositionals: true,
});

if (args.values.help) {
  console.log(`
🔍 Codebase Architecture Explorer

Usage: explore-architecture [target-dir] [options]

Arguments:
  target-dir          Directory to analyze (default: current directory)

Options:
  -h, --help         Show this help message
  -d, --depth        Analysis depth: quick | standard | deep (default: standard)
  -f, --focus        Focus on specific pattern (e.g., "auth", "api", "database")
  -o, --output       Save report to file (markdown format)

Examples:
  explore-architecture                    # Analyze current directory
  explore-architecture ./src              # Analyze src directory
  explore-architecture --focus auth       # Focus on authentication-related files
  explore-architecture --depth deep       # Perform deep analysis
  `);
  process.exit(0);
}

const targetDir = args.positionals[0] || process.cwd();
const depth = args.values.depth as string;
const focus = args.values.focus as string | undefined;
const outputFile = args.values.output as string | undefined;

console.log(`\n🔍 Exploring architecture in: ${targetDir}\n`);

try {
  // Phase 1: Discover file structure
  console.log("📂 Phase 1: Discovering file structure...\n");
  
  const glob = new Bun.Glob("**/*.{ts,tsx,js,jsx,json,md}");
  const allFiles = await Array.fromAsync(glob.scan({ cwd: targetDir }));
  
  // Categorize files
  const categories = {
    entryPoints: allFiles.filter(f => 
      f.match(/\/(index|main|app|server|cli)\.(ts|tsx|js|jsx)$/) && !f.includes("node_modules")
    ),
    configs: allFiles.filter(f => 
      f.match(/\.(json|config\.(ts|js))$/) && !f.includes("node_modules")
    ),
    tests: allFiles.filter(f => 
      f.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/) || f.includes("__tests__")
    ),
    docs: allFiles.filter(f => f.endsWith(".md")),
    source: allFiles.filter(f => 
      f.match(/\.(ts|tsx|js|jsx)$/) && 
      !f.includes("node_modules") &&
      !f.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/)
    ),
  };

  console.log(`📊 File Statistics:`);
  console.log(`   Total files: ${allFiles.length}`);
  console.log(`   📍 Entry points: ${categories.entryPoints.length}`);
  console.log(`   ⚙️  Config files: ${categories.configs.length}`);
  console.log(`   🧪 Test files: ${categories.tests.length}`);
  console.log(`   📄 Documentation: ${categories.docs.length}`);
  console.log(`   💾 Source files: ${categories.source.length}\n`);

  // Phase 2: Analyze directory structure
  console.log("🏗️  Phase 2: Analyzing directory structure...\n");
  
  const directories = new Set<string>();
  allFiles.forEach(f => {
    const parts = f.split("/");
    for (let i = 1; i < parts.length; i++) {
      directories.add(parts.slice(0, i).join("/"));
    }
  });

  const topLevelDirs = Array.from(directories)
    .filter(d => !d.includes("/"))
    .filter(d => d !== "node_modules");

  const dirStats = await Promise.all(
    topLevelDirs.map(async dir => {
      const filesInDir = allFiles.filter(f => f.startsWith(dir + "/"));
      return { dir, count: filesInDir.length, files: filesInDir };
    })
  );

  dirStats.sort((a, b) => b.count - a.count);
  
  console.log("📁 Top-level directories:");
  dirStats.slice(0, 10).forEach(({ dir, count }) => {
    console.log(`   ${dir.padEnd(30)} (${count} files)`);
  });

  // Phase 3: Read and analyze key files
  console.log("\n📖 Phase 3: Reading key files...\n");

  const filesToAnalyze = focus 
    ? allFiles.filter(f => f.toLowerCase().includes(focus.toLowerCase()))
    : [
        ...categories.entryPoints.slice(0, 3),
        ...categories.configs.filter(f => f.match(/package\.json|tsconfig\.json/)),
        ...categories.docs.filter(f => f.match(/README|ARCHITECTURE|DESIGN/i)),
      ];

  const fileAnalysis = await Promise.all(
    filesToAnalyze.slice(0, depth === "quick" ? 5 : depth === "deep" ? 20 : 10).map(async (file) => {
      try {
        const content = await Bun.file(`${targetDir}/${file}`).text();
        const lines = content.split("\n").length;
        
        // Extract imports/requires
        const imports = content.match(/^import .+ from ['"]+(.+)['"]+/gm) || [];
        const requires = content.match(/require\(['"]+(.+)['"]+\)/g) || [];
        const exports = content.match(/^export /gm) || [];
        
        return {
          file,
          lines,
          imports: imports.length + requires.length,
          exports: exports.length,
          content: content.slice(0, 1000), // First 1000 chars for analysis
        };
      } catch (err) {
        return null;
      }
    })
  );

  const validAnalysis = fileAnalysis.filter(Boolean);
  
  console.log("🔎 Key files analyzed:");
  validAnalysis.forEach(analysis => {
    if (analysis) {
      console.log(`   ${analysis.file}`);
      console.log(`      Lines: ${analysis.lines} | Imports: ${analysis.imports} | Exports: ${analysis.exports}`);
    }
  });

  // Phase 4: Use LLM to generate architectural insights
  console.log("\n🤖 Phase 4: Generating architectural insights...\n");

  const ArchitectureSchema = z.object({
    patterns: z.array(z.object({
      name: z.string(),
      description: z.string(),
      files: z.array(z.string()),
    })),
    entryPointAnalysis: z.string(),
    recommendations: z.array(z.string()),
    potentialIssues: z.array(z.string()),
  });

  const insights = await intelligenceWithSchema(
    `Analyze this codebase architecture and identify:
    1. Architectural patterns in use (e.g., MVC, layered, microservices, monolith)
    2. Key entry points and their purposes
    3. Recommendations for understanding this codebase before refactoring
    4. Potential issues or areas that need careful attention

    Focus on actionable insights for someone about to refactor.`,
    ArchitectureSchema,
    {
      fileStructure: JSON.stringify(dirStats.slice(0, 10), null, 2),
      entryPoints: categories.entryPoints.join("\n"),
      keyFileAnalysis: JSON.stringify(validAnalysis.map(a => ({
        file: a?.file,
        lines: a?.lines,
        imports: a?.imports,
        exports: a?.exports,
      })), null, 2),
      focus: focus || "general",
    }
  );

  // Output results
  const report = `
${"=".repeat(80)}
🏛️  ARCHITECTURE ANALYSIS REPORT
${"=".repeat(80)}

📊 STATISTICS
${"-".repeat(80)}
Total Files: ${allFiles.length}
Entry Points: ${categories.entryPoints.length}
Source Files: ${categories.source.length}
Test Coverage: ${categories.tests.length} test files

🏗️  ARCHITECTURAL PATTERNS
${"-".repeat(80)}
${insights.patterns.map(p => `
${p.name}
  ${p.description}
  Files: ${p.files.join(", ")}
`).join("\n")}

📍 ENTRY POINTS
${"-".repeat(80)}
${insights.entryPointAnalysis}

Key files:
${categories.entryPoints.map(f => `  • ${f}`).join("\n")}

⚠️  POTENTIAL ISSUES
${"-".repeat(80)}
${insights.potentialIssues.map((issue, i) => `${i + 1}. ${issue}`).join("\n")}

💡 RECOMMENDATIONS
${"-".repeat(80)}
${insights.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join("\n")}

📁 DIRECTORY STRUCTURE
${"-".repeat(80)}
${dirStats.slice(0, 10).map(d => `${d.dir.padEnd(30)} ${d.count} files`).join("\n")}

${"=".repeat(80)}
`;

  console.log(report);

  if (outputFile) {
    await Bun.write(outputFile, report);
    console.log(`\n💾 Report saved to: ${outputFile}`);
  }

  console.log("\n✅ Architecture exploration complete!\n");

} catch (error) {
  console.error("❌ Error during exploration:", error);
  process.exit(1);
}