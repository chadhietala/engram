/**
 * Memory consolidation logic
 * Handles promotion between memory types and decay
 */

import type { Database } from 'bun:sqlite';
import {
  queryMemories,
  updateMemory,
  promoteMemory,
  applyDecay,
  deleteMemory,
} from '../../db/queries/memories.ts';
import type { Memory, MemoryType } from '../../types/memory.ts';

/**
 * Consolidation configuration
 */
export interface ConsolidationConfig {
  workingToShortTermThreshold: {
    minAccessCount: number;
    minStrength: number;
  };
  shortTermToLongTermThreshold: {
    minAccessCount: number;
    minStrength: number;
    minAgeMs: number;
  };
  decayHalfLifeMs: number;
  minStrengthForRetention: number;
}

const DEFAULT_CONFIG: ConsolidationConfig = {
  workingToShortTermThreshold: {
    minAccessCount: 2,
    minStrength: 0.5,
  },
  shortTermToLongTermThreshold: {
    minAccessCount: 5,
    minStrength: 0.7,
    minAgeMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  decayHalfLifeMs: 12 * 60 * 60 * 1000, // 12 hours
  minStrengthForRetention: 0.01,
};

/**
 * Consolidate working memory to short-term memory
 */
export function consolidateWorkingToShortTerm(
  db: Database,
  sessionId: string,
  config: Partial<ConsolidationConfig> = {}
): Memory[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const promoted: Memory[] = [];

  const workingMemories = queryMemories(db, {
    types: ['working'],
    sessionId,
  });

  for (const memory of workingMemories) {
    const shouldPromote =
      memory.accessCount >= cfg.workingToShortTermThreshold.minAccessCount ||
      memory.strength >= cfg.workingToShortTermThreshold.minStrength;

    if (shouldPromote) {
      const promotedMemory = promoteMemory(db, memory.id, 'short_term');
      if (promotedMemory) {
        promoted.push(promotedMemory);
      }
    } else {
      // Delete low-value working memories
      deleteMemory(db, memory.id);
    }
  }

  return promoted;
}

/**
 * Consolidate short-term memory to long-term memory
 */
export function consolidateShortTermToLongTerm(
  db: Database,
  config: Partial<ConsolidationConfig> = {}
): Memory[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const promoted: Memory[] = [];
  const now = Date.now();

  const shortTermMemories = queryMemories(db, {
    types: ['short_term'],
  });

  for (const memory of shortTermMemories) {
    const age = now - memory.createdAt;

    const shouldPromote =
      memory.accessCount >= cfg.shortTermToLongTermThreshold.minAccessCount &&
      memory.strength >= cfg.shortTermToLongTermThreshold.minStrength &&
      age >= cfg.shortTermToLongTermThreshold.minAgeMs;

    if (shouldPromote) {
      const promotedMemory = promoteMemory(db, memory.id, 'long_term');
      if (promotedMemory) {
        promoted.push(promotedMemory);
      }
    }
  }

  return promoted;
}

/**
 * Apply decay to short-term memories
 */
export function applyMemoryDecay(
  db: Database,
  config: Partial<ConsolidationConfig> = {}
): number {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  return applyDecay(db, cfg.decayHalfLifeMs);
}

/**
 * Strengthen a memory based on access
 */
export function strengthenMemory(
  db: Database,
  memoryId: string,
  amount: number = 0.1
): Memory | null {
  const memory = queryMemories(db, { limit: 1 }).find((m) => m.id === memoryId);
  if (!memory) return null;

  const newStrength = Math.min(1.0, memory.strength + amount);
  return updateMemory(db, memoryId, { strength: newStrength });
}

/**
 * Weaken a memory (e.g., due to contradiction)
 */
export function weakenMemory(
  db: Database,
  memoryId: string,
  amount: number = 0.1
): Memory | null {
  const memory = queryMemories(db, { limit: 1 }).find((m) => m.id === memoryId);
  if (!memory) return null;

  const newStrength = Math.max(0, memory.strength - amount);

  if (newStrength < DEFAULT_CONFIG.minStrengthForRetention) {
    deleteMemory(db, memoryId);
    return null;
  }

  return updateMemory(db, memoryId, { strength: newStrength });
}

/**
 * Full consolidation pass for session end
 */
export function consolidateSession(
  db: Database,
  sessionId: string,
  config: Partial<ConsolidationConfig> = {}
): {
  workingPromoted: Memory[];
  shortTermPromoted: Memory[];
  decayedCount: number;
} {
  // First, promote eligible working memories
  const workingPromoted = consolidateWorkingToShortTerm(db, sessionId, config);

  // Apply decay to short-term memories
  const decayedCount = applyMemoryDecay(db, config);

  // Then, promote eligible short-term memories to long-term
  const shortTermPromoted = consolidateShortTermToLongTerm(db, config);

  return {
    workingPromoted,
    shortTermPromoted,
    decayedCount,
  };
}

/**
 * Get consolidation statistics
 */
export function getConsolidationStats(db: Database): {
  working: number;
  shortTerm: number;
  longTerm: number;
  collective: number;
  total: number;
} {
  const working = queryMemories(db, { types: ['working'] }).length;
  const shortTerm = queryMemories(db, { types: ['short_term'] }).length;
  const longTerm = queryMemories(db, { types: ['long_term'] }).length;
  const collective = queryMemories(db, { types: ['collective'] }).length;

  return {
    working,
    shortTerm,
    longTerm,
    collective,
    total: working + shortTerm + longTerm + collective,
  };
}
