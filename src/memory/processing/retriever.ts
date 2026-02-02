/**
 * Memory retrieval with hybrid FTS5 + embedding search
 */

import type { Database } from 'bun:sqlite';
import { embed, cosineSimilarity } from '../../embedding/index.ts';
import { queryMemories, getMemoriesWithEmbeddings, getMemory } from '../../db/queries/memories.ts';
import type { Memory, MemoryFilter, RetrievalResult } from '../../types/memory.ts';

/**
 * Retrieval configuration
 */
export interface RetrievalConfig {
  similarityWeight: number;
  recencyWeight: number;
  strengthWeight: number;
  minSimilarity: number;
  topK: number;
}

/**
 * Hybrid search configuration
 */
export interface HybridSearchConfig {
  ftsWeight: number;      // Weight for FTS5 keyword matches
  embeddingWeight: number; // Weight for semantic similarity
  recencyWeight: number;
  strengthWeight: number;
  topK: number;
}

const DEFAULT_CONFIG: RetrievalConfig = {
  similarityWeight: 0.6,
  recencyWeight: 0.2,
  strengthWeight: 0.2,
  minSimilarity: 0.3,
  topK: 10,
};

const DEFAULT_HYBRID_CONFIG: HybridSearchConfig = {
  ftsWeight: 0.4,
  embeddingWeight: 0.4,
  recencyWeight: 0.1,
  strengthWeight: 0.1,
  topK: 10,
};

/**
 * FTS5 search result
 */
interface FtsResult {
  id: string;
  rank: number;
}

/**
 * Search using FTS5 full-text search (fast keyword matching)
 */
export function searchFts(
  db: Database,
  query: string,
  limit: number = 20
): FtsResult[] {
  // Escape special FTS5 characters and prepare query
  const escapedQuery = query
    .replace(/['"]/g, '')
    .split(/\s+/)
    .filter(term => term.length > 1)
    .map(term => `"${term}"*`)
    .join(' OR ');

  if (!escapedQuery) return [];

  try {
    const results = db.query<{ id: string; rank: number }, [string, number]>(
      `SELECT memory_id as id, rank
       FROM memories_fts
       WHERE memories_fts MATCH ?
       ORDER BY rank
       LIMIT ?`
    ).all(escapedQuery, limit);

    return results;
  } catch {
    // FTS5 table might not exist yet or query syntax error
    return [];
  }
}

/**
 * Hybrid search combining FTS5 and embeddings
 * - FTS5 for exact/keyword matches (fast)
 * - Embeddings for semantic similarity (accurate)
 */
export async function hybridSearch(
  db: Database,
  query: string,
  filter: MemoryFilter = {},
  config: Partial<HybridSearchConfig> = {}
): Promise<RetrievalResult[]> {
  const cfg = { ...DEFAULT_HYBRID_CONFIG, ...config };
  const scores = new Map<string, { fts: number; embedding: number; memory?: Memory }>();

  // 1. FTS5 search (fast, keyword-based)
  const ftsResults = searchFts(db, query, cfg.topK * 2);
  const maxFtsRank = Math.max(...ftsResults.map(r => Math.abs(r.rank)), 1);

  for (const fts of ftsResults) {
    // Normalize FTS rank (lower is better, so invert)
    const normalizedScore = 1 - (Math.abs(fts.rank) / maxFtsRank);
    scores.set(fts.id, { fts: normalizedScore, embedding: 0 });
  }

  // 2. Embedding search (slower, semantic)
  const queryEmbedding = await embed(query, db);
  const candidates = getMemoriesWithEmbeddings(db, {
    ...filter,
    limit: undefined,
  });

  for (const memory of candidates) {
    if (!memory.embedding) continue;

    const similarity = cosineSimilarity(queryEmbedding, memory.embedding);
    if (similarity < 0.2) continue;

    const existing = scores.get(memory.id);
    if (existing) {
      existing.embedding = similarity;
      existing.memory = memory;
    } else {
      scores.set(memory.id, { fts: 0, embedding: similarity, memory });
    }
  }

  // 3. Load memories for FTS-only results
  for (const [id, score] of scores) {
    if (!score.memory) {
      const memory = getMemory(db, id);
      if (memory) {
        score.memory = memory;
      }
    }
  }

  // 4. Compute combined scores
  const results: RetrievalResult[] = [];

  for (const [, score] of scores) {
    if (!score.memory) continue;

    const recencyScore = computeRecencyScore(score.memory.lastAccessed);
    const strengthScore = score.memory.strength;

    const combinedScore =
      cfg.ftsWeight * score.fts +
      cfg.embeddingWeight * score.embedding +
      cfg.recencyWeight * recencyScore +
      cfg.strengthWeight * strengthScore;

    results.push({
      memory: score.memory,
      score: combinedScore,
      similarity: score.embedding,
    });
  }

  // Sort by combined score
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, cfg.topK);
}

/**
 * Compute recency score (1.0 for now, decaying to 0 over time)
 */
function computeRecencyScore(lastAccessed: number, halfLifeMs: number = 3600000): number {
  const age = Date.now() - lastAccessed;
  return Math.pow(0.5, age / halfLifeMs);
}

/**
 * Retrieve memories by semantic similarity with filters
 */
export async function retrieveMemories(
  db: Database,
  query: string,
  filter: MemoryFilter = {},
  config: Partial<RetrievalConfig> = {}
): Promise<RetrievalResult[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Embed the query
  const queryEmbedding = await embed(query, db);

  // Get candidate memories with embeddings
  const candidateFilter = {
    ...filter,
    limit: undefined, // Get all candidates, we'll filter by similarity
  };

  const candidates = getMemoriesWithEmbeddings(db, candidateFilter);

  if (candidates.length === 0) {
    return [];
  }

  // Score each candidate
  const scored: RetrievalResult[] = [];

  for (const memory of candidates) {
    if (!memory.embedding) continue;

    const similarity = cosineSimilarity(queryEmbedding, memory.embedding);

    // Skip if below minimum similarity
    if (similarity < cfg.minSimilarity) continue;

    const recencyScore = computeRecencyScore(memory.lastAccessed);
    const strengthScore = memory.strength;

    const score =
      cfg.similarityWeight * similarity +
      cfg.recencyWeight * recencyScore +
      cfg.strengthWeight * strengthScore;

    scored.push({
      memory,
      score,
      similarity,
    });
  }

  // Sort by score and return top-k
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, filter.limit ?? cfg.topK);
}

