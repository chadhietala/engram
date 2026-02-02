/**
 * Hook types for Claude Code integration
 */

export type HookEventName =
  | 'SessionStart'
  | 'UserPromptSubmit'
  | 'PostToolUse'
  | 'Stop'
  | 'SessionEnd';

// Base input that all hooks receive
export interface BaseHookInput {
  session_id: string;
  transcript_path?: string;
  hook_event_name: HookEventName;
}

// SessionStart hook input
export interface SessionStartInput extends BaseHookInput {
  hook_event_name: 'SessionStart';
}

// UserPromptSubmit hook input
export interface UserPromptSubmitInput extends BaseHookInput {
  hook_event_name: 'UserPromptSubmit';
  prompt: string;
}

// PostToolUse hook input
export interface PostToolUseInput extends BaseHookInput {
  hook_event_name: 'PostToolUse';
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output?: string;
  tool_error?: string;
}

// Stop hook input
export interface StopInput extends BaseHookInput {
  hook_event_name: 'Stop';
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence';
}

// SessionEnd hook input
export interface SessionEndInput extends BaseHookInput {
  hook_event_name: 'SessionEnd';
}

export type HookInput =
  | SessionStartInput
  | UserPromptSubmitInput
  | PostToolUseInput
  | StopInput
  | SessionEndInput;

// Hook output types
export interface HookOutput {
  // Continue processing or block
  continue?: boolean;
  // Reason for blocking (if continue is false)
  reason?: string;
  // Additional context to inject into the conversation
  additionalContext?: string;
  // Suppress further hooks of this type
  suppressFurtherHooks?: boolean;
}

export interface HookResult {
  success: boolean;
  output?: HookOutput;
  error?: string;
}

// Hook handler function signature
export type HookHandler<T extends HookInput = HookInput> = (
  input: T
) => Promise<HookOutput>;
