/**
 * PostToolUse hook handler
 * Encodes tool usage, detects patterns and contradictions
 *
 * Uses background worker for heavy processing when available,
 * falls back to synchronous processing otherwise.
 */

import type { Database } from 'bun:sqlite';
import { encodeToolUsage, encodeToolUsageFast } from '../memory/processing/encoder.ts';
import { DialecticEngine } from '../dialectic/index.ts';
import { isWorkerRunning, queueMemory } from '../worker/client.ts';
import type { PostToolUseInput, HookOutput } from '../types/hooks.ts';

export async function handlePostToolUse(
  db: Database,
  input: PostToolUseInput
): Promise<HookOutput> {
  const sessionId = input.session_id;
  const toolName = input.tool_name;
  const toolInput = input.tool_input;
  const toolOutput = input.tool_output;
  const toolError = input.tool_error;

  // Check if worker is available for background processing
  const workerAvailable = await isWorkerRunning();

  if (workerAvailable) {
    // Fast path: Create memory without embedding, queue for background processing
    const memory = await encodeToolUsageFast(db, sessionId, {
      toolName,
      toolInput,
      toolOutput,
      toolError,
    });

    // Queue for background embedding and dialectic processing
    queueMemory(memory.id, memory.content, {
      generateEmbedding: true,
      runDialectic: true,
    }).catch(() => {
      // Fire and forget - if queue fails, memory is still saved
    });

    // Return immediately - worker handles the rest
    return { continue: true };
  }

  // Fallback: Synchronous processing (when worker is not running)
  const memory = await encodeToolUsage(db, sessionId, {
    toolName,
    toolInput,
    toolOutput,
    toolError,
  });

  // Process through dialectic engine
  const dialecticEngine = new DialecticEngine(db);

  try {
    const result = await dialecticEngine.processMemory(memory);

    // Log dialectic activity for debugging
    if (result.action !== 'no_action') {
      console.error(`[Engram] Dialectic action: ${result.action}`);

      if (result.antithesis) {
        console.error(`[Engram] Created antithesis: ${result.antithesis.content}`);
      }

      if (result.synthesis) {
        console.error(`[Engram] Created synthesis: ${result.synthesis.content}`);
      }
    }
  } catch (error) {
    // Non-critical, continue without dialectic processing
    console.error('[Engram] Dialectic processing error:', error);
  }

  return { continue: true };
}
