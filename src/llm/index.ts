/**
 * LLM Analysis Module
 * Uses Claude Agent SDK with structured outputs (Zod schemas) for type-safe parsing
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { Memory } from '../types/memory.ts';
import type { Thesis, Antithesis, Synthesis } from '../types/dialectic.ts';

/**
 * Check if LLM analysis is available
 */
export async function isLLMAvailable(): Promise<boolean> {
  return isSdkAvailable();
}

// ============ Zod Schemas for Structured Output ============

const PatternAnalysisSchema = z.object({
  insight: z.string().describe('One sentence describing what the user is trying to accomplish and why'),
  concepts: z.array(z.string()).describe('Key concepts like: how-it-works, pattern, decision, trade-off'),
  observationType: z.enum(['discovery', 'pattern', 'decision', 'change', 'gotcha']).describe('The type of observation'),
  confidence: z.number().min(0).max(1).describe('Confidence score from 0.0 to 1.0'),
});

const ContradictionAnalysisSchema = z.object({
  explanation: z.string().describe('Why does the new evidence contradict the thesis?'),
  contextFactors: z.array(z.string()).describe('Factors that explain when each approach applies'),
  resolutionHint: z.string().describe('How might these be reconciled?'),
});

const SynthesisAnalysisSchema = z.object({
  resolution: z.string().describe('A clear statement of when and how to apply this pattern'),
  conditions: z.array(z.string()).describe('Conditions that determine which approach to use'),
  abstractedPattern: z.string().describe('A higher-level principle that encompasses both thesis and antitheses'),
});

const SkillStepSchema = z.object({
  action: z.string().describe('Brief action verb phrase like "Identify Entry Points" or "Deep Analysis"'),
  details: z.string().describe('1-3 sentences explaining how to perform this step, including which tool to use (Glob, Grep, Read, Bash) and what parameters/patterns to use'),
  toolHint: z.string().optional().describe('The primary tool to use for this step: Glob, Grep, Read, Bash, or "script" if running the bundled script'),
  conditional: z.string().optional().describe('If this step is conditional, describe when to use it (e.g., "If user mentions specific feature")'),
});

const SkillContentSchema = z.object({
  description: z.string().describe('A trigger-optimized description starting with "Use when..." that helps Claude recognize when to activate this skill'),
  triggerPhrases: z.array(z.string()).describe('3-5 specific phrases users might say that should activate this skill'),
  instructions: z.string().describe('2-4 sentences explaining how to use this skill'),
  whenToUse: z.array(z.string()).describe('Scenarios when this skill is useful, phrased as user intent patterns'),
  steps: z.array(SkillStepSchema).describe('3-6 procedural steps with explicit tool sequences Claude can follow'),
});

const UserGoalSchema = z.object({
  goal: z.string().describe('A 2-4 word hyphenated goal name like "understand-codebase" or "debug-failing-tests"'),
  goalDescription: z.string().describe('One sentence describing what the user is trying to accomplish'),
  category: z.enum(['exploration', 'implementation', 'debugging', 'refactoring', 'testing', 'documentation', 'deployment', 'other']).describe('The category of the goal'),
});

const IntelligencePointSchema = z.object({
  purpose: z.string().describe('What this intelligence point does (e.g., "generates commit message")'),
  location: z.string().describe('Where in the workflow (e.g., "after gathering git diff")'),
});

const SkillScriptSchema = z.object({
  script: z.string().describe('A complete, executable Bun/TypeScript script that implements the skill workflow'),
  explanation: z.string().describe('Brief explanation of what the script does and how to use it'),
  intelligencePoints: z.array(IntelligencePointSchema).optional().describe('List of intelligence points where LLM reasoning is used (empty if fully deterministic)'),
});

