/**
 * Memory database queries
 */

import type { Database } from 'bun:sqlite';
import { generateId, now } from '../index.ts';
import type {
  Memory,
  MemoryType,
  MemoryMetadata,
  MemoryFilter,
  MemoryCreateInput,
  MemoryUpdateInput,
  SemanticKeyValue,
} from '../../types/memory.ts';

interface MemoryRow {
  id: string;
  type: MemoryType;
  content: string;
  embedding: Buffer | null;
  metadata: string;
  session_id: string;
  stage: string;
  strength: number;
  decay_factor: number;
  access_count: number;
  last_accessed: number;
  created_at: number;
  updated_at: number;
}

function rowToMemory(row: MemoryRow): Memory {
  const metadata = JSON.parse(row.metadata) as MemoryMetadata;
  return {
    id: row.id,
    type: row.type,
    content: row.content,
    embedding: row.embedding ? new Float32Array(row.embedding.buffer) : null,
    metadata,
    strength: row.strength,
    decayFactor: row.decay_factor,
    accessCount: row.access_count,
    lastAccessed: row.last_accessed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createMemory(
  db: Database,
  input: MemoryCreateInput,
  embedding?: Float32Array
): Memory {
  const id = generateId();
  const timestamp = now();

  const metadata: MemoryMetadata = {
    ...input.metadata,
    stage: input.metadata.stage ?? 'conceptual',
    confidence: input.metadata.confidence ?? 0.5,
  };

  const embeddingBuffer = embedding
    ? Buffer.from(embedding.buffer)
    : null;

  db.run(
    `INSERT INTO memories (
      id, type, content, embedding, metadata, session_id, stage,
      strength, decay_factor, access_count, last_accessed, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.type,
      input.content,
      embeddingBuffer,
      JSON.stringify(metadata),
      metadata.sessionId,
      metadata.stage,
      input.strength ?? 1.0,
      input.decayFactor ?? 1.0,
      0,
      timestamp,
      timestamp,
      timestamp,
    ]
  );

  // Insert semantic keys
  for (const sk of metadata.semanticKeys) {
    db.run(
      `INSERT INTO semantic_keys (id, memory_id, key, value, weight) VALUES (?, ?, ?, ?, ?)`,
      [generateId(), id, sk.key, sk.value, sk.weight]
    );
  }

  return {
    id,
    type: input.type,
    content: input.content,
    embedding: embedding ?? null,
    metadata,
    strength: input.strength ?? 1.0,
    decayFactor: input.decayFactor ?? 1.0,
    accessCount: 0,
    lastAccessed: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getMemory(db: Database, id: string): Memory | null {
  const row = db.query<MemoryRow, [string]>(
    `SELECT * FROM memories WHERE id = ?`
  ).get(id);

  if (!row) return null;

  // Update access count and last accessed
  const timestamp = now();
  db.run(
    `UPDATE memories SET access_count = access_count + 1, last_accessed = ? WHERE id = ?`,
    [timestamp, id]
  );

  const memory = rowToMemory(row);
  memory.accessCount += 1;
  memory.lastAccessed = timestamp;
  return memory;
}

export function getMemoryWithoutTracking(db: Database, id: string): Memory | null {
  const row = db.query<MemoryRow, [string]>(
    `SELECT * FROM memories WHERE id = ?`
  ).get(id);

  return row ? rowToMemory(row) : null;
}

export function updateMemory(
  db: Database,
  id: string,
  input: MemoryUpdateInput,
  embedding?: Float32Array
): Memory | null {
  const existing = getMemoryWithoutTracking(db, id);
  if (!existing) return null;

  const timestamp = now();
  const updates: string[] = ['updated_at = ?'];
  const values: unknown[] = [timestamp];

  if (input.content !== undefined) {
    updates.push('content = ?');
    values.push(input.content);
  }

  if (input.type !== undefined) {
    updates.push('type = ?');
    values.push(input.type);
  }

  if (input.strength !== undefined) {
    updates.push('strength = ?');
    values.push(input.strength);
  }

  if (input.decayFactor !== undefined) {
    updates.push('decay_factor = ?');
    values.push(input.decayFactor);
  }

  if (input.metadata !== undefined) {
    const newMetadata = { ...existing.metadata, ...input.metadata };
    updates.push('metadata = ?');
    values.push(JSON.stringify(newMetadata));

    if (input.metadata.stage) {
      updates.push('stage = ?');
      values.push(input.metadata.stage);
    }

    // Update semantic keys if provided
    if (input.metadata.semanticKeys) {
      db.run(`DELETE FROM semantic_keys WHERE memory_id = ?`, [id]);
      for (const sk of input.metadata.semanticKeys) {
        db.run(
          `INSERT INTO semantic_keys (id, memory_id, key, value, weight) VALUES (?, ?, ?, ?, ?)`,
          [generateId(), id, sk.key, sk.value, sk.weight]
        );
      }
    }
  }

  if (embedding) {
    updates.push('embedding = ?');
    values.push(Buffer.from(embedding.buffer));
  }

  values.push(id);
  db.run(`UPDATE memories SET ${updates.join(', ')} WHERE id = ?`, values);

  return getMemoryWithoutTracking(db, id);
}

export function deleteMemory(db: Database, id: string): boolean {
  const result = db.run(`DELETE FROM memories WHERE id = ?`, [id]);
  return result.changes > 0;
}

export function queryMemories(db: Database, filter: MemoryFilter): Memory[] {
  const conditions: string[] = ['1=1'];
  const values: unknown[] = [];

  if (filter.types && filter.types.length > 0) {
    conditions.push(`type IN (${filter.types.map(() => '?').join(', ')})`);
    values.push(...filter.types);
  }

  if (filter.sessionId) {
    conditions.push('session_id = ?');
    values.push(filter.sessionId);
  }

  if (filter.source) {
    conditions.push(`json_extract(metadata, '$.source') = ?`);
    values.push(filter.source);
  }

  if (filter.stage) {
    conditions.push('stage = ?');
    values.push(filter.stage);
  }

  if (filter.minStrength !== undefined) {
    conditions.push('strength >= ?');
    values.push(filter.minStrength);
  }

  if (filter.minConfidence !== undefined) {
    conditions.push(`json_extract(metadata, '$.confidence') >= ?`);
    values.push(filter.minConfidence);
  }

  if (filter.tags && filter.tags.length > 0) {
    for (const tag of filter.tags) {
      conditions.push(`json_extract(metadata, '$.tags') LIKE ?`);
      values.push(`%"${tag}"%`);
    }
  }

  // Handle semantic key filters via subquery
  if (filter.semanticKeys && filter.semanticKeys.length > 0) {
    for (const sk of filter.semanticKeys) {
      if (sk.value !== undefined) {
        conditions.push(
          `EXISTS (SELECT 1 FROM semantic_keys WHERE memory_id = memories.id AND key = ? AND value = ?)`
        );
        values.push(sk.key, sk.value);
      } else {
        conditions.push(
          `EXISTS (SELECT 1 FROM semantic_keys WHERE memory_id = memories.id AND key = ?)`
        );
        values.push(sk.key);
      }
    }
  }

  let query = `SELECT * FROM memories WHERE ${conditions.join(' AND ')} ORDER BY last_accessed DESC`;

  if (filter.limit) {
    query += ` LIMIT ?`;
    values.push(filter.limit);
  }

  const rows = db.query<MemoryRow, unknown[]>(query).all(...values);
  return rows.map(rowToMemory);
}

export function getMemoriesBySession(db: Database, sessionId: string): Memory[] {
  return queryMemories(db, { sessionId });
}

export function getMemoriesByType(db: Database, type: MemoryType): Memory[] {
  return queryMemories(db, { types: [type] });
}

export function getSemanticKeys(db: Database, memoryId: string): SemanticKeyValue[] {
  const rows = db.query<{ key: string; value: string; weight: number }, [string]>(
    `SELECT key, value, weight FROM semantic_keys WHERE memory_id = ?`
  ).all(memoryId);

  return rows;
}

export function applyDecay(db: Database, halfLifeMs: number = 24 * 60 * 60 * 1000): number {
  const timestamp = now();

  // Apply decay to short-term memories based on time since last access
  const result = db.run(
    `UPDATE memories
     SET strength = strength * decay_factor * (0.5 * (1.0 / (1.0 + ((? - last_accessed) / ?))))
     WHERE type = 'short_term'`,
    [timestamp, halfLifeMs]
  );

  // Delete memories with very low strength
  db.run(`DELETE FROM memories WHERE strength < 0.01 AND type = 'short_term'`);

  return result.changes;
}

export function promoteMemory(db: Database, id: string, newType: MemoryType): Memory | null {
  return updateMemory(db, id, { type: newType });
}

export function getMemoriesWithEmbeddings(db: Database, filter: MemoryFilter): Memory[] {
  const memories = queryMemories(db, filter);
  return memories.filter((m) => m.embedding !== null);
}
