/**
 * Stage Pipeline - manages memory evolution through stages
 */

import type { Database } from 'bun:sqlite';
import { queryMemories, updateMemory } from '../db/queries/memories.ts';
import { queryPatterns, updatePattern } from '../db/queries/patterns.ts';
import { findRelatedMemories } from '../memory/processing/retriever.ts';
import type { Memory, MemoryStage } from '../types/memory.ts';
import type { Pattern } from '../types/dialectic.ts';

import {
  meetsConceptualRequirements,
  getConceptualReadyForTransition,
  enrichConceptualMemory,
  processConceptualBatch,
} from './conceptual.ts';

import {
  meetsSemanticRequirements,
  getSemanticReadyForTransition,
  enrichSemanticMemory,
  inferRelationships,
  extractSemanticStructure,
} from './semantic.ts';

import {
  meetsSyntacticRequirements,
  getSyntacticReadyForSkillExtraction,
  extractActionSequence,
  generateProcedure,
  addSyntacticMetadata,
  validateProcedure,
} from './syntactic.ts';

/**
 * Stage transition result
 */
export interface StageTransitionResult {
  memory: Memory;
  previousStage: MemoryStage;
  newStage: MemoryStage;
  reason: string;
}

/**
 * Pipeline processing result
 */
export interface PipelineResult {
  processed: number;
  transitioned: StageTransitionResult[];
  enriched: number;
  errors: string[];
}

/**
 * Stage Pipeline class
 */
export class StagePipeline {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Advance a memory to the next stage if eligible
   */
  async advanceStage(memoryId: string): Promise<StageTransitionResult | null> {
    const memories = queryMemories(this.db, {});
    const memory = memories.find((m) => m.id === memoryId);
    if (!memory) return null;

    const currentStage = memory.metadata.stage;

    switch (currentStage) {
      case 'conceptual':
        if (meetsConceptualRequirements(memory)) {
          return this.transitionToSemantic(memory);
        }
        break;

      case 'semantic':
        if (meetsSemanticRequirements(memory)) {
          return this.transitionToSyntactic(memory);
        }
        break;

      case 'syntactic':
        // Already at highest stage
        return null;
    }

    return null;
  }

  /**
   * Transition memory from conceptual to semantic
   */
  private async transitionToSemantic(
    memory: Memory
  ): Promise<StageTransitionResult | null> {
    // Get related memories for enrichment
    const related = await findRelatedMemories(this.db, memory, 5);
    const relatedMemories = related.map((r) => r.memory);

    // Enrich with semantic analysis
    enrichSemanticMemory(this.db, memory, relatedMemories);

    // Update stage
    const updated = updateMemory(this.db, memory.id, {
      metadata: {
        ...memory.metadata,
        stage: 'semantic',
      },
    });

    if (!updated) return null;

    return {
      memory: updated,
      previousStage: 'conceptual',
      newStage: 'semantic',
      reason: 'Met conceptual stage requirements',
    };
  }

  /**
   * Transition memory from semantic to syntactic
   */
  private async transitionToSyntactic(
    memory: Memory
  ): Promise<StageTransitionResult | null> {
    // Generate procedure from related memories
    const related = await findRelatedMemories(this.db, memory, 10);
    const relatedMemories = related.map((r) => r.memory);

    // Include the memory itself
    const allMemories = [memory, ...relatedMemories];

    // Generate procedure
    const procedure = generateProcedure(
      allMemories,
      `procedure_${memory.id.substring(0, 8)}`,
      memory.content.substring(0, 100)
    );

    // Add syntactic metadata (this updates the memory)
    const withSyntactic = addSyntacticMetadata(this.db, memory.id, procedure);

    // Update stage using the refreshed metadata
    const currentMetadata = withSyntactic?.metadata || memory.metadata;
    const updated = updateMemory(this.db, memory.id, {
      metadata: {
        ...currentMetadata,
        stage: 'syntactic',
      },
    });

    if (!updated) return null;

    return {
      memory: updated,
      previousStage: 'semantic',
      newStage: 'syntactic',
      reason: 'Met semantic stage requirements',
    };
  }

