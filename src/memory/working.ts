/**
 * Working memory - session-scoped memory management
 */

import type { Database } from 'bun:sqlite';
import { queryMemories, deleteMemory } from '../db/queries/memories.ts';
import type { Memory } from '../types/memory.ts';

/**
 * Get all working memories for a session
 */
export function getWorkingMemories(db: Database, sessionId: string): Memory[] {
  return queryMemories(db, {
    types: ['working'],
    sessionId,
  });
}

/**
 * Get working memory count for a session
 */
export function getWorkingMemoryCount(db: Database, sessionId: string): number {
  return getWorkingMemories(db, sessionId).length;
}

/**
 * Clear all working memories for a session
 */
export function clearWorkingMemory(db: Database, sessionId: string): number {
  const memories = getWorkingMemories(db, sessionId);
  let deleted = 0;

  for (const memory of memories) {
    if (deleteMemory(db, memory.id)) {
      deleted++;
    }
  }

  return deleted;
}

/**
 * Get recent working memories for a session
 */
export function getRecentWorkingMemories(
  db: Database,
  sessionId: string,
  limit: number = 10
): Memory[] {
  const memories = getWorkingMemories(db, sessionId);
  // Sort by creation time descending
  memories.sort((a, b) => b.createdAt - a.createdAt);
  return memories.slice(0, limit);
}

/**
 * Get working memories by tool type
 */
export function getWorkingMemoriesByTool(
  db: Database,
  sessionId: string,
  toolName: string
): Memory[] {
  return queryMemories(db, {
    types: ['working'],
    sessionId,
    semanticKeys: [{ key: 'tool', value: toolName }],
  });
}
