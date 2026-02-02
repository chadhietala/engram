/**
 * Skill Generator - generates Claude Skills from synthesized patterns
 */

import type { Database } from 'bun:sqlite';
import {
  createSkill,
  getSkillByName,
  updateSkill,
  querySkills,
} from '../db/queries/skills.ts';
import {
  getSynthesis,
  getSkillCandidates,
  getThesis,
  getAntithesesByThesis,
} from '../db/queries/dialectic.ts';
import { getPattern } from '../db/queries/patterns.ts';
import { getMemory } from '../db/queries/memories.ts';
import {
  validateSkill,
  validateSkillName,
  generateValidSkillName,
  extractNameFromDescription,
} from './validator.ts';
import {
  generateSkillMarkdown,
  determineComplexity,
} from './template.ts';
import {
  generateExecutableScript,
  generateReplayScript,
} from './script-generator.ts';
import { generateSkillContent, extractUserGoal, generateSkillScript } from '../llm/index.ts';
import { queryMemories } from '../db/queries/memories.ts';
import { generateProcedure } from '../stages/syntactic.ts';
import type {
  Skill,
  SkillCreateInput,
  SkillInstructions,
  SkillValidationResult,
} from '../types/skill.ts';
import type { Memory } from '../types/memory.ts';
import type { ToolDataSnapshot } from '../types/dialectic.ts';

const SKILLS_DIR = './.claude/skills';

/**
 * Find an existing skill that matches the goal (for evolution instead of duplication)
 * Returns the skill if found, null otherwise
 */
function findExistingSkillByGoal(db: Database, goalName: string): Skill | null {
  // First try exact match
  const exactMatch = getSkillByName(db, goalName);
  if (exactMatch) return exactMatch;

  // Try to find a skill with a similar base name (without version suffix)
  const baseName = goalName.replace(/-\d+$/, '');
  const allSkills = querySkills(db, {});

  for (const skill of allSkills) {
    const skillBaseName = skill.name.replace(/-\d+$/, '');
    if (skillBaseName === baseName) {
      return skill;
    }
  }

  return null;
}

/**
 * Increment version number (1.0 -> 1.1, 1.9 -> 2.0)
 */
function incrementVersion(version: string): string {
  const parts = version.split('.');
  const major = parseInt(parts[0] || '1', 10);
  const minor = parseInt(parts[1] || '0', 10);

  if (minor >= 9) {
    return `${major + 1}.0`;
  }
  return `${major}.${minor + 1}`;
}

/**
 * Find user prompts associated with memories based on session and temporal proximity
 */
function findAssociatedUserPrompts(db: Database, memories: Memory[]): string[] {
  if (memories.length === 0) return [];

  // Get unique session IDs from memories
  const sessionIds = [...new Set(memories.map(m => m.metadata.sessionId))];

  // Get time range (with some buffer)
  const timestamps = memories.map(m => m.createdAt);
  const minTime = Math.min(...timestamps) - 60000; // 1 minute before
  const maxTime = Math.max(...timestamps) + 60000; // 1 minute after

  const userPrompts: string[] = [];

  for (const sessionId of sessionIds) {
    const sessionMemories = queryMemories(db, { sessionId });

    for (const mem of sessionMemories) {
      if (
        mem.content.startsWith('User prompt:') &&
        mem.createdAt >= minTime &&
        mem.createdAt <= maxTime &&
        !mem.content.includes('<task-notification>')
      ) {
        // Extract the actual prompt text
        const promptText = mem.content.replace('User prompt:', '').trim();
        if (promptText.length > 5 && promptText.length < 500) {
          userPrompts.push(promptText);
        }
      }
    }
  }

  // Deduplicate
  return [...new Set(userPrompts)];
}

/**
 * Fetch memories by their IDs, filtering out nulls
 */
function fetchMemoriesByIds(db: Database, memoryIds: string[]): Memory[] {
  const memories: Memory[] = [];
  for (const memoryId of memoryIds) {
    const memory = getMemory(db, memoryId);
    if (memory) {
      memories.push(memory);
    }
  }
  return memories;
}

export class SkillGenerator {
  private db: Database;
  private skillsDir: string;

  constructor(db: Database, skillsDir: string = SKILLS_DIR) {
    this.db = db;
    this.skillsDir = skillsDir;
  }

