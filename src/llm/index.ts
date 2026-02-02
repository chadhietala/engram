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

const SkillContentSchema = z.object({
  description: z.string().describe('One sentence describing what this skill does'),
  instructions: z.string().describe('2-4 sentences explaining how to use this skill'),
  whenToUse: z.array(z.string()).describe('Scenarios when this skill is useful'),
});

// Export inferred types
export type PatternAnalysis = z.infer<typeof PatternAnalysisSchema>;
export type ContradictionAnalysis = z.infer<typeof ContradictionAnalysisSchema>;
export type SynthesisAnalysis = z.infer<typeof SynthesisAnalysisSchema>;
export type SkillContent = z.infer<typeof SkillContentSchema>;

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
  exemplarMemories: Memory[]
): Promise<SkillContent> {
  const toolSequence = exemplarMemories
    .filter(m => m.metadata.toolName)
    .map(m => m.metadata.toolName)
    .join(' → ');

  const memorySummary = exemplarMemories.slice(0, 5).map(m =>
    `- ${m.metadata.toolName}: ${m.content.substring(0, 100)}...`
  ).join('\n');

  const prompt = `Generate a skill description from this learned pattern.

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
- A one-sentence description of what this skill does
- 2-4 sentences explaining how to use this skill
- A list of scenarios when this skill is useful`;

  const result = await queryWithSchema(prompt, SkillContentSchema);
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

