#!/usr/bin/env bun
/**
 * Engram Hook Entry Point
 * Main stdin handler for Claude Code hooks
 *
 * Usage:
 *   echo '{"session_id":"test","hook_event_name":"SessionStart"}' | bun scripts/engram-hook.ts SessionStart
 */

import { handleHookFromStdin } from '../src/hooks/index.ts';

// Run the hook handler
await handleHookFromStdin();
