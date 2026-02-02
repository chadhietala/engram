/**
 * Antithesis management - contradiction detection
 * Uses LLM for rich contradiction explanations when available
 */

import type { Database } from 'bun:sqlite';
import {
  createAntithesis,
  getAntithesis,
  getAntithesesByThesis,
  getThesis,
  addAntithesisToCycle,
  getCycleByPattern,
} from '../db/queries/dialectic.ts';
import { getPattern } from '../db/queries/patterns.ts';
import { getMemory, queryMemories } from '../db/queries/memories.ts';
import { embed, cosineSimilarity } from '../embedding/index.ts';
import { analyzeContradiction } from '../llm/index.ts';
import type {
  Antithesis,
  AntithesisCreateInput,
  ContradictionType,
  Thesis,
} from '../types/dialectic.ts';
import type { Memory } from '../types/memory.ts';

/**
 * Contradiction detection result
 */
export interface ContradictionResult {
  detected: boolean;
  type: ContradictionType;
  description: string;
  conflictingMemoryIds: string[];
}

/**
 * Detect if a new memory contradicts an existing thesis
 */
export async function detectContradiction(
  db: Database,
  thesis: Thesis,
  newMemory: Memory
): Promise<ContradictionResult> {
  // Get thesis exemplar memories
  const exemplarMemories: Memory[] = [];
  for (const memoryId of thesis.exemplarMemoryIds) {
    const memory = getMemory(db, memoryId);
    if (memory) exemplarMemories.push(memory);
  }

  if (exemplarMemories.length === 0) {
    return {
      detected: false,
      type: 'direct',
      description: '',
      conflictingMemoryIds: [],
    };
  }

  // Check for direct contradiction (same tool, different outcome)
  const directContradiction = detectDirectContradiction(exemplarMemories, newMemory);
  if (directContradiction.detected) {
    return directContradiction;
  }

  // Check for refinement (same operation, more specific conditions)
  const refinement = detectRefinement(exemplarMemories, newMemory);
  if (refinement.detected) {
    return refinement;
  }

  // Check for edge case (similar operation, unexpected outcome)
  const edgeCase = await detectEdgeCase(db, exemplarMemories, newMemory);
  if (edgeCase.detected) {
    return edgeCase;
  }

  // Check for context-dependent contradiction
  const contextDependent = detectContextDependent(exemplarMemories, newMemory);
  if (contextDependent.detected) {
    return contextDependent;
  }

  return {
    detected: false,
    type: 'direct',
    description: '',
    conflictingMemoryIds: [],
  };
}

function detectDirectContradiction(
  exemplars: Memory[],
  newMemory: Memory
): ContradictionResult {
  // Check if same tool produces opposite results
  const newToolName = newMemory.metadata.toolName;
  if (!newToolName) {
    return { detected: false, type: 'direct', description: '', conflictingMemoryIds: [] };
  }

  const sameToolExemplars = exemplars.filter(
    (m) => m.metadata.toolName === newToolName
  );

  if (sameToolExemplars.length === 0) {
    return { detected: false, type: 'direct', description: '', conflictingMemoryIds: [] };
  }

  // Check for error vs success conflict
  const newHasError = newMemory.metadata.tags.includes('error');
  const exemplarHasError = sameToolExemplars.some((m) =>
    m.metadata.tags.includes('error')
  );

  if (newHasError !== exemplarHasError) {
    const conflicting = newHasError
      ? sameToolExemplars.filter((m) => !m.metadata.tags.includes('error'))
      : sameToolExemplars.filter((m) => m.metadata.tags.includes('error'));

    return {
      detected: true,
      type: 'direct',
      description: `Same tool (${newToolName}) shows different success/error outcomes`,
      conflictingMemoryIds: conflicting.map((m) => m.id),
    };
  }

  return { detected: false, type: 'direct', description: '', conflictingMemoryIds: [] };
}

function detectRefinement(
  exemplars: Memory[],
  newMemory: Memory
): ContradictionResult {
  // Check if new memory has more specific semantic keys
  const newKeys = newMemory.metadata.semanticKeys;
  const newKeyNames = new Set(newKeys.map((k) => k.key));

  for (const exemplar of exemplars) {
    const exemplarKeys = exemplar.metadata.semanticKeys;
    const exemplarKeyNames = new Set(exemplarKeys.map((k) => k.key));

    // Check if new memory is more specific (has additional keys)
    const additionalKeys = [...newKeyNames].filter((k) => !exemplarKeyNames.has(k));

    if (additionalKeys.length > 0) {
      // Check if they share common keys with different values
      for (const key of newKeys) {
        const exemplarKey = exemplarKeys.find((k) => k.key === key.key);
        if (exemplarKey && exemplarKey.value !== key.value) {
          return {
            detected: true,
            type: 'refinement',
            description: `Pattern refined with additional condition: ${additionalKeys.join(', ')}`,
            conflictingMemoryIds: [exemplar.id],
          };
        }
      }
    }
  }

  return { detected: false, type: 'refinement', description: '', conflictingMemoryIds: [] };
}

