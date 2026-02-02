/**
 * Dialectic Engine - Hegelian evolution of patterns
 */

import type { Database } from 'bun:sqlite';
import { getDatabase } from '../db/index.ts';
import {
  getPattern,
  queryPatterns,
  getPatternsWithEmbeddings,
  updatePattern,
} from '../db/queries/patterns.ts';
import {
  getThesis,
  getActiveTheses,
  createDialecticCycle,
  getCycleByPattern,
  getActiveCycles,
} from '../db/queries/dialectic.ts';
import { embed, cosineSimilarity } from '../embedding/index.ts';
import {
  findOrCreatePattern,
  createPatternThesis,
  getActiveThesisForPattern,
  generateThesisContent,
  addThesisEvidence,
} from './thesis.ts';
import {
  detectContradiction,
  createContradictionAntithesis,
  getThesisAntitheses,
  isReadyForSynthesis,
  type ContradictionResult,
} from './antithesis.ts';
import {
  synthesize,
  evaluateForSkillGeneration,
  getSkillCandidatesReadyForGeneration,
} from './synthesis.ts';
import type {
  Pattern,
  Thesis,
  Antithesis,
  Synthesis,
  DialecticCycle,
} from '../types/dialectic.ts';
import type { Memory } from '../types/memory.ts';

/**
 * Dialectic engine configuration
 */
export interface DialecticConfig {
  similarityThreshold: number;
  minMemoriesForPattern: number;
  minAntithesesForSynthesis: number;
  autoSynthesize: boolean;
}

const DEFAULT_CONFIG: DialecticConfig = {
  similarityThreshold: 0.7,
  minMemoriesForPattern: 3,
  minAntithesesForSynthesis: 1,
  autoSynthesize: true,
};

export class DialecticEngine {
  private db: Database;
  private config: DialecticConfig;

