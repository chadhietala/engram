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
  action: z.string().describe('Brief action verb phrase like "Discover relevant files"'),
  details: z.string().describe('1-2 sentences explaining how to perform this step'),
});

const SkillContentSchema = z.object({
  description: z.string().describe('One sentence describing what this skill does'),
  instructions: z.string().describe('2-4 sentences explaining how to use this skill'),
  whenToUse: z.array(z.string()).describe('Scenarios when this skill is useful'),
  steps: z.array(SkillStepSchema).describe('3-6 clear steps for executing this skill'),
});

const UserGoalSchema = z.object({
  goal: z.string().describe('A 2-4 word hyphenated goal name like "understand-codebase" or "debug-failing-tests"'),
  goalDescription: z.string().describe('One sentence describing what the user is trying to accomplish'),
  category: z.enum(['exploration', 'implementation', 'debugging', 'refactoring', 'testing', 'documentation', 'deployment', 'other']).describe('The category of the goal'),
});

const SkillScriptSchema = z.object({
  script: z.string().describe('A complete, executable Bun/TypeScript script that implements the skill workflow'),
  explanation: z.string().describe('Brief explanation of what the script does and how to use it'),
});

// Export inferred types
export type PatternAnalysis = z.infer<typeof PatternAnalysisSchema>;
export type ContradictionAnalysis = z.infer<typeof ContradictionAnalysisSchema>;
export type SynthesisAnalysis = z.infer<typeof SynthesisAnalysisSchema>;
export type SkillContent = z.infer<typeof SkillContentSchema>;
export type UserGoal = z.infer<typeof UserGoalSchema>;
export type SkillScript = z.infer<typeof SkillScriptSchema>;

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

  const prompt = `Generate a skill description from this learned pattern.
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
- A one-sentence description that focuses on the USER'S GOAL (what they're trying to accomplish), not just the tools used. MUST end with a period.
- 2-4 sentences explaining how to use this skill to achieve that goal
- A list of scenarios when this skill is useful
- 3-6 clear, actionable steps for executing this skill (each step should have an action phrase and brief details)

IMPORTANT:
1. Frame the description around the user's intent and outcome, not the mechanical tool operations. For example:
   - Good: "Helps you understand how a feature is implemented across multiple files"
   - Bad: "Reads files using the Read tool and searches with Grep"
2. Steps should be concrete and actionable, not just repeating the tool sequence. Focus on the logical workflow:
   - Good: "Discover relevant files" with details "Use glob patterns or keyword search to find files related to the target functionality"
   - Bad: "Use Grep tool" with details "Call the Grep tool"
3. Keep steps at 3-6 items - enough detail to be useful but not overwhelming`;

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

/**
 * Generate an intelligent, executable script for a skill
 * This creates a real workflow, not a dumb replay of tool calls
 */
export async function generateSkillScript(
  skillName: string,
  goalDescription: string,
  synthesisContent: string,
  exampleToolUsage: Array<{ tool: string; description: string }>
): Promise<SkillScript> {
  const toolExamples = exampleToolUsage.slice(0, 5).map(t =>
    `- ${t.tool}: ${t.description}`
  ).join('\n');

  const prompt = `Generate an intelligent Bun/TypeScript script that implements a reusable skill.

<skill_name>${skillName}</skill_name>

<goal>${goalDescription}</goal>

<learned_pattern>
${synthesisContent}
</learned_pattern>

<example_tool_usage>
${toolExamples}
</example_tool_usage>

Create a complete, executable script that:
1. Takes a target directory as the first argument (defaults to current directory)
2. Implements the skill's GOAL intelligently - don't just replay exact commands
3. Uses Bun APIs: Bun.file(), Bun.Glob, Bun.$\`command\`, etc.
4. Has proper error handling and helpful output
5. Is parameterized and works on any codebase, not just the one it learned from

The script should be a WORKFLOW that accomplishes the goal, not a sequence of hardcoded file reads.

For example, if the goal is "explore-codebase":
- DON'T just read specific files like "src/index.ts"
- DO dynamically discover structure, find entry points, analyze dependencies

Return a complete script starting with #!/usr/bin/env bun`;

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

