/**
 * Background Worker Service
 * Handles heavy processing asynchronously so hooks can return instantly
 * Includes LLM-powered analysis via Claude Agent SDK
 */

import { initializeDatabase } from '../db/index.ts';
import { embed } from '../embedding/index.ts';
import { createMemory, updateMemory, getMemory, queryMemories } from '../db/queries/memories.ts';
import { DialecticEngine } from '../dialectic/index.ts';
import { StagePipeline } from '../stages/index.ts';
import { SkillGenerator } from '../skill-generator/index.ts';
import { analyzePattern, analyzeContradiction, analyzeSynthesis } from '../llm/index.ts';
import type { Memory } from '../types/memory.ts';

const PORT = 37778;

interface QueuedTask {
  id: string;
  type: 'memory' | 'dialectic' | 'stages' | 'skills' | 'llm-analysis';
  data: unknown;
  timestamp: number;
}

// Task queue
const queue: QueuedTask[] = [];
let isProcessing = false;

// Stats
const stats = {
  queued: 0,
  processed: 0,
  errors: 0,
  lastProcessed: 0,
};

// Initialize database
const db = initializeDatabase();
const dialecticEngine = new DialecticEngine(db);
const stagePipeline = new StagePipeline(db);
const skillGenerator = new SkillGenerator(db);

/**
 * Process queued tasks
 */
async function processQueue(): Promise<void> {
  if (isProcessing || queue.length === 0) return;

  isProcessing = true;

  while (queue.length > 0) {
    const task = queue.shift();
    if (!task) continue;

    try {
      switch (task.type) {
        case 'memory':
          await processMemoryTask(task.data as MemoryTaskData);
          break;
        case 'dialectic':
          await processDialecticTask(task.data as { memoryId: string });
          break;
        case 'stages':
          await processStagesTask();
          break;
        case 'skills':
          await processSkillsTask();
          break;
        case 'llm-analysis':
          await processLLMAnalysisTask(task.data as { memoryIds: string[] });
          break;
      }
      stats.processed++;
      stats.lastProcessed = Date.now();
    } catch (error) {
      console.error(`[Worker] Error processing task ${task.type}:`, error);
      stats.errors++;
    }
  }

  isProcessing = false;
}

interface MemoryTaskData {
  memoryId: string;
  content: string;
  generateEmbedding: boolean;
  runDialectic: boolean;
}

/**
 * Process memory task - generate embedding and associations
 */
async function processMemoryTask(data: MemoryTaskData): Promise<void> {
  const { memoryId, content, generateEmbedding, runDialectic } = data;

  // Generate embedding if needed
  if (generateEmbedding) {
    try {
      const embedding = await embed(content, db);
      const memory = getMemory(db, memoryId);
      if (memory) {
        updateMemory(db, memoryId, {}, embedding);  // embedding is 4th param, not in input object
        console.error(`[Worker] Embedded memory ${memoryId.slice(0, 8)}...`);
      } else {
        console.error(`[Worker] Memory ${memoryId.slice(0, 8)}... not found, skipping embedding`);
      }
    } catch (err) {
      console.error(`[Worker] Embedding error for ${memoryId.slice(0, 8)}...:`, err);
    }
  }

  // Run dialectic processing if needed
  if (runDialectic) {
    const memory = getMemory(db, memoryId);
    if (memory) {
      await dialecticEngine.processMemory(memory);
    }
  }

  // Queue LLM analysis if we have enough related memories
  const memory = getMemory(db, memoryId);
  if (memory) {
    const sessionMemories = queryMemories(db, {
      sessionId: memory.metadata.sessionId,
      limit: 10,
    });

    // Analyze patterns every 5 memories in a session
    if (sessionMemories.length >= 5 && sessionMemories.length % 5 === 0) {
      enqueue({
        type: 'llm-analysis',
        data: { memoryIds: sessionMemories.map(m => m.id) },
      });
    }
  }
}

/**
 * Process dialectic task
 */
async function processDialecticTask(data: { memoryId: string }): Promise<void> {
  const memory = getMemory(db, data.memoryId);
  if (memory) {
    await dialecticEngine.processMemory(memory);
  }
}

/**
 * Process stages task - run stage pipeline
 */
async function processStagesTask(): Promise<void> {
  await stagePipeline.processAll();
}

/**
 * Process skills task - generate pending skills
 */
async function processSkillsTask(): Promise<void> {
  await skillGenerator.generateAllPending();
}

/**
 * Process LLM analysis task - enrich patterns with Claude insights
 */