  /**
   * Generate a skill from a synthesis
   */
  async generateFromSynthesis(synthesisId: string): Promise<Skill | null> {
    const synthesis = getSynthesis(this.db, synthesisId);
    if (!synthesis) {
      console.error(`Synthesis not found: ${synthesisId}`);
      return null;
    }

    if (!synthesis.skillCandidate) {
      console.error(`Synthesis is not marked as skill candidate: ${synthesisId}`);
      return null;
    }

    const thesis = getThesis(this.db, synthesis.thesisId);
    if (!thesis) {
      console.error(`Thesis not found for synthesis: ${synthesisId}`);
      return null;
    }

    const pattern = getPattern(this.db, thesis.patternId);
    if (!pattern) {
      console.error(`Pattern not found for thesis: ${thesis.id}`);
      return null;
    }

    // Get antitheses
    const antitheses = getAntithesesByThesis(this.db, thesis.id);
    const antithesisContents = antitheses.map((a) => a.content);

    // Get exemplar memories
    const exemplarMemories = fetchMemoriesByIds(this.db, synthesis.exemplarMemoryIds);

    // Try to extract user goal from associated prompts FIRST
    const userPrompts = findAssociatedUserPrompts(this.db, exemplarMemories);
    let userGoal: { goal: string; goalDescription: string } | undefined;

    if (userPrompts.length > 0) {
      try {
        console.error(`[SkillGenerator] Extracting goal from ${userPrompts.length} user prompts...`);
        const extractedGoal = await extractUserGoal(userPrompts, exemplarMemories);
        userGoal = { goal: extractedGoal.goal, goalDescription: extractedGoal.goalDescription };
        console.error(`[SkillGenerator] Extracted goal: ${userGoal.goal} - ${userGoal.goalDescription}`);
      } catch (error) {
        console.error(`[SkillGenerator] Failed to extract goal:`, error);
      }
    }

    // Generate LLM-powered skill content (pass user goal for context)
    console.error(`[SkillGenerator] Generating LLM-powered skill content...`);
    const llmContent = await generateSkillContent(synthesis, exemplarMemories, userGoal);

    // Map LLM output to SkillInstructions
    // Use LLM-generated steps instead of truncated synthesis content
    const steps = llmContent.steps && llmContent.steps.length > 0
      ? llmContent.steps.map((step, index) => ({
          order: index + 1,
          action: step.action,
          details: step.details,
        }))
      : [{
          order: 1,
          action: 'Follow the workflow pattern',
          details: synthesis.content.substring(0, 200),
        }];

    const instructions: SkillInstructions = {
      overview: llmContent.instructions,
      whenToUse: llmContent.whenToUse,
      steps,
      examples: [],
      // Don't include raw dialectic content - only include meaningful edge cases
      edgeCases: [],
    };
    const llmDescription = llmContent.description;
    console.error(`[SkillGenerator] LLM content generated successfully`);

    // Generate skill name - prefer user goal, fall back to description extraction
    let baseName: string;
    if (userGoal) {
      baseName = generateValidSkillName(userGoal.goal);
      console.error(`[SkillGenerator] Goal-based name: ${baseName}`);
    } else {
      // Fall back to extracting from LLM description
      const extractedName = extractNameFromDescription(llmDescription);
      baseName = extractedName
        ? generateValidSkillName(extractedName)
        : generateValidSkillName(pattern.name);
    }

    // Check if a skill with this goal already exists - EVOLVE instead of duplicate
    const existingSkill = findExistingSkillByGoal(this.db, baseName);

    if (existingSkill) {
      console.error(`[SkillGenerator] Found existing skill "${existingSkill.name}" - evolving instead of duplicating`);

      // Merge instructions - add new whenToUse scenarios and edge cases
      const mergedInstructions: SkillInstructions = {
        overview: llmContent.instructions, // Use newer, potentially better overview
        whenToUse: [...new Set([...existingSkill.instructions.whenToUse, ...llmContent.whenToUse])],
        steps: existingSkill.instructions.steps, // Keep existing steps
        examples: existingSkill.instructions.examples,
        edgeCases: [
          ...existingSkill.instructions.edgeCases,
          ...antithesisContents.map((content) => ({
            condition: 'When conditions differ',
            handling: content,
          })),
        ],
      };

      // Update the existing skill with new version
      const newVersion = incrementVersion(existingSkill.version);
      const updatedSkill = updateSkill(this.db, existingSkill.id, {
        description: llmDescription,
        version: newVersion,
        instructions: mergedInstructions,
      });

      console.error(`[SkillGenerator] Evolved skill to version ${newVersion}`);
      return updatedSkill;
    }

    // No existing skill - create new one
    const skillName = baseName;
    const description = llmDescription;
    const complexity = determineComplexity(instructions);

    const input: SkillCreateInput = {
      name: skillName,
      description,
      sourcePatternId: pattern.id,
      sourceSynthesisId: synthesis.id,
      instructions,
      complexity,
    };

    const skill = createSkill(this.db, input);

    // Validate
    const validation = validateSkill(skill);
    if (!validation.valid) {
      console.error(`Skill validation failed:`, validation.errors);
      // Still return the skill, but log warnings
    }

    if (validation.warnings.length > 0) {
      console.warn(`Skill validation warnings:`, validation.warnings);
    }

    return skill;
  }

