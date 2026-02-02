#!/usr/bin/env bun
/**
 * Backfill tool_data for existing syntheses and regenerate missing scripts
 *
 * This script:
 * 1. Runs the migration to add tool_data column (if not already done)
 * 2. Backfills tool_data from exemplar memories for existing syntheses
 * 3. Promotes exemplar memories to long_term to prevent future decay
 * 4. Regenerates scripts for skills with empty scripts directories
 *
 * Usage:
 *   bun scripts/backfill-synthesis-tool-data.ts [--dry-run]
 */

import { initializeDatabase } from '../src/db/index.ts';
import { getSkillCandidates, getSynthesis } from '../src/db/queries/dialectic.ts';
import { getMemory, promoteMemory } from '../src/db/queries/memories.ts';
import { querySkills, getSkillByName } from '../src/db/queries/skills.ts';
import { SkillGenerator } from '../src/skill-generator/index.ts';
import type { ToolDataSnapshot } from '../src/types/dialectic.ts';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (dryRun) {
  console.log('Running in DRY RUN mode - no changes will be made\n');
}

const db = initializeDatabase('./data/engram.db');

// Step 1: Check if migration applied
console.log('Step 1: Checking schema...');
try {
  const result = db.query<{ name: string }, []>(
    `SELECT name FROM pragma_table_info('syntheses') WHERE name = 'tool_data'`
  ).get();

  if (result) {
    console.log('  ✓ tool_data column exists');
  } else {
    console.log('  ✗ tool_data column missing - migration needed');
    if (!dryRun) {
      db.run('ALTER TABLE syntheses ADD COLUMN tool_data TEXT');
      console.log('  ✓ Migration applied');
    }
  }
} catch (error) {
  console.error('  Error checking schema:', error);
}

// Step 2: Backfill tool_data for syntheses that have exemplar memories
console.log('\nStep 2: Backfilling tool_data for existing syntheses...');

const allSyntheses = db.query<{ id: string; tool_data: string | null }, []>(
  `SELECT id, tool_data FROM syntheses`
).all();

console.log(`  Found ${allSyntheses.length} syntheses`);

let backfilled = 0;
let alreadyHasData = 0;
let noMemories = 0;

for (const synthesis of allSyntheses) {
  if (synthesis.tool_data) {
    alreadyHasData++;
    continue;
  }

  // Get exemplar memory IDs
  const memoryRows = db.query<{ memory_id: string }, [string]>(
    `SELECT memory_id FROM synthesis_memories WHERE synthesis_id = ?`
  ).all(synthesis.id);

  if (memoryRows.length === 0) {
    noMemories++;
    continue;
  }

  // Extract tool data from memories
  const toolData: ToolDataSnapshot[] = [];
  for (const row of memoryRows) {
    const memory = getMemory(db, row.memory_id);
    if (memory && memory.metadata.toolName) {
      toolData.push({
        tool: memory.metadata.toolName,
        action: memory.metadata.toolInput?.command as string | undefined,
        parameters: memory.metadata.toolInput as Record<string, unknown> | undefined,
        description: memory.content.substring(0, 150),
      });
    }
  }

  if (toolData.length > 0 && !dryRun) {
    db.run(
      `UPDATE syntheses SET tool_data = ? WHERE id = ?`,
      [JSON.stringify(toolData), synthesis.id]
    );
    backfilled++;
  } else if (toolData.length > 0) {
    backfilled++;
  }
}

console.log(`  Already has data: ${alreadyHasData}`);
console.log(`  Backfilled: ${backfilled}`);
console.log(`  No memories available: ${noMemories}`);

// Step 3: Promote exemplar memories to long_term
console.log('\nStep 3: Promoting exemplar memories to long_term...');

const allExemplarMemoryIds = db.query<{ memory_id: string }, []>(
  `SELECT DISTINCT memory_id FROM (
    SELECT memory_id FROM thesis_memories
    UNION
    SELECT memory_id FROM antithesis_memories
    UNION
    SELECT memory_id FROM synthesis_memories
  )`
).all();

console.log(`  Found ${allExemplarMemoryIds.length} unique exemplar memories`);

let promoted = 0;
let alreadyLongTerm = 0;
let memoryMissing = 0;

for (const row of allExemplarMemoryIds) {
  const memory = getMemory(db, row.memory_id);
  if (!memory) {
    memoryMissing++;
    continue;
  }

  if (memory.type === 'long_term') {
    alreadyLongTerm++;
    continue;
  }

  if (!dryRun) {
    try {
      promoteMemory(db, row.memory_id, 'long_term');
      promoted++;
    } catch {
      // Already processed or deleted
    }
  } else {
    promoted++;
  }
}

console.log(`  Already long_term: ${alreadyLongTerm}`);
console.log(`  Promoted: ${promoted}`);
console.log(`  Missing (deleted by decay): ${memoryMissing}`);

// Step 4: Regenerate scripts for skills with empty scripts directories
console.log('\nStep 4: Regenerating missing skill scripts...');

const skills = querySkills(db, {});
const skillGenerator = new SkillGenerator(db);
let regenerated = 0;
let skipped = 0;
let failed = 0;

for (const skill of skills) {
  const scriptsDir = `.claude/skills/${skill.name}/scripts`;
  const scriptPath = `${scriptsDir}/script.ts`;

  // Check if script exists and has content
  try {
    const file = Bun.file(scriptPath);
    const size = file.size;
    if (size > 100) {
      skipped++;
      continue;
    }
  } catch {
    // File doesn't exist
  }

  console.log(`  Regenerating: ${skill.name}`);

  if (!dryRun) {
    try {
      // Get the synthesis
      const synthesis = getSynthesis(db, skill.sourceSynthesisId);
      if (!synthesis) {
        console.log(`    ✗ No synthesis found`);
        failed++;
        continue;
      }

      // Get exemplar memories (what's left of them)
      const memories = synthesis.exemplarMemoryIds
        .map(id => getMemory(db, id))
        .filter((m): m is NonNullable<typeof m> => m !== null);

      // Write skill file (this will use toolData snapshot if available)
      await skillGenerator.writeSkillFile(skill, memories, synthesis.content, synthesis.toolData);
      regenerated++;
      console.log(`    ✓ Script regenerated`);
    } catch (error) {
      console.log(`    ✗ Failed: ${error}`);
      failed++;
    }
  } else {
    regenerated++;
    console.log(`    (would regenerate)`);
  }
}

console.log(`\n  Skipped (already exist): ${skipped}`);
console.log(`  Regenerated: ${regenerated}`);
console.log(`  Failed: ${failed}`);

// Summary
console.log('\n' + '='.repeat(50));
console.log('Summary');
console.log('='.repeat(50));
console.log(`Syntheses backfilled: ${backfilled}`);
console.log(`Memories promoted: ${promoted}`);
console.log(`Scripts regenerated: ${regenerated}`);

if (dryRun) {
  console.log('\nThis was a dry run. Run without --dry-run to apply changes.');
}
