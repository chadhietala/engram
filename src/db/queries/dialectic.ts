/**
 * Dialectic (thesis, antithesis, synthesis) database queries
 */

import type { Database } from 'bun:sqlite';
import { generateId, now } from '../index.ts';
import type {
  Thesis,
  ThesisStatus,
  ThesisCreateInput,
  Antithesis,
  AntithesisCreateInput,
  ContradictionType,
  Synthesis,
  SynthesisCreateInput,
  SynthesisResolution,
  DialecticCycle,
  ToolDataSnapshot,
} from '../../types/dialectic.ts';

// ============= Thesis Queries =============

interface ThesisRow {
  id: string;
  pattern_id: string;
  content: string;
  status: ThesisStatus;
  created_at: number;
  updated_at: number;
}

function rowToThesis(row: ThesisRow, exemplarMemoryIds: string[] = []): Thesis {
  return {
    id: row.id,
    patternId: row.pattern_id,
    content: row.content,
    status: row.status,
    exemplarMemoryIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createThesis(db: Database, input: ThesisCreateInput): Thesis {
  const id = generateId();
  const timestamp = now();

  db.run(
    `INSERT INTO theses (id, pattern_id, content, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.patternId, input.content, 'active', timestamp, timestamp]
  );

  // Associate exemplar memories
  for (const memoryId of input.exemplarMemoryIds) {
    db.run(
      `INSERT INTO thesis_memories (thesis_id, memory_id, created_at) VALUES (?, ?, ?)`,
      [id, memoryId, timestamp]
    );
  }

  return {
    id,
    patternId: input.patternId,
    content: input.content,
    status: 'active',
    exemplarMemoryIds: input.exemplarMemoryIds,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getThesis(db: Database, id: string): Thesis | null {
  const row = db.query<ThesisRow, [string]>(
    `SELECT * FROM theses WHERE id = ?`
  ).get(id);

  if (!row) return null;

  const exemplarMemoryIds = db
    .query<{ memory_id: string }, [string]>(
      `SELECT memory_id FROM thesis_memories WHERE thesis_id = ?`
    )
    .all(id)
    .map((r) => r.memory_id);

  return rowToThesis(row, exemplarMemoryIds);
}

export function updateThesisStatus(
  db: Database,
  id: string,
  status: ThesisStatus
): Thesis | null {
  const timestamp = now();
  db.run(`UPDATE theses SET status = ?, updated_at = ? WHERE id = ?`, [
    status,
    timestamp,
    id,
  ]);
  return getThesis(db, id);
}

export function addExemplarToThesis(
  db: Database,
  thesisId: string,
  memoryId: string
): void {
  const timestamp = now();
  db.run(
    `INSERT OR IGNORE INTO thesis_memories (thesis_id, memory_id, created_at) VALUES (?, ?, ?)`,
    [thesisId, memoryId, timestamp]
  );
}

export function getThesesByPattern(db: Database, patternId: string): Thesis[] {
  const rows = db.query<ThesisRow, [string]>(
    `SELECT * FROM theses WHERE pattern_id = ?`
  ).all(patternId);

  return rows.map((row) => {
    const exemplarMemoryIds = db
      .query<{ memory_id: string }, [string]>(
        `SELECT memory_id FROM thesis_memories WHERE thesis_id = ?`
      )
      .all(row.id)
      .map((r) => r.memory_id);
    return rowToThesis(row, exemplarMemoryIds);
  });
}

export function getActiveTheses(db: Database): Thesis[] {
  const rows = db.query<ThesisRow, []>(
    `SELECT * FROM theses WHERE status = 'active'`
  ).all();

  return rows.map((row) => {
    const exemplarMemoryIds = db
      .query<{ memory_id: string }, [string]>(
        `SELECT memory_id FROM thesis_memories WHERE thesis_id = ?`
      )
      .all(row.id)
      .map((r) => r.memory_id);
    return rowToThesis(row, exemplarMemoryIds);
  });
}

// ============= Antithesis Queries =============

interface AntithesisRow {
  id: string;
  thesis_id: string;
  content: string;
  contradiction_type: ContradictionType;
  created_at: number;
}

function rowToAntithesis(
  row: AntithesisRow,
  exemplarMemoryIds: string[] = []
): Antithesis {
  return {
    id: row.id,
    thesisId: row.thesis_id,
    content: row.content,
    contradictionType: row.contradiction_type,
    exemplarMemoryIds,
    createdAt: row.created_at,
  };
}

export function createAntithesis(
  db: Database,
  input: AntithesisCreateInput
): Antithesis {
  const id = generateId();
  const timestamp = now();

  db.run(
    `INSERT INTO antitheses (id, thesis_id, content, contradiction_type, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, input.thesisId, input.content, input.contradictionType, timestamp]
  );

  // Associate exemplar memories
  for (const memoryId of input.exemplarMemoryIds) {
    db.run(
      `INSERT INTO antithesis_memories (antithesis_id, memory_id, created_at) VALUES (?, ?, ?)`,
      [id, memoryId, timestamp]
    );
  }

  // Update thesis status to challenged
  updateThesisStatus(db, input.thesisId, 'challenged');

  return {
    id,
    thesisId: input.thesisId,
    content: input.content,
    contradictionType: input.contradictionType,
    exemplarMemoryIds: input.exemplarMemoryIds,
    createdAt: timestamp,
  };
}

export function getAntithesis(db: Database, id: string): Antithesis | null {
  const row = db.query<AntithesisRow, [string]>(
    `SELECT * FROM antitheses WHERE id = ?`
  ).get(id);

  if (!row) return null;

  const exemplarMemoryIds = db
    .query<{ memory_id: string }, [string]>(
      `SELECT memory_id FROM antithesis_memories WHERE antithesis_id = ?`
    )
    .all(id)
    .map((r) => r.memory_id);

  return rowToAntithesis(row, exemplarMemoryIds);
}

export function getAntithesesByThesis(
  db: Database,
  thesisId: string
): Antithesis[] {
  const rows = db.query<AntithesisRow, [string]>(
    `SELECT * FROM antitheses WHERE thesis_id = ?`
  ).all(thesisId);

  return rows.map((row) => {
    const exemplarMemoryIds = db
      .query<{ memory_id: string }, [string]>(
        `SELECT memory_id FROM antithesis_memories WHERE antithesis_id = ?`
      )
      .all(row.id)
      .map((r) => r.memory_id);
    return rowToAntithesis(row, exemplarMemoryIds);
  });
}

// ============= Synthesis Queries =============

interface SynthesisRow {
  id: string;
  thesis_id: string;
  content: string;
  resolution: string;
  skill_candidate: number;
  tool_data: string | null;
  created_at: number;
  updated_at: number;
}

function rowToSynthesis(
  row: SynthesisRow,
  antithesisIds: string[] = [],
  exemplarMemoryIds: string[] = []
): Synthesis {
  return {
    id: row.id,
    thesisId: row.thesis_id,
    content: row.content,
    resolution: JSON.parse(row.resolution) as SynthesisResolution,
    skillCandidate: row.skill_candidate === 1,
    antithesisIds,
    exemplarMemoryIds,
    toolData: row.tool_data ? JSON.parse(row.tool_data) as ToolDataSnapshot[] : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createSynthesis(
  db: Database,
  input: SynthesisCreateInput
): Synthesis {
  const id = generateId();
  const timestamp = now();
  const toolDataJson = input.toolData ? JSON.stringify(input.toolData) : null;

  db.run(
    `INSERT INTO syntheses (id, thesis_id, content, resolution, skill_candidate, tool_data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.thesisId,
      input.content,
      JSON.stringify(input.resolution),
      0,
      toolDataJson,
      timestamp,
      timestamp,
    ]
  );

  // Associate antitheses
  for (const antithesisId of input.antithesisIds) {
    db.run(
      `INSERT INTO synthesis_antitheses (synthesis_id, antithesis_id) VALUES (?, ?)`,
      [id, antithesisId]
    );
  }

  // Associate exemplar memories
  for (const memoryId of input.exemplarMemoryIds) {
    db.run(
      `INSERT INTO synthesis_memories (synthesis_id, memory_id, created_at) VALUES (?, ?, ?)`,
      [id, memoryId, timestamp]
    );
  }

  // Update thesis status to synthesized
  updateThesisStatus(db, input.thesisId, 'synthesized');

  return {
    id,
    thesisId: input.thesisId,
    antithesisIds: input.antithesisIds,
    content: input.content,
    resolution: input.resolution,
    skillCandidate: false,
    exemplarMemoryIds: input.exemplarMemoryIds,
    toolData: input.toolData,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getSynthesis(db: Database, id: string): Synthesis | null {
  const row = db.query<SynthesisRow, [string]>(
    `SELECT * FROM syntheses WHERE id = ?`
  ).get(id);

  if (!row) return null;

  const antithesisIds = db
    .query<{ antithesis_id: string }, [string]>(
      `SELECT antithesis_id FROM synthesis_antitheses WHERE synthesis_id = ?`
    )
    .all(id)
    .map((r) => r.antithesis_id);

  const exemplarMemoryIds = db
    .query<{ memory_id: string }, [string]>(
      `SELECT memory_id FROM synthesis_memories WHERE synthesis_id = ?`
    )
    .all(id)
    .map((r) => r.memory_id);

  return rowToSynthesis(row, antithesisIds, exemplarMemoryIds);
}

export function markAsSkillCandidate(
  db: Database,
  id: string,
  isCandidate: boolean
): Synthesis | null {
  const timestamp = now();
  db.run(
    `UPDATE syntheses SET skill_candidate = ?, updated_at = ? WHERE id = ?`,
    [isCandidate ? 1 : 0, timestamp, id]
  );
  return getSynthesis(db, id);
}

export function getSkillCandidates(db: Database): Synthesis[] {
  const rows = db.query<SynthesisRow, []>(
    `SELECT * FROM syntheses WHERE skill_candidate = 1`
  ).all();

  return rows.map((row) => {
    const antithesisIds = db
      .query<{ antithesis_id: string }, [string]>(
        `SELECT antithesis_id FROM synthesis_antitheses WHERE synthesis_id = ?`
      )
      .all(row.id)
      .map((r) => r.antithesis_id);

    const exemplarMemoryIds = db
      .query<{ memory_id: string }, [string]>(
        `SELECT memory_id FROM synthesis_memories WHERE synthesis_id = ?`
      )
      .all(row.id)
      .map((r) => r.memory_id);

    return rowToSynthesis(row, antithesisIds, exemplarMemoryIds);
  });
}

export function addExemplarToSynthesis(
  db: Database,
  synthesisId: string,
  memoryId: string
): void {
  const timestamp = now();
  db.run(
    `INSERT OR IGNORE INTO synthesis_memories (synthesis_id, memory_id, created_at) VALUES (?, ?, ?)`,
    [synthesisId, memoryId, timestamp]
  );
}

// ============= Dialectic Cycle Queries =============

interface DialecticCycleRow {
  id: string;
  pattern_id: string;
  thesis_id: string;
  synthesis_id: string | null;
  status: 'active' | 'resolved';
  created_at: number;
  resolved_at: number | null;
}

function rowToDialecticCycle(
  row: DialecticCycleRow,
  antithesisIds: string[] = []
): DialecticCycle {
  return {
    id: row.id,
    patternId: row.pattern_id,
    thesisId: row.thesis_id,
    antithesisIds,
    synthesisId: row.synthesis_id,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

export function createDialecticCycle(
  db: Database,
  patternId: string,
  thesisId: string
): DialecticCycle {
  const id = generateId();
  const timestamp = now();

  db.run(
    `INSERT INTO dialectic_cycles (id, pattern_id, thesis_id, status, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, patternId, thesisId, 'active', timestamp]
  );

  return {
    id,
    patternId,
    thesisId,
    antithesisIds: [],
    synthesisId: null,
    status: 'active',
    createdAt: timestamp,
    resolvedAt: null,
  };
}

export function getDialecticCycle(
  db: Database,
  id: string
): DialecticCycle | null {
  const row = db.query<DialecticCycleRow, [string]>(
    `SELECT * FROM dialectic_cycles WHERE id = ?`
  ).get(id);

  if (!row) return null;

  const antithesisIds = db
    .query<{ antithesis_id: string }, [string]>(
      `SELECT antithesis_id FROM cycle_antitheses WHERE cycle_id = ?`
    )
    .all(id)
    .map((r) => r.antithesis_id);

  return rowToDialecticCycle(row, antithesisIds);
}

export function addAntithesisToCycle(
  db: Database,
  cycleId: string,
  antithesisId: string
): void {
  db.run(
    `INSERT OR IGNORE INTO cycle_antitheses (cycle_id, antithesis_id) VALUES (?, ?)`,
    [cycleId, antithesisId]
  );
}

export function resolveCycle(
  db: Database,
  cycleId: string,
  synthesisId: string
): DialecticCycle | null {
  const timestamp = now();
  db.run(
    `UPDATE dialectic_cycles SET synthesis_id = ?, status = 'resolved', resolved_at = ? WHERE id = ?`,
    [synthesisId, timestamp, cycleId]
  );
  return getDialecticCycle(db, cycleId);
}

export function getActiveCycles(db: Database): DialecticCycle[] {
  const rows = db.query<DialecticCycleRow, []>(
    `SELECT * FROM dialectic_cycles WHERE status = 'active'`
  ).all();

  return rows.map((row) => {
    const antithesisIds = db
      .query<{ antithesis_id: string }, [string]>(
        `SELECT antithesis_id FROM cycle_antitheses WHERE cycle_id = ?`
      )
      .all(row.id)
      .map((r) => r.antithesis_id);
    return rowToDialecticCycle(row, antithesisIds);
  });
}

export function getCycleByPattern(
  db: Database,
  patternId: string
): DialecticCycle | null {
  const row = db.query<DialecticCycleRow, [string]>(
    `SELECT * FROM dialectic_cycles WHERE pattern_id = ? AND status = 'active'`
  ).get(patternId);

  if (!row) return null;

  const antithesisIds = db
    .query<{ antithesis_id: string }, [string]>(
      `SELECT antithesis_id FROM cycle_antitheses WHERE cycle_id = ?`
    )
    .all(row.id)
    .map((r) => r.antithesis_id);

  return rowToDialecticCycle(row, antithesisIds);
}
