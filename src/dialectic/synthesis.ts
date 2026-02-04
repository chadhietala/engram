/**
 * Synthesis management - pattern resolution
 * Uses LLM for synthesis insights (required)
 * Auto-publishes confirmed patterns to Claude's native memory (.claude/rules/)
 */

import type { Database } from 'bun:sqlite';
import {
  createSynthesis,
  getSynthesis,
  markAsSkillCandidate,
  getSkillCandidates,
  getThesis,
  getAntithesesByThesis,
  addExemplarToSynthesis,
  resolveCycle,
  getCycleByPattern,
} from '../db/queries/dialectic.ts';
import { getPattern, updatePattern } from '../db/queries/patterns.ts';
import { getMemory } from '../db/queries/memories.ts';
import { analyzeSynthesis as llmAnalyzeSynthesis, analyzeOutputType as llmAnalyzeOutputType } from '../llm/index.ts';
import { RulesWriter } from '../rules-writer/index.ts';
import { getRulesConfig } from '../config.ts';
import type {
  Synthesis,
  SynthesisCreateInput,
  SynthesisResolution,
  ResolutionType,
  Thesis,
  Antithesis,
  ToolDataSnapshot,
  SynthesisOutputType,
  OutputTypeAnalysis,
} from '../types/dialectic.ts';
import type { Memory } from '../types/memory.ts';
import { promoteMemory } from '../db/queries/memories.ts';

/**
 * Synthesis generation options
 */
export interface SynthesisOptions {
  minExemplars: number;
  minConfidence: number;
}

const DEFAULT_OPTIONS: SynthesisOptions = {
  minExemplars: 3,
  minConfidence: 0.6,
};

/**
 * Extract tool data snapshots from memories to preserve for script generation
 */
export function extractToolDataFromMemories(memories: Memory[]): ToolDataSnapshot[] {
  const toolData: ToolDataSnapshot[] = [];

  for (const memory of memories) {
    const toolName = memory.metadata.toolName;
    if (toolName) {
      toolData.push({
        tool: toolName,
        action: memory.metadata.toolInput?.command as string | undefined,
        parameters: memory.metadata.toolInput as Record<string, unknown> | undefined,
        description: memory.content.substring(0, 150),
      });
    }
  }

  return toolData;
}

// Patterns for detecting imperative language
const IMPERATIVE_PATTERNS = [
  /\balways\b/i,
  /\bnever\b/i,
  /\bmust\b/i,
  /\brequired?\b/i,
  /\bensure\b/i,
  /\bbefore\s+\w+ing\b/i,
  /\bafter\s+\w+ing\b/i,
  /\bshould\s+always\b/i,
  /\bshould\s+never\b/i,
  /\bdo\s+not\b/i,
  /\bdon't\b/i,
];

// Patterns for detecting procedural language
const PROCEDURAL_PATTERNS = [
  /\bstep\s*\d/i,
  /\bfirst\b.*\bthen\b/i,
  /\bnext\b/i,
  /\bfinally\b/i,
  /\bworkflow\b/i,
  /\bprocedure\b/i,
  /\bprocess\b/i,
  /\d+\.\s+\w/,  // Numbered lists
];

/**
 * Analyze characteristics of synthesis content for output type decision
 */
function analyzeCharacteristics(
  content: string,
  resolution: SynthesisResolution,
  toolData: ToolDataSnapshot[]
): OutputTypeAnalysis['characteristics'] {
  // Check for imperative language
  const isImperative = IMPERATIVE_PATTERNS.some(pattern => pattern.test(content));

  // Check for procedural language
  const isProcedural = PROCEDURAL_PATTERNS.some(pattern => pattern.test(content));

  // Count distinct tools
  const distinctTools = new Set(toolData.map(t => t.tool));
  const toolDiversity = distinctTools.size;

  // Check for conditions
  const hasConditions = resolution.type === 'conditional' ||
    /\bif\b/i.test(content) ||
    /\bwhen\b.*\bthen\b/i.test(content) ||
    /\bdepending\s+on\b/i.test(content);

  // Calculate complexity score (0-1)
  let complexity = 0;
  complexity += content.length > 500 ? 0.3 : content.length > 200 ? 0.15 : 0;
  complexity += toolDiversity > 3 ? 0.3 : toolDiversity > 1 ? 0.15 : 0;
  complexity += hasConditions ? 0.2 : 0;
  complexity += isProcedural ? 0.2 : 0;
  complexity = Math.min(complexity, 1);

  return {
    isImperative,
    isProcedural,
    toolDiversity,
    hasConditions,
    complexity,
  };
}