  /**
   * Process all eligible memories through the pipeline
   */
  async processAll(): Promise<PipelineResult> {
    const result: PipelineResult = {
      processed: 0,
      transitioned: [],
      enriched: 0,
      errors: [],
    };

    // Process conceptual → semantic transitions
    const conceptualReady = getConceptualReadyForTransition(this.db);
    for (const memory of conceptualReady) {
      try {
        const transition = await this.transitionToSemantic(memory);
        if (transition) {
          result.transitioned.push(transition);
        }
        result.processed++;
      } catch (error) {
        result.errors.push(`Failed to transition ${memory.id}: ${error}`);
      }
    }

    // Process semantic → syntactic transitions
    const semanticReady = getSemanticReadyForTransition(this.db);
    for (const memory of semanticReady) {
      try {
        const transition = await this.transitionToSyntactic(memory);
        if (transition) {
          result.transitioned.push(transition);
        }
        result.processed++;
      } catch (error) {
        result.errors.push(`Failed to transition ${memory.id}: ${error}`);
      }
    }

    // Enrich conceptual memories
    const enriched = await processConceptualBatch(this.db, 20);
    result.enriched = enriched.length;

    // Advance pattern stages based on associated memories
    await this.advancePatternStages();

    return result;
  }

  /**
   * Advance pattern stages based on their associated memories and confidence
   * Patterns only advance forward, never backward.
   *
   * Stage advancement criteria:
   * - conceptual → semantic: 3+ memories, confidence >= 0.5
   * - semantic → syntactic: 5+ memories, confidence >= 0.7
   */
  async advancePatternStages(): Promise<{ advanced: number; patterns: string[] }> {
    const patterns = queryPatterns(this.db);
    const advanced: string[] = [];

    const stageOrder = { conceptual: 0, semantic: 1, syntactic: 2 };

    for (const pattern of patterns) {
      const memoryCount = pattern.memoryIds.length;
      const targetStage = this.determinePatternStage(pattern, memoryCount);

      // Only advance, never downgrade
      if (stageOrder[targetStage] > stageOrder[pattern.stage]) {
        updatePattern(this.db, pattern.id, { stage: targetStage });
        advanced.push(`${pattern.name}: ${pattern.stage} → ${targetStage}`);
        console.error(`[Stages] Pattern ${pattern.name} advanced: ${pattern.stage} → ${targetStage}`);
      }
    }

    return { advanced: advanced.length, patterns: advanced };
  }

  /**
   * Determine what stage a pattern should be at based on its metrics
   */
  private determinePatternStage(
    pattern: Pattern,
    memoryCount: number
  ): 'conceptual' | 'semantic' | 'syntactic' {
    // Syntactic: mature pattern with high confidence and many examples
    if (memoryCount >= 5 && pattern.confidence >= 0.7) {
      return 'syntactic';
    }

    // Semantic: developing pattern with moderate confidence
    if (memoryCount >= 3 && pattern.confidence >= 0.5) {
      return 'semantic';
    }

    // Conceptual: early-stage pattern
    return 'conceptual';
  }

  /**
   * Get stage statistics
   */
  getStageStats(): {
    conceptual: { total: number; ready: number };
    semantic: { total: number; ready: number };
    syntactic: { total: number; readyForSkill: number };
  } {
    const conceptualMemories = queryMemories(this.db, { stage: 'conceptual' });
    const semanticMemories = queryMemories(this.db, { stage: 'semantic' });
    const syntacticMemories = queryMemories(this.db, { stage: 'syntactic' });

    const conceptualReady = getConceptualReadyForTransition(this.db);
    const semanticReady = getSemanticReadyForTransition(this.db);
    const syntacticReady = getSyntacticReadyForSkillExtraction(this.db);

    return {
      conceptual: {
        total: conceptualMemories.length,
        ready: conceptualReady.length,
      },
      semantic: {
        total: semanticMemories.length,
        ready: semanticReady.length,
      },
      syntactic: {
        total: syntacticMemories.length,
        readyForSkill: syntacticReady.length,
      },
    };
  }
}

// Export sub-modules
export * from './conceptual.ts';
export * from './semantic.ts';
export * from './syntactic.ts';
