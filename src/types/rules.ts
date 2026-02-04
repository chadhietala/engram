/**
 * Types for the Rules Writer system
 * Integrates Engram patterns with Claude's native memory system (.claude/rules/)
 */

export type RuleStatus = 'active' | 'superseded' | 'invalidated';
export type RuleScope = 'project' | 'user';

/**
 * YAML frontmatter for Claude rules files
 */
export interface RuleFrontmatter {
  /** Optional glob patterns for path-specific rules */
  paths?: string[];
}

/**
 * Metadata embedded in HTML comments for tracking
 */
export interface EngramRuleMetadata {
  /** Source pattern ID */
  patternId: string;
  /** Source synthesis ID (if from synthesis) */
  synthesisId?: string;
  /** Version of this rule */
  version: number;
  /** Timestamp of last update */
  updatedAt: string;
  /** Confidence score when published */
  confidence: number;
}

/**
 * A published rule in the database
 */
export interface PublishedRule {
  id: string;
  /** Rule filename (without .md extension) */
  name: string;
  /** Source pattern ID */
  patternId: string;
  /** Source synthesis ID (if from synthesis) */
  synthesisId: string | null;
  /** Full file path of the rule */
  filePath: string;
  /** Project or user scope */
  scope: RuleScope;
  /** Current status */
  status: RuleStatus;
  /** Version number */
  version: number;
  /** Confidence at time of publish */
  confidence: number;
  /** Hash of content for change detection */
  contentHash: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Input for creating a published rule record
 */
export interface PublishedRuleCreateInput {
  name: string;
  patternId: string;
  synthesisId?: string;
  filePath: string;
  scope: RuleScope;
  confidence: number;
  contentHash: string;
}

/**
 * Input for updating a published rule record
 */
export interface PublishedRuleUpdateInput {
  status?: RuleStatus;
  version?: number;
  confidence?: number;
  contentHash?: string;
}

/**
 * Related skill information for a rule
 */
export interface RelatedSkill {
  /** Skill name (used for invocation) */
  name: string;
  /** Skill description */
  description: string;
  /** Trigger phrases that invoke the skill */
  triggerPhrases?: string[];
}

/**
 * Structured content for a rule
 */
export interface RuleContent {
  /** Main title of the rule */
  title: string;
  /** Summary of the insight/pattern */
  summary: string;
  /** Detailed explanation */
  details?: string;
  /** Conditions when this rule applies */
  whenToApply?: string[];
  /** Examples of the pattern */
  examples?: string[];
  /** Related commands or tools */
  relatedTools?: string[];
  /** Session count that contributed to this insight */
  sessionCount?: number;
  /** Associated skill that can be invoked */
  relatedSkill?: RelatedSkill;
}

/**
 * Result of attempting to publish a rule
 */
export interface PublishResult {
  success: boolean;
  /** Path to the written rule file */
  filePath?: string;
  /** Database record of the published rule */
  rule?: PublishedRule;
  /** Error message if failed */
  error?: string;
  /** Whether this was an update to existing rule */
  isUpdate: boolean;
}
