#!/usr/bin/env bun

/**
 * Meta-Learning Mode Switcher
 * 
 * Dynamically switches between breadth-first exploration and depth-first implementation
 * modes to optimize meta-learning system development.
 */

import { parseArgs } from "util";
import { join, relative } from "path";

interface AnalysisResult {
  mode: "explore" | "exploit";
  confidence: number;
  reasoning: string;
  suggestedActions: string[];
  metrics: {
    unknownPatterns: number;
    implementationDepth: number;
    metaLearningSignals: number;
  };
}

interface FileContext {
  path: string;
  type: "source" | "test" | "config" | "docs" | "meta";
  complexity: number;
  isMetaLearning: boolean;
}

async function analyzeCodebase(targetDir: string): Promise<FileContext[]> {
  const contexts: FileContext[] = [];
  
  // Discover all relevant files
  const patterns = [
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx",
    "**/*.json",
    "**/*.md"
  ];
  
  for (const pattern of patterns) {
    const glob = new Bun.Glob(pattern);
    for await (const file of glob.scan({ cwd: targetDir, onlyFiles: true })) {
      // Skip node_modules and hidden dirs
      if (file.includes("node_modules") || file.includes("/.")) continue;
      
      const fullPath = join(targetDir, file);
      const content = await Bun.file(fullPath).text();
      
      const context: FileContext = {
        path: file,
        type: classifyFileType(file, content),
        complexity: estimateComplexity(content),
        isMetaLearning: detectMetaLearningSignals(content)
      };
      
      contexts.push(context);
    }
  }
  
  return contexts;
}

function classifyFileType(path: string, content: string): FileContext["type"] {
  if (path.includes("test") || path.includes("spec")) return "test";
  if (path.endsWith(".json") || path.includes("config")) return "config";
  if (path.endsWith(".md")) return "docs";
  if (detectMetaLearningSignals(content)) return "meta";
  return "source";
}

function estimateComplexity(content: string): number {
  let score = 0;
  
  // Count decision points
  score += (content.match(/\bif\b|\bswitch\b|\bcase\b/g) || []).length;
  
  // Count loops
  score += (content.match(/\bfor\b|\bwhile\b|\bdo\b/g) || []).length * 2;
  
  // Count function definitions
  score += (content.match(/function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>/g) || []).length;
  
  // Count async operations
  score += (content.match(/\basync\b|\bawait\b|\bPromise\b/g) || []).length;
  
  return score;
}

function detectMetaLearningSignals(content: string): boolean {
  const metaKeywords = [
    "meta-learning",
    "pattern",
    "skill",
    "learn",
    "adapt",
    "explore",
    "exploit",
    "analysis",
    "generator",
    "template",
    "workflow"
  ];
  
  const contentLower = content.toLowerCase();
  return metaKeywords.some(keyword => contentLower.includes(keyword));
}

async function analyzeRecentChanges(targetDir: string): Promise<{
  hasRecentMeta: boolean;
  hasRecentBugs: boolean;
  focusAreas: string[];
}> {
  try {
    // Check git log for recent activity
    const gitLog = await Bun.$`git -C ${targetDir} log --since="7 days ago" --pretty=format:"%s" --name-only`.text();
    
    const hasRecentMeta = /meta|pattern|skill|learn/i.test(gitLog);
    const hasRecentBugs = /fix|bug|error|issue/i.test(gitLog);
    
    // Extract focus areas from commit messages
    const commits = gitLog.split("\n\n");
    const focusAreas = commits
      .filter(c => c.trim())
      .map(c => c.split("\n")[0])
      .slice(0, 5);
    
    return { hasRecentMeta, hasRecentBugs, focusAreas };
  } catch {
    return { hasRecentMeta: false, hasRecentBugs: false, focusAreas: [] };
  }
}

async function determineMode(targetDir: string): Promise<AnalysisResult> {
  console.log("🔍 Analyzing codebase structure...\n");
  
  const contexts = await analyzeCodebase(targetDir);
  const recentChanges = await analyzeRecentChanges(targetDir);
  
  // Calculate metrics
  const metaFiles = contexts.filter(c => c.isMetaLearning);
  const sourceFiles = contexts.filter(c => c.type === "source");
  const avgComplexity = contexts.reduce((sum, c) => sum + c.complexity, 0) / contexts.length;
  
  // Heuristics for mode determination
  let exploreScore = 0;
  let exploitScore = 0;
  
  // Factor 1: Meta-learning infrastructure maturity
  if (metaFiles.length === 0) {
    exploreScore += 30; // Need to discover what to build
  } else if (metaFiles.length < 3) {
    exploitScore += 20; // Have some infrastructure, should build it out
  } else {
    exploreScore += 10; // Mature system, explore for improvements
  }
  
  // Factor 2: Recent activity
  if (recentChanges.hasRecentBugs) {
    exploitScore += 25; // Focus on fixing
  }
  if (recentChanges.hasRecentMeta) {
    exploitScore += 15; // Continue implementation work
  }
  
  // Factor 3: Code complexity
  if (avgComplexity > 20) {
    exploreScore += 15; // High complexity suggests need for understanding
  } else if (avgComplexity < 10) {
    exploreScore += 20; // Low complexity suggests early stage, explore more
  }
  
  // Factor 4: Test coverage
  const testFiles = contexts.filter(c => c.type === "test");
  const testRatio = testFiles.length / sourceFiles.length;
  if (testRatio < 0.3) {
    exploitScore += 20; // Need to implement tests
  }
  
  // Factor 5: Documentation
  const docFiles = contexts.filter(c => c.type === "docs");
  if (docFiles.length < metaFiles.length) {
    exploreScore += 10; // Undocumented patterns need exploration
  }
  
  const mode = exploreScore > exploitScore ? "explore" : "exploit";
  const confidence = Math.abs(exploreScore - exploitScore) / (exploreScore + exploitScore);
  
  // Generate reasoning and actions
  const reasoning = generateReasoning(mode, {
    metaFiles: metaFiles.length,
    sourceFiles: sourceFiles.length,
    avgComplexity,
    testRatio,
    recentChanges
  });
  
  const suggestedActions = generateActions(mode, contexts, recentChanges);
  
  return {
    mode,
    confidence,
    reasoning,
    suggestedActions,
    metrics: {
      unknownPatterns: exploreScore > 30 ? Math.floor(exploreScore / 10) : 0,
      implementationDepth: metaFiles.length,
      metaLearningSignals: metaFiles.length + (recentChanges.hasRecentMeta ? 1 : 0)
    }
  };
}