/**
 * Determine the output type for a synthesis using heuristics
 * Returns the decision with confidence score
 */
export function determineOutputType(
  content: string,
  resolution: SynthesisResolution,
  toolData: ToolDataSnapshot[],
  exemplarCount: number,
  patternConfidence: number
): OutputTypeAnalysis {
  const characteristics = analyzeCharacteristics(content, resolution, toolData);

  // Decision logic based on the plan
  let outputType: SynthesisOutputType;
  let reasoning: string;
  let decisionConfidence: number;

  // Rejection = none
  if (resolution.type === 'rejection') {
    return {
      outputType: 'none',
      reasoning: 'Resolution type is rejection - no artifact generated',
      decisionConfidence: 1.0,
      characteristics,
    };
  }

  // Low confidence or insufficient evidence = none
  if (patternConfidence < 0.5 || exemplarCount < 2) {
    return {
      outputType: 'none',
      reasoning: `Insufficient confidence (${patternConfidence.toFixed(2)}) or evidence (${exemplarCount} exemplars)`,
      decisionConfidence: 0.9,
      characteristics,
    };
  }

  // Imperative + procedural + multi-tool = rule_with_skill
  if (characteristics.isImperative && characteristics.isProcedural && characteristics.toolDiversity > 2) {
    outputType = 'rule_with_skill';
    reasoning = 'Contains imperative language, procedural steps, and uses multiple tools';
    decisionConfidence = 0.85;
  }
  // Imperative only = rule
  else if (characteristics.isImperative && !characteristics.isProcedural) {
    outputType = 'rule';
    reasoning = 'Contains imperative language without complex procedures';
    decisionConfidence = 0.9;
  }
  // Procedural + multi-tool + complex = skill
  else if (characteristics.isProcedural && characteristics.toolDiversity > 2 && characteristics.complexity > 0.5) {
    outputType = 'skill';
    reasoning = 'Describes procedural workflow with multiple tools and high complexity';
    decisionConfidence = 0.8;
  }
  // Conditional resolution = rule_with_skill (conditions need explanation)
  else if (resolution.type === 'conditional' && characteristics.hasConditions) {
    outputType = 'rule_with_skill';
    reasoning = 'Conditional resolution with context-dependent behavior requires both rule and skill';
    decisionConfidence = 0.75;
  }
  // High complexity alone = skill
  else if (characteristics.complexity > 0.6) {
    outputType = 'skill';
    reasoning = 'High complexity content is better suited as a skill';
    decisionConfidence = 0.7;
  }
  // Default = rule
  else {
    outputType = 'rule';
    reasoning = 'Default: straightforward pattern best expressed as a rule';
    decisionConfidence = 0.8;
  }

  return {
    outputType,
    reasoning,
    decisionConfidence,
    characteristics,
  };
}

/**
 * Determine output type with optional LLM enhancement for uncertain cases
 */
export async function determineOutputTypeWithLLM(
  content: string,
  resolution: SynthesisResolution,
  toolData: ToolDataSnapshot[],
  exemplarCount: number,
  patternConfidence: number
): Promise<OutputTypeAnalysis> {
  // First, get heuristic decision
  const heuristicDecision = determineOutputType(
    content,
    resolution,
    toolData,
    exemplarCount,
    patternConfidence
  );

  // If confidence is high enough, use heuristic decision
  if (heuristicDecision.decisionConfidence >= 0.7) {
    return heuristicDecision;
  }

  // For uncertain cases, use LLM to refine the decision
  try {
    const toolNames = toolData.map(t => t.tool);
    const llmAnalysis = await llmAnalyzeOutputType(
      content,
      resolution.type,
      toolNames,
      exemplarCount
    );

    // Combine LLM analysis with heuristic characteristics
    return {
      outputType: llmAnalysis.outputType,
      reasoning: `LLM-enhanced: ${llmAnalysis.reasoning}`,
      decisionConfidence: llmAnalysis.decisionConfidence,
      characteristics: {
        ...heuristicDecision.characteristics,
        // Override with LLM's assessment if it detected these
        isImperative: llmAnalysis.isImperative,
        isProcedural: llmAnalysis.isProcedural,
      },
    };
  } catch (error) {
    // Fall back to heuristic if LLM fails
    console.error('[Synthesis] LLM output type analysis failed, using heuristics:', error);
    return heuristicDecision;
  }
}

/**
 * Promote exemplar memories to long-term storage when they become part of a synthesis
 * This prevents memory decay from deleting important exemplars
 */