const OutputTypeAnalysisSchema = z.object({
  outputType: z.enum(['rule', 'skill', 'rule_with_skill', 'none']).describe('The type of output to generate'),
  reasoning: z.string().describe('Why this output type was chosen'),
  decisionConfidence: z.number().min(0).max(1).describe('Confidence in this decision (0-1)'),
  isImperative: z.boolean().describe('Does the content contain imperative language like "always", "never", "must"?'),
  isProcedural: z.boolean().describe('Does the content describe multi-step procedures?'),
});

// Export inferred types
export type PatternAnalysis = z.infer<typeof PatternAnalysisSchema>;
export type ContradictionAnalysis = z.infer<typeof ContradictionAnalysisSchema>;
export type SynthesisAnalysis = z.infer<typeof SynthesisAnalysisSchema>;
export type SkillContent = z.infer<typeof SkillContentSchema>;
export type UserGoal = z.infer<typeof UserGoalSchema>;
export type SkillScript = z.infer<typeof SkillScriptSchema>;
export type LLMOutputTypeAnalysis = z.infer<typeof OutputTypeAnalysisSchema>;

// ============ Analysis Functions ============

/**
 * Analyze a group of memories to extract pattern insights
 */
export async function analyzePattern(
  memories: Memory[]
): Promise<PatternAnalysis> {
  const memorySummaries = memories.map(m => {
    const tool = m.metadata.toolName || 'unknown';
    const tags = m.metadata.tags.join(', ');
    return `- ${tool}: ${m.content.substring(0, 200)}... [tags: ${tags}]`;
  }).join('\n');

  const prompt = `Analyze these tool usage memories and identify the underlying pattern.

<memories>
${memorySummaries}
</memories>

Identify:
- What the user is trying to accomplish and why
- Key concepts involved
- The type of observation (discovery, pattern, decision, change, or gotcha)
- Your confidence level (0.0 to 1.0)`;

  const result = await queryWithSchema(prompt, PatternAnalysisSchema);
  return result;
}

/**
 * Analyze a contradiction between thesis and new evidence
 */
export async function analyzeContradiction(
  thesis: Thesis,
  contradictingMemory: Memory,
  context: Memory[]
): Promise<ContradictionAnalysis> {
  const contextSummary = context.map(m =>
    `- ${m.metadata.toolName}: ${m.content.substring(0, 100)}...`
  ).join('\n');

  const prompt = `A pattern has been contradicted. Explain why.

<thesis>
${thesis.content}
</thesis>

<contradicting_evidence>
Tool: ${contradictingMemory.metadata.toolName}
${contradictingMemory.content.substring(0, 300)}
Tags: ${contradictingMemory.metadata.tags.join(', ')}
</contradicting_evidence>

<context>
${contextSummary}
</context>

Analyze why the evidence contradicts the thesis, what context factors explain when each approach applies, and how they might be reconciled.`;

  const result = await queryWithSchema(prompt, ContradictionAnalysisSchema);
  return result;
}

/**
 * Generate a synthesis from thesis and antitheses
 */
export async function analyzeSynthesis(
  thesis: Thesis,
  antitheses: Antithesis[],
  exemplarMemories: Memory[]
): Promise<SynthesisAnalysis> {
  const antithesesSummary = antitheses.map(a => `- ${a.content}`).join('\n');
  const memorySummary = exemplarMemories.slice(0, 5).map(m =>
    `- ${m.metadata.toolName}: ${m.content.substring(0, 100)}...`
  ).join('\n');

  const prompt = `Synthesize a resolution from thesis and contradictions.

<thesis>
${thesis.content}
</thesis>

<antitheses>
${antithesesSummary}
</antitheses>

<evidence>
${memorySummary}
</evidence>

Create a synthesis that:
- Provides a clear statement of when and how to apply this pattern
- Lists conditions that determine which approach to use
- Abstracts a higher-level principle that encompasses both thesis and antitheses`;

  const result = await queryWithSchema(prompt, SynthesisAnalysisSchema);
  return result;
}

/**
 * Generate skill description and instructions
 */
