/**
 * Background Worker Service
 * Handles heavy processing asynchronously so hooks can return instantly
 * Includes LLM-powered analysis via Claude Agent SDK
 */

import { initializeDatabase } from '../db/index.ts';
import { embed, embedBatch } from '../embedding/index.ts';
import { createMemory, updateMemory, getMemory, queryMemories } from '../db/queries/memories.ts';
import { DialecticEngine } from '../dialectic/index.ts';
import { StagePipeline } from '../stages/index.ts';
import { SkillGenerator } from '../skill-generator/index.ts';
import { analyzePattern, analyzeContradiction, analyzeSynthesis } from '../llm/index.ts';
import type { Memory } from '../types/memory.ts';

const PORT = 37778;
const CONCURRENCY_LIMIT = 4;

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

interface MemoryTaskData {
  memoryId: string;
  content: string;
  generateEmbedding: boolean;
  runDialectic: boolean;
}

/**
 * Process a single task
 */
async function processTask(task: QueuedTask): Promise<void> {
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
}

/**
 * Process memory tasks in batch using embedBatch for efficiency
 */
async function processMemoryTasksBatch(tasks: QueuedTask[]): Promise<void> {
  const memoryTasks = tasks
    .filter(t => t.type === 'memory')
    .map(t => ({ task: t, data: t.data as MemoryTaskData }));

  if (memoryTasks.length === 0) return;

  // Separate tasks that need embedding from those that don't
  const needsEmbedding = memoryTasks.filter(t => t.data.generateEmbedding);
  const noEmbedding = memoryTasks.filter(t => !t.data.generateEmbedding);

  // Batch embed all texts that need embedding
  if (needsEmbedding.length > 0) {
    const contents = needsEmbedding.map(t => t.data.content);
    const embeddings = await embedBatch(contents, db);

    // Apply embeddings to each memory
    for (let i = 0; i < needsEmbedding.length; i++) {
      const { data } = needsEmbedding[i]!;
      const embedding = embeddings[i];
      if (embedding) {
        const memory = getMemory(db, data.memoryId);
        if (memory) {
          updateMemory(db, data.memoryId, {}, embedding);
          console.error(`[Worker] Embedded memory ${data.memoryId.slice(0, 8)}...`);
        }
      }
    }
  }

  // Process dialectic for all tasks that need it (in parallel)
  const needsDialectic = memoryTasks.filter(t => t.data.runDialectic);
  await Promise.allSettled(
    needsDialectic.map(async ({ data }) => {
      const memory = getMemory(db, data.memoryId);
      if (memory) {
        await dialecticEngine.processMemory(memory);
      }
    })
  );

  // Queue LLM analysis for sessions with enough memories
  const processedIds = new Set<string>();
  for (const { data } of [...needsEmbedding, ...noEmbedding]) {
    if (processedIds.has(data.memoryId)) continue;
    processedIds.add(data.memoryId);

    const memory = getMemory(db, data.memoryId);
    if (memory) {
      const sessionMemories = queryMemories(db, {
        sessionId: memory.metadata.sessionId,
        limit: 10,
      });
      if (sessionMemories.length >= 5 && sessionMemories.length % 5 === 0) {
        enqueue({
          type: 'llm-analysis',
          data: { memoryIds: sessionMemories.map(m => m.id) },
        });
      }
    }
  }
}

/**
 * Process queued tasks with concurrency
 */
async function processQueue(): Promise<void> {
  if (isProcessing || queue.length === 0) return;

  isProcessing = true;

  while (queue.length > 0) {
    // Take a batch of tasks up to the concurrency limit
    const batch = queue.splice(0, CONCURRENCY_LIMIT);

    // Separate memory tasks for batch processing
    const memoryTasks = batch.filter(t => t.type === 'memory');
    const otherTasks = batch.filter(t => t.type !== 'memory');

    // Process memory tasks as a batch (uses embedBatch internally)
    if (memoryTasks.length > 0) {
      try {
        await processMemoryTasksBatch(memoryTasks);
        stats.processed += memoryTasks.length;
        stats.lastProcessed = Date.now();
      } catch (error) {
        console.error(`[Worker] Error processing memory batch:`, error);
        stats.errors += memoryTasks.length;
      }
    }

    // Process other tasks concurrently
    const results = await Promise.allSettled(
      otherTasks.map(task => processTask(task))
    );

    // Update stats based on results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        stats.processed++;
        stats.lastProcessed = Date.now();
      } else {
        console.error(`[Worker] Error processing task:`, result.reason);
        stats.errors++;
      }
    }
  }

  isProcessing = false;
}

/**
 * Process memory task - generate embedding and associations
 * (Used as fallback when processTask is called directly)
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

        createMemory(db, observationInput, embedding);
      }
    }
  } catch (error) {
    // LLM analysis is optional - don't fail the task
    console.error('[Worker] LLM analysis error (non-fatal):', error);
  }
}

/**
 * Format task data for queue display
 */
function formatTaskData(task: QueuedTask): Record<string, unknown> {
  switch (task.type) {
    case 'memory':
      return { memoryId: (task.data as MemoryTaskData).memoryId?.slice(0, 8) };
    case 'llm-analysis':
      return { count: (task.data as { memoryIds: string[] }).memoryIds?.length };
    default:
      return {};
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
            data: formatTaskData(t),
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