export function promoteExemplarMemories(
  db: Database,
  memoryIds: string[]
): void {
  for (const memoryId of memoryIds) {
    try {
      promoteMemory(db, memoryId, 'long_term');
    } catch {
      // Memory may already be deleted or promoted
    }
  }
}

/**
 * Determine the appropriate resolution type
 */
export function determineResolutionType(
  thesis: Thesis,
  antitheses: Antithesis[]
): ResolutionType {
  if (antitheses.length === 0) {
    return 'integration'; // No contradictions, thesis stands
  }

  const contradictionTypes = antitheses.map((a) => a.contradictionType);

  // All direct contradictions = rejection
  if (contradictionTypes.every((t) => t === 'direct')) {
    return 'rejection';
  }

  // All context-dependent = conditional
  if (contradictionTypes.every((t) => t === 'context_dependent')) {
    return 'conditional';
  }

  // Refinements or edge cases = abstraction
  if (
    contradictionTypes.some((t) => t === 'refinement' || t === 'edge_case')
  ) {
    return 'abstraction';
  }

  // Mixed = integration attempt
  return 'integration';
}

/**
 * Generate synthesis content using LLM
 * LLM is required - errors propagate if unavailable
 */
export async function generateSynthesisContent(
  thesis: Thesis,
  antitheses: Antithesis[],
  _resolutionType: ResolutionType,
  exemplarMemories: Memory[] = []
): Promise<string> {
  const analysis = await llmAnalyzeSynthesis(thesis, antitheses, exemplarMemories);
  // Return whatever the LLM produces
  return analysis.resolution;
}

/**
 * Generate resolution conditions for conditional type
 */
function generateConditions(antitheses: Antithesis[]): string[] {
  return antitheses
    .filter((a) => a.contradictionType === 'context_dependent')
    .map((a) => a.content);
}

/**
 * Generate abstraction for abstraction type
 */
function generateAbstraction(thesis: Thesis, antitheses: Antithesis[]): string {
  const refinements = antitheses
    .filter((a) => a.contradictionType === 'refinement' || a.contradictionType === 'edge_case')
    .map((a) => a.content);

  return `Abstract pattern: ${thesis.content} [with variations: ${refinements.join(', ')}]`;
}

/**
 * Execute the output decision - publish rule, generate skill, or both
 */
async function executeOutputDecision(
  db: Database,
  synthesis: Synthesis,
  outputDecision: OutputTypeAnalysis
): Promise<void> {
  const rulesConfig = getRulesConfig();

  switch (outputDecision.outputType) {
    case 'rule': {
      // Publish rule only
      if (rulesConfig.autoPublish) {
        try {
          const rulesWriter = new RulesWriter(db);
          const publishResult = await rulesWriter.publishFromSynthesis(synthesis.id);
          if (publishResult.success) {
            console.error(`[Synthesis] Published rule: ${publishResult.filePath}`);
          }
        } catch (error) {
          console.error(`[Synthesis] Failed to publish rule:`, error);
        }
      }
      break;
    }

    case 'skill': {
      // Mark as skill candidate only (skill generation happens separately)
      markAsSkillCandidate(db, synthesis.id, true);
      console.error(`[Synthesis] Marked as skill candidate: ${synthesis.id}`);
      break;
    }

    case 'rule_with_skill': {
      // First mark as skill candidate so skill gets generated
      markAsSkillCandidate(db, synthesis.id, true);
      console.error(`[Synthesis] Marked as skill candidate: ${synthesis.id}`);

      // Then publish rule (which will find and link the skill when available)
      if (rulesConfig.autoPublish) {
        try {
          const rulesWriter = new RulesWriter(db);
          const publishResult = await rulesWriter.publishFromSynthesis(synthesis.id);
          if (publishResult.success) {
            console.error(`[Synthesis] Published rule with skill reference: ${publishResult.filePath}`);
          }
        } catch (error) {
          console.error(`[Synthesis] Failed to publish rule:`, error);
        }
      }
      break;
    }

    case 'none':
    default:
      // No action - insufficient confidence or rejected
      console.error(`[Synthesis] No artifact generated: ${outputDecision.reasoning}`);
      break;
  }
}

/**
 * Create a synthesis from thesis and antitheses
 * Uses LLM for content generation (required)
 */