export async function generateSkillContent(
  synthesis: Synthesis,
  exemplarMemories: Memory[],
  userGoal?: { goal: string; goalDescription: string }
): Promise<SkillContent> {
  const toolSequence = exemplarMemories
    .filter(m => m.metadata.toolName)
    .map(m => m.metadata.toolName)
    .join(' → ');

  const memorySummary = exemplarMemories.slice(0, 5).map(m =>
    `- ${m.metadata.toolName}: ${m.content.substring(0, 100)}...`
  ).join('\n');

  // Include user goal context if available
  const goalContext = userGoal
    ? `\n<user_goal>
The user's original intent: "${userGoal.goalDescription}"
Goal name: ${userGoal.goal}
</user_goal>\n`
    : '';

  const prompt = `Generate a TRIGGER-OPTIMIZED skill description from this learned pattern.

The description MUST help Claude Code RECOGNIZE when to automatically activate this skill.
${goalContext}
<synthesis>
${synthesis.content}
</synthesis>

<tool_sequence>
${toolSequence}
</tool_sequence>

<example_actions>
${memorySummary}
</example_actions>

Create:

## 1. Description (CRITICAL - This is how Claude decides to activate the skill)
The description MUST:
- Start with "Use when..."
- Include specific trigger phrases users would say:
  - Questions they might ask ("how does X work?", "what does this do?")
  - Commands they might give ("explain", "understand", "explore")
- Include the INTENT, not just the capability

Good examples:
- "Use when user asks 'how does X work', wants to understand unfamiliar code, or says 'explain this codebase'. Triggers on exploration intent."
- "Use when user wants to commit changes, asks 'create a commit', or says 'save my work'. Triggers on version control intent."

Bad examples:
- "Helps explore and understand codebases." (doesn't tell Claude WHEN to use it)
- "Reads files and searches code." (describes tools, not user intent)

## 2. Trigger Phrases
Generate 3-5 specific phrases a user might say that should activate this skill.
Focus on:
- Question patterns ("how does X work?", "what does this do?")
- Command patterns ("explain", "understand", "explore")
- Intent signals, not specific words

## 3. Instructions
2-4 sentences explaining how to use this skill to achieve the goal.

## 4. When to Use
Scenarios when this skill is useful, phrased as user intent patterns (e.g., "User asks 'how does [feature] work?'")

## 5. Steps (PROCEDURAL WORKFLOW)
Generate 3-6 steps that Claude can follow as an explicit workflow.

Each step MUST specify:
- Which tool to use (Glob, Grep, Read, Bash, or "script" for bundled scripts)
- What parameters/patterns to use
- What to do with the results

Include conditional branches for common variations using the 'conditional' field:
- "If user mentions specific feature..."
- "If debugging a specific issue..."
- "If comprehensive understanding needed..."

Good step example:
{
  "action": "Identify Entry Points",
  "details": "Use Glob with pattern '**/index.{ts,js}' OR '**/main.{ts,js}' OR '**/app.{ts,js}' to find entry points.",
  "toolHint": "Glob"
}

{
  "action": "Deep Analysis",
  "details": "For comprehensive analysis, run the bundled script: bun scripts/script.ts $TARGET_DIR",
  "toolHint": "script",
  "conditional": "When comprehensive understanding is needed"
}

Bad step example:
{
  "action": "Discover relevant files",
  "details": "Use glob patterns to find files..."
} (no specific tool or parameters)`;

  const result = await queryWithSchema(prompt, SkillContentSchema);

  // Post-process: ensure description ends with punctuation
  if (result.description && !/[.!?]$/.test(result.description.trim())) {
    result.description = result.description.trim() + '.';
  }

  return result;
}

/**
 * Extract the high-level user goal from user prompts and tool usage
 */
