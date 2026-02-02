/**
 * Skill types for generated Claude Skills
 */

export type SkillStatus = 'draft' | 'validated' | 'published' | 'deprecated';
export type SkillComplexity = 'simple' | 'moderate' | 'complex';

export interface SkillFrontmatter {
  name: string;
  description: string;
  metadata: {
    author: string;
    version: string;
    generatedAt: string;
    sourcePatternId: string;
    sourceSynthesisId: string;
    confidence: number;
    exemplarCount: number;
  };
}

export interface SkillStep {
  order: number;
  action: string;
  details?: string;
}

export interface SkillExample {
  scenario: string;
  steps: string[];
}

export interface SkillEdgeCase {
  condition: string;
  handling: string;
}

export interface SkillInstructions {
  overview: string;
  whenToUse: string[];
  steps: SkillStep[];
  examples: SkillExample[];
  edgeCases: SkillEdgeCase[];
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  sourcePatternId: string;
  sourceSynthesisId: string;
  instructions: SkillInstructions;
  complexity: SkillComplexity;
  status: SkillStatus;
  filePath: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SkillCreateInput {
  name: string;
  description: string;
  sourcePatternId: string;
  sourceSynthesisId: string;
  instructions: SkillInstructions;
  complexity?: SkillComplexity;
}

export interface SkillValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
