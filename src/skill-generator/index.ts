/**
 * Skill Generator - generates Claude Skills from synthesized patterns
 */

import type { Database } from 'bun:sqlite';
import {
  createSkill,
  getSkill,
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
} from './validator.ts';
import {
  generateSkillMarkdown,
  buildInstructionsFromSynthesis,
  determineComplexity,
} from './template.ts';
import {
  generateExecutableScript,
  generateReplayScript,
} from './script-generator.ts';
import { generateSkillContent } from '../llm/index.ts';
import { generateProcedure } from '../stages/syntactic.ts';
import type {
  Skill,
  SkillCreateInput,
  SkillInstructions,
  SkillValidationResult,
  SkillEdgeCase,
} from '../types/skill.ts';
import type { Synthesis } from '../types/dialectic.ts';
import type { Memory } from '../types/memory.ts';

const SKILLS_DIR = './skills';

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
    const exemplarMemories: Memory[] = [];
    const exemplarContents: string[] = [];
    for (const memoryId of synthesis.exemplarMemoryIds) {
      const memory = getMemory(this.db, memoryId);
      if (memory) {
        exemplarMemories.push(memory);
        exemplarContents.push(memory.content);
      }
    }

    // Try LLM-powered skill content generation first
    let instructions: SkillInstructions;
    let llmDescription: string | null = null;

    try {
      console.error(`[SkillGenerator] Generating LLM-powered skill content...`);
      const llmContent = await generateSkillContent(synthesis, exemplarMemories);

      // Map LLM output to SkillInstructions
      instructions = {
        overview: llmContent.instructions,
        whenToUse: llmContent.whenToUse,
        steps: [{
          order: 1,
          action: 'Follow the pattern described above',
          details: synthesis.content.substring(0, 200),
        }],
        examples: [],
        edgeCases: antithesisContents.map((content) => ({
          condition: 'When conditions differ',
          handling: content,
        })),
      };
      llmDescription = llmContent.description;
      console.error(`[SkillGenerator] LLM content generated successfully`);
    } catch (error) {
      console.error(`[SkillGenerator] LLM generation failed, using template:`, error);
      // Fall back to template-based generation
      instructions = buildInstructionsFromSynthesis(
        synthesis.content,
        thesis.content,
        antithesisContents,
        exemplarContents
      );
    }

    // Generate skill name
    const baseName = generateValidSkillName(pattern.name);
    let skillName = baseName;
    let counter = 1;

    // Ensure unique name
    while (getSkillByName(this.db, skillName)) {
      skillName = `${baseName}-${counter}`;
      counter++;
    }

    // Generate description (prefer LLM-generated if available)
    const description = llmDescription || this.generateDescription(pattern.description, synthesis);

    // Determine complexity
    const complexity = determineComplexity(instructions);

    // Create skill
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
   * Generate description from pattern and synthesis
   */
  private generateDescription(
    patternDescription: string,
    synthesis: Synthesis
  ): string {
    let description = patternDescription;

    // Add resolution context
    switch (synthesis.resolution.type) {
      case 'conditional':
        description += ' Applies under specific conditions.';
        break;
      case 'abstraction':
        description += ' Abstracted from multiple variations.';
        break;
      case 'integration':
        description += ' Integrated from multiple patterns.';
        break;
    }

    // Ensure ends with punctuation
    if (!/[.!?]$/.test(description.trim())) {
      description = description.trim() + '.';
    }

    // Truncate if too long
    if (description.length > 1024) {
      description = description.substring(0, 1020) + '...';
    }

    return description;
  }

  /**
   * Write skill to file (SKILL.md + script.ts)
   */
  async writeSkillFile(skill: Skill, memories?: Memory[]): Promise<string> {
    const content = generateSkillMarkdown(skill);
    const dirPath = `${this.skillsDir}/${skill.name}`;
    const filePath = `${dirPath}/SKILL.md`;
    const scriptPath = `${dirPath}/script.ts`;

    // Ensure directory exists
    await Bun.spawn(['mkdir', '-p', dirPath]).exited;

    // Write SKILL.md
    await Bun.write(filePath, content);

    // Generate and write executable script
    if (memories && memories.length > 0) {
      const procedure = generateProcedure(
        memories,
        skill.name,
        skill.description
      );
      const script = generateExecutableScript(skill, procedure);
      await Bun.write(scriptPath, script);
      await Bun.spawn(['chmod', '+x', scriptPath]).exited;
    }

    // Update skill with file path
    updateSkill(this.db, skill.id, { filePath, status: 'validated' });

    return filePath;
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
          const memories: Memory[] = [];
          for (const memoryId of synthesis.exemplarMemoryIds) {
            const memory = getMemory(this.db, memoryId);
            if (memory) memories.push(memory);
          }
          await this.writeSkillFile(skill, memories);
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