export async function extractUserGoal(
  userPrompts: string[],
  toolMemories: Memory[]
): Promise<UserGoal> {
  const promptList = userPrompts.map(p => `- "${p}"`).join('\n');

  const toolSummary = toolMemories.slice(0, 8).map(m => {
    const tool = m.metadata.toolName || 'unknown';
    const input = m.metadata.toolInput
      ? JSON.stringify(m.metadata.toolInput).substring(0, 100)
      : '';
    return `- ${tool}: ${input}`;
  }).join('\n');

  const prompt = `Analyze what the user was trying to accomplish based on their prompts and the tools used.

<user_prompts>
${promptList}
</user_prompts>

<tools_used>
${toolSummary}
</tools_used>

Extract:
1. A concise 2-4 word goal name using hyphens (like "understand-codebase", "fix-failing-tests", "implement-feature", "refactor-authentication")
2. A one-sentence description of what the user is trying to accomplish
3. The category of the goal

Focus on the HIGH-LEVEL INTENT, not the mechanical tool usage. For example:
- If user asked "what is index.ts for?" the goal is "understand-entrypoint" not "read-file"
- If user asked "why is the test failing?" the goal is "debug-test-failure" not "grep-pattern"
- If user asked "add authentication" the goal is "implement-authentication" not "edit-files"`;

  const result = await queryWithSchema(prompt, UserGoalSchema);
  return result;
}

// Schema for trigger phrase extraction
const TriggerPhrasesSchema = z.object({
  triggerPhrases: z.array(z.string()).describe('3-5 generalized trigger phrases that should activate this skill'),
  questionPatterns: z.array(z.string()).describe('Question patterns users might ask'),
  commandPatterns: z.array(z.string()).describe('Command patterns users might give'),
  intentSignals: z.array(z.string()).describe('Intent signals that indicate this skill should be used'),
});

export type TriggerPhrases = z.infer<typeof TriggerPhrasesSchema>;

/**
 * Extract generalizable trigger phrases from user prompts
 * These help Claude Code automatically recognize when to activate a skill
 */
export async function extractTriggerPhrases(
  userPrompts: string[],
  toolMemories: Memory[]
): Promise<TriggerPhrases> {
  const promptList = userPrompts.map(p => `- "${p}"`).join('\n');

  const toolSummary = toolMemories.slice(0, 5).map(m => {
    const tool = m.metadata.toolName || 'unknown';
    return `- ${tool}`;
  }).join('\n');

  const prompt = `Given these user prompts that triggered a workflow:

<user_prompts>
${promptList}
</user_prompts>

<tools_used>
${toolSummary}
</tools_used>

Extract generalizable trigger phrases that should activate this skill.

Focus on:
1. **Question patterns**: How users ask about things
   - "how does X work?"
   - "what does this do?"
   - "can you explain X?"

2. **Command patterns**: How users give instructions
   - "explain", "understand", "explore"
   - "find", "search", "look for"
   - "create", "add", "implement"

3. **Intent signals**: Words/phrases that indicate intent, not specific words
   - "unfamiliar code", "didn't write", "new to this"
   - "not working", "broken", "failing"
   - "improve", "optimize", "refactor"

IMPORTANT:
- Generalize from specific examples. "how does auth.ts work?" → "how does X work?"
- Focus on intent patterns, not specific file/function names
- Include both question and command forms
- Each phrase should be short (3-7 words)`;

  const result = await queryWithSchema(prompt, TriggerPhrasesSchema);
  return result;
}

/**
 * Analyze synthesis content to determine the optimal output type using LLM
 * Called when heuristic confidence is below threshold (< 0.7)
 */
