/**
 * Worker Process Manager
 * Handles starting, stopping, and checking the background worker
 */

import { isWorkerRunning } from './client.ts';

const PID_FILE = './data/worker.pid';
const WORKER_SCRIPT = './scripts/start-worker.ts';

/**
 * Get the stored worker PID
 */
export async function getWorkerPid(): Promise<number | null> {
  try {
    const file = Bun.file(PID_FILE);
    if (await file.exists()) {
      const content = await file.text();
      const pid = parseInt(content.trim(), 10);
      return isNaN(pid) ? null : pid;
    }
  } catch {
    // File doesn't exist or can't be read
  }
  return null;
}

/**
 * Save the worker PID
 */
async function saveWorkerPid(pid: number): Promise<void> {
  await Bun.write(PID_FILE, String(pid));
}

/**
 * Clear the worker PID file
 */
async function clearWorkerPid(): Promise<void> {
  try {
    const file = Bun.file(PID_FILE);
    if (await file.exists()) {
      await Bun.write(PID_FILE, '');
    }
  } catch {
    // Ignore
  }
}

/**
 * Check if a process is running by PID
 */
function isProcessRunning(pid: number): boolean {
  try {
    // Sending signal 0 checks if process exists without killing it
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Start the worker if not already running
 */
export async function startWorker(): Promise<boolean> {
  // First check if worker is responding
  if (await isWorkerRunning()) {
    console.error('[Engram] Worker already running (responding to health check)');
    return true;
  }

  // Check if we have a PID and it's still running
  const existingPid = await getWorkerPid();
  if (existingPid && isProcessRunning(existingPid)) {
    console.error(`[Engram] Worker process exists (PID: ${existingPid}) but not responding, killing...`);
    try {
      process.kill(existingPid, 'SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch {
      // Process may have already exited
    }
  }

  console.error('[Engram] Starting background worker...');

  try {
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

    // Use nohup to ensure process survives after parent exits
    const proc = Bun.spawn(['nohup', 'bun', 'run', WORKER_SCRIPT], {
      cwd: projectDir,
      stdout: 'ignore',
      stderr: 'ignore',
      stdin: 'ignore',
      env: {
        ...process.env,
        ENGRAM_WORKER: '1',
      },
    });

    // Save the PID
    if (proc.pid) {
      await saveWorkerPid(proc.pid);
      console.error(`[Engram] Worker started with PID: ${proc.pid}`);
    }

    // Detach from parent
    proc.unref();

    // Wait for worker to be ready
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      if (await isWorkerRunning()) {
        console.error('[Engram] Worker is ready');
        return true;
      }
    }

    console.error('[Engram] Worker started but not responding yet');
    return false;
  } catch (error) {
    console.error('[Engram] Failed to start worker:', error);
    return false;
  }
}

/**
 * Stop the worker
 */
export async function stopWorker(): Promise<boolean> {
  const pid = await getWorkerPid();

  if (pid && isProcessRunning(pid)) {
    try {
      process.kill(pid, 'SIGTERM');
      console.error(`[Engram] Sent SIGTERM to worker (PID: ${pid})`);
      await clearWorkerPid();
      return true;
    } catch (error) {
      console.error('[Engram] Failed to stop worker:', error);
      return false;
    }
  }

  await clearWorkerPid();
  return true;
}

/**
 * Ensure worker is running (start if needed)
 */
export async function ensureWorkerRunning(): Promise<boolean> {
  if (await isWorkerRunning()) {
    return true;
  }
  return startWorker();
}
