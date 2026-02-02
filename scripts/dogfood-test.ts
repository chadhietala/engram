#!/usr/bin/env bun
/**
 * Dogfood test - test Engram within Engram
 */

import { MemoryManager } from '../src/index.ts';

const manager = new MemoryManager('./data/engram.db');
manager.startSession('dogfood-test');

// Simulate some tool usage
console.log('Encoding tool usage...');
await manager.encodeToolUsage('dogfood-test', {
  toolName: 'Read',
  toolInput: { file_path: '/Users/chietala/Code/engram/src/index.ts' },
  toolOutput: 'Engram main exports...',
});

await manager.encodeToolUsage('dogfood-test', {
  toolName: 'Edit',
  toolInput: { file_path: '/Users/chietala/Code/engram/src/index.ts', old_string: 'foo', new_string: 'bar' },
});

await manager.encodeToolUsage('dogfood-test', {
  toolName: 'Bash',
  toolInput: { command: 'bun test' },
  toolOutput: '19 tests passed',
});

// Retrieve memories
console.log('\nRetrieving memories for "edit file"...');
const results = await manager.retrieveMemories('edit file');
for (const r of results) {
  console.log(`  - [${(r.similarity * 100).toFixed(0)}%] ${r.memory.content.substring(0, 60)}...`);
}

// Consolidate
console.log('\nConsolidating session...');
const consolidated = manager.consolidateSession('dogfood-test');
console.log(`  Working→ShortTerm: ${consolidated.workingPromoted.length}`);
console.log(`  ShortTerm→LongTerm: ${consolidated.shortTermPromoted.length}`);

// Stats
console.log('\nFinal stats:');
const stats = manager.getStats();
console.log(`  Total memories: ${stats.total}`);
console.log(`  Working: ${stats.working}, Short-term: ${stats.shortTerm}, Long-term: ${stats.longTerm}`);

manager.endCurrentSession();
console.log('\nDone!');
