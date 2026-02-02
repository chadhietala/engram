/**
 * Dialectic types for the Hegelian evolution process
 */

export type ThesisStatus = 'active' | 'challenged' | 'synthesized';
export type ContradictionType = 'direct' | 'refinement' | 'edge_case' | 'context_dependent';
export type ResolutionType = 'integration' | 'rejection' | 'conditional' | 'abstraction';
export type DialecticPhase = 'thesis' | 'antithesis' | 'synthesis';

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
