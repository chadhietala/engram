#!/usr/bin/env bun
/**
 * Check Engram worker status
 */

import { getWorkerPid } from '../src/worker/manager.ts';
import { getWorkerStatus, isWorkerRunning } from '../src/worker/client.ts';

async function main() {
  const pid = await getWorkerPid();
  const running = await isWorkerRunning();

  console.log('=== Engram Worker Status ===\n');
  console.log(`PID file: ${pid || 'none'}`);
  console.log(`Responding: ${running}`);

  if (running) {
    const status = await getWorkerStatus();
    if (status) {
      console.log(`\nQueue: ${status.queue} tasks`);
      console.log(`Processing: ${status.processing}`);
      console.log(`\nStats:`);
      console.log(`  Queued: ${status.stats.queued}`);
      console.log(`  Processed: ${status.stats.processed}`);
      console.log(`  Errors: ${status.stats.errors}`);
      if (status.stats.lastProcessed) {
        const ago = Date.now() - status.stats.lastProcessed;
        console.log(`  Last processed: ${Math.round(ago / 1000)}s ago`);
      }
    }
  } else {
    console.log('\nWorker is not running.');
    console.log('It will auto-start when you begin a Claude Code session.');
    console.log('Or start manually: bun run worker');
  }
}

main();
