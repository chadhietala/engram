/**
 * SessionStart hook handler
 * Initializes session, starts worker, and loads relevant memories into context
 */

import type { Database } from 'bun:sqlite';
import { createSession } from '../db/queries/sessions.ts';
import { retrieveContextMemories, formatMemoriesForContext } from '../memory/processing/retriever.ts';
import { ensureWorkerRunning } from '../worker/manager.ts';
import type { SessionStartInput, HookOutput } from '../types/hooks.ts';

export async function handleSessionStart(
  db: Database,
  input: SessionStartInput
): Promise<HookOutput> {
  const sessionId = input.session_id;

  // Start worker if not running (non-blocking, falls back to sync if fails)
  ensureWorkerRunning().catch(err => {
    console.error('[Engram] Worker startup error (non-fatal):', err);
  });

  // Create or get session
  createSession(db, sessionId);

  // Load relevant long-term memories for initial context
  // Use a generic query since we don't have a prompt yet
  const memories = await retrieveContextMemories(
    db,
    'session start context',
    undefined, // Not session-specific
    5
  );

  if (memories.length === 0) {
    return {
      continue: true,
    };
  }

  // Format memories for context injection
  const contextStr = formatMemoriesForContext(memories);

  return {
    continue: true,
    additionalContext: contextStr
      ? `<engram-context type="session-start">\n${contextStr}\n</engram-context>`
      : undefined,
  };
}
