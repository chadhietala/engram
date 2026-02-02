/**
 * Conceptual stage processing
 * Initial stage for abstract understanding
 */

import type { Database } from 'bun:sqlite';
import { queryMemories, updateMemory } from '../db/queries/memories.ts';
import { findRelatedMemories } from '../memory/processing/retriever.ts';
import type { Memory, SemanticKeyValue } from '../types/memory.ts';

/**
 * Conceptual stage transition requirements
 */
export interface ConceptualRequirements {
  minStrength: number;
  minAccessCount: number;
  minAssociations: number;
}

const DEFAULT_REQUIREMENTS: ConceptualRequirements = {
  minStrength: 0.1,   // Lowered - decay is aggressive
  minAccessCount: 2,  // Lowered for faster learning
  minAssociations: 1, // Lowered - associations take time to build
};

/**
 * Check if memory meets conceptual stage requirements
 */
export function meetsConceptualRequirements(
  memory: Memory,
  requirements: Partial<ConceptualRequirements> = {}
): boolean {
  const reqs = { ...DEFAULT_REQUIREMENTS, ...requirements };

  return (
    memory.metadata.stage === 'conceptual' &&
    memory.strength >= reqs.minStrength &&
    memory.accessCount >= reqs.minAccessCount &&
    memory.metadata.associations.length >= reqs.minAssociations
  );
}

/**
 * Get memories ready for conceptual → semantic transition
 */
export function getConceptualReadyForTransition(
  db: Database,
  requirements: Partial<ConceptualRequirements> = {}
): Memory[] {
  const memories = queryMemories(db, {
    stage: 'conceptual',
    types: ['short_term', 'long_term'],  // Include short_term for faster learning
  });

  return memories.filter((m) => meetsConceptualRequirements(m, requirements));
}

/**
 * Extract conceptual understanding from memory
 */
export function extractConceptualUnderstanding(memory: Memory): {
  concepts: string[];
  relationships: Array<{ from: string; to: string; type: string }>;
} {
  const concepts: string[] = [];
  const relationships: Array<{ from: string; to: string; type: string }> = [];

  // Extract concepts from semantic keys
  for (const key of memory.metadata.semanticKeys) {
    if (key.weight >= 0.7) {
      concepts.push(`${key.key}:${key.value}`);
    }
  }

  // Extract concepts from tags
  for (const tag of memory.metadata.tags) {
    if (!concepts.includes(tag)) {
      concepts.push(tag);
    }
  }

  // Build basic relationships
  const toolConcept = memory.metadata.toolName;
  if (toolConcept) {
    concepts.push(`tool:${toolConcept}`);

    // Tool uses file
    const filePath = memory.metadata.semanticKeys.find((k) => k.key === 'file_path');
    if (filePath) {
      relationships.push({
        from: `tool:${toolConcept}`,
        to: `file:${filePath.value}`,
        type: 'operates_on',
      });
    }

    // Tool in directory
    const directory = memory.metadata.semanticKeys.find((k) => k.key === 'directory');
    if (directory) {
      relationships.push({
        from: `tool:${toolConcept}`,
        to: `directory:${directory.value}`,
        type: 'within',
      });
    }
  }

  // Association relationships
  for (const assocId of memory.metadata.associations) {
    relationships.push({
      from: memory.id,
      to: assocId,
      type: 'associated_with',
    });
  }

  return { concepts, relationships };
}

/**
 * Enrich memory with conceptual analysis
 */
export async function enrichConceptualMemory(
  db: Database,
  memory: Memory
): Promise<Memory | null> {
  const understanding = extractConceptualUnderstanding(memory);

  // Add concept tags
  const newTags = [...memory.metadata.tags];
  for (const concept of understanding.concepts) {
    if (!newTags.includes(concept) && newTags.length < 20) {
      newTags.push(concept);
    }
  }

  // Find more associations
  const related = await findRelatedMemories(db, memory, 5);
  const newAssociations = [...memory.metadata.associations];
  for (const result of related) {
    if (!newAssociations.includes(result.memory.id)) {
      newAssociations.push(result.memory.id);
    }
  }

  // Update memory with enriched metadata
  return updateMemory(db, memory.id, {
    metadata: {
      ...memory.metadata,
      tags: newTags,
      associations: newAssociations.slice(0, 10),
    },
  });
}

/**
 * Batch process conceptual memories
 */
export async function processConceptualBatch(
  db: Database,
  limit: number = 10
): Promise<Memory[]> {
  const memories = queryMemories(db, {
    stage: 'conceptual',
    types: ['short_term', 'long_term'],
    limit,
  });

  const enriched: Memory[] = [];

  for (const memory of memories) {
    const result = await enrichConceptualMemory(db, memory);
    if (result) {
      enriched.push(result);
    }
  }

  return enriched;
}
