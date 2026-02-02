/**
 * Skill validation
 */

import type { Skill, SkillInstructions, SkillValidationResult } from '../types/skill.ts';

/**
 * Validate skill name format
 * - lowercase letters, numbers, hyphens only
 * - 1-64 characters
 * - must start with letter
 */
export function validateSkillName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length === 0) {
    return { valid: false, error: 'Name cannot be empty' };
  }

  if (name.length > 64) {
    return { valid: false, error: 'Name must be 64 characters or less' };
  }

  if (!/^[a-z]/.test(name)) {
    return { valid: false, error: 'Name must start with a lowercase letter' };
  }

  if (!/^[a-z0-9-]+$/.test(name)) {
    return { valid: false, error: 'Name can only contain lowercase letters, numbers, and hyphens' };
  }

  if (name.includes('--')) {
    return { valid: false, error: 'Name cannot contain consecutive hyphens' };
  }

  if (name.endsWith('-')) {
    return { valid: false, error: 'Name cannot end with a hyphen' };
  }

  return { valid: true };
}

/**
 * Validate skill description
 * - 1-1024 characters
 * - should be a complete sentence
 */
export function validateSkillDescription(description: string): { valid: boolean; error?: string } {
  if (!description || description.length === 0) {
    return { valid: false, error: 'Description cannot be empty' };
  }

  if (description.length > 1024) {
    return { valid: false, error: 'Description must be 1024 characters or less' };
  }

  // Should end with punctuation
  if (!/[.!?]$/.test(description.trim())) {
    return { valid: false, error: 'Description should end with punctuation' };
  }

  return { valid: true };
}

/**
 * Validate skill instructions
 */
