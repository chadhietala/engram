/**
 * Published rules database queries
 */

import type { Database, SQLQueryBindings } from 'bun:sqlite';
import { generateId, now } from '../index.ts';
import type {
  PublishedRule,
  PublishedRuleCreateInput,
  PublishedRuleUpdateInput,
  RuleStatus,
  RuleScope,
} from '../../types/rules.ts';

interface PublishedRuleRow {
  id: string;
  name: string;
  pattern_id: string;
  synthesis_id: string | null;
  file_path: string;
  scope: RuleScope;
  status: RuleStatus;
  version: number;
  confidence: number;
  content_hash: string;
  created_at: number;
  updated_at: number;
}

function rowToPublishedRule(row: PublishedRuleRow): PublishedRule {
  return {
    id: row.id,
    name: row.name,
    patternId: row.pattern_id,
    synthesisId: row.synthesis_id,
    filePath: row.file_path,
    scope: row.scope,
    status: row.status,
    version: row.version,
    confidence: row.confidence,
    contentHash: row.content_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createPublishedRule(
  db: Database,
  input: PublishedRuleCreateInput
): PublishedRule {
  const id = generateId();
  const timestamp = now();

  db.run(
    `INSERT INTO published_rules (
      id, name, pattern_id, synthesis_id, file_path, scope,
      status, version, confidence, content_hash, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.patternId,
      input.synthesisId ?? null,
      input.filePath,
      input.scope,
      'active',
      1,
      input.confidence,
      input.contentHash,
      timestamp,
      timestamp,
    ]
  );

  return {
    id,
    name: input.name,
    patternId: input.patternId,
    synthesisId: input.synthesisId ?? null,
    filePath: input.filePath,
    scope: input.scope,
    status: 'active',
    version: 1,
    confidence: input.confidence,
    contentHash: input.contentHash,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getPublishedRule(db: Database, id: string): PublishedRule | null {
  const row = db.query<PublishedRuleRow, [string]>(
    `SELECT * FROM published_rules WHERE id = ?`
  ).get(id);

  return row ? rowToPublishedRule(row) : null;
}

export function getPublishedRuleByFilePath(
  db: Database,
  filePath: string
): PublishedRule | null {
  const row = db.query<PublishedRuleRow, [string]>(
    `SELECT * FROM published_rules WHERE file_path = ?`
  ).get(filePath);

  return row ? rowToPublishedRule(row) : null;
}

export function getPublishedRuleByPattern(
  db: Database,
  patternId: string
): PublishedRule | null {
  const row = db.query<PublishedRuleRow, [string]>(
    `SELECT * FROM published_rules WHERE pattern_id = ? AND status = 'active' ORDER BY version DESC LIMIT 1`
  ).get(patternId);

  return row ? rowToPublishedRule(row) : null;
}

export function getPublishedRuleBySynthesis(
  db: Database,
  synthesisId: string
): PublishedRule | null {
  const row = db.query<PublishedRuleRow, [string]>(
    `SELECT * FROM published_rules WHERE synthesis_id = ? AND status = 'active' ORDER BY version DESC LIMIT 1`
  ).get(synthesisId);

  return row ? rowToPublishedRule(row) : null;
}

export function updatePublishedRule(
  db: Database,
  id: string,
  updates: PublishedRuleUpdateInput
): PublishedRule | null {
  const timestamp = now();
  const setClauses: string[] = ['updated_at = ?'];
  const values: SQLQueryBindings[] = [timestamp];

  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    values.push(updates.status);
  }

  if (updates.version !== undefined) {
    setClauses.push('version = ?');
    values.push(updates.version);
  }

  if (updates.confidence !== undefined) {
    setClauses.push('confidence = ?');
    values.push(updates.confidence);
  }

  if (updates.contentHash !== undefined) {
    setClauses.push('content_hash = ?');
    values.push(updates.contentHash);
  }

  values.push(id);
  db.run(`UPDATE published_rules SET ${setClauses.join(', ')} WHERE id = ?`, values);

  return getPublishedRule(db, id);
}

export function deletePublishedRule(db: Database, id: string): boolean {
  const result = db.run(`DELETE FROM published_rules WHERE id = ?`, [id]);
  return result.changes > 0;
}

export function queryPublishedRules(
  db: Database,
  filter: {
    status?: RuleStatus;
    scope?: RuleScope;
    patternId?: string;
    limit?: number;
  } = {}
): PublishedRule[] {
  const conditions: string[] = ['1=1'];
  const values: SQLQueryBindings[] = [];

  if (filter.status) {
    conditions.push('status = ?');
    values.push(filter.status);
  }

  if (filter.scope) {
    conditions.push('scope = ?');
    values.push(filter.scope);
  }

  if (filter.patternId) {
    conditions.push('pattern_id = ?');
    values.push(filter.patternId);
  }

  let query = `SELECT * FROM published_rules WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`;

  if (filter.limit) {
    query += ` LIMIT ?`;
    values.push(filter.limit);
  }

  const rows = db.query<PublishedRuleRow, SQLQueryBindings[]>(query).all(...values);
  return rows.map(rowToPublishedRule);
}

export function getAllPublishedRules(db: Database): PublishedRule[] {
  const rows = db.query<PublishedRuleRow, []>(
    `SELECT * FROM published_rules ORDER BY created_at DESC`
  ).all();
  return rows.map(rowToPublishedRule);
}

export function getActivePublishedRules(db: Database): PublishedRule[] {
  return queryPublishedRules(db, { status: 'active' });
}

export function invalidatePublishedRule(db: Database, id: string): PublishedRule | null {
  return updatePublishedRule(db, id, { status: 'invalidated' });
}

export function supersedePublishedRule(db: Database, id: string): PublishedRule | null {
  return updatePublishedRule(db, id, { status: 'superseded' });
}