export async function analyzeOutputType(
  synthesisContent: string,
  resolutionType: string,
  toolNames: string[],
  exemplarCount: number
): Promise<LLMOutputTypeAnalysis> {
  const prompt = `Analyze this synthesis to determine what type of output should be generated.

<synthesis_content>
${synthesisContent}
</synthesis_content>

<resolution_type>${resolutionType}</resolution_type>

<tools_involved>${toolNames.join(', ') || 'None specified'}</tools_involved>

<exemplar_memories>${exemplarCount}</exemplar_memories>

Determine the appropriate output type:

**rule**: Generate ONLY when the synthesis describes MANDATORY behaviors that should ALWAYS or NEVER be done.
- Contains imperatives: "always", "never", "must", "required", "ensure before X"
- Describes constraints, not procedures
- Examples: "Always run tests before committing", "Never commit secrets"

**skill**: Generate ONLY when the synthesis describes an OPTIONAL PROCEDURE with multiple steps.
- Describes HOW to do something, not WHEN something must be done
- Multi-step workflow with distinct phases
- Uses multiple tools in sequence
- Examples: "How to debug memory leaks", "Workflow for reviewing PRs"

**rule_with_skill**: Generate when there's BOTH a mandatory behavior AND a complex procedure.
- The rule specifies WHEN (mandatory trigger)
- The skill specifies HOW (procedure to follow)
- Example: "Before releasing (rule), follow the deployment checklist (skill)"

**none**: Generate when the resolution is a rejection or confidence is too low.

Be conservative - most syntheses should be simple rules. Only choose 'skill' or 'rule_with_skill' for genuinely procedural, multi-step workflows.`;

  const result = await queryWithSchema(prompt, OutputTypeAnalysisSchema);
  return result;
}

/**
 * Structured tool operation for script generation
 */
interface ToolOperation {
  tool: string;
  params?: Record<string, unknown>;
  description?: string;
}

/**
 * Analyze tool operations to extract the generalizable pattern
 */
