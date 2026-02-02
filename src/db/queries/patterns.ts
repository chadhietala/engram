/**
 * Pattern database queries
 */

import type { Database } from 'bun:sqlite';
import { generateId, now } from '../index.ts';
import type {
  Pattern,
  PatternCreateInput,
  DialecticPhase,
} from '../../types/dialectic.ts';

interface PatternRow {
  id: string;
  name: string;
  description: string;
  stage: 'conceptual' | 'semantic' | 'syntactic';
  dialectic_phase: DialecticPhase;
  embedding: Buffer | null;
  confidence: number;
  usage_count: number;
  success_rate: number;
  created_at: number;
  updated_at: number;
}

function rowToPattern(row: PatternRow, memoryIds: string[] = []): Pattern {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    stage: row.stage,
    dialecticPhase: row.dialectic_phase,
    embedding: row.embedding ? new Float32Array(row.embedding.buffer) : null,
    confidence: row.confidence,
    usageCount: row.usage_count,
    successRate: row.success_rate,
    memoryIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createPattern(
  db: Database,
  input: PatternCreateInput,
  embedding?: Float32Array
): Pattern {
  const id = generateId();
  const timestamp = now();

  const embeddingBuffer = embedding ? Buffer.from(embedding.buffer) : null;

  db.run(
    `INSERT INTO patterns (
      id, name, description, stage, dialectic_phase, embedding,
      confidence, usage_count, success_rate, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.description,
      input.stage ?? 'conceptual',
      'thesis', // New patterns start in thesis phase
      embeddingBuffer,
      0.5,
      0,
      0.0,
      timestamp,
      timestamp,
    ]
  );

  // Associate memories with pattern
  for (const memoryId of input.memoryIds) {
    db.run(
      `INSERT INTO pattern_memories (pattern_id, memory_id, created_at) VALUES (?, ?, ?)`,
      [id, memoryId, timestamp]
    );
  }

  return {
    id,
    name: input.name,
    description: input.description,
    stage: input.stage ?? 'conceptual',
    dialecticPhase: 'thesis',
    embedding: embedding ?? null,
    confidence: 0.5,
    usageCount: 0,
    successRate: 0.0,
    memoryIds: input.memoryIds,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getPattern(db: Database, id: string): Pattern | null {
  const row = db.query<PatternRow, [string]>(
    `SELECT * FROM patterns WHERE id = ?`
  ).get(id);

  if (!row) return null;

  const memoryIds = db
    .query<{ memory_id: string }, [string]>(
      `SELECT memory_id FROM pattern_memories WHERE pattern_id = ?`
    )
    .all(id)
    .map((r) => r.memory_id);

  return rowToPattern(row, memoryIds);
}

export function updatePattern(
  db: Database,
  id: string,
  updates: Partial<{
    name: string;
    description: string;
    stage: 'conceptual' | 'semantic' | 'syntactic';
    dialecticPhase: DialecticPhase;
    confidence: number;
    usageCount: number;
    successRate: number;
  }>,
  embedding?: Float32Array
): Pattern | null {
  const timestamp = now();
  const setClauses: string[] = ['updated_at = ?'];
  const values: unknown[] = [timestamp];

  if (updates.name !== undefined) {
    setClauses.push('name = ?');
    values.push(updates.name);
  }

  if (updates.description !== undefined) {
    setClauses.push('description = ?');
    values.push(updates.description);
  }

  if (updates.stage !== undefined) {
    setClauses.push('stage = ?');
    values.push(updates.stage);
  }

  if (updates.dialecticPhase !== undefined) {
    setClauses.push('dialectic_phase = ?');
    values.push(updates.dialecticPhase);
  }

  if (updates.confidence !== undefined) {
    setClauses.push('confidence = ?');
    values.push(updates.confidence);
  }

  if (updates.usageCount !== undefined) {
    setClauses.push('usage_count = ?');
    values.push(updates.usageCount);
  }

  if (updates.successRate !== undefined) {
    setClauses.push('success_rate = ?');
    values.push(updates.successRate);
  }

  if (embedding) {
    setClauses.push('embedding = ?');
    values.push(Buffer.from(embedding.buffer));
  }

  values.push(id);
  db.run(`UPDATE patterns SET ${setClauses.join(', ')} WHERE id = ?`, values);

  return getPattern(db, id);
}

export function deletePattern(db: Database, id: string): boolean {
  const result = db.run(`DELETE FROM patterns WHERE id = ?`, [id]);
  return result.changes > 0;
}

export function queryPatterns(
  db: Database,
  filter: {
    stage?: 'conceptual' | 'semantic' | 'syntactic';
    dialecticPhase?: DialecticPhase;
    minConfidence?: number;
    limit?: number;
  } = {}
): Pattern[] {
  const conditions: string[] = ['1=1'];
  const values: unknown[] = [];

  if (filter.stage) {
    conditions.push('stage = ?');
    values.push(filter.stage);
  }

  if (filter.dialecticPhase) {
    conditions.push('dialectic_phase = ?');
    values.push(filter.dialecticPhase);
  }

  if (filter.minConfidence !== undefined) {
    conditions.push('confidence >= ?');
    values.push(filter.minConfidence);
  }

  let query = `SELECT * FROM patterns WHERE ${conditions.join(' AND ')} ORDER BY confidence DESC`;

  if (filter.limit) {
    query += ` LIMIT ?`;
    values.push(filter.limit);
  }

  const rows = db.query<PatternRow, unknown[]>(query).all(...values);

  return rows.map((row) => {
    const memoryIds = db
      .query<{ memory_id: string }, [string]>(
        `SELECT memory_id FROM pattern_memories WHERE pattern_id = ?`
      )
      .all(row.id)
      .map((r) => r.memory_id);
    return rowToPattern(row, memoryIds);
  });
}

export function addMemoryToPattern(
  db: Database,
  patternId: string,
  memoryId: string
): void {
  const timestamp = now();
  db.run(
    `INSERT OR IGNORE INTO pattern_memories (pattern_id, memory_id, created_at) VALUES (?, ?, ?)`,
    [patternId, memoryId, timestamp]
  );
}

export function removeMemoryFromPattern(
  db: Database,
  patternId: string,
  memoryId: string
): void {
  db.run(
    `DELETE FROM pattern_memories WHERE pattern_id = ? AND memory_id = ?`,
    [patternId, memoryId]
  );
}

export function incrementPatternUsage(
  db: Database,
  id: string,
  success: boolean
): void {
  const timestamp = now();

  // Get current values
  const pattern = getPattern(db, id);
  if (!pattern) return;

  const newUsageCount = pattern.usageCount + 1;
  const successIncrement = success ? 1 : 0;
  const newSuccessRate =
    (pattern.successRate * pattern.usageCount + successIncrement) / newUsageCount;

  db.run(
    `UPDATE patterns SET usage_count = ?, success_rate = ?, updated_at = ? WHERE id = ?`,
    [newUsageCount, newSuccessRate, timestamp, id]
  );
}

export function getPatternsWithEmbeddings(db: Database): Pattern[] {
  const rows = db.query<PatternRow, []>(
    `SELECT * FROM patterns WHERE embedding IS NOT NULL`
  ).all();

  return rows.map((row) => {
    const memoryIds = db
      .query<{ memory_id: string }, [string]>(
        `SELECT memory_id FROM pattern_memories WHERE pattern_id = ?`
      )
      .all(row.id)
      .map((r) => r.memory_id);
    return rowToPattern(row, memoryIds);
  });
}
