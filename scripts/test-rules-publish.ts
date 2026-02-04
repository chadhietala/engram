#!/usr/bin/env bun
/**
 * Test script to demonstrate rules publishing
 * Creates sample data using REAL encoders and publishes a rule
 */

import { initializeDatabase } from '../src/db/index.ts';
import { encodeToolUsage } from '../src/memory/processing/encoder.ts';
import { createPattern } from '../src/db/queries/patterns.ts';
import { createThesis, createSynthesis } from '../src/db/queries/dialectic.ts';
import { createSkill } from '../src/db/queries/skills.ts';
import { promoteMemory } from '../src/db/queries/memories.ts';
import { RulesWriter } from '../src/rules-writer/index.ts';
import { getRulesDir } from '../src/config.ts';

const db = initializeDatabase();

console.log('=== Testing Rules Publishing ===\n');

// 1. Create sample memories using REAL encoder
console.log('1. Creating sample memories (using real encoder)...');

const memory1 = await encodeToolUsage(db, 'test-session-1', {
  toolName: 'Bash',
  toolInput: { command: 'bun test', timeout: 120000 },
  toolOutput: '23 pass\n0 fail\nRan 23 tests across 1 file',
});
promoteMemory(db, memory1.id, 'long_term');

const memory2 = await encodeToolUsage(db, 'test-session-1', {
  toolName: 'Bash',
  toolInput: { command: 'git add src/ && git commit -m "feat: add new feature"' },
  toolOutput: '[main abc1234] feat: add new feature\n 3 files changed, 42 insertions(+)',
});
promoteMemory(db, memory2.id, 'long_term');

const memory3 = await encodeToolUsage(db, 'test-session-2', {
  toolName: 'Read',
  toolInput: { file_path: 'src/index.test.ts' },
  toolOutput: 'import { test, expect } from "bun:test";\n\ntest("example", () => {...',
});
promoteMemory(db, memory3.id, 'long_term');

const memory4 = await encodeToolUsage(db, 'test-session-2', {
  toolName: 'Bash',
  toolInput: { command: 'bun test src/index.test.ts' },
  toolOutput: '5 pass\n0 fail',
});
promoteMemory(db, memory4.id, 'long_term');

console.log(`   Created 4 memories`);
console.log(`   Example memory content:\n`);
console.log('   ---');
console.log('   ' + memory1.content.split('\n').join('\n   '));
console.log('   ---');
console.log(`   Semantic keys: ${memory1.metadata.semanticKeys.map(sk => `${sk.key}=${sk.value}`).join(', ')}`);
console.log(`   Tags: ${memory1.metadata.tags.join(', ')}`);

// 2. Create a pattern
console.log('\n2. Creating pattern...');
const pattern = createPattern(db, {
  name: 'test-before-commit',
  description: 'Always run tests before committing changes to ensure code quality',
  stage: 'syntactic',
  memoryIds: [memory1.id, memory2.id, memory3.id, memory4.id],
});

// Update pattern confidence
db.run('UPDATE patterns SET confidence = 0.85, dialectic_phase = ? WHERE id = ?', ['synthesis', pattern.id]);
console.log(`   Created pattern: ${pattern.name}`);

// 3. Create thesis
console.log('\n3. Creating thesis...');
const thesis = createThesis(db, {
  patternId: pattern.id,
  content: 'Running tests before commits prevents broken code from entering the repository',
  exemplarMemoryIds: [memory1.id, memory2.id, memory4.id],
});
console.log(`   Created thesis`);

// 4. Create synthesis
console.log('\n4. Creating synthesis...');
const synthesis = createSynthesis(db, {
  thesisId: thesis.id,
  antithesisIds: [],
  content: 'Before committing any code changes, always run the test suite with `bun test`. This ensures that new changes do not break existing functionality. If tests fail, fix the issues before committing. Use conventional commit messages (feat:, fix:, docs:, etc.) for clear history.',
  resolution: {
    type: 'integration',
  },
  exemplarMemoryIds: [memory1.id, memory2.id, memory3.id, memory4.id],
  toolData: [
    { tool: 'Bash', action: 'bun test', description: 'Run test suite' },
    { tool: 'Read', action: 'file_path: src/index.test.ts', description: 'Review test file' },
    { tool: 'Bash', action: 'git commit', description: 'Commit changes' },
  ],
});

// Mark as skill candidate
db.run('UPDATE syntheses SET skill_candidate = 1 WHERE id = ?', [synthesis.id]);
console.log(`   Created synthesis`);

// 5. Create associated skill
console.log('5. Creating associated skill...');
const skill = createSkill(db, {
  name: 'test-before-commit',
  description: 'Runs tests and commits changes with conventional commit messages',
  sourcePatternId: pattern.id,
  sourceSynthesisId: synthesis.id,
  instructions: {
    overview: 'Automates the test-then-commit workflow',
    whenToUse: ['Before committing changes', 'After making code modifications'],
    steps: [
      { order: 1, action: 'Run tests', toolHint: 'Bash' },
      { order: 2, action: 'Stage changes', toolHint: 'Bash' },
      { order: 3, action: 'Commit with message', toolHint: 'Bash' },
    ],
    examples: [],
    edgeCases: [],
    triggerPhrases: [
      'commit my changes',
      'run tests and commit',
      'safe commit',
    ],
  },
  complexity: 'simple',
});
console.log(`   Created skill: ${skill.name}`);

// 6. Publish as rule
console.log('\n6. Publishing as rule...');
const rulesWriter = new RulesWriter(db);
const result = await rulesWriter.publishFromSynthesis(synthesis.id, { force: true });

if (result.success) {
  console.log(`   ✓ Published to: ${result.filePath}`);
  console.log('\n=== Generated Rule Content ===\n');

  const content = await Bun.file(result.filePath!).text();
  console.log(content);
} else {
  console.error(`   ✗ Failed: ${result.error}`);
}

// Show final status
console.log('\n=== Final Status ===');
const stats = rulesWriter.getStats();
console.log(`Published rules: ${stats.active} active`);
console.log(`Rules directory: ${getRulesDir()}`);
