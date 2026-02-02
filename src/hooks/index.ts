/**
 * Hook orchestrator
 * Routes hook inputs to appropriate handlers
 */

import type { Database } from 'bun:sqlite';
import { initializeDatabase } from '../db/index.ts';
import type {
  HookInput,
  HookOutput,
  HookResult,
  SessionStartInput,
  UserPromptSubmitInput,
  PostToolUseInput,
  StopInput,
  SessionEndInput,
} from '../types/hooks.ts';

import { handleSessionStart } from './session-start.ts';
import { handleUserPromptSubmit } from './user-prompt-submit.ts';
import { handlePostToolUse } from './post-tool-use.ts';
import { handleStop } from './stop.ts';
import { handleSessionEnd } from './session-end.ts';

const DB_PATH = './data/engram.db';

/**
 * Main hook dispatcher
 */
export async function handleHook(input: HookInput): Promise<HookResult> {
  let db: Database;

  try {
    db = initializeDatabase(DB_PATH);
  } catch (error) {
    return {
      success: false,
      error: `Database initialization failed: ${error}`,
    };
  }

  try {
    let output: HookOutput;

    switch (input.hook_event_name) {
      case 'SessionStart':
        output = await handleSessionStart(db, input as SessionStartInput);
        break;

      case 'UserPromptSubmit':
        output = await handleUserPromptSubmit(db, input as UserPromptSubmitInput);
        break;

      case 'PostToolUse':
        output = await handlePostToolUse(db, input as PostToolUseInput);
        break;

      case 'Stop':
        output = await handleStop(db, input as StopInput);
        break;

      case 'SessionEnd':
        output = await handleSessionEnd(db, input as SessionEndInput);
        break;

      default:
        return {
          success: false,
          error: `Unknown hook event: ${(input as HookInput).hook_event_name}`,
        };
    }

    return {
      success: true,
      output,
    };
  } catch (error) {
    console.error(`[Engram] Hook error:`, error);
    return {
      success: false,
      error: `Hook handler failed: ${error}`,
    };
  }
}

/**
 * Parse and handle hook from stdin
 */
export async function handleHookFromStdin(): Promise<void> {
  // Read from stdin
  const chunks: Uint8Array[] = [];

  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(chunk);
  }

  const inputStr = Buffer.concat(chunks).toString('utf-8').trim();

  if (!inputStr) {
    // No input, output empty response
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  let input: HookInput;

  try {
    input = JSON.parse(inputStr) as HookInput;
  } catch (error) {
    console.error(`[Engram] Failed to parse input: ${error}`);
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const result = await handleHook(input);

  if (result.success && result.output) {
    console.log(JSON.stringify(result.output));
  } else if (!result.success) {
    console.error(`[Engram] Hook failed: ${result.error}`);
    console.log(JSON.stringify({ continue: true }));
  } else {
    console.log(JSON.stringify({ continue: true }));
  }
}

// Export handlers
export { handleSessionStart } from './session-start.ts';
export { handleUserPromptSubmit } from './user-prompt-submit.ts';
export { handlePostToolUse } from './post-tool-use.ts';
export { handleStop } from './stop.ts';
export { handleSessionEnd } from './session-end.ts';
