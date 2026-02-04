#!/usr/bin/env bun
/**
 * Publish mature patterns as Claude rules
 *
 * Usage:
 *   bun scripts/publish-rules.ts --all           # Publish all qualifying patterns
 *   bun scripts/publish-rules.ts --synthesis <id> # Publish specific synthesis
 *   bun scripts/publish-rules.ts --pattern <id>   # Publish specific pattern
 *   bun scripts/publish-rules.ts --status         # Show published rules status
 *
 * Options:
 *   --force           Force publish even if below threshold
 *   --scope project   Publish to project rules (default)
 *   --scope user      Publish to user-level rules
 */

import { initializeDatabase } from '../src/db/index.ts';
import { RulesWriter } from '../src/rules-writer/index.ts';
import { getRulesConfig, getRulesDir, getUserRulesDir } from '../src/config.ts';
import type { RuleScope } from '../src/types/rules.ts';

const db = initializeDatabase();
const rulesWriter = new RulesWriter(db);

function parseArgs(): {
  action: 'all' | 'synthesis' | 'pattern' | 'status';
  id?: string;
  force: boolean;
  scope: RuleScope;
} {
  const args = process.argv.slice(2);
  let action: 'all' | 'synthesis' | 'pattern' | 'status' = 'status';
  let id: string | undefined;
  let force = false;
  let scope: RuleScope = 'project';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--all':
        action = 'all';
        break;
      case '--synthesis':
        action = 'synthesis';
        id = args[++i];
        break;
      case '--pattern':
        action = 'pattern';
        id = args[++i];
        break;
      case '--status':
        action = 'status';
        break;
      case '--force':
        force = true;
        break;
      case '--scope':
        scope = args[++i] as RuleScope;
        if (scope !== 'project' && scope !== 'user') {
          console.error('Invalid scope. Use "project" or "user".');
          process.exit(1);
        }
        break;
    }
  }

  return { action, id, force, scope };
}

async function showStatus() {
  const stats = rulesWriter.getStats();
  const config = getRulesConfig();

  console.log('=== Engram Rules Status ===\n');
  console.log('Configuration:');
  console.log(`  Auto-publish: ${config.autoPublish ? 'enabled' : 'disabled'}`);
  console.log(`  Min confidence: ${config.minConfidence}`);
  console.log(`  Min memories: ${config.minSupportingMemories}`);
  console.log(`  Project rules dir: ${getRulesDir()}`);
  console.log(`  User rules dir: ${getUserRulesDir()}`);
  console.log('');

  console.log('Published Rules:');
  console.log(`  Total: ${stats.total}`);
  console.log(`  Active: ${stats.active}`);
  console.log(`  Invalidated: ${stats.invalidated}`);
  console.log(`  Project-level: ${stats.byScope.project}`);
  console.log(`  User-level: ${stats.byScope.user}`);
  if (stats.active > 0) {
    console.log(`  Avg confidence: ${stats.avgConfidence.toFixed(2)}`);
  }
  console.log('');

  const activeRules = rulesWriter.getActiveRules();
  if (activeRules.length > 0) {
    console.log('Active Rules:');
    for (const rule of activeRules) {
      console.log(`  - ${rule.name} (v${rule.version}, confidence: ${rule.confidence.toFixed(2)})`);
      console.log(`    ${rule.filePath}`);
    }
  }
}

async function publishAll(force: boolean, scope: RuleScope) {
  console.log('Publishing all qualifying patterns...\n');

  const result = await rulesWriter.autoPublishAll();

  if (result.published.length > 0) {
    console.log(`Published ${result.published.length} rule(s):`);
    for (const r of result.published) {
      console.log(`  ✓ ${r.filePath}`);
    }
  } else {
    console.log('No new rules to publish.');
  }

  if (result.skipped.length > 0) {
    console.log(`\nSkipped ${result.skipped.length}:`);
    for (const s of result.skipped) {
      console.log(`  - ${s.synthesisId}: ${s.reason}`);
    }
  }
}

async function publishSynthesis(synthesisId: string, force: boolean, scope: RuleScope) {
  console.log(`Publishing synthesis: ${synthesisId}...\n`);

  // Check readiness first
  const readiness = rulesWriter.isPublishReady(synthesisId);
  if (!readiness.ready && !force) {
    console.error(`Not ready to publish: ${readiness.reason}`);
    console.log('Use --force to publish anyway.');
    process.exit(1);
  }

  const result = await rulesWriter.publishFromSynthesis(synthesisId, { force, scope });

  if (result.success) {
    console.log(`✓ Published: ${result.filePath}`);
    if (result.isUpdate) {
      console.log(`  (Updated existing rule to v${result.rule?.version})`);
    }
  } else {
    console.error(`✗ Failed: ${result.error}`);
    process.exit(1);
  }
}

async function publishPattern(patternId: string, force: boolean, scope: RuleScope) {
  console.log(`Publishing pattern: ${patternId}...\n`);

  const result = await rulesWriter.publishFromPattern(patternId, { force, scope });

  if (result.success) {
    console.log(`✓ Published: ${result.filePath}`);
    if (result.isUpdate) {
      console.log(`  (Updated existing rule to v${result.rule?.version})`);
    }
  } else {
    console.error(`✗ Failed: ${result.error}`);
    process.exit(1);
  }
}

async function main() {
  const { action, id, force, scope } = parseArgs();

  switch (action) {
    case 'status':
      await showStatus();
      break;
    case 'all':
      await publishAll(force, scope);
      break;
    case 'synthesis':
      if (!id) {
        console.error('Missing synthesis ID. Use: --synthesis <id>');
        process.exit(1);
      }
      await publishSynthesis(id, force, scope);
      break;
    case 'pattern':
      if (!id) {
        console.error('Missing pattern ID. Use: --pattern <id>');
        process.exit(1);
      }
      await publishPattern(id, force, scope);
      break;
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
