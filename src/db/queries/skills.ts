/**
 * Skill database queries
 */

import type { Database } from 'bun:sqlite';
import { generateId, now } from '../index.ts';
import type {
  Skill,
  SkillCreateInput,
  SkillStatus,
  SkillComplexity,
  SkillInstructions,
} from '../../types/skill.ts';

interface SkillRow {
  id: string;
  name: string;
  description: string;
  version: string;
  source_pattern_id: string;
  source_synthesis_id: string;
  instructions: string;
  complexity: SkillComplexity;
  status: SkillStatus;
  file_path: string | null;
  created_at: number;
  updated_at: number;
}

function rowToSkill(row: SkillRow): Skill {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    version: row.version,
    sourcePatternId: row.source_pattern_id,
    sourceSynthesisId: row.source_synthesis_id,
    instructions: JSON.parse(row.instructions) as SkillInstructions,
    complexity: row.complexity,
    status: row.status,
    filePath: row.file_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createSkill(db: Database, input: SkillCreateInput): Skill {
  const id = generateId();
  const timestamp = now();

  db.run(
    `INSERT INTO skills (
      id, name, description, version, source_pattern_id, source_synthesis_id,
      instructions, complexity, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.description,
      '1.0',
      input.sourcePatternId,
      input.sourceSynthesisId,
      JSON.stringify(input.instructions),
      input.complexity ?? 'moderate',
      'draft',
      timestamp,
      timestamp,
    ]
  );

  return {
    id,
    name: input.name,
    description: input.description,
    version: '1.0',
    sourcePatternId: input.sourcePatternId,
    sourceSynthesisId: input.sourceSynthesisId,
    instructions: input.instructions,
    complexity: input.complexity ?? 'moderate',
    status: 'draft',
    filePath: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getSkill(db: Database, id: string): Skill | null {
  const row = db.query<SkillRow, [string]>(
    `SELECT * FROM skills WHERE id = ?`
  ).get(id);

  return row ? rowToSkill(row) : null;
}

export function getSkillByName(db: Database, name: string): Skill | null {
  const row = db.query<SkillRow, [string]>(
    `SELECT * FROM skills WHERE name = ?`
  ).get(name);

  return row ? rowToSkill(row) : null;
}

export function updateSkill(
  db: Database,
  id: string,
  updates: Partial<{
    name: string;
    description: string;
    version: string;
    instructions: SkillInstructions;
    complexity: SkillComplexity;
    status: SkillStatus;
    filePath: string;
  }>
): Skill | null {
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

  if (updates.version !== undefined) {
    setClauses.push('version = ?');
    values.push(updates.version);
  }

  if (updates.instructions !== undefined) {
    setClauses.push('instructions = ?');
    values.push(JSON.stringify(updates.instructions));
  }

  if (updates.complexity !== undefined) {
    setClauses.push('complexity = ?');
    values.push(updates.complexity);
  }

  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    values.push(updates.status);
  }

  if (updates.filePath !== undefined) {
    setClauses.push('file_path = ?');
    values.push(updates.filePath);
  }

  values.push(id);
  db.run(`UPDATE skills SET ${setClauses.join(', ')} WHERE id = ?`, values);

  return getSkill(db, id);
}

export function deleteSkill(db: Database, id: string): boolean {
  const result = db.run(`DELETE FROM skills WHERE id = ?`, [id]);
  return result.changes > 0;
}

export function querySkills(
  db: Database,
  filter: {
    status?: SkillStatus;
    complexity?: SkillComplexity;
    limit?: number;
  } = {}
): Skill[] {
  const conditions: string[] = ['1=1'];
  const values: unknown[] = [];

  if (filter.status) {
    conditions.push('status = ?');
    values.push(filter.status);
  }

  if (filter.complexity) {
    conditions.push('complexity = ?');
    values.push(filter.complexity);
  }

  let query = `SELECT * FROM skills WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`;

  if (filter.limit) {
    query += ` LIMIT ?`;
    values.push(filter.limit);
  }

  const rows = db.query<SkillRow, unknown[]>(query).all(...values);
  return rows.map(rowToSkill);
}

export function getAllSkills(db: Database): Skill[] {
  const rows = db.query<SkillRow, []>(
    `SELECT * FROM skills ORDER BY created_at DESC`
  ).all();
  return rows.map(rowToSkill);
}

export function getPublishedSkills(db: Database): Skill[] {
  return querySkills(db, { status: 'published' });
}

export function publishSkill(db: Database, id: string): Skill | null {
  return updateSkill(db, id, { status: 'published' });
}

export function deprecateSkill(db: Database, id: string): Skill | null {
  return updateSkill(db, id, { status: 'deprecated' });
}