function analyzeToolPattern(operations: ToolOperation[]): {
  workflow: string;
  keyOperations: string[];
  filePatterns: string[];
  searchPatterns: string[];
} {
  const toolCounts: Record<string, number> = {};
  const filePatterns = new Set<string>();
  const searchPatterns = new Set<string>();
  const workflow: string[] = [];

  for (const op of operations) {
    toolCounts[op.tool] = (toolCounts[op.tool] || 0) + 1;

    // Extract generalizable patterns from specific paths/commands
    if (op.params) {
      // File patterns
      if (typeof op.params.file_path === 'string') {
        const path = op.params.file_path as string;
        // Extract directory patterns: src/*, types/*, etc.
        const dirMatch = path.match(/\/([a-z-]+)\//gi);
        if (dirMatch) {
          dirMatch.forEach(d => filePatterns.add(d.replace(/\//g, '')));
        }
        // Extract file type patterns
        const extMatch = path.match(/\.(ts|tsx|js|jsx|json|md)$/);
        if (extMatch) filePatterns.add(`*.${extMatch[1]}`);
      }

      // Glob patterns
      if (typeof op.params.pattern === 'string') {
        searchPatterns.add(op.params.pattern as string);
      }

      // Grep patterns
      if (typeof op.params.pattern === 'string' && op.tool === 'Grep') {
        searchPatterns.add(`search: ${op.params.pattern}`);
      }

      // Bash commands - extract the action, not specific paths
      if (typeof op.params.command === 'string') {
        const cmd = op.params.command as string;
        const action = cmd.split(' ')[0] || '';
        if (action && !workflow.includes(action)) workflow.push(action);
      }
    }
  }

  // Determine workflow phases
  const keyOperations: string[] = [];
  if (toolCounts['Glob'] || toolCounts['Grep']) {
    keyOperations.push('Discovery: Find relevant files/patterns');
  }
  if (toolCounts['Read']) {
    keyOperations.push(`Analysis: Read and understand ${toolCounts['Read']} file(s)`);
  }
  if (toolCounts['Bash']) {
    keyOperations.push('Execution: Run commands');
  }
  if (toolCounts['Edit'] || toolCounts['Write']) {
    keyOperations.push('Modification: Update files');
  }

  return {
    workflow: keyOperations.join(' → '),
    keyOperations,
    filePatterns: [...filePatterns],
    searchPatterns: [...searchPatterns],
  };
}

/**
 * Generate an intelligent, executable script for a skill
 * This creates a real workflow, not a dumb replay of tool calls
 */
export async function generateSkillScript(
  skillName: string,
  goalDescription: string,
  synthesisContent: string,
  exampleToolUsage: Array<{ tool: string; description?: string; parameters?: Record<string, unknown> }>
): Promise<SkillScript> {
  // Convert to structured operations
  const operations: ToolOperation[] = exampleToolUsage.map(t => ({
    tool: t.tool,
    params: t.parameters,
    description: t.description,
  }));

  // Analyze to extract generalizable pattern
  const pattern = analyzeToolPattern(operations);

  // Build structured tool summary - show what was done, not exact paths
  const toolSummary = operations.length > 0
    ? operations.slice(0, 15).map(op => {
        if (op.tool === 'Read' && op.params?.file_path) {
          const path = String(op.params.file_path);
          const fileName = path.split('/').pop() || path;
          const dir = path.split('/').slice(-2, -1)[0] || '';
          return `Read: ${dir}/${fileName}`;
        }
        if (op.tool === 'Glob' && op.params?.pattern) {
          return `Glob: ${op.params.pattern}`;
        }
        if (op.tool === 'Grep' && op.params?.pattern) {
          return `Grep: "${op.params.pattern}"`;
        }
        if (op.tool === 'Bash' && op.params?.command) {
          const cmd = String(op.params.command);
          return `Bash: ${cmd.length > 50 ? cmd.substring(0, 50) + '...' : cmd}`;
        }
        return `${op.tool}`;
      }).join('\n')
    : '(No specific tool data available - infer from the learned pattern description)';

  // Build prompt with or without tool data
  const hasToolData = operations.length > 0;
  const prompt = `Generate a USEFUL Bun/TypeScript CLI tool that implements this learned skill.

<skill_name>${skillName}</skill_name>

<goal>${goalDescription}</goal>

<learned_pattern>
${synthesisContent}
</learned_pattern>
${hasToolData ? `
<tool_sequence>
${toolSummary}
</tool_sequence>

<abstracted_workflow>
${pattern.workflow}
</abstracted_workflow>

<file_patterns_observed>
${pattern.filePatterns.join(', ') || 'Various source files'}
</file_patterns_observed>` : `
<note>
No specific tool usage data is available. Generate a script based ONLY on the skill name,
goal description, and learned pattern. The script should implement the pattern described
using reasonable Bun APIs (Bun.Glob, Bun.file, etc.) for a generic TypeScript/JavaScript codebase.
</note>`}

<search_patterns_observed>
${pattern.searchPatterns.join(', ') || 'None specific'}
</search_patterns_observed>

CRITICAL: Generate a script that provides REAL VALUE. The script must:

1. **Be genuinely useful** - Not just print instructions, but DO something:
   - If the skill involves exploration: scan files, analyze patterns, produce a report
   - If the skill involves modification: make actual changes with confirmation
   - If the skill involves search: find and display results

2. **Generalize from the examples** - Don't hardcode specific paths:
   - If examples read "src/dialectic/thesis.ts", the script should discover files matching patterns
   - If examples searched for "function xyz", the script should search for configurable patterns

3. **Produce actionable output** - Console output should be:
   - Structured (sections, lists, counts)
   - Informative (what was found, what it means)
   - Actionable (next steps, suggestions)

Example of a BAD script (just prints instructions):
\`\`\`
console.log("To explore a codebase:");
console.log("1. Read the README");
console.log("2. Look at the entry point");
\`\`\`

Example of a GOOD script (actually does something):
\`\`\`
const files = await glob.scan({ cwd: targetDir, pattern: "**/*.ts" });
const entryPoints = files.filter(f => f.includes("index.") || f.includes("main."));
console.log(\`Found \${entryPoints.length} entry points:\`);
for (const entry of entryPoints) {
  const content = await Bun.file(entry).text();
  const exports = content.match(/export .+/g)?.length || 0;
  console.log(\`  \${entry}: \${exports} exports\`);
}
\`\`\`

## Intelligence Points (Hybrid Scripts)

Your script can use the \`intelligence()\` function to inject LLM reasoning where deterministic code isn't enough:

\`\`\`typescript
import { intelligence, intelligenceWithSchema, decide, z } from 'engram/skill-runtime';

// Simple text response - for generating human-readable output
const summary = await intelligence("Summarize these findings", { data: JSON.stringify(results) });

// Structured response - for typed data
const ReviewSchema = z.object({
  issues: z.array(z.string()),
  approved: z.boolean(),
});
const review = await intelligenceWithSchema("Review this code", ReviewSchema, { code });

// Yes/no decision
const shouldInclude = await decide("Should we include test files?", { context: fileList });
\`\`\`

**When to use intelligence points:**
- Generating human-readable text (commit messages, summaries, explanations)
- Making judgment calls (is this code safe? should we include this file?)
- Synthesizing information from multiple sources
- Naming things (variables, files, branches)
- Code review or analysis that requires reasoning

**When NOT to use intelligence points (use deterministic code):**
- File discovery and reading
- Running shell commands
- Parsing structured data (JSON, YAML)
- Mathematical operations
- String manipulation with known patterns

Example of a GOOD hybrid script:
\`\`\`typescript
// Deterministic: gather data
const diff = await $\`git diff --cached\`.text();
const status = await $\`git status --porcelain\`.text();

// Intelligence point: generate commit message (requires judgment)
const message = await intelligence(
  "Generate a concise git commit message following conventional commits format",
  { diff, status }
);

// Deterministic: execute with the generated message
await $\`git commit -m \${message}\`;
\`\`\`

Requirements:
- Use Bun APIs: Bun.file(), Bun.Glob, Bun.$\`cmd\`
- Accept target directory as first argument (default to cwd)
- Include --help flag support
- Use parseArgs from "util" for argument parsing
- Have proper error handling
- Make the output visually clear with emoji/formatting
- Use intelligence points ONLY where LLM reasoning adds value (not for mechanical tasks)

Start with: #!/usr/bin/env bun`;

  const result = await queryWithSchema(prompt, SkillScriptSchema);
  return result;
}

// ============ Claude Agent SDK Integration ============

let sdkAvailable: boolean | null = null;

/**
 * Check if Agent SDK is available (just try to use it)
 */
async function isSdkAvailable(): Promise<boolean> {
  // SDK is always available - it handles auth internally
  return true;
}

/**
 * Convert Zod schema to SDK-compatible JSON Schema
 */
function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  // Remove fields that may cause issues with the SDK
  delete jsonSchema.$schema;
  delete jsonSchema.additionalProperties;
  return jsonSchema;
}

/**
 * Query Claude via Agent SDK with structured output using Zod schema
 */
async function queryWithSchema<T extends z.ZodType>(
  prompt: string,
  schema: T
): Promise<z.infer<T>> {
  if (!(await isSdkAvailable())) {
    throw new Error('Claude Agent SDK not available');
  }

  const jsonSchema = zodToJsonSchema(schema);

  for await (const message of query({
    prompt,
    options: {
      allowedTools: [],
      maxTurns: 5, // Needs extra turns for structured output validation
      outputFormat: {
        type: 'json_schema',
        schema: jsonSchema,
      },
    },
  })) {
    // Get structured output from result message
    if (message.type === 'result') {
      if (message.subtype === 'success' && message.structured_output) {
        // Validate with Zod for type safety
        const parsed = schema.safeParse(message.structured_output);
        if (parsed.success) {
          return parsed.data;
        }
        throw new Error(`Schema validation failed: ${parsed.error.message}`);
      } else if (message.subtype === 'error_max_structured_output_retries') {
        throw new Error('Could not produce valid structured output');
      }
    }
  }

  throw new Error('No result message received');
}

