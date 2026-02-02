#!/usr/bin/env bun
/**
 * Stop the Engram background worker
 */

import { stopWorker, getWorkerPid } from '../src/worker/manager.ts';
import { isWorkerRunning } from '../src/worker/client.ts';

async function main() {
  const pid = await getWorkerPid();
  const running = await isWorkerRunning();

  console.log(`Worker PID: ${pid || 'none'}`);
  console.log(`Worker responding: ${running}`);

  if (!pid && !running) {
    console.log('Worker is not running');
    return;
  }

  console.log('Stopping worker...');
  const stopped = await stopWorker();

  if (stopped) {
    console.log('Worker stopped');
  } else {
    console.log('Failed to stop worker');
  }
}

main();
