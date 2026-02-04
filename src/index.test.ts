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
  extractNameFromDescription,
} from './skill-generator/validator.ts';
import { cosineSimilarity } from './embedding/index.ts';
import { RulesWriter } from './rules-writer/index.ts';
import {
  formatFrontmatter,
  formatMetadataComment,
  titleToFilename,
  extractPathPatterns,
  hashContent,
} from './rules-writer/formatter.ts';

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

  test('extracts name from description - verb + noun patterns', () => {
    expect(extractNameFromDescription('This skill explores the codebase structure'))
      .toBe('explore-codebase');
    expect(extractNameFromDescription('Commit changes to git'))
      .toBe('commit-changes');
    expect(extractNameFromDescription('Search for files in the repository'))
      .toBe('search-files');
    expect(extractNameFromDescription('Run tests on the project'))
      .toBe('run-tests');
    expect(extractNameFromDescription('Debug the errors in the code'))
      .toBe('debug-errors');
  });

  test('extracts name from description - various verb forms', () => {
    expect(extractNameFromDescription('Explores codebase patterns'))
      .toBe('explore-codebase');
    expect(extractNameFromDescription('Building the project'))
      .toBe('build-project');
    expect(extractNameFromDescription('Fetches API data'))
      .toBe('fetch-api');
  });

  test('extracts name from description - returns null for no match', () => {
    expect(extractNameFromDescription('')).toBeNull();
    expect(extractNameFromDescription('Just some random text')).toBeNull();
  });

  test('extracts name from description - finds noun without direct verb', () => {
    expect(extractNameFromDescription('This skill helps with the codebase'))
      .toBe('explore-codebase');
    expect(extractNameFromDescription('Helps manage the repository'))
      .toBe('explore-repository');
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

describe('Rules Writer', () => {
  let db: Database;
  let rulesWriter: RulesWriter;

  beforeAll(() => {
    db = resetDatabase(TEST_DB_PATH);
    rulesWriter = new RulesWriter(db, './rules-test/engram', './rules-test/user');
  });

  test('gets writer stats', () => {
    const stats = rulesWriter.getStats();

    expect(stats).toBeDefined();
    expect(typeof stats.total).toBe('number');
    expect(typeof stats.active).toBe('number');
    expect(typeof stats.invalidated).toBe('number');
    expect(stats.byScope).toBeDefined();
    expect(typeof stats.avgConfidence).toBe('number');
  });

  test('gets active rules (empty initially)', () => {
    const rules = rulesWriter.getActiveRules();
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBe(0);
  });

  test('auto-publishes (none initially)', async () => {
    const result = await rulesWriter.autoPublishAll();

    expect(result).toBeDefined();
    expect(Array.isArray(result.published)).toBe(true);
    expect(Array.isArray(result.skipped)).toBe(true);
  });

  test('isPublishReady returns not ready for invalid synthesis', () => {
    const result = rulesWriter.isPublishReady('invalid-synthesis-id');

    expect(result.ready).toBe(false);
    expect(result.reason).toBe('Synthesis not found');
  });
});

describe('Rules Formatter', () => {
  test('formats frontmatter with paths', () => {
    const frontmatter = formatFrontmatter({ paths: ['src/**/*.ts', '**/*.test.ts'] });

    expect(frontmatter).toContain('---');
    expect(frontmatter).toContain('paths:');
    expect(frontmatter).toContain('src/**/*.ts');
    expect(frontmatter).toContain('**/*.test.ts');
  });

  test('formats frontmatter empty when no paths', () => {
    const frontmatter = formatFrontmatter({});
    expect(frontmatter).toBe('');

    const frontmatter2 = formatFrontmatter({ paths: [] });
    expect(frontmatter2).toBe('');
  });

  test('formats metadata comment', () => {
    const comment = formatMetadataComment({
      patternId: 'pat-123',
      synthesisId: 'syn-456',
      version: 2,
      updatedAt: '2026-02-04',
      confidence: 0.85,
    });

    expect(comment).toContain('<!-- engram:');
    expect(comment).toContain('pattern:pat-123');
    expect(comment).toContain('synthesis:syn-456');
    expect(comment).toContain('v2');
    expect(comment).toContain('confidence:0.85');
    expect(comment).toContain('-->');
  });

  test('generates filename from title', () => {
    expect(titleToFilename('Git Workflow')).toBe('git-workflow');
    expect(titleToFilename('TypeScript Testing Patterns')).toBe('typescript-testing-patterns');
    expect(titleToFilename('API!@#Endpoints')).toBe('api-endpoints');
  });

  test('extracts path patterns from semantic keys', () => {
    const keys = [
      { key: 'file_path', value: 'src/components/Button.tsx' },
      { key: 'file_path', value: 'tests/unit/utils.test.ts' },
      { key: 'tool', value: 'Read' },
    ];

    const patterns = extractPathPatterns(keys);

    expect(patterns).toContain('**/*.tsx');
    expect(patterns).toContain('**/*.ts');
    expect(patterns).toContain('src/**');
    expect(patterns).toContain('tests/**');
  });

  test('hashes content deterministically', () => {
    const hash1 = hashContent('test content');
    const hash2 = hashContent('test content');
    const hash3 = hashContent('different content');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(16);
  });
});

describe('Output Type Determination', () => {
  // Import the determineOutputType function
  const { determineOutputType } = require('./dialectic/synthesis.ts');

  test('returns none for rejection resolution', () => {
    const result = determineOutputType(
      'This pattern was rejected',
      { type: 'rejection' },
      [],
      5,
      0.8
    );

    expect(result.outputType).toBe('none');
    expect(result.decisionConfidence).toBe(1.0);
  });

  test('returns none for low confidence', () => {
    const result = determineOutputType(
      'Some pattern content',
      { type: 'integration' },
      [],
      5,
      0.3 // Below 0.5 threshold
    );

    expect(result.outputType).toBe('none');
    expect(result.reasoning).toContain('confidence');
  });

  test('returns none for insufficient exemplars', () => {
    const result = determineOutputType(
      'Some pattern content',
      { type: 'integration' },
      [],
      1, // Below 2 threshold
      0.8
    );

    expect(result.outputType).toBe('none');
    expect(result.reasoning).toContain('evidence');
  });

  test('returns rule for imperative-only content', () => {
    const result = determineOutputType(
      'Always run tests before committing. Never commit secrets.',
      { type: 'integration' },
      [{ tool: 'Bash', action: 'bun test' }],
      5,
      0.8
    );

    expect(result.outputType).toBe('rule');
    expect(result.characteristics.isImperative).toBe(true);
    expect(result.characteristics.isProcedural).toBe(false);
  });

  test('returns skill for procedural + multi-tool + complex content', () => {
    // Need long content (>500 chars) to get high complexity, plus conditions
    const longContent = 'Step 1: First search for files using glob patterns. Step 2: Then read the content of each matched file. Step 3: Finally analyze patterns using grep. Next, create a detailed report. ' +
      'If the analysis shows issues depending on the context, proceed to the next phase. ' +
      'This is a complex workflow that requires multiple tools and careful consideration. '.repeat(3);

    const result = determineOutputType(
      longContent,
      { type: 'integration' },
      [
        { tool: 'Glob', action: '**/*.ts' },
        { tool: 'Read', action: 'file.ts' },
        { tool: 'Grep', action: 'pattern' },
        { tool: 'Bash', action: 'analyze' },
      ],
      5,
      0.8
    );

    expect(result.outputType).toBe('skill');
    expect(result.characteristics.isProcedural).toBe(true);
    expect(result.characteristics.toolDiversity).toBeGreaterThan(2);
    expect(result.characteristics.complexity).toBeGreaterThan(0.5);
  });

  test('returns rule_with_skill for imperative + procedural + multi-tool', () => {
    const result = determineOutputType(
      'Always follow this debugging workflow before releasing. Step 1: First run the linter. Step 2: Then read the error logs. Finally run tests to verify.',
      { type: 'integration' },
      [
        { tool: 'Bash', action: 'lint' },
        { tool: 'Read', action: 'logs' },
        { tool: 'Grep', action: 'error' },
      ],
      5,
      0.8
    );

    expect(result.outputType).toBe('rule_with_skill');
    expect(result.characteristics.isImperative).toBe(true);
    expect(result.characteristics.isProcedural).toBe(true);
    expect(result.characteristics.toolDiversity).toBeGreaterThan(2);
  });

  test('returns rule_with_skill for conditional resolution with conditions', () => {
    const result = determineOutputType(
      'When debugging memory issues, if the problem involves leaks then use profiler.',
      { type: 'conditional', conditions: ['memory issues', 'leaks'] },
      [{ tool: 'Bash' }, { tool: 'Read' }],
      5,
      0.8
    );

    expect(result.outputType).toBe('rule_with_skill');
    expect(result.characteristics.hasConditions).toBe(true);
  });

  test('detects imperative patterns correctly', () => {
    const imperativeTexts = [
      'Always validate input',
      'Never use eval()',
      'You must run tests',
      'Required: format code',
      'Ensure tests pass',
      'Before committing, check',
    ];

    for (const text of imperativeTexts) {
      const result = determineOutputType(
        text,
        { type: 'integration' },
        [],
        5,
        0.8
      );
      expect(result.characteristics.isImperative).toBe(true);
    }
  });

  test('detects procedural patterns correctly', () => {
    const proceduralTexts = [
      'Step 1: Do this',
      'First do A, then do B',
      'Next, proceed with',
      'Finally, complete the task',
      'This workflow involves',
      '1. First item 2. Second item',
    ];

    for (const text of proceduralTexts) {
      const result = determineOutputType(
        text,
        { type: 'integration' },
        [],
        5,
        0.8
      );
      expect(result.characteristics.isProcedural).toBe(true);
    }
  });

  test('calculates complexity score correctly', () => {
    // Low complexity
    const lowResult = determineOutputType(
      'Short content',
      { type: 'integration' },
      [{ tool: 'Read' }],
      2,
      0.6
    );
    expect(lowResult.characteristics.complexity).toBeLessThan(0.3);

    // High complexity
    const highResult = determineOutputType(
      'A'.repeat(600) + ' if condition then do something depending on context',
      { type: 'conditional', conditions: ['a', 'b'] },
      [
        { tool: 'Glob' },
        { tool: 'Read' },
        { tool: 'Grep' },
        { tool: 'Bash' },
      ],
      5,
      0.8
    );
    expect(highResult.characteristics.complexity).toBeGreaterThan(0.5);
  });
});
