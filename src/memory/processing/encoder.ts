/**
 * Memory encoding pipeline
 * Transforms tool usage and observations into memories with embeddings
 */

import type { Database } from 'bun:sqlite';
import { embed } from '../../embedding/index.ts';
import { createMemory, queryMemories } from '../../db/queries/memories.ts';
import type {
  Memory,
  MemoryCreateInput,
  MemorySource,
  SemanticKeyValue,
} from '../../types/memory.ts';

/**
 * Tool input/output structure for encoding
 */
export interface ToolUsageData {
  toolName: string;
  toolInput: Record<string, unknown>;
  toolOutput?: string;
  toolError?: string;
}

/**
 * Extract semantic key/value pairs from tool usage
 */
function extractSemanticKeys(data: ToolUsageData): SemanticKeyValue[] {
  const keys: SemanticKeyValue[] = [];

  // Always add tool name
  keys.push({ key: 'tool', value: data.toolName, weight: 1.0 });

  // Extract based on tool type
  switch (data.toolName) {
    case 'Bash':
      if (typeof data.toolInput.command === 'string') {
        keys.push({ key: 'command', value: data.toolInput.command, weight: 0.9 });
        // Extract command name (first word)
        const cmdName = data.toolInput.command.split(/\s+/)[0];
        if (cmdName) {
          keys.push({ key: 'command_name', value: cmdName, weight: 0.8 });
        }
      }
      break;

    case 'Read':
    case 'Write':
    case 'Edit':
      if (typeof data.toolInput.file_path === 'string') {
        keys.push({ key: 'file_path', value: data.toolInput.file_path, weight: 0.9 });
        // Extract file extension
        const ext = data.toolInput.file_path.split('.').pop();
        if (ext) {
          keys.push({ key: 'file_extension', value: ext, weight: 0.7 });
        }
        // Extract directory
        const dir = data.toolInput.file_path.substring(
          0,
          data.toolInput.file_path.lastIndexOf('/')
        );
        if (dir) {
          keys.push({ key: 'directory', value: dir, weight: 0.6 });
        }
      }
      break;

    case 'Glob':
      if (typeof data.toolInput.pattern === 'string') {
        keys.push({ key: 'pattern', value: data.toolInput.pattern, weight: 0.9 });
      }
      if (typeof data.toolInput.path === 'string') {
        keys.push({ key: 'directory', value: data.toolInput.path, weight: 0.7 });
      }
      break;

    case 'Grep':
      if (typeof data.toolInput.pattern === 'string') {
        keys.push({ key: 'search_pattern', value: data.toolInput.pattern, weight: 0.9 });
      }
      if (typeof data.toolInput.path === 'string') {
        keys.push({ key: 'directory', value: data.toolInput.path, weight: 0.7 });
      }
      break;

    case 'WebFetch':
      if (typeof data.toolInput.url === 'string') {
        keys.push({ key: 'url', value: data.toolInput.url, weight: 0.9 });
        // Extract domain
        try {
          const url = new URL(data.toolInput.url);
          keys.push({ key: 'domain', value: url.hostname, weight: 0.8 });
        } catch {
          // Invalid URL, skip domain extraction
        }
      }
      break;
  }

  // Add error indicator if present
  if (data.toolError) {
    keys.push({ key: 'has_error', value: 'true', weight: 0.5 });
  }

  return keys;
}

/**
 * Generate content string from tool usage
 */
function generateContent(data: ToolUsageData): string {
  const parts: string[] = [`Tool: ${data.toolName}`];

  // Add relevant input
  const inputStr = JSON.stringify(data.toolInput, null, 2);
  if (inputStr.length < 500) {
    parts.push(`Input: ${inputStr}`);
  } else {
    // Truncate long inputs
    parts.push(`Input: ${inputStr.substring(0, 500)}...`);
  }

  // Add output summary if present
  if (data.toolOutput) {
    const outputSummary =
      data.toolOutput.length > 200
        ? data.toolOutput.substring(0, 200) + '...'
        : data.toolOutput;
    parts.push(`Output: ${outputSummary}`);
  }

  // Add error if present
  if (data.toolError) {
    parts.push(`Error: ${data.toolError}`);
  }

  return parts.join('\n');
}

/**
 * Generate tags from tool usage
 */
function generateTags(data: ToolUsageData): string[] {
  const tags: string[] = [data.toolName.toLowerCase()];

  // Add category tags
  switch (data.toolName) {
    case 'Bash':
      tags.push('shell', 'command');
      break;
    case 'Read':
      tags.push('file', 'read');
      break;
    case 'Write':
      tags.push('file', 'write');
      break;
    case 'Edit':
      tags.push('file', 'edit');
      break;
    case 'Glob':
      tags.push('search', 'files');
      break;
    case 'Grep':
      tags.push('search', 'content');
      break;
    case 'WebFetch':
      tags.push('web', 'fetch');
      break;
  }

  if (data.toolError) {
    tags.push('error');
  }

  return tags;
}

