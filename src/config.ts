/**
 * Centralized configuration for engram plugin
 */

import { join } from 'path';
import { homedir } from 'os';

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

/**
 * Get the project-level rules directory for engram-generated rules
 * Rules here are auto-loaded by Claude and should be committed to git
 */
export function getRulesDir(): string {
  return process.env.ENGRAM_RULES_DIR || join(process.cwd(), '.claude', 'rules', 'engram');
}

/**
 * Get the user-level rules directory for cross-project preferences
 * Rules here apply to all projects for this user
 */
export function getUserRulesDir(): string {
  return process.env.ENGRAM_USER_RULES_DIR || join(homedir(), '.claude', 'rules');
}

/**
 * Configuration options for rules publishing
 */
export interface RulesConfig {
  /** Minimum confidence score to auto-publish (0-1) */
  minConfidence: number;
  /** Minimum number of supporting memories */
  minSupportingMemories: number;
  /** Whether to auto-publish confirmed patterns */
  autoPublish: boolean;
}

/**
 * Get rules publishing configuration
 */
export function getRulesConfig(): RulesConfig {
  return {
    minConfidence: parseFloat(process.env.ENGRAM_RULES_MIN_CONFIDENCE || '0.7'),
    minSupportingMemories: parseInt(process.env.ENGRAM_RULES_MIN_MEMORIES || '3', 10),
    autoPublish: process.env.ENGRAM_RULES_AUTO_PUBLISH !== 'false',
  };
}
