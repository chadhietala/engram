#!/usr/bin/env bun
/**
 * Generate a skill from session tool usage
 *
 * Usage:
 *   bun scripts/generate-skill.ts <skill-name> [description]
 */

import { MemoryManager } from '../src/index.ts';
import { queryMemories } from '../src/db/queries/memories.ts';
import { getRecentSessions } from '../src/db/queries/sessions.ts';
import { generateReplayScript } from '../src/skill-generator/script-generator.ts';
import { generateValidSkillName } from '../src/skill-generator/validator.ts';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Engram Skill Generator');
  console.log('');
  console.log('Usage:');
  console.log('  bun scripts/generate-skill.ts <skill-name> [description]');
  console.log('');
  console.log('Examples:');
  console.log('  bun scripts/generate-skill.ts explore-codebase "Get an overview of a project structure"');
  console.log('  bun scripts/generate-skill.ts setup-typescript "Initialize a TypeScript project with common config"');
  process.exit(1);
}

const rawName = args[0]!;
const skillName = generateValidSkillName(rawName);

// Check for --session flag
let userDescription: string | null = null;
let explicitSessionId: string | null = null;

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--session' && args[i + 1]) {
    explicitSessionId = args[i + 1]!;
    i++;
  } else {
    userDescription = (userDescription ? userDescription + ' ' : '') + args[i];
  }
}

const manager = new MemoryManager('./data/engram.db');
const db = manager.getDatabase();

// Get session - explicit, or most recent with tool operations
let sessionId: string;
if (explicitSessionId) {
  sessionId = explicitSessionId;
} else {
  const sessions = getRecentSessions(db, 10);
  // Find first session with tool operations
  let bestSession = sessions[0];
  for (const s of sessions) {
    const count = queryMemories(db, { sessionId: s.id, source: 'tool_use' }).length;
    if (count > 0) {
      bestSession = s;
      break;
    }
  }
  if (!bestSession) {
    console.error('No sessions found.');
    process.exit(1);
  }
  sessionId = bestSession.id;
}

// Get tool memories
const memories = queryMemories(db, {
  sessionId,
  source: 'tool_use',
});

if (memories.length === 0) {
  console.error('No tool operations found in the current session.');
  process.exit(1);
}

memories.sort((a, b) => a.createdAt - b.createdAt);
console.log(`Captured ${memories.length} operations`);

// Analyze the workflow
const analysis = analyzeWorkflow(memories);

// Generate description if not provided
const description = userDescription || analysis.inferredDescription;

// Generate script
const toolData = memories.map((m) => ({
  toolName: m.metadata.toolName || 'unknown',
  toolInput: m.metadata.toolInput || {},
}));

const script = generateReplayScript(skillName, toolData, description);

// Write files
const skillDir = `.claude/skills/${skillName}`;
await Bun.spawn(['mkdir', '-p', skillDir]).exited;

await Bun.write(`${skillDir}/script.ts`, script);
await Bun.spawn(['chmod', '+x', `${skillDir}/script.ts`]).exited;

// Generate clean SKILL.md
const skillMd = generateSkillMarkdown(skillName, description, analysis);
await Bun.write(`${skillDir}/SKILL.md`, skillMd);

console.log('');
console.log(`Created: ${skillName}`);
console.log(`  ${skillDir}/SKILL.md`);
console.log(`  ${skillDir}/script.ts`);
console.log('');
console.log(`Invoke with: /${skillName}`);

// ============= Helper Functions =============

interface WorkflowAnalysis {
  inferredDescription: string;
  purpose: string;
  steps: string[];
  whenToUse: string[];
  inputs: string[];
  outputs: string[];
}

