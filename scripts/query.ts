#!/usr/bin/env bun
/**
 * Query memories from the command line
 * Usage: bun scripts/query.ts "search term"
 */

import { initializeDatabase } from '../src/db/index.ts';
import { queryMemories, getMemory } from '../src/db/queries/memories.ts';
import { searchFts } from '../src/memory/processing/retriever.ts';

const query = process.argv[2];

if (!query) {
  console.log('Usage: bun scripts/query.ts "search term"');
  console.log('');
  console.log('Examples:');
  console.log('  bun scripts/query.ts "error handling"');
  console.log('  bun scripts/query.ts "git commit"');
  console.log('  bun scripts/query.ts "typescript"');
  process.exit(1);
}

const db = initializeDatabase();

// FTS5 full-text search
const ftsResults = searchFts(db, query, 10);
const results = ftsResults
  .map(r => getMemory(db, r.id))
  .filter((m): m is NonNullable<typeof m> => m !== null);

if (results.length === 0) {
  console.log('No memories found for:', query);
  console.log('');

  // Show total count
  const all = queryMemories(db, { limit: 1 });
  const total = db.query<{ count: number }, []>('SELECT COUNT(*) as count FROM memories').get();
  console.log(`Total memories in database: ${total?.count ?? 0}`);
  process.exit(0);
}

console.log(`Found ${results.length} memories for: "${query}"\n`);

for (const memory of results) {
  const age = Date.now() - memory.createdAt;
  const ageStr = age < 60000
    ? `${Math.floor(age / 1000)}s ago`
    : age < 3600000
    ? `${Math.floor(age / 60000)}m ago`
    : `${Math.floor(age / 3600000)}h ago`;

  console.log(`[${memory.type}] ${ageStr}`);
  console.log(`  ${memory.content.substring(0, 120).replace(/\n/g, ' ')}${memory.content.length > 120 ? '...' : ''}`);

  if (memory.metadata.tags.length > 0) {
    console.log(`  Tags: ${memory.metadata.tags.slice(0, 5).join(', ')}`);
  }
  console.log('');
}
