/**
 * Syntactic stage processing
 * Executable patterns and procedures
 */

import type { Database } from 'bun:sqlite';
import { queryMemories, updateMemory } from '../db/queries/memories.ts';
import type { Memory, SemanticKeyValue } from '../types/memory.ts';

/**
 * Syntactic stage requirements
 */
export interface SyntacticRequirements {
  minStrength: number;
  minAccessCount: number;
  minSteps: number;
}

const DEFAULT_REQUIREMENTS: SyntacticRequirements = {
  minStrength: 0.8,
  minAccessCount: 7,
  minSteps: 2,
};

/**
 * Procedural step
 */
export interface ProceduralStep {
  order: number;
  tool: string;
  action: string;
  parameters: Record<string, unknown>;
  expectedOutcome?: string;
}

/**
 * Procedure extracted from memories
 */
export interface Procedure {
  id: string;
  name: string;
  description: string;
  steps: ProceduralStep[];
  preconditions: string[];
  postconditions: string[];
  memoryIds: string[];
}

/**
 * Check if memory meets syntactic stage requirements
 */
export function meetsSyntacticRequirements(
  memory: Memory,
  requirements: Partial<SyntacticRequirements> = {}
): boolean {
  const reqs = { ...DEFAULT_REQUIREMENTS, ...requirements };

  // Check for procedure indicators
  const hasProcedureType = memory.metadata.semanticKeys.some(
    (k) => k.key === 'procedure_type'
  );

  return (
    memory.metadata.stage === 'syntactic' &&
    memory.strength >= reqs.minStrength &&
    memory.accessCount >= reqs.minAccessCount &&
    hasProcedureType
  );
}

/**
 * Get syntactic memories ready for skill extraction
 */
export function getSyntacticReadyForSkillExtraction(
  db: Database,
  requirements: Partial<SyntacticRequirements> = {}
): Memory[] {
  const memories = queryMemories(db, {
    stage: 'syntactic',
    types: ['short_term', 'long_term'],  // Include short_term for faster learning
  });

  return memories.filter((m) => meetsSyntacticRequirements(m, requirements));
}

/**
 * Extract action sequence from ordered memories
 */
export function extractActionSequence(memories: Memory[]): ProceduralStep[] {
  // Sort by creation time
  const sorted = [...memories].sort((a, b) => a.createdAt - b.createdAt);

  const steps: ProceduralStep[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const memory = sorted[i];
    if (!memory) continue;

    if (memory.metadata.source !== 'tool_use' || !memory.metadata.toolName) {
      continue;
    }

    const step: ProceduralStep = {
      order: steps.length + 1,
      tool: memory.metadata.toolName,
      action: describeToolAction(memory),
      parameters: extractParameters(memory),
    };

    // Add expected outcome based on success/error
    if (!memory.metadata.tags.includes('error')) {
      step.expectedOutcome = 'success';
    }

    steps.push(step);
  }

  return steps;
}

function describeToolAction(memory: Memory): string {
  const tool = memory.metadata.toolName;

  switch (tool) {
    case 'Read':
      const readPath = memory.metadata.semanticKeys.find((k) => k.key === 'file_path');
      return `Read file ${readPath?.value ?? 'unknown'}`;

    case 'Write':
      const writePath = memory.metadata.semanticKeys.find((k) => k.key === 'file_path');
      return `Write to file ${writePath?.value ?? 'unknown'}`;

    case 'Edit':
      const editPath = memory.metadata.semanticKeys.find((k) => k.key === 'file_path');
      return `Edit file ${editPath?.value ?? 'unknown'}`;

    case 'Bash':
      const cmd = memory.metadata.semanticKeys.find((k) => k.key === 'command_name');
      return `Execute ${cmd?.value ?? 'command'}`;

    case 'Glob':
      const pattern = memory.metadata.semanticKeys.find((k) => k.key === 'pattern');
      return `Find files matching ${pattern?.value ?? 'pattern'}`;

    case 'Grep':
      const searchPattern = memory.metadata.semanticKeys.find((k) => k.key === 'search_pattern');
      return `Search for ${searchPattern?.value ?? 'pattern'}`;

    case 'WebFetch':
      const domain = memory.metadata.semanticKeys.find((k) => k.key === 'domain');
      return `Fetch from ${domain?.value ?? 'web'}`;

    default:
      return `Use ${tool}`;
  }
}

