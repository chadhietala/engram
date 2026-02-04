/**
 * Centralized configuration for engram plugin
 */

import { join } from 'path';

export function getPluginRoot(): string {
  return process.env.CLAUDE_PLUGIN_ROOT || process.cwd();
}

export function getDataDir(): string {
  // Use project-local .engram/ directory for isolated memory per project
  return process.env.ENGRAM_DATA_DIR || join(process.cwd(), '.engram');
}

export function getSkillsDir(): string {
  return process.env.ENGRAM_SKILLS_DIR || join(process.cwd(), '.claude', 'skills');
}

export function getDbPath(): string {
  return join(getDataDir(), 'engram.db');
}