function analyzeWorkflow(memories: any[]): WorkflowAnalysis {
  const tools = memories.map(m => m.metadata.toolName).filter(Boolean);
  const uniqueTools = [...new Set(tools)];

  // Count operations
  const reads = memories.filter(m => m.metadata.toolName === 'Read').length;
  const writes = memories.filter(m => m.metadata.toolName === 'Write').length;
  const edits = memories.filter(m => m.metadata.toolName === 'Edit').length;
  const bashes = memories.filter(m => m.metadata.toolName === 'Bash').length;
  const globs = memories.filter(m => m.metadata.toolName === 'Glob').length;
  const greps = memories.filter(m => m.metadata.toolName === 'Grep').length;

  // Infer purpose
  let purpose = '';
  let inferredDescription = '';
  const whenToUse: string[] = [];

  if (reads > 3 && writes === 0 && edits === 0) {
    purpose = 'Explore and understand a codebase';
    inferredDescription = 'Get an overview of a project by examining its structure and key files.';
    whenToUse.push('When starting work on an unfamiliar codebase');
    whenToUse.push('When you need to understand how a project is organized');
  } else if (writes > 0 || edits > 0) {
    purpose = 'Set up or modify project files';
    inferredDescription = 'Create or update files following a specific pattern.';
    whenToUse.push('When setting up a new project with similar structure');
    whenToUse.push('When applying a common set of changes');
  } else if (greps > 0 || globs > 0) {
    purpose = 'Search and analyze code';
    inferredDescription = 'Find specific patterns or files across a codebase.';
    whenToUse.push('When searching for specific code patterns');
    whenToUse.push('When auditing a codebase for certain constructs');
  } else if (bashes > reads) {
    purpose = 'Run a sequence of commands';
    inferredDescription = 'Execute a series of shell commands for a specific task.';
    whenToUse.push('When you need to run this command sequence repeatedly');
  } else {
    purpose = 'Perform a multi-step workflow';
    inferredDescription = 'Execute a series of operations on a target directory.';
    whenToUse.push('When you need to repeat this workflow');
  }

  // Generate high-level steps
  const steps = generateHighLevelSteps(memories);

  // Identify inputs/outputs
  const inputs: string[] = ['Target directory'];
  const outputs: string[] = [];

  if (reads > 0) outputs.push('Understanding of project structure');
  if (writes > 0) outputs.push('New files created');
  if (edits > 0) outputs.push('Modified files');

  return {
    inferredDescription,
    purpose,
    steps,
    whenToUse,
    inputs,
    outputs,
  };
}

function generateHighLevelSteps(memories: any[]): string[] {
  const steps: string[] = [];
  let currentPhase = '';

  for (const mem of memories) {
    const tool = mem.metadata.toolName;
    const input = mem.metadata.toolInput || {};

    let step = '';
    let phase = '';

    switch (tool) {
      case 'Bash':
        const cmd = (input.command as string || '').split(' ')[0];
        if (cmd === 'ls' || cmd === 'find' || cmd === 'tree') {
          phase = 'explore';
          step = 'Explore directory structure';
        } else if (cmd === 'mkdir') {
          phase = 'setup';
          step = 'Create necessary directories';
        } else if (cmd === 'npm' || cmd === 'bun' || cmd === 'yarn') {
          phase = 'deps';
          step = 'Install dependencies';
        } else if (cmd === 'git') {
          phase = 'git';
          step = 'Git operations';
        } else {
          phase = 'cmd';
          step = `Run ${cmd} command`;
        }
        break;

      case 'Read':
        const readFile = (input.file_path as string || '').split('/').pop() || '';
        if (readFile === 'README.md' || readFile === 'CLAUDE.md') {
          phase = 'docs';
          step = 'Read project documentation';
        } else if (readFile === 'package.json' || readFile === 'tsconfig.json') {
          phase = 'config';
          step = 'Examine configuration files';
        } else if (readFile.endsWith('.ts') || readFile.endsWith('.js')) {
          phase = 'code';
          step = 'Review source code';
        } else {
          phase = 'read';
          step = 'Read project files';
        }
        break;

      case 'Write':
        phase = 'write';
        const writeFile = (input.file_path as string || '').split('/').pop() || '';
        step = `Create ${writeFile}`;
        break;

      case 'Edit':
        phase = 'edit';
        step = 'Modify existing files';
        break;

      case 'Glob':
        phase = 'search';
        step = `Find files matching pattern`;
        break;

      case 'Grep':
        phase = 'search';
        step = 'Search for code patterns';
        break;
    }

    // Only add if phase changed (dedupe similar consecutive operations)
    if (phase !== currentPhase && step) {
      steps.push(step);
      currentPhase = phase;
    }
  }

  return steps;
}

function generateSkillMarkdown(
  name: string,
  description: string,
  analysis: WorkflowAnalysis
): string {
  const title = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return `---
name: ${name}
description: ${description}
---

# ${title}

${description}

## When to Use

${analysis.whenToUse.map(w => `- ${w}`).join('\n')}

## What It Does

${analysis.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Usage

\`\`\`
/${name}
\`\`\`

Or run the script directly on a specific directory:

\`\`\`bash
bun .claude/skills/${name}/script.ts /path/to/project
\`\`\`
`;
}