/**
 * Retrieve memories relevant to a prompt for context injection
 * Uses hybrid search (FTS5 + embeddings) for best results
 */
export async function retrieveContextMemories(
  db: Database,
  prompt: string,
  sessionId?: string,
  maxMemories: number = 5
): Promise<RetrievalResult[]> {
  // Use hybrid search for best of both worlds
  const filter: MemoryFilter = sessionId
    ? { sessionId }
    : { types: ['short_term', 'long_term', 'collective'] };

  // Hybrid search combines FTS5 keyword matching with semantic similarity
  const hybridResults = await hybridSearch(db, prompt, filter, {
    topK: maxMemories,
    ftsWeight: 0.35,      // Keyword matches are valuable
    embeddingWeight: 0.45, // Semantic similarity slightly more important
    recencyWeight: 0.1,
    strengthWeight: 0.1,
  });

  // If we got enough results, return them
  if (hybridResults.length >= maxMemories) {
    return hybridResults.slice(0, maxMemories);
  }

  // Otherwise, supplement with pure embedding search for long-term memories
  const longTermMemories = await retrieveMemories(
    db,
    prompt,
    { types: ['long_term', 'collective'] },
    {
      topK: maxMemories - hybridResults.length,
      minSimilarity: 0.4,
    }
  );

  // Combine and deduplicate
  const combined = [...hybridResults];
  const seenIds = new Set(hybridResults.map((r) => r.memory.id));

  for (const result of longTermMemories) {
    if (!seenIds.has(result.memory.id)) {
      combined.push(result);
      seenIds.add(result.memory.id);
    }
  }

  // Sort by score and limit
  combined.sort((a, b) => b.score - a.score);

  return combined.slice(0, maxMemories);
}

/**
 * Format memories for context injection
 */
export function formatMemoriesForContext(results: RetrievalResult[]): string {
  if (results.length === 0) {
    return '';
  }

  const lines: string[] = ['<engram-memories>'];

  for (const result of results) {
    const { memory, similarity } = result;
    const relevance = (similarity * 100).toFixed(0);

    lines.push(`<memory relevance="${relevance}%">`);
    lines.push(memory.content);

    // Add metadata hints
    const hints: string[] = [];
    if (memory.metadata.toolName) {
      hints.push(`tool: ${memory.metadata.toolName}`);
    }
    if (memory.metadata.tags.length > 0) {
      hints.push(`tags: ${memory.metadata.tags.slice(0, 3).join(', ')}`);
    }
    if (hints.length > 0) {
      lines.push(`[${hints.join(' | ')}]`);
    }

    lines.push('</memory>');
  }

  lines.push('</engram-memories>');

  return lines.join('\n');
}

/**
 * Find related memories to a given memory
 */
export async function findRelatedMemories(
  db: Database,
  memory: Memory,
  maxRelated: number = 5
): Promise<RetrievalResult[]> {
  if (!memory.embedding) {
    // Can't find related without embedding
    return [];
  }

  // Get all memories with embeddings
  const candidates = getMemoriesWithEmbeddings(db, {});

  const results: RetrievalResult[] = [];

  for (const candidate of candidates) {
    if (candidate.id === memory.id || !candidate.embedding) continue;

    const similarity = cosineSimilarity(memory.embedding, candidate.embedding);

    if (similarity > 0.5) {
      results.push({
        memory: candidate,
        score: similarity,
        similarity,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);

  return results.slice(0, maxRelated);
}

/**
 * Search memories by semantic key filters
 */
export function searchBySemanticKeys(
  db: Database,
  keys: Array<{ key: string; value?: string }>,
  limit: number = 10
): Memory[] {
  return queryMemories(db, {
    semanticKeys: keys,
    limit,
  });
}