function extractParameters(memory: Memory): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  for (const key of memory.metadata.semanticKeys) {
    if (key.weight >= 0.7) {
      params[key.key] = key.value;
    }
  }

  return params;
}

/**
 * Generate procedure from related memories
 */
export function generateProcedure(
  memories: Memory[],
  name: string,
  description: string
): Procedure {
  const steps = extractActionSequence(memories);

  // Extract preconditions (from first memory context)
  const preconditions: string[] = [];
  if (memories[0]) {
    const firstMemory = memories[0];
    const directory = firstMemory.metadata.semanticKeys.find((k) => k.key === 'directory');
    if (directory) {
      preconditions.push(`Working in directory: ${directory.value}`);
    }
  }

  // Extract postconditions (from last memory outcome)
  const postconditions: string[] = [];
  const lastMemory = memories[memories.length - 1];
  if (lastMemory && !lastMemory.metadata.tags.includes('error')) {
    postconditions.push('Operation completed successfully');
  }

  return {
    id: crypto.randomUUID(),
    name,
    description,
    steps,
    preconditions,
    postconditions,
    memoryIds: memories.map((m) => m.id),
  };
}

/**
 * Determine procedure type from steps
 */
export function determineProcedureType(steps: ProceduralStep[]): string {
  const tools = steps.map((s) => s.tool);
  const uniqueTools = [...new Set(tools)];

  if (uniqueTools.length === 1) {
    return `single_tool_${uniqueTools[0]?.toLowerCase() ?? 'unknown'}`;
  }

  if (tools.every((t) => ['Read', 'Write', 'Edit'].includes(t))) {
    return 'file_operation';
  }

  if (tools.includes('Bash')) {
    return 'shell_workflow';
  }

  if (tools.includes('Grep') || tools.includes('Glob')) {
    return 'search_workflow';
  }

  return 'mixed_workflow';
}

/**
 * Add syntactic metadata to memory
 */
export function addSyntacticMetadata(
  db: Database,
  memoryId: string,
  procedure: Procedure
): Memory | null {
  const memories = queryMemories(db, {});
  const memory = memories.find((m) => m.id === memoryId);
  if (!memory) return null;

  const procedureType = determineProcedureType(procedure.steps);

  const newSemanticKeys: SemanticKeyValue[] = [
    ...memory.metadata.semanticKeys,
    { key: 'procedure_type', value: procedureType, weight: 0.9 },
    { key: 'step_count', value: String(procedure.steps.length), weight: 0.7 },
    { key: 'procedure_name', value: procedure.name, weight: 0.8 },
  ];

  // Add unique keys only
  const uniqueKeys = newSemanticKeys.filter(
    (k, i, arr) =>
      arr.findIndex((x) => x.key === k.key && x.value === k.value) === i
  );

  return updateMemory(db, memoryId, {
    metadata: {
      ...memory.metadata,
      semanticKeys: uniqueKeys,
    },
  });
}

/**
 * Check if procedure is consistent (no errors, logical flow)
 */
export function validateProcedure(procedure: Procedure): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (procedure.steps.length === 0) {
    issues.push('No steps in procedure');
  }

  // Check for logical ordering
  let lastReadFile: string | null = null;
  for (const step of procedure.steps) {
    // Can't edit a file before reading it (in some cases)
    if (step.tool === 'Read') {
      lastReadFile = step.parameters.file_path as string | null;
    }

    if (step.tool === 'Edit' && !lastReadFile) {
      // Not necessarily an issue, but note it
    }
  }

  // Check for error steps
  const hasErrors = procedure.steps.some((s) => s.expectedOutcome !== 'success');
  if (hasErrors) {
    issues.push('Procedure contains error steps');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