export async function synthesize(
  db: Database,
  thesisId: string,
  options: Partial<SynthesisOptions> = {}
): Promise<Synthesis | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const thesis = getThesis(db, thesisId);
  if (!thesis) return null;

  const antitheses = getAntithesesByThesis(db, thesisId);

  // Collect all exemplar memory IDs
  const exemplarMemoryIds = new Set<string>(thesis.exemplarMemoryIds);
  for (const antithesis of antitheses) {
    for (const memoryId of antithesis.exemplarMemoryIds) {
      exemplarMemoryIds.add(memoryId);
    }
  }

  // Get exemplar memories for LLM context
  const exemplarMemories = [...exemplarMemoryIds]
    .slice(0, 10)
    .map(id => getMemory(db, id))
    .filter((m): m is Memory => m !== null);

  // Determine resolution type
  const resolutionType = determineResolutionType(thesis, antitheses);

  // Generate content (uses LLM when available)
  const content = await generateSynthesisContent(thesis, antitheses, resolutionType, exemplarMemories);

  // Build resolution object
  const resolution: SynthesisResolution = {
    type: resolutionType,
  };

  if (resolutionType === 'conditional') {
    resolution.conditions = generateConditions(antitheses);
  }

  if (resolutionType === 'abstraction') {
    resolution.abstraction = generateAbstraction(thesis, antitheses);
  }

  // Extract tool data from exemplar memories before they could be deleted by decay
  const toolData = extractToolDataFromMemories(exemplarMemories);

  // Get pattern for confidence check
  const pattern = getPattern(db, thesis.patternId);
  const patternConfidence = pattern?.confidence ?? 0;

  // Determine output type using heuristics (with LLM fallback for uncertain cases)
  const outputDecision = await determineOutputTypeWithLLM(
    content,
    resolution,
    toolData,
    [...exemplarMemoryIds].length,
    patternConfidence
  );

  // Attach output decision to resolution
  resolution.outputDecision = outputDecision;

  const input: SynthesisCreateInput = {
    thesisId,
    antithesisIds: antitheses.map((a) => a.id),
    content,
    resolution,
    exemplarMemoryIds: [...exemplarMemoryIds],
    toolData: toolData.length > 0 ? toolData : undefined,
  };

  const synthesis = createSynthesis(db, input);

  // Promote exemplar memories to long-term to prevent decay from deleting them
  promoteExemplarMemories(db, [...exemplarMemoryIds]);

  // Resolve the dialectic cycle
  if (pattern) {
    const cycle = getCycleByPattern(db, pattern.id);
    if (cycle) {
      resolveCycle(db, cycle.id, synthesis.id);
    }

    // Update pattern's dialectic phase
    updatePattern(db, pattern.id, { dialecticPhase: 'synthesis' });

    // Execute the output decision (publish rule, mark skill candidate, or both)
    const rulesConfig = getRulesConfig();
    if (rulesConfig.autoPublish && patternConfidence >= rulesConfig.minConfidence) {
      await executeOutputDecision(db, synthesis, outputDecision);
    }
  }

  return synthesis;
}

/**
 * Check if synthesis qualifies as skill candidate
 */
export function checkSkillCandidacy(
  db: Database,
  synthesisId: string,
  minExemplars: number = 5,
  minConfidence: number = 0.8
): boolean {
  const synthesis = getSynthesis(db, synthesisId);
  if (!synthesis) return false;

  // Rejection resolutions don't make good skills
  if (synthesis.resolution.type === 'rejection') {
    return false;
  }

  // Need enough exemplars
  if (synthesis.exemplarMemoryIds.length < minExemplars) {
    return false;
  }

  // Check if associated pattern has reached syntactic stage
  const thesis = getThesis(db, synthesis.thesisId);
  if (!thesis) return false;

  const pattern = getPattern(db, thesis.patternId);
  if (!pattern || pattern.stage !== 'syntactic') {
    return false;
  }

  // Check confidence
  if (pattern.confidence < minConfidence) {
    return false;
  }

  return true;
}

/**
 * Mark a synthesis as skill candidate if it qualifies
 */
export function evaluateForSkillGeneration(
  db: Database,
  synthesisId: string
): Synthesis | null {
  const isCandidate = checkSkillCandidacy(db, synthesisId);

  if (isCandidate) {
    return markAsSkillCandidate(db, synthesisId, true);
  }

  return getSynthesis(db, synthesisId);
}

/**
 * Get all skill candidates ready for generation
 */
export function getSkillCandidatesReadyForGeneration(db: Database): Synthesis[] {
  return getSkillCandidates(db);
}

/**
 * Add more evidence to a synthesis
 */
export function addSynthesisEvidence(
  db: Database,
  synthesisId: string,
  memoryId: string
): void {
  addExemplarToSynthesis(db, synthesisId, memoryId);

  // Re-evaluate for skill candidacy
  evaluateForSkillGeneration(db, synthesisId);
}