/**
 * Find related memories for association
 */
async function findAssociations(
  db: Database,
  content: string,
  semanticKeys: SemanticKeyValue[],
  sessionId: string,
  maxAssociations: number = 5
): Promise<string[]> {
  const associations: string[] = [];

  // Find memories with matching semantic keys
  for (const sk of semanticKeys) {
    const memories = queryMemories(db, {
      semanticKeys: [{ key: sk.key, value: sk.value }],
      limit: 3,
    });

    for (const memory of memories) {
      if (!associations.includes(memory.id)) {
        associations.push(memory.id);
      }
    }

    if (associations.length >= maxAssociations) break;
  }

  // Also include recent memories from same session
  const sessionMemories = queryMemories(db, {
    sessionId,
    limit: 3,
  });

  for (const memory of sessionMemories) {
    if (!associations.includes(memory.id)) {
      associations.push(memory.id);
    }
    if (associations.length >= maxAssociations) break;
  }

  return associations.slice(0, maxAssociations);
}

/**
 * Encode tool usage into a memory
 */
export async function encodeToolUsage(
  db: Database,
  sessionId: string,
  data: ToolUsageData
): Promise<Memory> {
  const content = generateContent(data);
  const semanticKeys = extractSemanticKeys(data);
  const tags = generateTags(data);

  // Compute embedding
  const embedding = await embed(content, db);

  // Find associations
  const associations = await findAssociations(db, content, semanticKeys, sessionId);

  const input: MemoryCreateInput = {
    type: 'working',
    content,
    metadata: {
      sessionId,
      source: 'tool_use',
      toolName: data.toolName,
      toolInput: data.toolInput,
      toolOutput: data.toolOutput ? { summary: data.toolOutput.substring(0, 500) } : undefined,
      tags,
      associations,
      semanticKeys,
    },
  };

  return createMemory(db, input, embedding);
}

/**
 * Fast encode tool usage - skips embedding generation
 * Use when background worker will handle embeddings
 */
export async function encodeToolUsageFast(
  db: Database,
  sessionId: string,
  data: ToolUsageData
): Promise<Memory> {
  const content = generateContent(data);
  const semanticKeys = extractSemanticKeys(data);
  const tags = generateTags(data);

  // Skip embedding - worker will generate it
  // Skip associations - requires embedding for similarity search

  const input: MemoryCreateInput = {
    type: 'working',
    content,
    metadata: {
      sessionId,
      source: 'tool_use',
      toolName: data.toolName,
      toolInput: data.toolInput,
      toolOutput: data.toolOutput ? { summary: data.toolOutput.substring(0, 500) } : undefined,
      tags,
      associations: [], // Will be populated by worker
      semanticKeys,
    },
  };

  // Create without embedding - worker will add it
  return createMemory(db, input, undefined);
}

/**
 * Encode a user prompt into a memory
 */
export async function encodePrompt(
  db: Database,
  sessionId: string,
  prompt: string
): Promise<Memory> {
  const content = `User prompt: ${prompt}`;

  // Generate basic semantic keys from prompt
  const semanticKeys: SemanticKeyValue[] = [
    { key: 'type', value: 'prompt', weight: 1.0 },
  ];

  // Extract file paths mentioned
  const pathMatches = prompt.match(/[\/\w.-]+\.\w+/g) || [];
  for (const path of pathMatches.slice(0, 3)) {
    semanticKeys.push({ key: 'mentioned_path', value: path, weight: 0.7 });
  }

  const embedding = await embed(content, db);
  const associations = await findAssociations(db, content, semanticKeys, sessionId);

  const input: MemoryCreateInput = {
    type: 'working',
    content,
    metadata: {
      sessionId,
      source: 'prompt',
      tags: ['prompt', 'user_input'],
      associations,
      semanticKeys,
    },
  };

  return createMemory(db, input, embedding);
}

/**
 * Encode an observation into a memory
 */
export async function encodeObservation(
  db: Database,
  sessionId: string,
  observation: string,
  tags: string[] = []
): Promise<Memory> {
  const content = `Observation: ${observation}`;

  const semanticKeys: SemanticKeyValue[] = [
    { key: 'type', value: 'observation', weight: 1.0 },
  ];

  const embedding = await embed(content, db);
  const associations = await findAssociations(db, content, semanticKeys, sessionId);

  const input: MemoryCreateInput = {
    type: 'working',
    content,
    metadata: {
      sessionId,
      source: 'observation',
      tags: ['observation', ...tags],
      associations,
      semanticKeys,
    },
  };

  return createMemory(db, input, embedding);
}
