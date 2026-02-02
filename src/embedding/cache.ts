/**
 * SQLite-backed embedding cache
 */

import type { Database } from 'bun:sqlite';
import { generateId, now } from '../db/index.ts';

const MODEL_NAME = 'all-MiniLM-L6-v2';

/**
 * Generate a hash for content to use as cache key
 */
function hashContent(content: string): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(content);
  return hasher.digest('hex');
}

/**
 * Get cached embedding for content
 */
export function getCachedEmbedding(
  db: Database,
  content: string
): Float32Array | null {
  const contentHash = hashContent(content);

  const row = db.query<{ embedding: Buffer }, [string, string]>(
    `SELECT embedding FROM embedding_cache WHERE content_hash = ? AND model = ?`
  ).get(contentHash, MODEL_NAME);

  if (!row) return null;

  return new Float32Array(row.embedding.buffer);
}

/**
 * Cache an embedding for content
 */
export function cacheEmbedding(
  db: Database,
  content: string,
  embedding: Float32Array
): void {
  const contentHash = hashContent(content);
  const timestamp = now();

  db.run(
    `INSERT OR REPLACE INTO embedding_cache (content_hash, embedding, model, created_at)
     VALUES (?, ?, ?, ?)`,
    [contentHash, Buffer.from(embedding.buffer), MODEL_NAME, timestamp]
  );
}

/**
 * Clear old cached embeddings
 */
export function clearOldCache(db: Database, maxAgeMs: number): number {
  const cutoff = now() - maxAgeMs;
  const result = db.run(
    `DELETE FROM embedding_cache WHERE created_at < ?`,
    [cutoff]
  );
  return result.changes;
}

/**
 * Get cache statistics
 */
export function getCacheStats(db: Database): {
  totalEntries: number;
  totalSizeBytes: number;
} {
  const row = db.query<{ count: number; size: number }, []>(
    `SELECT COUNT(*) as count, COALESCE(SUM(LENGTH(embedding)), 0) as size FROM embedding_cache`
  ).get();

  return {
    totalEntries: row?.count ?? 0,
    totalSizeBytes: row?.size ?? 0,
  };
}
