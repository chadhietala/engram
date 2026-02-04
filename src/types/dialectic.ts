/**
 * Dialectic types for the Hegelian evolution process
 */

export type ThesisStatus = 'active' | 'challenged' | 'synthesized';
export type ContradictionType = 'direct' | 'refinement' | 'edge_case' | 'context_dependent';
export type ResolutionType = 'integration' | 'rejection' | 'conditional' | 'abstraction';
export type DialecticPhase = 'thesis' | 'antithesis' | 'synthesis';

/**
 * Synthesis output type - determines what artifact to generate
 * - 'rule': Mandatory behavior ("always run tests before commit")
 * - 'skill': Optional procedure ("how to change log level for debugging")
 * - 'rule_with_skill': A rule that references a skill for implementation details
 * - 'none': No artifact (e.g., rejection or low confidence)
 */
export type SynthesisOutputType = 'rule' | 'skill' | 'rule_with_skill' | 'none';

/**
 * Analysis of what output type to generate from a synthesis
 */
export interface OutputTypeAnalysis {
  outputType: SynthesisOutputType;
  reasoning: string;
  decisionConfidence: number;
  characteristics: {
    /** Content contains imperative language ("always", "never", "must") */
    isImperative: boolean;
    /** Content describes multi-step procedures */
    isProcedural: boolean;
    /** Number of distinct tools involved */
    toolDiversity: number;
    /** Content has conditional branches */
    hasConditions: boolean;
    /** Overall complexity score 0-1 */
    complexity: number;
  };
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  stage: 'conceptual' | 'semantic' | 'syntactic';
  dialecticPhase: DialecticPhase;
  embedding: Float32Array | null;
  confidence: number;
  usageCount: number;
  successRate: number;
  memoryIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Thesis {
  id: string;
  patternId: string;
  content: string;
  status: ThesisStatus;
  exemplarMemoryIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Antithesis {
  id: string;
  thesisId: string;
  content: string;
  contradictionType: ContradictionType;
  exemplarMemoryIds: string[];
  createdAt: number;
}

export interface SynthesisResolution {
  type: ResolutionType;
  conditions?: string[];
  abstraction?: string;
  /** Explicit decision about what output type to generate */
  outputDecision?: OutputTypeAnalysis;
}

/**
 * Snapshot of tool usage data, stored at synthesis time to prevent loss when memories decay
 */
export interface ToolDataSnapshot {
  tool: string;
  action?: string;
  parameters?: Record<string, unknown>;
  description?: string;
}

export interface Synthesis {
  id: string;
  thesisId: string;
  antithesisIds: string[];
  content: string;
  resolution: SynthesisResolution;
  skillCandidate: boolean;
  exemplarMemoryIds: string[];
  toolData?: ToolDataSnapshot[];
  createdAt: number;
  updatedAt: number;
}

export interface DialecticCycle {
  id: string;
  patternId: string;
  thesisId: string;
  antithesisIds: string[];
  synthesisId: string | null;
  status: 'active' | 'resolved';
  createdAt: number;
  resolvedAt: number | null;
}

export interface PatternCreateInput {
  name: string;
  description: string;
  stage?: 'conceptual' | 'semantic' | 'syntactic';
  memoryIds: string[];
}

export interface ThesisCreateInput {
  patternId: string;
  content: string;
  exemplarMemoryIds: string[];
}

export interface AntithesisCreateInput {
  thesisId: string;
  content: string;
  contradictionType: ContradictionType;
  exemplarMemoryIds: string[];
}

export interface SynthesisCreateInput {
  thesisId: string;
  antithesisIds: string[];
  content: string;
  resolution: SynthesisResolution;
  exemplarMemoryIds: string[];
  toolData?: ToolDataSnapshot[];
}
