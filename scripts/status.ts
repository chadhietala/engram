#!/usr/bin/env bun
/**
 * Show engram status and statistics
 */

import { initializeDatabase } from '../src/db/index.ts';

const db = initializeDatabase();

// Query counts from database
const memoryCounts = db.query<{ type: string; count: number }, []>(`
  SELECT type, COUNT(*) as count
  FROM memories
  GROUP BY type
`).all();

const patternCount = db.query<{ count: number }, []>(`SELECT COUNT(*) as count FROM patterns`).get();
const synthesisCount = db.query<{ count: number }, []>(`SELECT COUNT(*) as count FROM syntheses WHERE skill_candidate = 1`).get();
const skillCount = db.query<{ count: number }, []>(`SELECT COUNT(*) as count FROM skills`).get();
const sessionCount = db.query<{ count: number }, []>(`SELECT COUNT(*) as count FROM sessions`).get();

// Query published rules (may not exist in older databases)
let publishedRulesCount = 0;
let activeRulesCount = 0;
try {
  const publishedRules = db.query<{ count: number }, []>(`SELECT COUNT(*) as count FROM published_rules`).get();
  const activeRules = db.query<{ count: number }, []>(`SELECT COUNT(*) as count FROM published_rules WHERE status = 'active'`).get();
  publishedRulesCount = publishedRules?.count || 0;
  activeRulesCount = activeRules?.count || 0;
} catch {
  // Table doesn't exist yet - that's fine
}

console.log('=== Engram Status ===\n');

console.log('Sessions:', sessionCount?.count || 0);
console.log('');

console.log('Memories:');
if (memoryCounts.length === 0) {
  console.log('  (none)');
} else {
  for (const row of memoryCounts) {
    console.log(`  ${row.type}: ${row.count}`);
  }
}

console.log('');
console.log(`Patterns: ${patternCount?.count || 0}`);
console.log(`Skill candidates: ${synthesisCount?.count || 0}`);
console.log(`Generated skills: ${skillCount?.count || 0}`);
console.log(`Published rules: ${activeRulesCount}/${publishedRulesCount} active`);
