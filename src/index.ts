/**
 * Engram: Memory Evolution System
 *
 * A memory system enabling AI agents to evolve from System 2 (deliberate)
 * to System 1 (automatic) thinking through Hegelian dialectic, ultimately
 * generating Claude Skills from learned patterns.
 */

// Core types
export * from './types/index.ts';

// Database
export { getDatabase, initializeDatabase, closeDatabase, resetDatabase } from './db/index.ts';
export * from './db/queries/index.ts';

// Embedding
export {
  embed,
  embedBatch,
  cosineSimilarity,
  findTopKSimilar,
  getEmbeddingDimension,
  preloadModel,
} from './embedding/index.ts';

// Memory
export { MemoryManager } from './memory/index.ts';
export * from './memory/processing/index.ts';
export * from './memory/working.ts';
export * from './memory/short-term.ts';
export * from './memory/long-term.ts';

// Dialectic
export { DialecticEngine } from './dialectic/index.ts';
export * from './dialectic/thesis.ts';
export * from './dialectic/antithesis.ts';
export * from './dialectic/synthesis.ts';

// Stages
export { StagePipeline } from './stages/index.ts';
export * from './stages/conceptual.ts';
export * from './stages/semantic.ts';
export * from './stages/syntactic.ts';

// Skill Generator
export { SkillGenerator } from './skill-generator/index.ts';
export * from './skill-generator/validator.ts';
export * from './skill-generator/template.ts';

// Hooks
export { handleHook, handleHookFromStdin } from './hooks/index.ts';
