/**
 * Rules Writer - publishes mature patterns to Claude's native memory system
 *
 * Integrates Engram's learned patterns with .claude/rules/ for automatic loading
 */

import type { Database } from 'bun:sqlite';
import { join } from 'path';
import {
  createPublishedRule,
  getPublishedRuleByPattern,
  getPublishedRuleBySynthesis,
  updatePublishedRule,
  queryPublishedRules,
  getActivePublishedRules,
  invalidatePublishedRule,
  supersedePublishedRule,
} from '../db/queries/rules.ts';
import { getSynthesis, getThesis } from '../db/queries/dialectic.ts';
import { getPattern } from '../db/queries/patterns.ts';
import { getMemory } from '../db/queries/memories.ts';
import { querySkills } from '../db/queries/skills.ts';
import { getRulesDir, getUserRulesDir, getRulesConfig } from '../config.ts';
import {
  formatRuleContent,
  titleToFilename,
  extractPathPatterns,
  hashContent,
} from './formatter.ts';
import type {
  PublishedRule,
  PublishResult,
  RuleContent,
  RuleFrontmatter,
  EngramRuleMetadata,
  RuleScope,
  RelatedSkill,
} from '../types/rules.ts';
import type { Synthesis, Pattern } from '../types/dialectic.ts';
import type { Memory } from '../types/memory.ts';

/**
 * Options for publishing rules
 */
export interface PublishOptions {
  /** Force overwrite even if content hash matches */
  force?: boolean;
  /** Scope: project or user level */
  scope?: RuleScope;
  /** Custom title for the rule */
  title?: string;
}

export class RulesWriter {
  private db: Database;
  private projectRulesDir: string;
  private userRulesDir: string;

  constructor(db: Database, projectRulesDir?: string, userRulesDir?: string) {
    this.db = db;
    this.projectRulesDir = projectRulesDir || getRulesDir();
    this.userRulesDir = userRulesDir || getUserRulesDir();
  }

