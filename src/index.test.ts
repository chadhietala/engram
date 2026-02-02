/**
 * Basic tests for Engram system
 */

import { test, expect, beforeAll, afterAll, describe } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  initializeDatabase,
  resetDatabase,
  closeDatabase,
} from './db/index.ts';
import { MemoryManager } from './memory/index.ts';
import { DialecticEngine } from './dialectic/index.ts';
import { StagePipeline } from './stages/index.ts';
import { SkillGenerator } from './skill-generator/index.ts';
import {
  validateSkillName,
  generateValidSkillName,
} from './skill-generator/validator.ts';
import { cosineSimilarity } from './embedding/index.ts';

const TEST_DB_PATH = './data/test-engram.db';

describe('Database', () => {
  let db: Database;

  beforeAll(() => {
    db = resetDatabase(TEST_DB_PATH);
  });

  afterAll(() => {
    closeDatabase();
    // Clean up test database
    try {
      Bun.spawnSync(['rm', '-f', TEST_DB_PATH, `${TEST_DB_PATH}-wal`, `${TEST_DB_PATH}-shm`]);
    } catch {
      // Ignore cleanup errors
    }
  });

  test('database initializes successfully', () => {
    expect(db).toBeDefined();
  });

  test('tables exist', () => {
    const tables = db.query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all();

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('memories');
    expect(tableNames).toContain('patterns');
    expect(tableNames).toContain('theses');
    expect(tableNames).toContain('syntheses');
    expect(tableNames).toContain('skills');
  });
});

describe('Memory Manager', () => {
  let manager: MemoryManager;

  beforeAll(() => {
    manager = new MemoryManager(TEST_DB_PATH);
  });

  test('creates memory manager', () => {
    expect(manager).toBeDefined();
  });

  test('starts and ends session', () => {
    manager.startSession('test-session-1');
    expect(manager.getCurrentSessionId()).toBe('test-session-1');

    manager.endCurrentSession();
    expect(manager.getCurrentSessionId()).toBeNull();
  });

  test('encodes tool usage', async () => {
    manager.startSession('test-session-2');

    const memory = await manager.encodeToolUsage('test-session-2', {
      toolName: 'Read',
      toolInput: { file_path: '/test/file.ts' },
      toolOutput: 'file contents here',
    });

    expect(memory).toBeDefined();
    expect(memory.id).toBeDefined();
    expect(memory.type).toBe('working');
    expect(memory.metadata.toolName).toBe('Read');
    expect(memory.embedding).toBeDefined();

    manager.endCurrentSession();
  });

  test('retrieves memories', async () => {
    manager.startSession('test-session-3');

    await manager.encodeToolUsage('test-session-3', {
      toolName: 'Bash',
      toolInput: { command: 'ls -la' },
      toolOutput: 'directory listing',
    });

    const results = await manager.retrieveMemories('list files');
    expect(Array.isArray(results)).toBe(true);

    manager.endCurrentSession();
  });

  test('consolidates session', () => {
    manager.startSession('test-session-4');

    // Create some memories first (they need to exist)
    const result = manager.consolidateSession('test-session-4');

    expect(result).toBeDefined();
    expect(Array.isArray(result.workingPromoted)).toBe(true);
    expect(Array.isArray(result.shortTermPromoted)).toBe(true);
    expect(typeof result.decayedCount).toBe('number');

    manager.endCurrentSession();
  });

  test('gets stats', () => {
    const stats = manager.getStats();

    expect(stats).toBeDefined();
    expect(typeof stats.working).toBe('number');
    expect(typeof stats.shortTerm).toBe('number');
    expect(typeof stats.longTerm).toBe('number');
    expect(typeof stats.total).toBe('number');
  });
});

