/**
 * Semantic stage processing
 * Relationships and structure understanding
 */

import type { Database } from 'bun:sqlite';
import { queryMemories, updateMemory } from '../db/queries/memories.ts';
import type { Memory, SemanticKeyValue } from '../types/memory.ts';

/**
 * Semantic stage transition requirements
 */
export interface SemanticRequirements {
  minStrength: number;
  minAccessCount: number;
  minRelationships: number;
  minConcepts: number;
}

const DEFAULT_REQUIREMENTS: SemanticRequirements = {
  minStrength: 0.15,  // Lowered - decay is aggressive
  minAccessCount: 3,  // Lowered for faster learning
  minRelationships: 2,
  minConcepts: 3,
};

/**
 * Semantic relationship types
 */
export type RelationshipType =
  | 'precedes'
  | 'follows'
  | 'causes'
  | 'requires'
  | 'similar_to'
  | 'opposite_of'
  | 'part_of'
  | 'contains';

export interface SemanticRelationship {
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  strength: number;
}

/**
 * Check if memory meets semantic stage requirements
 */
export function meetsSemanticRequirements(
  memory: Memory,
  requirements: Partial<SemanticRequirements> = {}
): boolean {
  const reqs = { ...DEFAULT_REQUIREMENTS, ...requirements };

  const conceptCount = memory.metadata.semanticKeys.length + memory.metadata.tags.length;
  const relationshipCount = memory.metadata.associations.length;

  return (
    memory.metadata.stage === 'semantic' &&
    memory.strength >= reqs.minStrength &&
    memory.accessCount >= reqs.minAccessCount &&
    relationshipCount >= reqs.minRelationships &&
    conceptCount >= reqs.minConcepts
  );
}

/**
 * Get memories ready for semantic → syntactic transition
 */
export function getSemanticReadyForTransition(
  db: Database,
  requirements: Partial<SemanticRequirements> = {}
): Memory[] {
  const memories = queryMemories(db, {
    stage: 'semantic',
    types: ['short_term', 'long_term'],  // Include short_term for faster learning
  });

  return memories.filter((m) => meetsSemanticRequirements(m, requirements));
}

/**
 * Infer relationships between memories
 */
export function inferRelationships(
  sourceMemory: Memory,
  targetMemory: Memory
): SemanticRelationship[] {
  const relationships: SemanticRelationship[] = [];

  // Time-based relationships
  if (sourceMemory.createdAt < targetMemory.createdAt) {
    // Check if from same session (likely sequence)
    if (sourceMemory.metadata.sessionId === targetMemory.metadata.sessionId) {
      const timeDiff = targetMemory.createdAt - sourceMemory.createdAt;
      // Within 5 minutes = likely related
      if (timeDiff < 5 * 60 * 1000) {
        relationships.push({
          sourceId: sourceMemory.id,
          targetId: targetMemory.id,
          type: 'precedes',
          strength: Math.max(0.5, 1 - timeDiff / (5 * 60 * 1000)),
        });
      }
    }
  }

  // Tool-based relationships
  if (
    sourceMemory.metadata.toolName &&
    targetMemory.metadata.toolName &&
    sourceMemory.metadata.toolName === targetMemory.metadata.toolName
  ) {
    relationships.push({
      sourceId: sourceMemory.id,
      targetId: targetMemory.id,
      type: 'similar_to',
      strength: 0.8,
    });
  }

  // File-based relationships
  const sourceFile = sourceMemory.metadata.semanticKeys.find((k) => k.key === 'file_path');
  const targetFile = targetMemory.metadata.semanticKeys.find((k) => k.key === 'file_path');

  if (sourceFile && targetFile) {
    if (sourceFile.value === targetFile.value) {
      relationships.push({
        sourceId: sourceMemory.id,
        targetId: targetMemory.id,
        type: 'part_of',
        strength: 0.9,
      });
    } else {
      // Same directory
      const sourceDir = sourceFile.value.substring(0, sourceFile.value.lastIndexOf('/'));
      const targetDir = targetFile.value.substring(0, targetFile.value.lastIndexOf('/'));
      if (sourceDir === targetDir) {
        relationships.push({
          sourceId: sourceMemory.id,
          targetId: targetMemory.id,
          type: 'similar_to',
          strength: 0.6,
        });
      }
    }
  }

  // Error-based relationships
  const sourceHasError = sourceMemory.metadata.tags.includes('error');
  const targetHasError = targetMemory.metadata.tags.includes('error');

  if (sourceHasError !== targetHasError && sourceMemory.metadata.toolName === targetMemory.metadata.toolName) {
    relationships.push({
      sourceId: sourceMemory.id,
      targetId: targetMemory.id,
      type: 'opposite_of',
      strength: 0.7,
    });
  }

  return relationships;
}