  /**
   * Write skill to file (SKILL.md + scripts/script.ts)
   */
  async writeSkillFile(
    skill: Skill,
    memories?: Memory[],
    synthesisContent?: string,
    toolDataSnapshot?: ToolDataSnapshot[]
  ): Promise<string> {
    const content = generateSkillMarkdown(skill);
    const dirPath = `${this.skillsDir}/${skill.name}`;
    const filePath = `${dirPath}/SKILL.md`;
    const scriptsDir = `${dirPath}/scripts`;
    const scriptPath = `${scriptsDir}/script.ts`;

    // Ensure directories exist (skill dir and scripts subdirectory)
    await Bun.spawn(['mkdir', '-p', dirPath]).exited;
    await Bun.spawn(['mkdir', '-p', scriptsDir]).exited;

    // Write SKILL.md
    await Bun.write(filePath, content);

    // Prepare tool examples from either toolData snapshot (preferred) or memories (fallback)
    // This ensures script generation works even when memories have been deleted by decay
    // Include full parameters for the LLM to understand the actual operations
    let toolExamples: { tool: string; description?: string; parameters?: Record<string, unknown> }[] = [];

    if (toolDataSnapshot && toolDataSnapshot.length > 0) {
      // Use the snapshot (preserved at synthesis time, immune to memory decay)
      console.error(`[SkillGenerator] Using toolData snapshot with ${toolDataSnapshot.length} entries`);
      toolExamples = toolDataSnapshot.slice(0, 15).map(td => ({
        tool: td.tool,
        description: td.description,
        parameters: td.parameters,
      }));
    } else if (memories && memories.length > 0) {
      // Fall back to fetching from memories (may be incomplete due to decay)
      console.error(`[SkillGenerator] Falling back to memories (${memories.length} available)`);
      toolExamples = memories.slice(0, 15).map(m => ({
        tool: m.metadata.toolName || 'unknown',
        description: m.content.substring(0, 150),
        parameters: m.metadata.toolInput as Record<string, unknown> | undefined,
      }));
    }

    // Generate intelligent LLM-powered script
    // Even without tool data, the LLM can generate useful scripts from synthesis content
    console.error(`[SkillGenerator] Generating intelligent script via LLM...`);
    if (toolExamples.length > 0) {
      console.error(`[SkillGenerator] Using ${toolExamples.length} tool examples`);
    } else {
      console.error(`[SkillGenerator] No tool data - generating from synthesis content only`);
    }

    try {
      const scriptResult = await generateSkillScript(
        skill.name,
        skill.description,
        synthesisContent || skill.instructions.overview,
        toolExamples
      );

      await Bun.write(scriptPath, scriptResult.script);
      await Bun.spawn(['chmod', '+x', scriptPath]).exited;
      console.error(`[SkillGenerator] Generated intelligent script: ${scriptResult.explanation}`);
    } catch (error) {
      console.error(`[SkillGenerator] Failed to generate LLM script:`, error);
      // Generate a minimal placeholder script as last resort
      const placeholderScript = this.generatePlaceholderScript(skill);
      await Bun.write(scriptPath, placeholderScript);
      await Bun.spawn(['chmod', '+x', scriptPath]).exited;
      console.error(`[SkillGenerator] Generated placeholder script (LLM failed)`);
    }

    // Update skill with file path
    updateSkill(this.db, skill.id, { filePath, status: 'validated' });

    return filePath;
  }