export function validateInstructions(instructions: SkillInstructions): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Overview is required
  if (!instructions.overview || instructions.overview.length === 0) {
    errors.push('Overview is required');
  } else if (instructions.overview.length < 20) {
    warnings.push('Overview is very short, consider adding more detail');
  }

  // When to use is required
  if (!instructions.whenToUse || instructions.whenToUse.length === 0) {
    errors.push('At least one "when to use" condition is required');
  }

  // Steps are required
  if (!instructions.steps || instructions.steps.length === 0) {
    errors.push('At least one step is required');
  } else {
    // Validate step ordering
    const orders = instructions.steps.map((s) => s.order);
    const expectedOrders = instructions.steps.map((_, i) => i + 1);
    if (!orders.every((o, i) => o === expectedOrders[i])) {
      warnings.push('Step ordering may be inconsistent');
    }

    // Check for empty actions
    for (const step of instructions.steps) {
      if (!step.action || step.action.length === 0) {
        errors.push(`Step ${step.order} has empty action`);
      }
    }
  }

  // Examples are recommended
  if (!instructions.examples || instructions.examples.length === 0) {
    warnings.push('Consider adding examples to help users understand the skill');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Full skill validation
 */
export function validateSkill(skill: Skill): SkillValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate name
  const nameResult = validateSkillName(skill.name);
  if (!nameResult.valid && nameResult.error) {
    errors.push(`Name: ${nameResult.error}`);
  }

  // Validate description
  const descResult = validateSkillDescription(skill.description);
  if (!descResult.valid && descResult.error) {
    errors.push(`Description: ${descResult.error}`);
  }

  // Validate instructions
  const instrResult = validateInstructions(skill.instructions);
  errors.push(...instrResult.errors.map((e) => `Instructions: ${e}`));
  warnings.push(...instrResult.warnings.map((w) => `Instructions: ${w}`));

  // Validate version format
  if (!/^\d+\.\d+(\.\d+)?$/.test(skill.version)) {
    warnings.push('Version should follow semver format (e.g., 1.0 or 1.0.0)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Common action verbs that often appear in skill descriptions
 */
const DESCRIPTION_ACTION_VERBS = [
  'explore', 'discover', 'search', 'find', 'locate',
  'commit', 'push', 'pull', 'merge', 'checkout',
  'build', 'compile', 'run', 'test', 'deploy',
  'read', 'write', 'edit', 'create', 'delete',
  'fetch', 'request', 'send', 'upload', 'download',
  'debug', 'fix', 'refactor', 'review', 'analyze',
  'start', 'stop', 'configure', 'setup', 'initialize',
  'validate', 'lint', 'format', 'generate', 'execute',
];

/**
 * Common noun targets that appear in skill descriptions
 */
const DESCRIPTION_NOUNS = [
  'codebase', 'code', 'files', 'file', 'directory', 'directories',
  'repository', 'repo', 'project', 'module', 'package',
  'function', 'functions', 'class', 'classes', 'component', 'components',
  'api', 'endpoint', 'endpoints', 'route', 'routes',
  'test', 'tests', 'spec', 'specs',
  'config', 'configuration', 'settings',
  'changes', 'commits', 'branches', 'workflow',
  'database', 'schema', 'query', 'queries',
  'dependencies', 'packages', 'modules',
  'errors', 'issues', 'bugs', 'logs',
  'structure', 'architecture', 'patterns',
];

/**
 * Extract a meaningful name from an LLM-generated description
 * Looks for verb + noun patterns like "explore codebase" -> "explore-codebase"
 */
export function extractNameFromDescription(description: string): string | null {
  if (!description || description.length === 0) {
    return null;
  }

  const lowerDesc = description.toLowerCase();

  // Try to find verb + noun combination
  for (const verb of DESCRIPTION_ACTION_VERBS) {
    // Look for patterns like "verb the noun", "verbs noun", "verb noun"
    const verbPatterns = [
      new RegExp(`\\b${verb}s?\\s+(?:the\\s+)?([a-z]+)`, 'i'),
      new RegExp(`\\b${verb}(?:ing|ed)?\\s+(?:the\\s+)?([a-z]+)`, 'i'),
    ];

    for (const pattern of verbPatterns) {
      const match = lowerDesc.match(pattern);
      if (match && match[1]) {
        const noun = match[1].toLowerCase();
        // Check if the noun is meaningful
        if (DESCRIPTION_NOUNS.includes(noun) || noun.length >= 4) {
          return `${verb}-${noun}`;
        }
      }
    }
  }

  // Try to find just a meaningful noun and use a generic action
  for (const noun of DESCRIPTION_NOUNS) {
    if (lowerDesc.includes(noun)) {
      // Try to find the closest verb before this noun
      const nounIndex = lowerDesc.indexOf(noun);
      const beforeNoun = lowerDesc.substring(Math.max(0, nounIndex - 50), nounIndex);

      for (const verb of DESCRIPTION_ACTION_VERBS) {
        if (beforeNoun.includes(verb)) {
          return `${verb}-${noun}`;
        }
      }

      // If no verb found, use a sensible default based on the noun
      if (['codebase', 'code', 'files', 'repository', 'project'].includes(noun)) {
        return `explore-${noun}`;
      }
      if (['test', 'tests', 'spec', 'specs'].includes(noun)) {
        return `run-${noun}`;
      }
      if (['changes', 'commits'].includes(noun)) {
        return `commit-${noun}`;
      }
    }
  }

  // Last resort: try to extract first verb and any word after it
  for (const verb of DESCRIPTION_ACTION_VERBS) {
    const match = lowerDesc.match(new RegExp(`\\b${verb}s?\\s+([a-z]{4,})`, 'i'));
    if (match && match[1]) {
      return `${verb}-${match[1]}`;
    }
  }

  return null;
}

/**
 * Generate a valid skill name from a string
 */
export function generateValidSkillName(input: string): string {
  // Convert to lowercase
  let name = input.toLowerCase();

  // Replace spaces and underscores with hyphens
  name = name.replace(/[\s_]+/g, '-');

  // Remove invalid characters
  name = name.replace(/[^a-z0-9-]/g, '');

  // Remove consecutive hyphens
  name = name.replace(/-+/g, '-');

  // Remove leading/trailing hyphens
  name = name.replace(/^-+|-+$/g, '');

  // Ensure starts with letter
  if (!/^[a-z]/.test(name)) {
    name = 'skill-' + name;
  }

  // Truncate to 64 characters
  if (name.length > 64) {
    name = name.substring(0, 64);
    // Don't end with hyphen
    name = name.replace(/-+$/, '');
  }

  // Fallback
  if (name.length === 0) {
    name = 'unnamed-skill';
  }

  return name;
}
