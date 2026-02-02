/**
 * Skill Runtime - Provides intelligence helpers for generated skill scripts
 *
 * This module allows hybrid scripts to interleave deterministic code with
 * LLM-powered "intelligence points" for tasks requiring judgment.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

/**
 * Simple intelligence point for skill scripts.
 * Use this when you need LLM reasoning for tasks like:
 * - Generating human-readable text (commit messages, summaries)
 * - Making judgment calls (should we proceed?)
 * - Synthesizing information from multiple sources
 * - Naming things (variables, files, branches)
 *
 * @param task - Description of what the LLM should do
 * @param context - Key-value pairs of context to include
 * @returns The LLM's response as a string
 *
 * @example
 * const message = await intelligence(
 *   "Generate a git commit message following conventional commits",
 *   { diff: gitDiff, status: gitStatus }
 * );
 */
export async function intelligence(
  task: string,
  context: Record<string, string> = {}
): Promise<string> {
  const contextStr = Object.entries(context)
    .map(([k, v]) => `<${k}>\n${v}\n</${k}>`)
    .join('\n\n');

  const prompt = contextStr
    ? `${task}\n\n${contextStr}`
    : task;

  for await (const message of query({ prompt })) {
    if (message.type === 'result') {
      if (message.subtype === 'success') {
        return message.text || '';
      }
      if (message.subtype === 'error') {
        throw new Error(`Intelligence point failed: ${message.error}`);
      }
    }
  }

  throw new Error('Intelligence point failed: no result received');
}

/**
 * Convert Zod schema to JSON Schema for the SDK
 */
function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema.$schema;
  delete jsonSchema.additionalProperties;
  return jsonSchema;
}

/**
 * Structured intelligence point with schema validation.
 * Use this when you need typed, structured responses from the LLM.
 *
 * @param task - Description of what the LLM should do
 * @param schema - Zod schema for the expected response
 * @param context - Key-value pairs of context to include
 * @returns Parsed and validated response matching the schema
 *
 * @example
 * const ReviewSchema = z.object({
 *   approved: z.boolean(),
 *   issues: z.array(z.string()),
 *   summary: z.string(),
 * });
 *
 * const review = await intelligenceWithSchema(
 *   "Review this code change",
 *   ReviewSchema,
 *   { diff: gitDiff }
 * );
 */
export async function intelligenceWithSchema<T>(
  task: string,
  schema: z.ZodType<T>,
  context: Record<string, string> = {}
): Promise<T> {
  const contextStr = Object.entries(context)
    .map(([k, v]) => `<${k}>\n${v}\n</${k}>`)
    .join('\n\n');

  const prompt = contextStr
    ? `${task}\n\n${contextStr}`
    : task;

  const jsonSchema = zodToJsonSchema(schema);

  for await (const message of query({
    prompt,
    options: {
      allowedTools: [],
      maxTurns: 3,
      outputFormat: {
        type: 'json_schema',
        schema: jsonSchema,
      },
    },
  })) {
    if (message.type === 'result') {
      if (message.subtype === 'success' && message.structured_output) {
        const parsed = schema.safeParse(message.structured_output);
        if (parsed.success) {
          return parsed.data;
        }
        throw new Error(`Schema validation failed: ${JSON.stringify(parsed.error)}`);
      }
      if (message.subtype === 'error') {
        throw new Error(`Intelligence point failed: ${message.error}`);
      }
    }
  }

  throw new Error('Structured intelligence point failed: no valid result received');
}

/**
 * Ask a yes/no question and get a boolean response.
 * Convenience wrapper for simple decision points.
 *
 * @param question - The yes/no question to ask
 * @param context - Context to help the LLM decide
 * @returns true for yes, false for no
 *
 * @example
 * const shouldProceed = await decide(
 *   "Should we include test files in this analysis?",
 *   { fileList: files.join('\n') }
 * );
 */
export async function decide(
  question: string,
  context: Record<string, string> = {}
): Promise<boolean> {
  const DecisionSchema = z.object({
    decision: z.boolean().describe('true for yes, false for no'),
    reasoning: z.string().describe('Brief explanation of the decision'),
  });

  const result = await intelligenceWithSchema(
    `Answer this yes/no question: ${question}\n\nRespond with your decision (true/false) and brief reasoning.`,
    DecisionSchema,
    context
  );

  return result.decision;
}

// Re-export zod for schema definitions in scripts
export { z } from 'zod';