async function detectEdgeCase(
  db: Database,
  exemplars: Memory[],
  newMemory: Memory
): Promise<ContradictionResult> {
  if (!newMemory.embedding) {
    return { detected: false, type: 'edge_case', description: '', conflictingMemoryIds: [] };
  }

  // Check semantic similarity - edge cases are similar but not identical
  const similarities: Array<{ memory: Memory; similarity: number }> = [];

  for (const exemplar of exemplars) {
    if (exemplar.embedding) {
      const similarity = cosineSimilarity(newMemory.embedding, exemplar.embedding);
      similarities.push({ memory: exemplar, similarity });
    }
  }

  // Edge case: moderately similar (0.5-0.8) but different outcome
  const moderatelySimilar = similarities.filter(
    (s) => s.similarity >= 0.5 && s.similarity < 0.8
  );

  if (moderatelySimilar.length > 0) {
    // Check if outcomes differ
    const newOutcome = newMemory.metadata.toolOutput;
    const exemplarOutcome = moderatelySimilar[0]?.memory.metadata.toolOutput;

    if (newOutcome && exemplarOutcome && JSON.stringify(newOutcome) !== JSON.stringify(exemplarOutcome)) {
      return {
        detected: true,
        type: 'edge_case',
        description: 'Similar operation with unexpected different outcome (edge case)',
        conflictingMemoryIds: moderatelySimilar.map((s) => s.memory.id),
      };
    }
  }

  return { detected: false, type: 'edge_case', description: '', conflictingMemoryIds: [] };
}

function detectContextDependent(
  exemplars: Memory[],
  newMemory: Memory
): ContradictionResult {
  // Check if same operation in different context has different result
  const newSession = newMemory.metadata.sessionId;
  const differentSessionExemplars = exemplars.filter(
    (m) => m.metadata.sessionId !== newSession
  );

  if (differentSessionExemplars.length === 0) {
    return {
      detected: false,
      type: 'context_dependent',
      description: '',
      conflictingMemoryIds: [],
    };
  }

  // Check for same tool with same input pattern but different outcome
  const newToolName = newMemory.metadata.toolName;
  const sameToolDifferentSession = differentSessionExemplars.filter(
    (m) => m.metadata.toolName === newToolName
  );

  if (sameToolDifferentSession.length > 0) {
    // Compare semantic keys
    const newDirectory = newMemory.metadata.semanticKeys.find((k) => k.key === 'directory')?.value;

    for (const exemplar of sameToolDifferentSession) {
      const exemplarDirectory = exemplar.metadata.semanticKeys.find(
        (k) => k.key === 'directory'
      )?.value;

      // Different directory = different context
      if (newDirectory && exemplarDirectory && newDirectory !== exemplarDirectory) {
        return {
          detected: true,
          type: 'context_dependent',
          description: `Same operation behaves differently in different directories/contexts`,
          conflictingMemoryIds: [exemplar.id],
        };
      }
    }
  }

  return {
    detected: false,
    type: 'context_dependent',
    description: '',
    conflictingMemoryIds: [],
  };
}

/**
 * Create an antithesis from detected contradiction
 * Tries LLM for rich explanation, falls back to heuristic description
 */
export async function createContradictionAntithesis(
  db: Database,
  thesisId: string,
  contradiction: ContradictionResult,
  newMemoryId: string
): Promise<Antithesis> {
  const thesis = getThesis(db, thesisId);
  const newMemory = getMemory(db, newMemoryId);

  // Try to get rich LLM explanation
  let content = contradiction.description;

  if (thesis && newMemory) {
    try {
      // Get context memories
      const contextMemories = queryMemories(db, {
        sessionId: newMemory.metadata.sessionId,
        limit: 5,
      });

      const analysis = await analyzeContradiction(thesis, newMemory, contextMemories);

      if (analysis.explanation.length > 20) {
        content = analysis.explanation;
        // Add resolution hint as additional context
        if (analysis.resolutionHint) {
          content += ` (Resolution hint: ${analysis.resolutionHint})`;
        }
      }
    } catch {
      // LLM not available, use heuristic description
    }
  }

  const input: AntithesisCreateInput = {
    thesisId,
    content,
    contradictionType: contradiction.type,
    exemplarMemoryIds: [newMemoryId, ...contradiction.conflictingMemoryIds],
  };

  const antithesis = createAntithesis(db, input);

  // Add to active cycle if exists
  if (thesis) {
    const cycle = getCycleByPattern(db, thesis.patternId);
    if (cycle) {
      addAntithesisToCycle(db, cycle.id, antithesis.id);
    }
  }

  return antithesis;
}

/**
 * Get all antitheses for a thesis
 */
export function getThesisAntitheses(db: Database, thesisId: string): Antithesis[] {
  return getAntithesesByThesis(db, thesisId);
}

/**
 * Check if a thesis is ready for synthesis (has enough antitheses)
 */
export function isReadyForSynthesis(
  db: Database,
  thesisId: string,
  minAntitheses: number = 1
): boolean {
  const antitheses = getAntithesesByThesis(db, thesisId);
  return antitheses.length >= minAntitheses;
}