/**
 * Extract semantic structure from memory
 */
export function extractSemanticStructure(memory: Memory): {
  entities: string[];
  relationships: Array<{ subject: string; predicate: string; object: string }>;
  categories: string[];
} {
  const entities: string[] = [];
  const relationships: Array<{ subject: string; predicate: string; object: string }> = [];
  const categories: string[] = [];

  // Extract entities from semantic keys
  for (const key of memory.metadata.semanticKeys) {
    entities.push(`${key.key}:${key.value}`);
  }

  // Add tool as entity
  if (memory.metadata.toolName) {
    entities.push(`tool:${memory.metadata.toolName}`);
  }

  // Extract categories from tags
  const categoryTags = ['file', 'shell', 'web', 'search', 'edit', 'read', 'write'];
  for (const tag of memory.metadata.tags) {
    if (categoryTags.includes(tag)) {
      categories.push(tag);
    }
  }

  // Build relationships from structure
  if (memory.metadata.toolName) {
    const tool = `tool:${memory.metadata.toolName}`;

    // Tool operates on file
    const filePath = memory.metadata.semanticKeys.find((k) => k.key === 'file_path');
    if (filePath) {
      relationships.push({
        subject: tool,
        predicate: 'operates_on',
        object: `file:${filePath.value}`,
      });
    }

    // Tool executes command
    const command = memory.metadata.semanticKeys.find((k) => k.key === 'command');
    if (command) {
      relationships.push({
        subject: tool,
        predicate: 'executes',
        object: `command:${command.value}`,
      });
    }

    // Tool produces result
    if (memory.metadata.tags.includes('error')) {
      relationships.push({
        subject: tool,
        predicate: 'produces',
        object: 'result:error',
      });
    } else {
      relationships.push({
        subject: tool,
        predicate: 'produces',
        object: 'result:success',
      });
    }
  }

  return { entities, relationships, categories };
}

/**
 * Add semantic keys to memory
 */
export function addSemanticKeys(
  db: Database,
  memoryId: string,
  keys: SemanticKeyValue[]
): Memory | null {
  const memories = queryMemories(db, {});
  const memory = memories.find((m) => m.id === memoryId);
  if (!memory) return null;

  const existingKeys = memory.metadata.semanticKeys;
  const newKeys = [...existingKeys];

  for (const key of keys) {
    const existing = newKeys.findIndex((k) => k.key === key.key && k.value === key.value);
    if (existing === -1) {
      newKeys.push(key);
    } else {
      // Update weight if higher
      if (key.weight > (newKeys[existing]?.weight ?? 0)) {
        newKeys[existing] = key;
      }
    }
  }

  return updateMemory(db, memoryId, {
    metadata: {
      ...memory.metadata,
      semanticKeys: newKeys,
    },
  });
}

/**
 * Enrich memory with semantic analysis
 */
export function enrichSemanticMemory(
  db: Database,
  memory: Memory,
  relatedMemories: Memory[]
): Memory | null {
  const structure = extractSemanticStructure(memory);

  // Build semantic keys from structure
  const newSemanticKeys: SemanticKeyValue[] = [];

  for (const category of structure.categories) {
    newSemanticKeys.push({
      key: 'category',
      value: category,
      weight: 0.8,
    });
  }

  // Add entity count
  newSemanticKeys.push({
    key: 'entity_count',
    value: String(structure.entities.length),
    weight: 0.5,
  });

  // Add relationship count
  newSemanticKeys.push({
    key: 'relationship_count',
    value: String(structure.relationships.length),
    weight: 0.5,
  });

  // Add inferred relationships from related memories
  const allRelationships: SemanticRelationship[] = [];
  for (const related of relatedMemories) {
    const inferred = inferRelationships(memory, related);
    allRelationships.push(...inferred);
  }

  if (allRelationships.length > 0) {
    newSemanticKeys.push({
      key: 'has_relationships',
      value: 'true',
      weight: 0.7,
    });
  }

  return addSemanticKeys(db, memory.id, newSemanticKeys);
}
