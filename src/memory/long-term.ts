/**
 * Long-term memory - consolidated, stable memories
 */

import type { Database } from 'bun:sqlite';
import { queryMemories, updateMemory } from '../db/queries/memories.ts';
import type { Memory, MemoryStage } from '../types/memory.ts';

/**
 * Get all long-term memories
 */
export function getLongTermMemories(db: Database): Memory[] {
  return queryMemories(db, {
    types: ['long_term'],
  });
}

/**
 * Get long-term memories by stage
 */
export function getLongTermMemoriesByStage(
  db: Database,
  stage: MemoryStage
): Memory[] {
  return queryMemories(db, {
    types: ['long_term'],
    stage,
  });
}

/**
 * Get high-confidence long-term memories
 */
export function getConfidentMemories(
  db: Database,
  minConfidence: number = 0.8
): Memory[] {
  return queryMemories(db, {
    types: ['long_term'],
    minConfidence,
  });
}

/**
 * Get syntactic-stage memories (candidates for skill extraction)
 */
export function getSyntacticMemories(db: Database): Memory[] {
  return getLongTermMemoriesByStage(db, 'syntactic');
}

/**
 * Get memories related to a specific tool
 */
export function getLongTermMemoriesByTool(
  db: Database,
  toolName: string
): Memory[] {
  return queryMemories(db, {
    types: ['long_term'],
    semanticKeys: [{ key: 'tool', value: toolName }],
  });
}

/**
 * Get memories in a specific directory
 */
export function getLongTermMemoriesByDirectory(
  db: Database,
  directory: string
): Memory[] {
  return queryMemories(db, {
    types: ['long_term'],
    semanticKeys: [{ key: 'directory', value: directory }],
  });
}

/**
 * Advance memory to a higher stage
 */
export function advanceMemoryStage(
  db: Database,
  memoryId: string,
  newStage: MemoryStage
): Memory | null {
  const memories = queryMemories(db, { types: ['long_term'] });
  const memory = memories.find((m) => m.id === memoryId);

  if (!memory) return null;

  // Validate stage transition
  const stageOrder: MemoryStage[] = ['conceptual', 'semantic', 'syntactic'];
  const currentIndex = stageOrder.indexOf(memory.metadata.stage);
  const newIndex = stageOrder.indexOf(newStage);

  if (newIndex <= currentIndex) {
    // Can't go backwards or stay the same
    return memory;
  }

  return updateMemory(db, memoryId, {
    metadata: { ...memory.metadata, stage: newStage },
  });
}

/**
 * Update memory confidence
 */
export function updateMemoryConfidence(
  db: Database,
  memoryId: string,
  confidence: number
): Memory | null {
  const memories = queryMemories(db, { types: ['long_term'] });
  const memory = memories.find((m) => m.id === memoryId);

  if (!memory) return null;

  const clampedConfidence = Math.max(0, Math.min(1, confidence));

  return updateMemory(db, memoryId, {
    metadata: { ...memory.metadata, confidence: clampedConfidence },
  });
}

/**
 * Get collective memories (shared across all agents/sessions)
 */
export function getCollectiveMemories(db: Database): Memory[] {
  return queryMemories(db, {
    types: ['collective'],
  });
}

/**
 * Get memory statistics by stage
 */
export function getLongTermStats(db: Database): {
  conceptual: number;
  semantic: number;
  syntactic: number;
  total: number;
  avgConfidence: number;
} {
  const memories = getLongTermMemories(db);

  let conceptual = 0;
  let semantic = 0;
  let syntactic = 0;
  let totalConfidence = 0;

  for (const memory of memories) {
    switch (memory.metadata.stage) {
      case 'conceptual':
        conceptual++;
        break;
      case 'semantic':
        semantic++;
        break;
      case 'syntactic':
        syntactic++;
        break;
    }
    totalConfidence += memory.metadata.confidence;
  }

  return {
    conceptual,
    semantic,
    syntactic,
    total: memories.length,
    avgConfidence: memories.length > 0 ? totalConfidence / memories.length : 0,
  };
}
