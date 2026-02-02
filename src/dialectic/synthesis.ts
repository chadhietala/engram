/**
 * Synthesis management - pattern resolution
 * Uses LLM for rich synthesis insights when available
 */

import type { Database } from 'bun:sqlite';
import {
  createSynthesis,
  getSynthesis,
  markAsSkillCandidate,
  getSkillCandidates,
  getThesis,
  getAntithesis,
  getAntithesesByThesis,
  addExemplarToSynthesis,
  resolveCycle,
  getCycleByPattern,
} from '../db/queries/dialectic.ts';
import { getPattern, updatePattern } from '../db/queries/patterns.ts';
import { getMemory } from '../db/queries/memories.ts';
import { analyzeSynthesis as llmAnalyzeSynthesis } from '../llm/index.ts';
import type {
  Synthesis,
  SynthesisCreateInput,
  SynthesisResolution,
  ResolutionType,
  Thesis,
  Antithesis,
} from '../types/dialectic.ts';
import type { Memory } from '../types/memory.ts';

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
 * Generate synthesis content
 * Tries LLM for rich insights, falls back to templates
 */
export async function generateSynthesisContent(
  thesis: Thesis,
  antitheses: Antithesis[],
  resolutionType: ResolutionType,
  exemplarMemories: Memory[] = []
): Promise<string> {
  // Try LLM analysis first
  try {
    const analysis = await llmAnalyzeSynthesis(thesis, antitheses, exemplarMemories);
    if (analysis.resolution.length > 20) {
      return analysis.resolution;
    }
  } catch {
    // LLM not available, use templates
  }

  return generateSynthesisContentHeuristic(thesis, antitheses, resolutionType);
}

/**
 * Synchronous heuristic-based synthesis content
 */
export function generateSynthesisContentSync(
  thesis: Thesis,
  antitheses: Antithesis[],
  resolutionType: ResolutionType
): string {
  return generateSynthesisContentHeuristic(thesis, antitheses, resolutionType);
}

function generateSynthesisContentHeuristic(
  thesis: Thesis,
  antitheses: Antithesis[],
  resolutionType: ResolutionType
): string {
  switch (resolutionType) {
    case 'rejection':
      return `Original pattern "${thesis.content}" was found to be incorrect. ` +
        `Contradicted by: ${antitheses.map((a) => a.content).join('; ')}`;

    case 'conditional':
      const conditions = antitheses.map((a) => a.content);
      return `Pattern "${thesis.content}" applies conditionally: ` +
        `Conditions: ${conditions.join('; ')}`;

    case 'abstraction':
      return `Abstracted pattern from "${thesis.content}": ` +
        `Incorporates variations: ${antitheses.map((a) => a.content).join('; ')}`;

    case 'integration':
    default:
      return `Integrated pattern combining thesis "${thesis.content}" ` +
        `with considerations: ${antitheses.map((a) => a.content).join('; ')}`;
  }
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
 * Create a synthesis from thesis and antitheses
 * Uses LLM for rich content when available
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

  const input: SynthesisCreateInput = {
    thesisId,
    antithesisIds: antitheses.map((a) => a.id),
    content,
    resolution,
    exemplarMemoryIds: [...exemplarMemoryIds],
  };

  const synthesis = createSynthesis(db, input);

  // Resolve the dialectic cycle
  const pattern = getPattern(db, thesis.patternId);
  if (pattern) {
    const cycle = getCycleByPattern(db, pattern.id);
    if (cycle) {
      resolveCycle(db, cycle.id, synthesis.id);
    }

    // Update pattern's dialectic phase
    updatePattern(db, pattern.id, { dialecticPhase: 'synthesis' });
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