  /**
   * Publish a synthesis as a rule
   */
  async publishFromSynthesis(
    synthesisId: string,
    options: PublishOptions = {}
  ): Promise<PublishResult> {
    const synthesis = getSynthesis(this.db, synthesisId);
    if (!synthesis) {
      return { success: false, error: 'Synthesis not found', isUpdate: false };
    }

    const thesis = getThesis(this.db, synthesis.thesisId);
    if (!thesis) {
      return { success: false, error: 'Thesis not found', isUpdate: false };
    }

    const pattern = getPattern(this.db, thesis.patternId);
    if (!pattern) {
      return { success: false, error: 'Pattern not found', isUpdate: false };
    }

    // Check if this synthesis already has a published rule
    const existingRule = getPublishedRuleBySynthesis(this.db, synthesisId);

    // Get exemplar memories for context
    const memories = this.fetchMemoriesByIds(synthesis.exemplarMemoryIds);

    // Build rule content
    const content = this.buildRuleContent(synthesis, pattern, memories, options.title);

    // Determine path patterns from semantic keys
    const pathPatterns = this.extractPathPatternsFromMemories(memories);

    // Build frontmatter
    const frontmatter: RuleFrontmatter = {
      paths: pathPatterns.length > 0 ? pathPatterns : undefined,
    };

    // Build metadata
    const metadata: EngramRuleMetadata = {
      patternId: pattern.id,
      synthesisId: synthesis.id,
      version: existingRule ? existingRule.version + 1 : 1,
      updatedAt: new Date().toISOString().split('T')[0] || new Date().toISOString().substring(0, 10),
      confidence: pattern.confidence,
    };

    // Format the rule content
    const ruleContent = formatRuleContent(content, frontmatter, metadata);
    const contentHash = hashContent(ruleContent);

    // Check if update is needed
    if (existingRule && !options.force && existingRule.contentHash === contentHash) {
      return {
        success: true,
        filePath: existingRule.filePath,
        rule: existingRule,
        isUpdate: false,
      };
    }

    // Determine scope and path
    const scope = options.scope || 'project';
    const filename = titleToFilename(content.title);
    const rulesDir = scope === 'user'
      ? join(this.userRulesDir, 'engram')
      : this.projectRulesDir;
    const filePath = join(rulesDir, `${filename}.md`);

    // Write the rule file
    try {
      await this.ensureDirectoryExists(rulesDir);
      await Bun.write(filePath, ruleContent);

      // Update or create database record
      let rule: PublishedRule;
      if (existingRule) {
        // Supersede old version
        supersedePublishedRule(this.db, existingRule.id);

        // Create new version
        rule = createPublishedRule(this.db, {
          name: filename,
          patternId: pattern.id,
          synthesisId: synthesis.id,
          filePath,
          scope,
          confidence: pattern.confidence,
          contentHash,
        });

        // Update version number
        updatePublishedRule(this.db, rule.id, { version: metadata.version });
        rule.version = metadata.version;
      } else {
        rule = createPublishedRule(this.db, {
          name: filename,
          patternId: pattern.id,
          synthesisId: synthesis.id,
          filePath,
          scope,
          confidence: pattern.confidence,
          contentHash,
        });
      }

      return {
        success: true,
        filePath,
        rule,
        isUpdate: !!existingRule,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write rule file: ${error}`,
        isUpdate: false,
      };
    }
  }

  /**
   * Publish a pattern directly (without synthesis)
   */
  async publishFromPattern(
    patternId: string,
    options: PublishOptions = {}
  ): Promise<PublishResult> {
    const pattern = getPattern(this.db, patternId);
    if (!pattern) {
      return { success: false, error: 'Pattern not found', isUpdate: false };
    }

    // Check confidence threshold
    const config = getRulesConfig();
    if (pattern.confidence < config.minConfidence && !options.force) {
      return {
        success: false,
        error: `Pattern confidence (${pattern.confidence.toFixed(2)}) below threshold (${config.minConfidence})`,
        isUpdate: false,
      };
    }

    // Check if this pattern already has a published rule
    const existingRule = getPublishedRuleByPattern(this.db, patternId);

    // Get pattern memories
    const memories = this.fetchMemoriesByIds(pattern.memoryIds);

    if (memories.length < config.minSupportingMemories && !options.force) {
      return {
        success: false,
        error: `Not enough supporting memories (${memories.length}/${config.minSupportingMemories})`,
        isUpdate: false,
      };
    }

    // Build rule content from pattern
    const content = this.buildPatternRuleContent(pattern, memories, options.title);

    // Determine path patterns
    const pathPatterns = this.extractPathPatternsFromMemories(memories);

    const frontmatter: RuleFrontmatter = {
      paths: pathPatterns.length > 0 ? pathPatterns : undefined,
    };

    const metadata: EngramRuleMetadata = {
      patternId: pattern.id,
      version: existingRule ? existingRule.version + 1 : 1,
      updatedAt: new Date().toISOString().split('T')[0] || new Date().toISOString().substring(0, 10),
      confidence: pattern.confidence,
    };

    const ruleContent = formatRuleContent(content, frontmatter, metadata);
    const contentHash = hashContent(ruleContent);

    if (existingRule && !options.force && existingRule.contentHash === contentHash) {
      return {
        success: true,
        filePath: existingRule.filePath,
        rule: existingRule,
        isUpdate: false,
      };
    }

    const scope = options.scope || 'project';
    const filename = titleToFilename(content.title);
    const rulesDir = scope === 'user'
      ? join(this.userRulesDir, 'engram')
      : this.projectRulesDir;
    const filePath = join(rulesDir, `${filename}.md`);

    try {
      await this.ensureDirectoryExists(rulesDir);
      await Bun.write(filePath, ruleContent);

      let rule: PublishedRule;
      if (existingRule) {
        supersedePublishedRule(this.db, existingRule.id);
        rule = createPublishedRule(this.db, {
          name: filename,
          patternId: pattern.id,
          filePath,
          scope,
          confidence: pattern.confidence,
          contentHash,
        });
        updatePublishedRule(this.db, rule.id, { version: metadata.version });
        rule.version = metadata.version;
      } else {
        rule = createPublishedRule(this.db, {
          name: filename,
          patternId: pattern.id,
          filePath,
          scope,
          confidence: pattern.confidence,
          contentHash,
        });
      }

      return { success: true, filePath, rule, isUpdate: !!existingRule };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write rule file: ${error}`,
        isUpdate: false,
      };
    }
  }

