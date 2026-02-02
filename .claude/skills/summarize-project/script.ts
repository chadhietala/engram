#!/usr/bin/env bun
/**
 * summarize-project
 * Get an overview of a project by examining its structure and key files.
 *
 * Usage:
 *   bun .claude/skills/summarize-project/script.ts [target-directory]
 */

import { $ } from "bun";

// Target directory (defaults to current)
const targetDir = process.argv[2] || process.cwd();

async function main() {
  console.log("Running: summarize-project");
  console.log(`Target: ${targetDir}`);
  console.log("");

  // Step 1: Bash
  console.log("$ ls -la ${targetDir}/ | head -20");
  await $`ls -la ${targetDir}/ | head -20`;

  // Step 2: Read
  console.log("Reading: CLAUDE.md");
  await Bun.file(`${targetDir}/CLAUDE.md`).text();

  // Step 3: Read
  console.log("Reading: package.json");
  await Bun.file(`${targetDir}/package.json`).text();

  // Step 4: Bash
  console.log("$ find ${targetDir}/src -type f -name \"*.ts\" -o -name \"*.tsx\" ...");
  await $`find ${targetDir}/src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.json" | head -30`;

  // Step 5: Bash
  console.log("$ find ${targetDir}/src -type f -name \"*.ts\" -o -name \"*.tsx\" ...");
  await $`find ${targetDir}/src -type f -name "*.ts" -o -name "*.tsx" | sort`;

  // Step 6: Bash
  console.log("$ ls -la ${targetDir}/src/");
  await $`ls -la ${targetDir}/src/`;

  // Step 7: Bash
  console.log("$ ls -la ${targetDir}/data/ && ls -la ${targetDir}/scripts/");
  await $`ls -la ${targetDir}/data/ && ls -la ${targetDir}/scripts/`;

  // Step 8: Read
  console.log("Reading: src/index.ts");
  await Bun.file(`${targetDir}/src/index.ts`).text();

  // Step 9: Read
  console.log("Reading: src/types/index.ts");
  await Bun.file(`${targetDir}/src/types/index.ts`).text();

  // Step 10: Read
  console.log("Reading: src/types/dialectic.ts");
  await Bun.file(`${targetDir}/src/types/dialectic.ts`).text();

  // Step 11: Read
  console.log("Reading: src/memory/index.ts");
  await Bun.file(`${targetDir}/src/memory/index.ts`).text();

  // Step 12: Read
  console.log("Reading: src/stages/index.ts");
  await Bun.file(`${targetDir}/src/stages/index.ts`).text();

  // Step 13: Read
  console.log("Reading: src/skill-generator/index.ts");
  await Bun.file(`${targetDir}/src/skill-generator/index.ts`).text();

  // Step 14: Read
  console.log("Reading: src/dialectic/index.ts");
  await Bun.file(`${targetDir}/src/dialectic/index.ts`).text();

  // Step 15: Read
  console.log("Reading: src/db/schema.ts");
  await Bun.file(`${targetDir}/src/db/schema.ts`).text();

  // Step 16: Read
  console.log("Reading: src/embedding/index.ts");
  await Bun.file(`${targetDir}/src/embedding/index.ts`).text();

  // Step 17: Read
  console.log("Reading: src/hooks/index.ts");
  await Bun.file(`${targetDir}/src/hooks/index.ts`).text();

  // Step 18: Read
  console.log("Reading: src/types/skill.ts");
  await Bun.file(`${targetDir}/src/types/skill.ts`).text();

  // Step 19: Read
  console.log("Reading: src/index.test.ts");
  await Bun.file(`${targetDir}/src/index.test.ts`).text();

  // Step 20: Read
  console.log("Reading: src/memory/processing/encoder.ts");
  await Bun.file(`${targetDir}/src/memory/processing/encoder.ts`).text();

  // Step 21: Read
  console.log("Reading: src/dialectic/thesis.ts");
  await Bun.file(`${targetDir}/src/dialectic/thesis.ts`).text();

  // Step 22: Read
  console.log("Reading: scripts/engram-hook.ts");
  await Bun.file(`${targetDir}/scripts/engram-hook.ts`).text();

  // Step 23: Read
  console.log("Reading: src/types/hooks.ts");
  await Bun.file(`${targetDir}/src/types/hooks.ts`).text();

  // Step 24: Bash
  console.log("$ find ${targetDir}/src -type f -name \"*.ts\" | wc -l");
  await $`find ${targetDir}/src -type f -name "*.ts" | wc -l`;

  console.log("Done!");
}

main().catch(e => { console.error(e); process.exit(1); });