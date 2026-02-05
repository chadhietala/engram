#!/usr/bin/env bun
/**
 * Setup script to generate local hooks.json for self-hosted mode
 * Run this once after cloning the repo: bun scripts/setup-hooks.ts
 */

import { dirname, resolve } from 'path';

const projectRoot = resolve(dirname(import.meta.path), '..');
const hooksTemplate = {
  hooks: {
    SessionStart: [
      {
        type: 'command',
        command: `bun ${projectRoot}/scripts/engram-hook.ts SessionStart`,
        timeout: 5000,
      },
    ],
    UserPromptSubmit: [
      {
        type: 'command',
        command: `bun ${projectRoot}/scripts/engram-hook.ts UserPromptSubmit`,
        timeout: 3000,
      },
    ],
    PostToolUse: [
      {
        matcher: 'Bash|Read|Write|Edit|Glob|Grep|WebFetch|Task',
        hooks: [
          {
            type: 'command',
            command: `bun ${projectRoot}/scripts/engram-hook.ts PostToolUse`,
            timeout: 5000,
          },
        ],
      },
    ],
    Stop: [
      {
        type: 'command',
        command: `bun ${projectRoot}/scripts/engram-hook.ts Stop`,
        timeout: 3000,
      },
    ],
    SessionEnd: [
      {
        type: 'command',
        command: `bun ${projectRoot}/scripts/engram-hook.ts SessionEnd`,
        timeout: 30000,
      },
    ],
  },
};

const outputPath = resolve(projectRoot, '.claude/hooks.json');
await Bun.write(outputPath, JSON.stringify(hooksTemplate, null, 2) + '\n');

console.log(`Generated ${outputPath}`);
console.log('Engram hooks configured for self-hosted mode.');
console.log('Restart Claude Code to activate.');