  /**
   * Check if a synthesis qualifies for rule publishing
   */
  isPublishReady(synthesisId: string): { ready: boolean; reason?: string } {
    const synthesis = getSynthesis(this.db, synthesisId);
    if (!synthesis) {
      return { ready: false, reason: 'Synthesis not found' };
    }

    const thesis = getThesis(this.db, synthesis.thesisId);
    if (!thesis) {
      return { ready: false, reason: 'Thesis not found' };
    }

    const pattern = getPattern(this.db, thesis.patternId);
    if (!pattern) {
      return { ready: false, reason: 'Pattern not found' };
    }

    const config = getRulesConfig();

    // Check confidence
    if (pattern.confidence < config.minConfidence) {
      return {
        ready: false,
        reason: `Confidence ${pattern.confidence.toFixed(2)} below threshold ${config.minConfidence}`,
      };
    }

    // Check supporting memories
    if (synthesis.exemplarMemoryIds.length < config.minSupportingMemories) {
      return {
        ready: false,
        reason: `${synthesis.exemplarMemoryIds.length} memories, need ${config.minSupportingMemories}`,
      };
    }

    // Rejection resolutions don't make good rules
    if (synthesis.resolution.type === 'rejection') {
      return { ready: false, reason: 'Rejection resolutions are not published' };
    }

    return { ready: true };
  }

  /**
   * Auto-publish all qualifying syntheses
   */
  async autoPublishAll(): Promise<{
    published: PublishResult[];
    skipped: Array<{ synthesisId: string; reason: string }>;
  }> {
    const config = getRulesConfig();
    if (!config.autoPublish) {
      return { published: [], skipped: [] };
    }

    // Find all syntheses that could be published
    const stmt = this.db.query<{ id: string }, []>(`
      SELECT s.id
      FROM syntheses s
      JOIN theses t ON s.thesis_id = t.id
      JOIN patterns p ON t.pattern_id = p.id
      WHERE p.confidence >= ?
        AND s.skill_candidate = 1
      ORDER BY p.confidence DESC
    `);

    const rows = stmt.all();
    const published: PublishResult[] = [];
    const skipped: Array<{ synthesisId: string; reason: string }> = [];

    for (const row of rows) {
      const readiness = this.isPublishReady(row.id);
      if (!readiness.ready) {
        skipped.push({ synthesisId: row.id, reason: readiness.reason || 'Unknown' });
        continue;
      }

      // Check if already published
      const existing = getPublishedRuleBySynthesis(this.db, row.id);
      if (existing) {
        skipped.push({ synthesisId: row.id, reason: 'Already published' });
        continue;
      }

      const result = await this.publishFromSynthesis(row.id);
      if (result.success) {
        published.push(result);
      } else {
        skipped.push({ synthesisId: row.id, reason: result.error || 'Publish failed' });
      }
    }

    return { published, skipped };
  }

  /**
   * Invalidate a published rule (e.g., when pattern contradicted)
   */
  async invalidateRule(ruleId: string): Promise<boolean> {
    const rule = invalidatePublishedRule(this.db, ruleId);
    if (!rule) return false;

    // Optionally delete the file or add a deprecation notice
    try {
      const content = await Bun.file(rule.filePath).text();
      const deprecated = `> **INVALIDATED**: This rule has been invalidated due to new contradicting evidence.\n\n${content}`;
      await Bun.write(rule.filePath, deprecated);
      return true;
    } catch {
      return true; // Rule record updated even if file update failed
    }
  }