describe('Embedding', () => {
  test('computes cosine similarity', () => {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([1, 0, 0]);
    const c = new Float32Array([0, 1, 0]);

    // Same vectors should have similarity 1
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);

    // Orthogonal vectors should have similarity 0
    expect(cosineSimilarity(a, c)).toBeCloseTo(0, 5);
  });

  test('handles zero vectors', () => {
    const zero = new Float32Array([0, 0, 0]);
    const nonZero = new Float32Array([1, 0, 0]);

    expect(cosineSimilarity(zero, nonZero)).toBe(0);
  });
});

describe('Skill Validator', () => {
  test('validates skill names', () => {
    expect(validateSkillName('valid-name').valid).toBe(true);
    expect(validateSkillName('name123').valid).toBe(true);
    expect(validateSkillName('a').valid).toBe(true);

    expect(validateSkillName('').valid).toBe(false);
    expect(validateSkillName('Invalid').valid).toBe(false);
    expect(validateSkillName('123name').valid).toBe(false);
    expect(validateSkillName('name--double').valid).toBe(false);
    expect(validateSkillName('name-').valid).toBe(false);
    expect(validateSkillName('name_underscore').valid).toBe(false);
  });

  test('generates valid skill names', () => {
    expect(generateValidSkillName('Test Name')).toBe('test-name');
    expect(generateValidSkillName('  spaces  ')).toBe('spaces');
    expect(generateValidSkillName('123start')).toBe('skill-123start');
    expect(generateValidSkillName('UPPERCASE')).toBe('uppercase');
    expect(generateValidSkillName('special!@#chars')).toBe('specialchars');
  });
});

describe('Stage Pipeline', () => {
  let db: Database;
  let pipeline: StagePipeline;

  beforeAll(() => {
    db = resetDatabase(TEST_DB_PATH);
    pipeline = new StagePipeline(db);
  });

  test('gets stage stats', () => {
    const stats = pipeline.getStageStats();

    expect(stats).toBeDefined();
    expect(stats.conceptual).toBeDefined();
    expect(stats.semantic).toBeDefined();
    expect(stats.syntactic).toBeDefined();
  });

  test('processes pipeline without errors', async () => {
    const result = await pipeline.processAll();

    expect(result).toBeDefined();
    expect(typeof result.processed).toBe('number');
    expect(Array.isArray(result.transitioned)).toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

describe('Dialectic Engine', () => {
  let db: Database;
  let engine: DialecticEngine;

  beforeAll(() => {
    db = resetDatabase(TEST_DB_PATH);
    engine = new DialecticEngine(db);
  });

  test('gets engine stats', () => {
    const stats = engine.getStats();

    expect(stats).toBeDefined();
    expect(typeof stats.totalPatterns).toBe('number');
    expect(typeof stats.activeTheses).toBe('number');
    expect(typeof stats.activeCycles).toBe('number');
    expect(typeof stats.skillCandidates).toBe('number');
  });

  test('gets active cycles (empty initially)', () => {
    const cycles = engine.getActiveCycles();
    expect(Array.isArray(cycles)).toBe(true);
  });

  test('gets skill candidates (empty initially)', () => {
    const candidates = engine.getSkillCandidates();
    expect(Array.isArray(candidates)).toBe(true);
  });
});

describe('Skill Generator', () => {
  let db: Database;
  let generator: SkillGenerator;

  beforeAll(() => {
    db = resetDatabase(TEST_DB_PATH);
    generator = new SkillGenerator(db, './skills-test');
  });

  test('gets generator stats', () => {
    const stats = generator.getStats();

    expect(stats).toBeDefined();
    expect(typeof stats.totalSkills).toBe('number');
    expect(typeof stats.pendingCandidates).toBe('number');
    expect(stats.byStatus).toBeDefined();
    expect(stats.byComplexity).toBeDefined();
  });

  test('generates pending skills (none initially)', async () => {
    const result = await generator.generateAllPending();

    expect(result).toBeDefined();
    expect(Array.isArray(result.generated)).toBe(true);
    expect(Array.isArray(result.failed)).toBe(true);
  });
});