async function processLLMAnalysisTask(data: { memoryIds: string[] }): Promise<void> {
  const memories = data.memoryIds
    .map(id => getMemory(db, id))
    .filter((m): m is Memory => m !== null);

  if (memories.length < 3) return;

  console.error(`[Worker] Running LLM analysis on ${memories.length} memories...`);

  try {
    // Analyze pattern
    const analysis = await analyzePattern(memories);

    console.error(`[Worker] LLM insight: ${analysis.insight}`);
    console.error(`[Worker] Concepts: ${analysis.concepts.join(', ')}`);
    console.error(`[Worker] Type: ${analysis.observationType}, Confidence: ${analysis.confidence}`);

    // Update memories with LLM-derived tags
    for (const memory of memories) {
      const existingTags = memory.metadata.tags;
      const newTags = [...new Set([...existingTags, ...analysis.concepts])];

      if (newTags.length > existingTags.length) {
        updateMemory(db, memory.id, {
          metadata: {
            ...memory.metadata,
            tags: newTags.slice(0, 20), // Limit tags
          },
        });
      }
    }

    // Store the insight as an observation memory
    if (analysis.confidence >= 0.6) {
      const firstMemory = memories[0];
      if (firstMemory) {
        const embedding = await embed(analysis.insight, db);

        const observationInput = {
          type: 'working' as const,
          content: `LLM Insight: ${analysis.insight}`,
          metadata: {
            sessionId: firstMemory.metadata.sessionId,
            source: 'observation' as const,
            tags: ['llm-insight', analysis.observationType, ...analysis.concepts],
            associations: memories.map(m => m.id).slice(0, 5),
            semanticKeys: [
              { key: 'insight_type', value: analysis.observationType, weight: 0.9 },
              { key: 'confidence', value: String(analysis.confidence), weight: 0.7 },
            ],
          },
        };

        const { createMemory } = await import('../db/queries/memories.ts');
        createMemory(db, observationInput, embedding);
      }
    }
  } catch (error) {
    // LLM analysis is optional - don't fail the task
    console.error('[Worker] LLM analysis error (non-fatal):', error);
  }
}

/**
 * Add task to queue
 */
function enqueue(task: Omit<QueuedTask, 'id' | 'timestamp'>): string {
  const id = crypto.randomUUID();
  queue.push({
    ...task,
    id,
    timestamp: Date.now(),
  });
  stats.queued++;

  // Trigger processing
  processQueue();

  return id;
}

/**
 * Start the worker server
 */
const server = Bun.serve({
  port: PORT,
  routes: {
    // Queue a memory for processing
    '/memory': {
      POST: async (req) => {
        const data = await req.json() as MemoryTaskData;
        const taskId = enqueue({ type: 'memory', data });
        return Response.json({ taskId, queued: true });
      },
    },

    // Queue dialectic processing
    '/dialectic': {
      POST: async (req) => {
        const data = await req.json() as { memoryId: string };
        const taskId = enqueue({ type: 'dialectic', data });
        return Response.json({ taskId, queued: true });
      },
    },

    // Queue stage processing
    '/stages': {
      POST: async () => {
        const taskId = enqueue({ type: 'stages', data: {} });
        return Response.json({ taskId, queued: true });
      },
    },

    // Queue skill generation
    '/skills': {
      POST: async () => {
        const taskId = enqueue({ type: 'skills', data: {} });
        return Response.json({ taskId, queued: true });
      },
    },

    // Queue LLM analysis for specific memories
    '/analyze': {
      POST: async (req) => {
        const data = await req.json() as { memoryIds: string[] };
        const taskId = enqueue({ type: 'llm-analysis', data });
        return Response.json({ taskId, queued: true });
      },
    },

    // Get worker status
    '/status': {
      GET: () => {
        return Response.json({
          status: 'running',
          queue: queue.length,
          processing: isProcessing,
          stats,
        });
      },
    },

    // Health check
    '/health': {
      GET: () => new Response('ok'),
    },

    // View queue contents
    '/queue': {
      GET: () => {
        return Response.json({
          length: queue.length,
          tasks: queue.map(t => ({
            id: t.id,
            type: t.type,
            age: Date.now() - t.timestamp,
            data: t.type === 'memory'
              ? { memoryId: (t.data as MemoryTaskData).memoryId?.slice(0, 8) }
              : t.type === 'llm-analysis'
              ? { count: (t.data as { memoryIds: string[] }).memoryIds?.length }
              : {}
          }))
        });
      },
    },

    // Process all pending work immediately
    '/flush': {
      POST: async () => {
        await processQueue();
        return Response.json({ flushed: true, stats });
      },
    },
  },

  // Handle unknown routes
  fetch(req) {
    return new Response('Not found', { status: 404 });
  },
});

console.log(`[Engram Worker] Running on http://localhost:${PORT}`);
console.log(`[Engram Worker] Endpoints:`);
console.log(`  POST /memory    - Queue memory for embedding/dialectic`);
console.log(`  POST /dialectic - Queue dialectic processing`);
console.log(`  POST /stages    - Queue stage pipeline`);
console.log(`  POST /skills    - Queue skill generation`);
console.log(`  POST /analyze   - Queue LLM analysis (Claude-powered insights)`);
console.log(`  GET  /status    - Get worker status`);
console.log(`  GET  /health    - Health check`);
console.log(`  POST /flush     - Process all queued tasks`);

// Periodic processing for stages and skills (every 5 minutes)
setInterval(() => {
  enqueue({ type: 'stages', data: {} });
}, 5 * 60 * 1000);

// Export for testing
export { enqueue, processQueue, stats };