  /**
   * Remove a published rule completely
   */
  async removeRule(ruleId: string): Promise<boolean> {
    const rule = invalidatePublishedRule(this.db, ruleId);
    if (!rule) return false;

    try {
      const file = Bun.file(rule.filePath);
      if (await file.exists()) {
        await Bun.spawn(['rm', rule.filePath]).exited;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all active published rules
   */
  getActiveRules(): PublishedRule[] {
    return getActivePublishedRules(this.db);
  }

  /**
   * Get rules by scope
   */
  getRulesByScope(scope: RuleScope): PublishedRule[] {
    return queryPublishedRules(this.db, { scope, status: 'active' });
  }

  /**
   * Get statistics about published rules
   */
  getStats(): {
    total: number;
    active: number;
    invalidated: number;
    byScope: Record<RuleScope, number>;
    avgConfidence: number;
  } {
    const all = queryPublishedRules(this.db, {});
    const active = all.filter(r => r.status === 'active');
    const invalidated = all.filter(r => r.status === 'invalidated');

    const byScope: Record<RuleScope, number> = { project: 0, user: 0 };
    let totalConfidence = 0;

    for (const rule of active) {
      byScope[rule.scope]++;
      totalConfidence += rule.confidence;
    }

    return {
      total: all.length,
      active: active.length,
      invalidated: invalidated.length,
      byScope,
      avgConfidence: active.length > 0 ? totalConfidence / active.length : 0,
    };
  }

  // Private helper methods

  private fetchMemoriesByIds(memoryIds: string[]): Memory[] {
    const memories: Memory[] = [];
    for (const id of memoryIds) {
      const memory = getMemory(this.db, id);
      if (memory) memories.push(memory);
    }
    return memories;
  }

  private extractPathPatternsFromMemories(memories: Memory[]): string[] {
    const allKeys: Array<{ key: string; value: string }> = [];
    for (const mem of memories) {
      for (const sk of mem.metadata.semanticKeys) {
        allKeys.push({ key: sk.key, value: sk.value });
      }
    }
    return extractPathPatterns(allKeys);
  }

  private buildRuleContent(
    synthesis: Synthesis,
    pattern: Pattern,
    memories: Memory[],
    customTitle?: string
  ): RuleContent {
    // Extract tool names from memories
    const tools = new Set<string>();
    for (const mem of memories) {
      if (mem.metadata.toolName) {
        tools.add(mem.metadata.toolName);
      }
    }

    // Count unique sessions
    const sessions = new Set(memories.map(m => m.metadata.sessionId));

    // Build title from pattern name
    const title = customTitle || this.formatTitle(pattern.name);

    // Build when to apply based on resolution type
    const whenToApply: string[] = [];
    if (synthesis.resolution.type === 'conditional' && synthesis.resolution.conditions) {
      whenToApply.push(...synthesis.resolution.conditions);
    } else if (synthesis.resolution.type === 'integration') {
      whenToApply.push(`When working with ${pattern.name.replace(/-/g, ' ')} patterns`);
    } else if (synthesis.resolution.type === 'abstraction' && synthesis.resolution.abstraction) {
      whenToApply.push(synthesis.resolution.abstraction);
    }

    // Look up associated skill for this synthesis
    const relatedSkill = this.findRelatedSkill(synthesis.id, pattern.id);

    return {
      title,
      summary: synthesis.content,
      details: pattern.description !== pattern.name ? pattern.description : undefined,
      whenToApply: whenToApply.length > 0 ? whenToApply : undefined,
      relatedTools: tools.size > 0 ? [...tools] : undefined,
      sessionCount: sessions.size,
      relatedSkill,
    };
  }

  /**
   * Find a skill associated with the given synthesis or pattern
   */
  private findRelatedSkill(synthesisId: string, patternId: string): RelatedSkill | undefined {
    // Query skills that match this synthesis or pattern
    const allSkills = querySkills(this.db, {});

    // First try to find by synthesis ID (most specific)
    let skill = allSkills.find(s => s.sourceSynthesisId === synthesisId);

    // Fall back to pattern ID
    if (!skill) {
      skill = allSkills.find(s => s.sourcePatternId === patternId);
    }

    if (!skill) {
      return undefined;
    }

    return {
      name: skill.name,
      description: skill.description,
      triggerPhrases: skill.instructions.triggerPhrases,
    };
  }

  private buildPatternRuleContent(
    pattern: Pattern,
    memories: Memory[],
    customTitle?: string
  ): RuleContent {
    const tools = new Set<string>();
    for (const mem of memories) {
      if (mem.metadata.toolName) {
        tools.add(mem.metadata.toolName);
      }
    }

    const sessions = new Set(memories.map(m => m.metadata.sessionId));
    const title = customTitle || this.formatTitle(pattern.name);

    return {
      title,
      summary: pattern.description,
      relatedTools: tools.size > 0 ? [...tools] : undefined,
      sessionCount: sessions.size,
    };
  }

  private formatTitle(name: string): string {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private async ensureDirectoryExists(dir: string): Promise<void> {
    await Bun.spawn(['mkdir', '-p', dir]).exited;
  }
}

export * from './formatter.ts';
