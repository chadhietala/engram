#!/usr/bin/env bun

import { parseArgs } from "util";
import { join, relative } from "path";

const args = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    output: { type: "string", short: "o", default: "./metacognitive-report.json" },
    generate: { type: "boolean", short: "g", default: false },
    verbose: { type: "boolean", short: "v", default: false },
  },
  allowPositionals: true,
});

if (args.values.help) {
  console.log(`
🧠 Metacognitive Infrastructure Builder

Usage: build-metacognitive [directory] [options]

Arguments:
  directory              Target directory to analyze (default: current directory)

Options:
  -h, --help            Show this help message
  -o, --output <file>   Output report file (default: ./metacognitive-report.json)
  -g, --generate        Generate actual infrastructure files
  -v, --verbose         Show detailed analysis

Description:
  Analyzes a codebase to build metacognitive infrastructure for recursive
  self-improvement. Identifies patterns, extracts learning opportunities,
  and optionally generates synthesis databases and skill pipelines.

Examples:
  build-metacognitive                    # Analyze current directory
  build-metacognitive ./src -g           # Analyze src/ and generate files
  build-metacognitive ./project -v -o report.json
`);
  process.exit(0);
}

const targetDir = args.positionals[0] || process.cwd();
const outputFile = args.values.output as string;
const shouldGenerate = args.values.generate as boolean;
const verbose = args.values.verbose as boolean;

console.log("🧠 Metacognitive Infrastructure Builder\n");
console.log(`📂 Target: ${targetDir}\n`);

interface CodePattern {
  type: string;
  file: string;
  line: number;
  content: string;
}

interface LearningOpportunity {
  category: string;
  description: string;
  files: string[];
  priority: "high" | "medium" | "low";
}

interface MetacognitiveReport {
  timestamp: string;
  directory: string;
  stats: {
    totalFiles: number;
    totalLines: number;
    languages: Record<string, number>;
  };
  patterns: CodePattern[];
  learningOpportunities: LearningOpportunity[];
  infrastructureNeeded: string[];
}

// Step 1: Scan codebase
console.log("🔍 Phase 1: Scanning codebase...");
const glob = new Bun.Glob("**/*.{ts,tsx,js,jsx,py,go,rs,java,cpp,c,h}");
const files = await Array.fromAsync(glob.scan({ cwd: targetDir, onlyFiles: true }));

if (files.length === 0) {
  console.error("❌ No source files found in target directory");
  process.exit(1);
}

console.log(`   Found ${files.length} source files`);

// Step 2: Analyze patterns
console.log("\n🔬 Phase 2: Extracting patterns...");
const patterns: CodePattern[] = [];
const languages: Record<string, number> = {};
let totalLines = 0;

for (const file of files) {
  try {
    const fullPath = join(targetDir, file);
    const content = await Bun.file(fullPath).text();
    const lines = content.split("\n");
    totalLines += lines.length;

    // Track language distribution
    const ext = file.split(".").pop() || "unknown";
    languages[ext] = (languages[ext] || 0) + 1;

    // Extract learning patterns
    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Pattern: Self-referential functions (analyze, evaluate, improve, learn, synthesize)
      if (/\b(analyze|evaluate|improve|learn|synthesize|observe|reflect)\w*\s*\(/i.test(trimmed)) {
        patterns.push({
          type: "self-referential-function",
          file,
          line: idx + 1,
          content: trimmed.slice(0, 80),
        });
      }

      // Pattern: Metacognitive comments
      if (/\/\/.*\b(TODO|FIXME|OPTIMIZE|LEARN|IMPROVE)\b/i.test(trimmed)) {
        patterns.push({
          type: "metacognitive-comment",
          file,
          line: idx + 1,
          content: trimmed.slice(0, 80),
        });
      }

      // Pattern: Database/storage for learning
      if (/\b(database|store|persist|save|log).*\b(pattern|skill|learning|knowledge)\b/i.test(trimmed)) {
        patterns.push({
          type: "knowledge-persistence",
          file,
          line: idx + 1,
          content: trimmed.slice(0, 80),
        });
      }

      // Pattern: Pipeline/workflow definitions
      if (/\b(pipeline|workflow|sequence|chain|stage)\b/i.test(trimmed)) {
        patterns.push({
          type: "pipeline-structure",
          file,
          line: idx + 1,
          content: trimmed.slice(0, 80),
        });
      }
    });

    if (verbose && patterns.length > 0) {
      const filePatterns = patterns.filter(p => p.file === file);
      if (filePatterns.length > 0) {
        console.log(`   ${file}: ${filePatterns.length} patterns`);
      }
    }
  } catch (err) {
    if (verbose) console.warn(`   ⚠️  Could not read ${file}`);
  }
}

