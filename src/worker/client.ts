/**
 * Worker Client
 * Used by hooks to queue tasks to the background worker
 */

const WORKER_URL = 'http://localhost:37778';
const TIMEOUT_MS = 1000; // 1 second timeout for queue requests

interface WorkerStatus {
  status: 'running' | 'stopped';
  queue: number;
  processing: boolean;
  stats: {
    queued: number;
    processed: number;
    errors: number;
    lastProcessed: number;
  };
}

/**
 * Check if worker is running
 */
export async function isWorkerRunning(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${WORKER_URL}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get worker status
 */
export async function getWorkerStatus(): Promise<WorkerStatus | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${WORKER_URL}/status`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Queue a memory for background processing
 */
export async function queueMemory(
  memoryId: string,
  content: string,
  options: { generateEmbedding?: boolean; runDialectic?: boolean } = {}
): Promise<boolean> {
  const { generateEmbedding = true, runDialectic = true } = options;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${WORKER_URL}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memoryId,
        content,
        generateEmbedding,
        runDialectic,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Queue dialectic processing for a memory
 */
export async function queueDialectic(memoryId: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${WORKER_URL}/dialectic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memoryId }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Queue stage pipeline processing
 */
export async function queueStages(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${WORKER_URL}/stages`, {
      method: 'POST',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Queue skill generation
 */
export async function queueSkills(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${WORKER_URL}/skills`, {
      method: 'POST',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Flush all queued tasks (wait for completion)
 */
export async function flushWorker(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout for flush

    const response = await fetch(`${WORKER_URL}/flush`, {
      method: 'POST',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Queue LLM analysis for specific memories
 */
export async function queueLLMAnalysis(memoryIds: string[]): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${WORKER_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memoryIds }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}
