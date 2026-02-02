#!/usr/bin/env bun
/**
 * Start the Engram background worker
 *
 * Usage:
 *   bun scripts/start-worker.ts
 *
 * Or add to package.json scripts:
 *   "worker": "bun scripts/start-worker.ts"
 */

import '../src/worker/index.ts';
