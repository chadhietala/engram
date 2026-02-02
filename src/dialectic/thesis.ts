/**
 * Thesis management for the dialectic process
 * Uses LLM for pattern insights (required)
 */

import type { Database } from 'bun:sqlite';
import {
  createThesis,
  getThesis,
  updateThesisStatus,
  addExemplarToThesis,
  getThesesByPattern,
  getActiveTheses,
} from '../db/queries/dialectic.ts';
import {
  createPattern,
  getPattern,
  updatePattern,
  addMemoryToPattern,
  getPatternsWithEmbeddings,
} from '../db/queries/patterns.ts';
import { embed, cosineSimilarity } from '../embedding/index.ts';
import { analyzePattern } from '../llm/index.ts';
import type { Pattern, Thesis, ThesisCreateInput } from '../types/dialectic.ts';
import type { Memory } from '../types/memory.ts';

/**
 * Find or create a pattern from memories
 */
export async function findOrCreatePattern(
  db: Database,
  memories: Memory[],
  name: string,
  description: string
): Promise<Pattern> {
  // Compute combined embedding from memories
  const contents = memories.map((m) => m.content).join('\n');
  const embedding = await embed(contents, db);

  // Check for similar existing patterns
  const existingPatterns = getPatternsWithEmbeddings(db);
  const similarityThreshold = 0.8;

  for (const pattern of existingPatterns) {
    if (pattern.embedding) {
      const similarity = cosineSimilarity(embedding, pattern.embedding);
      if (similarity >= similarityThreshold) {
        // Add new memories to existing pattern
        for (const memory of memories) {
          addMemoryToPattern(db, pattern.id, memory.id);
        }
        return pattern;
      }
    }
  }

  // Create new pattern
  return createPattern(
    db,
    {
      name,
      description,
      memoryIds: memories.map((m) => m.id),
    },
    embedding
  );
}

/**
 * Create a thesis for a pattern
 */
export function createPatternThesis(
  db: Database,
  patternId: string,
  content: string,
  exemplarMemoryIds: string[]
): Thesis {
  const input: ThesisCreateInput = {
    patternId,
    content,
    exemplarMemoryIds,
  };

  return createThesis(db, input);
}

/**
 * Get the active thesis for a pattern
 */
export function getActiveThesisForPattern(
  db: Database,
  patternId: string
): Thesis | null {
  const theses = getThesesByPattern(db, patternId);
  return theses.find((t) => t.status === 'active') ?? null;
}

/**
 * Get all challenged theses
 */
export function getChallengedTheses(db: Database): Thesis[] {
  const active = getActiveTheses(db);
  const allTheses = active; // getActiveTheses returns active ones

  // Query for challenged theses
  const thesesByPattern: Thesis[] = [];
  for (const thesis of active) {
    const patternTheses = getThesesByPattern(db, thesis.patternId);
    for (const t of patternTheses) {
      if (t.status === 'challenged' && !thesesByPattern.find((x) => x.id === t.id)) {
        thesesByPattern.push(t);
      }
    }
  }

  return thesesByPattern;
}

/**
 * Add supporting evidence to a thesis
 */
export function addThesisEvidence(
  db: Database,
  thesisId: string,
  memoryId: string
): void {
  addExemplarToThesis(db, thesisId, memoryId);
}

/**
 * Check if a thesis has enough support for synthesis
 */
export function hasEnoughSupport(
  db: Database,
  thesisId: string,
  minExemplars: number = 3
): boolean {
  const thesis = getThesis(db, thesisId);
  if (!thesis) return false;

  return thesis.exemplarMemoryIds.length >= minExemplars;
}

/**
 * Generate thesis content from memories using LLM
 * LLM is required - errors propagate if unavailable
 */
export async function generateThesisContent(memories: Memory[]): Promise<string> {
  const analysis = await analyzePattern(memories);
  if (analysis.confidence >= 0.5 && analysis.insight.length > 20) {
    return analysis.insight;
  }
  // Low confidence or short insight - still return it rather than failing
  return analysis.insight;
}
