/**
 * Memory types for the Engram system
 */

export type MemoryType = 'working' | 'short_term' | 'long_term' | 'collective';
export type MemorySource = 'tool_use' | 'prompt' | 'observation' | 'synthesis';
export type MemoryStage = 'conceptual' | 'semantic' | 'syntactic';

export interface SemanticKeyValue {
  key: string;   // e.g., 'tool', 'file_path', 'command'
  value: string;
  weight: number;
}

export interface MemoryMetadata {
  sessionId: string;
  source: MemorySource;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: Record<string, unknown>;
  tags: string[];
  associations: string[];
  stage: MemoryStage;
  confidence: number;
  semanticKeys: SemanticKeyValue[];
}

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  embedding: Float32Array | null;
  metadata: MemoryMetadata;
  strength: number;
  decayFactor: number;
  accessCount: number;
  lastAccessed: number;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryFilter {
  types?: MemoryType[];
  sessionId?: string;
  source?: MemorySource;
  stage?: MemoryStage;
  tags?: string[];
  semanticKeys?: Array<{ key: string; value?: string }>;
  minStrength?: number;
  minConfidence?: number;
  limit?: number;
}

export interface MemoryCreateInput {
  type: MemoryType;
  content: string;
  metadata: Omit<MemoryMetadata, 'stage' | 'confidence'> & {
    stage?: MemoryStage;
    confidence?: number;
  };
  strength?: number;
  decayFactor?: number;
}

export interface MemoryUpdateInput {
  content?: string;
  type?: MemoryType;
  metadata?: Partial<MemoryMetadata>;
  strength?: number;
  decayFactor?: number;
}

export interface RetrievalResult {
  memory: Memory;
  score: number;
  similarity: number;
}
