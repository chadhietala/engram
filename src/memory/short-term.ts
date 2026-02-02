/**
 * Short-term memory - decaying memory with half-life
 */

import type { Database } from 'bun:sqlite';
import { queryMemories, updateMemory, deleteMemory } from '../db/queries/memories.ts';
import type { Memory } from '../types/memory.ts';

/**
 * Get all short-term memories
 */
export function getShortTermMemories(db: Database): Memory[] {
  return queryMemories(db, {
    types: ['short_term'],
  });
}

/**
 * Get short-term memories above a strength threshold
 */
export function getStrongShortTermMemories(
  db: Database,
  minStrength: number = 0.5
): Memory[] {
  return queryMemories(db, {
    types: ['short_term'],
    minStrength,
  });
}

/**
 * Get short-term memories by session
 */
export function getShortTermMemoriesBySession(
  db: Database,
  sessionId: string
): Memory[] {
  return queryMemories(db, {
    types: ['short_term'],
    sessionId,
  });
}

/**
 * Boost short-term memory strength (reinforcement)
 */
export function reinforceMemory(
  db: Database,
  memoryId: string,
  boostAmount: number = 0.2
): Memory | null {
  const memories = queryMemories(db, { types: ['short_term'] });
  const memory = memories.find((m) => m.id === memoryId);

  if (!memory) return null;

  const newStrength = Math.min(1.0, memory.strength + boostAmount);
  return updateMemory(db, memoryId, { strength: newStrength });
}

/**
 * Get memories that are candidates for long-term promotion
 */
export function getPromotionCandidates(
  db: Database,
  minStrength: number = 0.7,
  minAccessCount: number = 5
): Memory[] {
  const memories = queryMemories(db, {
    types: ['short_term'],
    minStrength,
  });

  return memories.filter((m) => m.accessCount >= minAccessCount);
}

/**
 * Get decaying memories (below strength threshold)
 */
export function getDecayingMemories(
  db: Database,
  maxStrength: number = 0.3
): Memory[] {
  const memories = queryMemories(db, {
    types: ['short_term'],
  });

  return memories.filter((m) => m.strength <= maxStrength);
}

/**
 * Prune weak short-term memories
 */
export function pruneWeakMemories(
  db: Database,
  threshold: number = 0.1
): number {
  const weak = getDecayingMemories(db, threshold);
  let deleted = 0;

  for (const memory of weak) {
    if (deleteMemory(db, memory.id)) {
      deleted++;
    }
  }

  return deleted;
}