  /**
   * Generate a placeholder script when no tool data is available
   */
  private generatePlaceholderScript(skill: Skill): string {
    return `#!/usr/bin/env bun
/**
 * ${skill.name} - Skill Script
 * ${skill.description}
 *
 * This is a placeholder script. The original tool usage data was not available
 * at generation time. Please regenerate this skill with fresh exemplar data.
 *
 * Usage: bun ${skill.name}/scripts/script.ts [target-path]
 */

const targetPath = process.argv[2] || '.';

console.log(\`Running ${skill.name} on: \${targetPath}\`);
console.log('');
console.log('Instructions:');
console.log('${skill.instructions.overview.replace(/'/g, "\\'")}');
console.log('');
console.log('Steps:');
${skill.instructions.steps.map((step, i) => `console.log('${i + 1}. ${step.action.replace(/'/g, "\\'")}');`).join('\n')}
`;
  }

  /**
   * Generate a quick replay script from recent session memories
   */
  async generateReplayFromSession(
    sessionId: string,
    skillName: string
  ): Promise<string | null> {
    const memories = this.getSessionToolMemories(sessionId);
    if (memories.length === 0) return null;

    const dirPath = `${this.skillsDir}/${skillName}`;
    const scriptPath = `${dirPath}/script.ts`;

    await Bun.spawn(['mkdir', '-p', dirPath]).exited;

    const toolData = memories.map((m) => ({
      toolName: m.metadata.toolName || 'unknown',
      toolInput: m.metadata.toolInput || {},
    }));

    const script = generateReplayScript(skillName, toolData);
    await Bun.write(scriptPath, script);
    await Bun.spawn(['chmod', '+x', scriptPath]).exited;

    return scriptPath;
  }

  private getSessionToolMemories(sessionId: string): Memory[] {
    const memories = require('../db/queries/memories.ts').queryMemories(this.db, {
      sessionId,
      source: 'tool_use',
    });
    return memories.sort((a: Memory, b: Memory) => a.createdAt - b.createdAt);
  }

  /**
   * Generate and write all pending skill candidates
   */
  async generateAllPending(): Promise<{
    generated: Skill[];
    failed: string[];
  }> {
    const candidates = getSkillCandidates(this.db);
    const generated: Skill[] = [];
    const failed: string[] = [];

    for (const synthesis of candidates) {
      try {
        // Check if skill already exists for this synthesis
        const existingSkills = querySkills(this.db, {});
        const exists = existingSkills.some(
          (s) => s.sourceSynthesisId === synthesis.id
        );

        if (exists) {
          continue;
        }

        const skill = await this.generateFromSynthesis(synthesis.id);
        if (skill) {
          // Get exemplar memories for script generation
          // Fall back to fetching by IDs if toolData snapshot is not available
          const memories = fetchMemoriesByIds(this.db, synthesis.exemplarMemoryIds);
          await this.writeSkillFile(skill, memories, synthesis.content, synthesis.toolData);
          generated.push(skill);
        } else {
          failed.push(synthesis.id);
        }
      } catch (error) {
        console.error(`Failed to generate skill for ${synthesis.id}:`, error);
        failed.push(synthesis.id);
      }
    }

    return { generated, failed };
  }

  /**
   * Validate a skill file
   */
  async validateSkillFile(filePath: string): Promise<SkillValidationResult> {
    try {
      const content = await Bun.file(filePath).text();

      // Parse frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) {
        return {
          valid: false,
          errors: ['Missing or invalid frontmatter'],
          warnings: [],
        };
      }

      // Extract name and description from frontmatter
      const frontmatter = frontmatterMatch[1] ?? '';
      const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
      const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

      const errors: string[] = [];
      const warnings: string[] = [];

      if (!nameMatch) {
        errors.push('Missing name in frontmatter');
      } else {
        const nameValidation = validateSkillName(nameMatch[1] ?? '');
        if (!nameValidation.valid && nameValidation.error) {
          errors.push(nameValidation.error);
        }
      }

      if (!descMatch) {
        errors.push('Missing description in frontmatter');
      }

      // Check for required sections
      if (!content.includes('## Overview')) {
        errors.push('Missing Overview section');
      }

      if (!content.includes('## When to Use')) {
        warnings.push('Missing "When to Use" section');
      }

      if (!content.includes('## Steps')) {
        warnings.push('Missing Steps section');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to read file: ${error}`],
        warnings: [],
      };
    }
  }

  /**
   * Get generator statistics
   */
  getStats(): {
    totalSkills: number;
    byStatus: Record<string, number>;
    byComplexity: Record<string, number>;
    pendingCandidates: number;
  } {
    const skills = querySkills(this.db, {});
    const candidates = getSkillCandidates(this.db);

    const byStatus: Record<string, number> = {};
    const byComplexity: Record<string, number> = {};

    for (const skill of skills) {
      byStatus[skill.status] = (byStatus[skill.status] ?? 0) + 1;
      byComplexity[skill.complexity] = (byComplexity[skill.complexity] ?? 0) + 1;
    }

    // Count candidates not yet generated
    const generatedSynthesisIds = new Set(skills.map((s) => s.sourceSynthesisId));
    const pendingCandidates = candidates.filter(
      (c) => !generatedSynthesisIds.has(c.id)
    ).length;

    return {
      totalSkills: skills.length,
      byStatus,
      byComplexity,
      pendingCandidates,
    };
  }
}

// Export sub-modules
export * from './validator.ts';
export * from './template.ts';
export * from './script-generator.ts';