  constructor(db: Database, config: Partial<DialecticConfig> = {}) {
    this.db = db;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process a new memory through the dialectic system
   */
  async processMemory(memory: Memory): Promise<{
    pattern: Pattern | null;
    thesis: Thesis | null;
    antithesis: Antithesis | null;
    synthesis: Synthesis | null;
    action: 'created_pattern' | 'added_evidence' | 'created_antithesis' | 'synthesized' | 'no_action';
  }> {
    // Find related patterns
    let relatedPattern = await this.findRelatedPattern(memory);

    if (!relatedPattern) {
      // No existing pattern - try to create one from similar memories
      const created = await this.maybeCreatePattern(memory);
      if (created) {
        return {
          pattern: created.pattern,
          thesis: created.thesis,
          antithesis: null,
          synthesis: null,
          action: 'created_pattern',
        };
      }

      // Not enough similar memories yet
      return {
        pattern: null,
        thesis: null,
        antithesis: null,
        synthesis: null,
        action: 'no_action',
      };
    }

    // Get active thesis for pattern
    const thesis = getActiveThesisForPattern(this.db, relatedPattern.id);

    if (!thesis) {
      // Pattern exists but no thesis - unusual state
      return {
        pattern: relatedPattern,
        thesis: null,
        antithesis: null,
        synthesis: null,
        action: 'no_action',
      };
    }

    // Check for contradiction
    const contradiction = await detectContradiction(this.db, thesis, memory);

    if (contradiction.detected) {
      // Create antithesis (uses LLM when available)
      const antithesis = await createContradictionAntithesis(
        this.db,
        thesis.id,
        contradiction,
        memory.id
      );

      // Check if ready for synthesis
      if (
        this.config.autoSynthesize &&
        isReadyForSynthesis(this.db, thesis.id, this.config.minAntithesesForSynthesis)
      ) {
        const synthesis = await synthesize(this.db, thesis.id);

        if (synthesis) {
          evaluateForSkillGeneration(this.db, synthesis.id);

          return {
            pattern: relatedPattern,
            thesis,
            antithesis,
            synthesis,
            action: 'synthesized',
          };
        }
      }

      return {
        pattern: relatedPattern,
        thesis,
        antithesis,
        synthesis: null,
        action: 'created_antithesis',
      };
    }

    // No contradiction - add as supporting evidence
    addThesisEvidence(this.db, thesis.id, memory.id);

    // Update pattern confidence
    const newConfidence = Math.min(1.0, relatedPattern.confidence + 0.05);
    updatePattern(this.db, relatedPattern.id, { confidence: newConfidence });

    return {
      pattern: relatedPattern,
      thesis,
      antithesis: null,
      synthesis: null,
      action: 'added_evidence',
    };
  }

  /**
   * Find a pattern related to a memory
   */
  async findRelatedPattern(memory: Memory): Promise<Pattern | null> {
    if (!memory.embedding) return null;

    const patterns = getPatternsWithEmbeddings(this.db);

    let bestMatch: Pattern | null = null;
    let bestSimilarity = 0;

    for (const pattern of patterns) {
      if (pattern.embedding) {
        const similarity = cosineSimilarity(memory.embedding, pattern.embedding);
        if (similarity >= this.config.similarityThreshold && similarity > bestSimilarity) {
          bestMatch = pattern;
          bestSimilarity = similarity;
        }
      }
    }

    return bestMatch;
  }

  /**
   * Try to create a pattern if we have enough similar memories
   */
  async maybeCreatePattern(memory: Memory): Promise<{ pattern: Pattern; thesis: Thesis } | null> {
    if (!memory.embedding) return null;

    // Import here to avoid circular dependency
    const { getMemoriesWithEmbeddings } = await import('../db/queries/memories.ts');

    // Find similar memories
    const allMemories = getMemoriesWithEmbeddings(this.db, {
      types: ['working', 'short_term', 'long_term'],
    });

    const similarMemories: Memory[] = [memory];

    for (const candidate of allMemories) {
      if (candidate.id === memory.id || !candidate.embedding) continue;

      const similarity = cosineSimilarity(memory.embedding, candidate.embedding);

      // Use a slightly lower threshold for grouping
      if (similarity >= this.config.similarityThreshold - 0.1) {
        similarMemories.push(candidate);
      }
    }

    // Need enough similar memories to form a pattern
    if (similarMemories.length < this.config.minMemoriesForPattern) {
      return null;
    }

    // Generate pattern name from common characteristics
    const toolNames = [...new Set(
      similarMemories
        .map(m => m.metadata.toolName)
        .filter(Boolean)
    )];

    const name = toolNames.length > 0
      ? `${toolNames.join('-')}-pattern`
      : `pattern-${Date.now()}`;

    const description = `Pattern detected from ${similarMemories.length} similar operations using ${toolNames.join(', ') || 'various tools'}`;

    // Create the pattern
    const { pattern, thesis } = await this.createPatternFromMemories(
      similarMemories,
      name,
      description
    );

    console.error(`[Engram] Created pattern: ${name} (${similarMemories.length} memories)`);

    return { pattern, thesis };
  }

  /**
   * Create a new pattern from a group of related memories
   */
  async createPatternFromMemories(
    memories: Memory[],
    name: string,
    description: string
  ): Promise<{ pattern: Pattern; thesis: Thesis; cycle: DialecticCycle }> {
    // Create or find pattern
    const pattern = await findOrCreatePattern(this.db, memories, name, description);

    // Generate thesis content (uses LLM when available)
    const thesisContent = await generateThesisContent(memories);

    // Create thesis
    const thesis = createPatternThesis(
      this.db,
      pattern.id,
      thesisContent,
      memories.map((m) => m.id)
    );

    // Create dialectic cycle
    const cycle = createDialecticCycle(this.db, pattern.id, thesis.id);

    return { pattern, thesis, cycle };
  }

  /**
   * Manually trigger synthesis for a thesis
   */
  async triggerSynthesis(thesisId: string): Promise<Synthesis | null> {
    return synthesize(this.db, thesisId);
  }

  /**
   * Get all active dialectic cycles
   */
  getActiveCycles(): DialecticCycle[] {
    return getActiveCycles(this.db);
  }

  /**
   * Get all skill candidates
   */
  getSkillCandidates(): Synthesis[] {
    return getSkillCandidatesReadyForGeneration(this.db);
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    totalPatterns: number;
    activeTheses: number;
    activeCycles: number;
    skillCandidates: number;
    patternsByStage: {
      conceptual: number;
      semantic: number;
      syntactic: number;
    };
  } {
    const patterns = queryPatterns(this.db);
    const activeTheses = getActiveTheses(this.db);
    const activeCycles = getActiveCycles(this.db);
    const skillCandidates = getSkillCandidatesReadyForGeneration(this.db);

    const patternsByStage = {
      conceptual: patterns.filter((p) => p.stage === 'conceptual').length,
      semantic: patterns.filter((p) => p.stage === 'semantic').length,
      syntactic: patterns.filter((p) => p.stage === 'syntactic').length,
    };

    return {
      totalPatterns: patterns.length,
      activeTheses: activeTheses.length,
      activeCycles: activeCycles.length,
      skillCandidates: skillCandidates.length,
      patternsByStage,
    };
  }
}

// Export sub-modules
export * from './thesis.ts';
export * from './antithesis.ts';
export * from './synthesis.ts';
