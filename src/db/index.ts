/**
 * Database initialization and connection management
 */

import { Database } from 'bun:sqlite';
import { SCHEMA, MIGRATIONS, REBUILD_FTS } from './schema.ts';
import { getDbPath, getDataDir } from '../config.ts';

let db: Database | null = null;

export function getDatabase(dbPath: string = getDbPath()): Database {
  if (db) return db;

  // Ensure data directory exists
  const dir = dbPath.substring(0, dbPath.lastIndexOf('/'));
  if (dir) {
    try {
      Bun.spawnSync(['mkdir', '-p', dir]);
    } catch {
      // Directory may already exist
    }
  }

  db = new Database(dbPath, { create: true });

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Enable WAL mode for better concurrency
  db.run('PRAGMA journal_mode = WAL');

  return db;
}

export function initializeDatabase(dbPath: string = getDbPath()): Database {
  const database = getDatabase(dbPath);

  // Run schema
  database.run(SCHEMA);

  // Run migrations (ignore errors for already-applied migrations)
  for (const migration of MIGRATIONS) {
    try {
      database.run(migration);
    } catch {
      // Migration may have already been applied
    }
  }

  // Check if FTS5 needs to be synced
  ensureFtsSync(database);

  return database;
}

/**
 * Ensure FTS5 index is in sync with memories table
 */
function ensureFtsSync(database: Database): void {
  try {
    const memoriesCount = database.query<{ count: number }, []>(
      'SELECT COUNT(*) as count FROM memories'
    ).get()?.count ?? 0;

    const ftsCount = database.query<{ count: number }, []>(
      'SELECT COUNT(*) as count FROM memories_fts'
    ).get()?.count ?? 0;

    // If counts differ significantly, rebuild
    if (Math.abs(memoriesCount - ftsCount) > 0) {
      rebuildFtsIndex(database);
    }
  } catch {
    // FTS table might not exist yet, schema will create it
  }
}

/**
 * Rebuild FTS5 index from memories table
 */
export function rebuildFtsIndex(database: Database = getDatabase()): void {
  database.exec(REBUILD_FTS);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function resetDatabase(dbPath: string = getDbPath()): Database {
  closeDatabase();

  // Delete existing database file
  try {
    const file = Bun.file(dbPath);
    if (file.size > 0) {
      Bun.spawnSync(['rm', '-f', dbPath, `${dbPath}-wal`, `${dbPath}-shm`]);
    }
  } catch {
    // File may not exist
  }

  return initializeDatabase(dbPath);
}

// Helper to generate UUIDs
export function generateId(): string {
  return crypto.randomUUID();
}

// Helper to get current timestamp
export function now(): number {
  return Date.now();
}

export { Database };
