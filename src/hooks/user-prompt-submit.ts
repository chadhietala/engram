/**
 * UserPromptSubmit hook handler
 * Queries memories and injects relevant patterns into context
 */

import type { Database } from 'bun:sqlite';
import { encodePrompt } from '../memory/processing/encoder.ts';
import {
  retrieveContextMemories,
  formatMemoriesForContext,
} from '../memory/processing/retriever.ts';
import type { UserPromptSubmitInput, HookOutput } from '../types/hooks.ts';

export async function handleUserPromptSubmit(
  db: Database,
  input: UserPromptSubmitInput
): Promise<HookOutput> {
  const sessionId = input.session_id;
  const prompt = input.prompt;

  if (!prompt || prompt.trim().length === 0) {
    return { continue: true };
  }

  // Encode the prompt as a memory (optional, for learning)
  try {
    await encodePrompt(db, sessionId, prompt);
  } catch (error) {
    // Non-critical, continue without encoding
    console.error('Failed to encode prompt:', error);
  }

  // Retrieve relevant memories
  const memories = await retrieveContextMemories(db, prompt, sessionId, 5);

  if (memories.length === 0) {
    return { continue: true };
  }

  // Format memories for context injection
  const contextStr = formatMemoriesForContext(memories);

  // Only inject if we have meaningful context
  if (!contextStr || contextStr.trim().length === 0) {
    return { continue: true };
  }

  return {
    continue: true,
    additionalContext: `<engram-context type="prompt-relevant">\nRelevant patterns from previous sessions:\n${contextStr}\n</engram-context>`,
  };
}