function generateReasoning(mode: string, data: any): string {
  if (mode === "explore") {
    const reasons = [];
    if (data.metaFiles < 3) reasons.push("Limited meta-learning infrastructure detected");
    if (data.avgComplexity > 20) reasons.push("High code complexity requires architectural understanding");
    if (data.avgComplexity < 10) reasons.push("Early-stage codebase needs pattern discovery");
    return reasons.join(". ") + ".";
  } else {
    const reasons = [];
    if (data.recentChanges.hasRecentBugs) reasons.push("Recent bug fixes indicate refinement phase");
    if (data.recentChanges.hasRecentMeta) reasons.push("Active meta-learning development in progress");
    if (data.testRatio < 0.3) reasons.push("Low test coverage needs implementation work");
    return reasons.join(". ") + ".";
  }
}

function generateActions(mode: string, contexts: FileContext[], changes: any): string[] {
  if (mode === "explore") {
    const actions = [
      "Survey codebase architecture and identify key patterns",
      "Map relationships between components and modules",
      "Document discovered patterns and architectural decisions"
    ];
    
    const metaFiles = contexts.filter(c => c.isMetaLearning);
    if (metaFiles.length > 0) {
      actions.push(`Analyze existing meta-learning files: ${metaFiles.slice(0, 3).map(f => f.path).join(", ")}`);
    }
    
    actions.push("Identify opportunities for meta-learning improvements");
    return actions;
  } else {
    const actions = [
      "Implement or refine specific meta-learning components",
      "Add tests for meta-learning infrastructure",
      "Fix bugs and improve error handling"
    ];
    
    if (changes.focusAreas.length > 0) {
      actions.push(`Continue work on: ${changes.focusAreas[0]}`);
    }
    
    actions.push("Iterate on existing patterns based on feedback");
    return actions;
  }
}

async function generateReport(targetDir: string, result: AnalysisResult) {
  console.log("=" .repeat(70));
  console.log("🧠 META-LEARNING MODE ANALYSIS");
  console.log("=" .repeat(70));
  console.log();
  
  console.log(`📂 Target: ${targetDir}`);
  console.log(`🎯 Recommended Mode: ${result.mode.toUpperCase()}`);
  console.log(`📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log();
  
  console.log("💭 Reasoning:");
  console.log(`   ${result.reasoning}`);
  console.log();
  
  console.log("📈 Metrics:");
  console.log(`   • Unknown Patterns: ${result.metrics.unknownPatterns}`);
  console.log(`   • Implementation Depth: ${result.metrics.implementationDepth}`);
  console.log(`   • Meta-Learning Signals: ${result.metrics.metaLearningSignals}`);
  console.log();
  
  console.log("✅ Suggested Actions:");
  result.suggestedActions.forEach((action, i) => {
    console.log(`   ${i + 1}. ${action}`);
  });
  console.log();
  
  if (result.mode === "explore") {
    console.log("🔭 BREADTH-FIRST EXPLORATION MODE");
    console.log("   Focus on discovering patterns and building understanding.");
    console.log("   Use tools: code search, dependency analysis, pattern matching.");
  } else {
    console.log("🛠️  DEPTH-FIRST IMPLEMENTATION MODE");
    console.log("   Focus on building and refining specific capabilities.");
    console.log("   Use tools: testing, debugging, iterative development.");
  }
  console.log();
  console.log("=" .repeat(70));
}

// Main execution
const args = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    dir: { type: "string", short: "d" },
    json: { type: "boolean" }
  },
  allowPositionals: true
});

const targetDir = args.values.dir || args.positionals[0] || process.cwd();

try {
  const result = await determineMode(targetDir);
  
  if (args.values.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    await generateReport(targetDir, result);
  }
  
  process.exit(0);
} catch (error) {
  console.error("❌ Error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}