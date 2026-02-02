/**
 * Session tracking database queries
 */

import type { Database } from 'bun:sqlite';
import { now } from '../index.ts';

interface Session {
  id: string;
  startedAt: number;
  endedAt: number | null;
  memoryCount: number;
  consolidated: boolean;
}

interface SessionRow {
  id: string;
  started_at: number;
  ended_at: number | null;
  memory_count: number;
  consolidated: number;
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    memoryCount: row.memory_count,
    consolidated: row.consolidated === 1,
  };
}

export function createSession(db: Database, sessionId: string): Session {
  const timestamp = now();

  db.run(
    `INSERT OR IGNORE INTO sessions (id, started_at, memory_count, consolidated)
     VALUES (?, ?, ?, ?)`,
    [sessionId, timestamp, 0, 0]
  );

  return {
    id: sessionId,
    startedAt: timestamp,
    endedAt: null,
    memoryCount: 0,
    consolidated: false,
  };
}

export function getSession(db: Database, sessionId: string): Session | null {
  const row = db.query<SessionRow, [string]>(
    `SELECT * FROM sessions WHERE id = ?`
  ).get(sessionId);

  return row ? rowToSession(row) : null;
}

export function endSession(db: Database, sessionId: string): Session | null {
  const timestamp = now();
  db.run(`UPDATE sessions SET ended_at = ? WHERE id = ?`, [timestamp, sessionId]);
  return getSession(db, sessionId);
}

export function incrementMemoryCount(
  db: Database,
  sessionId: string
): void {
  db.run(
    `UPDATE sessions SET memory_count = memory_count + 1 WHERE id = ?`,
    [sessionId]
  );
}

export function markConsolidated(
  db: Database,
  sessionId: string
): Session | null {
  db.run(`UPDATE sessions SET consolidated = 1 WHERE id = ?`, [sessionId]);
  return getSession(db, sessionId);
}

export function getUnconsolidatedSessions(db: Database): Session[] {
  const rows = db.query<SessionRow, []>(
    `SELECT * FROM sessions WHERE consolidated = 0 AND ended_at IS NOT NULL`
  ).all();

  return rows.map(rowToSession);
}

export function getRecentSessions(db: Database, limit: number = 10): Session[] {
  const rows = db.query<SessionRow, [number]>(
    `SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?`
  ).all(limit);

  return rows.map(rowToSession);
}