console.log(`   Extracted ${patterns.length} metacognitive patterns`);

// Step 3: Identify learning opportunities
console.log("\n💡 Phase 3: Identifying learning opportunities...");
const opportunities: LearningOpportunity[] = [];

// Check for synthesis database
const hasDatabase = patterns.some(p => p.type === "knowledge-persistence");
if (!hasDatabase) {
  opportunities.push({
    category: "Infrastructure",
    description: "No knowledge persistence layer detected. Need synthesis database for pattern storage.",
    files: [],
    priority: "high",
  });
}

// Check for self-referential functions
const selfRefFiles = new Set(
  patterns.filter(p => p.type === "self-referential-function").map(p => p.file)
);
if (selfRefFiles.size > 0) {
  opportunities.push({
    category: "Bootstrap",
    description: `${selfRefFiles.size} files contain self-referential logic that could feed metacognitive loops.`,
    files: Array.from(selfRefFiles),
    priority: "high",
  });
}

// Check for pipeline structures
const pipelineFiles = new Set(
  patterns.filter(p => p.type === "pipeline-structure").map(p => p.file)
);
if (pipelineFiles.size > 0) {
  opportunities.push({
    category: "Automation",
    description: `${pipelineFiles.size} files define pipelines that could be enhanced with learning capabilities.`,
    files: Array.from(pipelineFiles),
    priority: "medium",
  });
}

// Check for TODO/FIXME comments
const todoCount = patterns.filter(p => p.type === "metacognitive-comment").length;
if (todoCount > 0) {
  opportunities.push({
    category: "Improvement",
    description: `${todoCount} metacognitive comments suggest areas for self-improvement.`,
    files: Array.from(new Set(patterns.filter(p => p.type === "metacognitive-comment").map(p => p.file))),
    priority: "low",
  });
}

console.log(`   Identified ${opportunities.length} learning opportunities`);

// Step 4: Recommend infrastructure
console.log("\n🏗️  Phase 4: Infrastructure recommendations...");
const infrastructureNeeded: string[] = [];

if (!hasDatabase) {
  infrastructureNeeded.push("Synthesis Database (SQLite/JSON) for pattern storage");
}

if (patterns.length > 0 && selfRefFiles.size === 0) {
  infrastructureNeeded.push("Pattern Extraction Pipeline with self-referential hooks");
}

if (pipelineFiles.size === 0) {
  infrastructureNeeded.push("Workflow Orchestration System for autonomous learning loops");
}

infrastructureNeeded.push("Skill Generation Logic to convert patterns into executable code");
infrastructureNeeded.push("Observation Layer to monitor system behavior");

console.log(`   ${infrastructureNeeded.length} infrastructure components recommended`);

// Generate report
const report: MetacognitiveReport = {
  timestamp: new Date().toISOString(),
  directory: targetDir,
  stats: {
    totalFiles: files.length,
    totalLines,
    languages,
  },
  patterns,
  learningOpportunities: opportunities,
  infrastructureNeeded,
};

// Save report
await Bun.write(outputFile, JSON.stringify(report, null, 2));
console.log(`\n💾 Report saved to: ${outputFile}`);

// Display summary
console.log("\n" + "=".repeat(60));
console.log("📊 METACOGNITIVE ANALYSIS SUMMARY");
console.log("=".repeat(60));

console.log("\n📈 Statistics:");
console.log(`   • Files analyzed: ${report.stats.totalFiles}`);
console.log(`   • Total lines: ${report.stats.totalLines.toLocaleString()}`);
console.log(`   • Languages: ${Object.keys(languages).join(", ")}`);

