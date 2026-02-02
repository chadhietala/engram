/**
 * Memory Manager - unified interface for memory operations
 */

import type { Database } from 'bun:sqlite';
import { getDatabase, initializeDatabase } from '../db/index.ts';
import {
  createMemory,
  getMemory,
  updateMemory,
  deleteMemory,
  queryMemories,
} from '../db/queries/memories.ts';
import {
  createSession,
  getSession,
  endSession,
  incrementMemoryCount,
} from '../db/queries/sessions.ts';
import {
  encodeToolUsage,
  encodePrompt,
  encodeObservation,
  type ToolUsageData,
} from './processing/encoder.ts';
import {
  retrieveMemories,
  retrieveContextMemories,
  formatMemoriesForContext,
  findRelatedMemories,
} from './processing/retriever.ts';
import {
  consolidateSession,
  consolidateWorkingToShortTerm,
  consolidateShortTermToLongTerm,
  applyMemoryDecay,
  strengthenMemory,
  weakenMemory,
  getConsolidationStats,
} from './processing/consolidator.ts';
import type {
  Memory,
  MemoryFilter,
  MemoryCreateInput,
  MemoryUpdateInput,
  RetrievalResult,
} from '../types/memory.ts';

export class MemoryManager {
  private db: Database;
  private currentSessionId: string | null = null;

  constructor(dbPath?: string) {
    this.db = initializeDatabase(dbPath);
  }

  // ============= Session Management =============

  startSession(sessionId: string): void {
    this.currentSessionId = sessionId;
    createSession(this.db, sessionId);
  }

  endCurrentSession(): void {
    if (this.currentSessionId) {
      endSession(this.db, this.currentSessionId);
      this.currentSessionId = null;
    }
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  // ============= Memory Encoding =============

  async encodeToolUsage(
    sessionId: string,
    data: ToolUsageData
  ): Promise<Memory> {
    const memory = await encodeToolUsage(this.db, sessionId, data);
    incrementMemoryCount(this.db, sessionId);
    return memory;
  }

  async encodePrompt(sessionId: string, prompt: string): Promise<Memory> {
    const memory = await encodePrompt(this.db, sessionId, prompt);
    incrementMemoryCount(this.db, sessionId);
    return memory;
  }

  async encodeObservation(
    sessionId: string,
    observation: string,
    tags?: string[]
  ): Promise<Memory> {
    const memory = await encodeObservation(this.db, sessionId, observation, tags);
    incrementMemoryCount(this.db, sessionId);
    return memory;
  }

  // ============= Memory Retrieval =============

  async retrieveMemories(
    query: string,
    filter?: MemoryFilter
  ): Promise<RetrievalResult[]> {
    return retrieveMemories(this.db, query, filter);
  }

  async retrieveContextMemories(
    prompt: string,
    sessionId?: string,
    maxMemories?: number
  ): Promise<RetrievalResult[]> {
    return retrieveContextMemories(
      this.db,
      prompt,
      sessionId ?? this.currentSessionId ?? undefined,
      maxMemories
    );
  }

  formatForContext(results: RetrievalResult[]): string {
    return formatMemoriesForContext(results);
  }

  async findRelated(memory: Memory, maxRelated?: number): Promise<RetrievalResult[]> {
    return findRelatedMemories(this.db, memory, maxRelated);
  }

  // ============= Memory CRUD =============

  createMemory(input: MemoryCreateInput, embedding?: Float32Array): Memory {
    return createMemory(this.db, input, embedding);
  }

  getMemory(id: string): Memory | null {
    return getMemory(this.db, id);
  }

  updateMemory(id: string, input: MemoryUpdateInput, embedding?: Float32Array): Memory | null {
    return updateMemory(this.db, id, input, embedding);
  }

  deleteMemory(id: string): boolean {
    return deleteMemory(this.db, id);
  }

  queryMemories(filter: MemoryFilter): Memory[] {
    return queryMemories(this.db, filter);
  }

  // ============= Consolidation =============

  consolidateSession(sessionId: string): {
    workingPromoted: Memory[];
    shortTermPromoted: Memory[];
    decayedCount: number;
  } {
    return consolidateSession(this.db, sessionId);
  }

  consolidateWorkingToShortTerm(sessionId: string): Memory[] {
    return consolidateWorkingToShortTerm(this.db, sessionId);
  }

  consolidateShortTermToLongTerm(): Memory[] {
    return consolidateShortTermToLongTerm(this.db);
  }

  applyDecay(): number {
    return applyMemoryDecay(this.db);
  }

  strengthenMemory(memoryId: string, amount?: number): Memory | null {
    return strengthenMemory(this.db, memoryId, amount);
  }

  weakenMemory(memoryId: string, amount?: number): Memory | null {
    return weakenMemory(this.db, memoryId, amount);
  }

  // ============= Statistics =============

  getStats(): {
    working: number;
    shortTerm: number;
    longTerm: number;
    collective: number;
    total: number;
  } {
    return getConsolidationStats(this.db);
  }

  // ============= Direct DB Access =============

  getDatabase(): Database {
    return this.db;
  }
}

// Export processing modules
export * from './processing/index.ts';
export * from './working.ts';
export * from './short-term.ts';
export * from './long-term.ts';
