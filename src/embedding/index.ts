/**
 * Embedding manager using Transformers.js
 * Uses all-MiniLM-L6-v2 model (384 dimensions)
 */

import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import type { Database } from 'bun:sqlite';
import { getCachedEmbedding, cacheEmbedding } from './cache.ts';

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384;

let embeddingPipeline: FeatureExtractionPipeline | null = null;
let initPromise: Promise<FeatureExtractionPipeline> | null = null;

/**
 * Initialize the embedding pipeline (lazy loading)
 */
async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (embeddingPipeline) return embeddingPipeline;

  if (initPromise) return initPromise;

  initPromise = pipeline('feature-extraction', MODEL_NAME, {
    // Use local cache directory
    cache_dir: './data/embeddings',
  }).then((pipe) => {
    embeddingPipeline = pipe as FeatureExtractionPipeline;
    return embeddingPipeline;
  });

  return initPromise;
}

/**
 * Compute embedding for a single text
 */
export async function embed(
  text: string,
  db?: Database
): Promise<Float32Array> {
  // Check cache first if database provided
  if (db) {
    const cached = getCachedEmbedding(db, text);
    if (cached) return cached;
  }

  const pipe = await getEmbeddingPipeline();

  // Get embedding with mean pooling and normalization
  const output = await pipe(text, {
    pooling: 'mean',
    normalize: true,
  });

  // Convert to Float32Array
  const embedding = new Float32Array(output.data as ArrayLike<number>);

  // Cache if database provided
  if (db) {
    cacheEmbedding(db, text, embedding);
  }

  return embedding;
}

/**
 * Compute embeddings for multiple texts (batched)
 */
export async function embedBatch(
  texts: string[],
  db?: Database
): Promise<Float32Array[]> {
  const results: Float32Array[] = [];
  const uncachedTexts: string[] = [];
  const uncachedIndices: number[] = [];

  // Check cache for each text
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (!text) continue;

    if (db) {
      const cached = getCachedEmbedding(db, text);
      if (cached) {
        results[i] = cached;
        continue;
      }
    }
    uncachedTexts.push(text);
    uncachedIndices.push(i);
  }

  // Compute embeddings for uncached texts in parallel
  if (uncachedTexts.length > 0) {
    const pipe = await getEmbeddingPipeline();

    const embeddings = await Promise.all(
      uncachedTexts.map(text =>
        pipe(text, { pooling: 'mean', normalize: true })
      )
    );

    for (let i = 0; i < embeddings.length; i++) {
      const output = embeddings[i]!;
      const embedding = new Float32Array(output.data as ArrayLike<number>);
      const originalIndex = uncachedIndices[i]!;
      results[originalIndex] = embedding;

      // Cache
      if (db) {
        cacheEmbedding(db, uncachedTexts[i]!, embedding);
      }
    }
  }

  return results;
}

/**
 * Compute cosine similarity between two embeddings
 * Note: If embeddings are normalized, this is equivalent to dot product
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Embedding dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Find top-k most similar embeddings
 */
export function findTopKSimilar(
  query: Float32Array,
  candidates: Array<{ id: string; embedding: Float32Array }>,
  k: number
): Array<{ id: string; similarity: number }> {
  const scored = candidates.map((c) => ({
    id: c.id,
    similarity: cosineSimilarity(query, c.embedding),
  }));

  scored.sort((a, b) => b.similarity - a.similarity);

  return scored.slice(0, k);
}

/**
 * Get embedding dimension
 */
export function getEmbeddingDimension(): number {
  return EMBEDDING_DIM;
}

/**
 * Preload the model (useful for startup)
 */
export async function preloadModel(): Promise<void> {
  await getEmbeddingPipeline();
}

export { getCachedEmbedding, cacheEmbedding } from './cache.ts';