console.log("\n🔍 Pattern Discovery:");
const patternTypes = patterns.reduce((acc, p) => {
  acc[p.type] = (acc[p.type] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

for (const [type, count] of Object.entries(patternTypes)) {
  console.log(`   • ${type}: ${count}`);
}

console.log("\n💡 Learning Opportunities:");
for (const opp of opportunities) {
  const icon = opp.priority === "high" ? "🔴" : opp.priority === "medium" ? "🟡" : "🟢";
  console.log(`   ${icon} [${opp.category}] ${opp.description}`);
  if (verbose && opp.files.length > 0) {
    console.log(`      Files: ${opp.files.slice(0, 3).join(", ")}${opp.files.length > 3 ? "..." : ""}`);
  }
}

console.log("\n🏗️  Infrastructure Needed:");
for (const item of infrastructureNeeded) {
  console.log(`   • ${item}`);
}

// Step 5: Generate infrastructure files
if (shouldGenerate) {
  console.log("\n⚙️  Phase 5: Generating infrastructure...");

  const synthDbPath = join(targetDir, "synthesis-db.json");
  const pipelinePath = join(targetDir, "metacognitive-pipeline.ts");
  const skillGenPath = join(targetDir, "skill-generator.ts");

  // Generate synthesis database schema
  const synthDb = {
    version: "1.0.0",
    created: new Date().toISOString(),
    patterns: patterns.map(p => ({
      type: p.type,
      location: `${p.file}:${p.line}`,
      content: p.content,
      extracted: new Date().toISOString(),
    })),
    skills: [],
    learnings: [],
  };

  await Bun.write(synthDbPath, JSON.stringify(synthDb, null, 2));
  console.log(`   ✅ Created: ${relative(process.cwd(), synthDbPath)}`);

  // Generate pipeline template
  const pipelineCode = `// Auto-generated Metacognitive Pipeline
import { readdir } from "fs/promises";

export interface Pattern {
  type: string;
  location: string;
  content: string;
  extracted: string;
}

export class MetacognitivePipeline {
  private dbPath: string;

  constructor(dbPath: string = "./synthesis-db.json") {
    this.dbPath = dbPath;
  }

  async observe(): Promise<Pattern[]> {
    // Phase 1: Observe system behavior
    console.log("👁️  Observing system behavior...");
    // TODO: Implement observation logic
    return [];
  }

  async synthesize(patterns: Pattern[]): Promise<void> {
    // Phase 2: Synthesize patterns into skills
    console.log("🧠 Synthesizing patterns...");
    const db = await Bun.file(this.dbPath).json();
    db.patterns.push(...patterns);
    await Bun.write(this.dbPath, JSON.stringify(db, null, 2));
  }

  async improve(): Promise<void> {
    // Phase 3: Apply improvements
    console.log("🚀 Applying improvements...");
    // TODO: Implement self-improvement logic
  }

  async run() {
    const patterns = await this.observe();
    await this.synthesize(patterns);
    await this.improve();
    console.log("✅ Metacognitive cycle complete");
  }
}

// Run if called directly
if (import.meta.main) {
  const pipeline = new MetacognitivePipeline();
  await pipeline.run();
}
`;

  await Bun.write(pipelinePath, pipelineCode);
  console.log(`   ✅ Created: ${relative(process.cwd(), pipelinePath)}`);

  // Generate skill generator template
  const skillGenCode = `// Auto-generated Skill Generator
export interface Skill {
  name: string;
  pattern: string;
  implementation: string;
}

export class SkillGenerator {
  generate(patternType: string, examples: string[]): Skill {
    // Convert observed patterns into executable skills
    console.log(\`🎯 Generating skill from pattern: \${patternType}\`);
    
    return {
      name: \`auto-\${patternType}\`,
      pattern: patternType,
      implementation: \`// Auto-generated from \${examples.length} examples\`,
    };
  }

  async persist(skill: Skill, dbPath: string): Promise<void> {
    const db = await Bun.file(dbPath).json();
    db.skills.push(skill);
    await Bun.write(dbPath, JSON.stringify(db, null, 2));
    console.log(\`💾 Skill '\${skill.name}' saved to database\`);
  }
}
`;

  await Bun.write(skillGenPath, skillGenCode);
  console.log(`   ✅ Created: ${relative(process.cwd(), skillGenPath)}`);

  console.log("\n🎉 Infrastructure generation complete!");
  console.log("\n📝 Next steps:");
  console.log("   1. Review generated files");
  console.log("   2. Implement TODO items in metacognitive-pipeline.ts");
  console.log("   3. Run: bun metacognitive-pipeline.ts");
  console.log("   4. Begin autonomous learning phase");
}

console.log("\n" + "=".repeat(60));
console.log("✨ Analysis complete! Review the report for insights.");
if (!shouldGenerate) {
  console.log("💡 Tip: Use -g flag to generate infrastructure files");
}
console.log("=".repeat(60) + "\n");
