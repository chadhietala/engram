/**
 * Dialectic Engine - Hegelian evolution of patterns
 */

import type { Database } from 'bun:sqlite';
import { getDatabase } from '../db/index.ts';
import {
  getPattern,
  queryPatterns,
  getPatternsWithEmbeddings,
  updatePattern,
} from '../db/queries/patterns.ts';
import {
  getThesis,
  getActiveTheses,
  createDialecticCycle,
  getCycleByPattern,
  getActiveCycles,
} from '../db/queries/dialectic.ts';
import { embed, cosineSimilarity } from '../embedding/index.ts';
import {
  findOrCreatePattern,
  createPatternThesis,
  getActiveThesisForPattern,
  generateThesisContent,
  addThesisEvidence,
} from './thesis.ts';
import {
  detectContradiction,
  createContradictionAntithesis,
  getThesisAntitheses,
  isReadyForSynthesis,
  type ContradictionResult,
} from './antithesis.ts';
import {
  synthesize,
  evaluateForSkillGeneration,
  getSkillCandidatesReadyForGeneration,
} from './synthesis.ts';
import type {
  Pattern,
  Thesis,
  Antithesis,
  Synthesis,
  DialecticCycle,
} from '../types/dialectic.ts';
import type { Memory } from '../types/memory.ts';
import { extractUserGoal } from '../llm/index.ts';

/**
 * Common action verbs to detect in memory content
 */
const ACTION_VERBS = [
  'commit', 'push', 'pull', 'merge', 'checkout', 'branch', 'rebase', 'clone',
  'build', 'compile', 'run', 'test', 'deploy', 'install', 'update', 'upgrade',
  'read', 'write', 'edit', 'create', 'delete', 'search', 'find', 'explore',
  'fetch', 'request', 'send', 'upload', 'download',
  'debug', 'fix', 'refactor', 'review', 'analyze', 'validate', 'lint',
  'start', 'stop', 'restart', 'configure', 'setup', 'init',
];

/**
 * Map file extensions to human-readable names
 */
function extensionToName(ext: string): string {
  const mapping: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript-react',
    js: 'javascript',
    jsx: 'javascript-react',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    c: 'c',
    cpp: 'cpp',
    h: 'c-header',
    hpp: 'cpp-header',
    cs: 'csharp',
    php: 'php',
    sh: 'shell',
    bash: 'bash',
    zsh: 'zsh',
    md: 'markdown',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sql: 'sql',
  };
  return mapping[ext.toLowerCase()] || ext.toLowerCase();
}

/**
 * Get the most frequent item in an array
 */
function getMostFrequent(arr: string[]): string | null {
  if (arr.length === 0) return null;

  const counts = new Map<string, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }

  let maxCount = 0;
  let mostFrequent: string | null = null;
  for (const [item, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequent = item;
    }
  }

  return mostFrequent;
}

/**
 * Extract action verbs from memory content and tool inputs
 */
function extractActionFromContent(memories: Memory[]): string | null {
  const foundActions: string[] = [];

  for (const memory of memories) {
    const content = memory.content.toLowerCase();

    // Check content for action verbs
    for (const verb of ACTION_VERBS) {
      // Look for verb as a whole word
      const regex = new RegExp(`\\b${verb}(s|ed|ing)?\\b`, 'i');
      if (regex.test(content)) {
        foundActions.push(verb);
      }
    }

    // Also check tool input for commands (especially Bash commands)
    const toolInput = memory.metadata.toolInput;
    if (toolInput && typeof toolInput === 'object') {
      const command = (toolInput as Record<string, unknown>).command;
      if (typeof command === 'string') {
        const firstWord = command.trim().split(/\s+/)[0]?.toLowerCase();
        if (firstWord && ACTION_VERBS.includes(firstWord)) {
          foundActions.push(firstWord);
        }
      }
    }
  }

  return getMostFrequent(foundActions);
}

/**
 * Generate a semantic pattern name from memories
 * Priority: command_name > domain > file_extension > tool names
 */
function generateSemanticPatternName(memories: Memory[]): string {
  const commandNames: string[] = [];
  const domains: string[] = [];
  const fileExtensions: string[] = [];
  const toolNames: string[] = [];

  for (const memory of memories) {
    // Collect tool names
    if (memory.metadata.toolName) {
      toolNames.push(memory.metadata.toolName.toLowerCase());
    }

    // Extract semantic keys
    for (const sk of memory.metadata.semanticKeys || []) {
      switch (sk.key) {
        case 'command_name':
        case 'command':
          commandNames.push(sk.value.toLowerCase());
          break;
        case 'domain':
          domains.push(sk.value.toLowerCase().replace(/\./g, '-'));
          break;
        case 'file_extension':
        case 'extension':
          fileExtensions.push(sk.value.toLowerCase().replace(/^\./, ''));
          break;
      }
    }

    // Also try to extract from tool inputs
    const toolInput = memory.metadata.toolInput;
    if (toolInput && typeof toolInput === 'object') {
      const input = toolInput as Record<string, unknown>;

      // Extract command from Bash
      if (typeof input.command === 'string') {
        const firstWord = input.command.trim().split(/\s+/)[0]?.toLowerCase();
        if (firstWord) {
          commandNames.push(firstWord);
        }
      }

      // Extract domain from URLs
      if (typeof input.url === 'string') {
        try {
          const url = new URL(input.url);
          domains.push(url.hostname.replace(/\./g, '-'));
        } catch {
          // Invalid URL, ignore
        }
      }

      // Extract file extension from file paths
      if (typeof input.file_path === 'string') {
        const match = input.file_path.match(/\.([a-z0-9]+)$/i);
        if (match) {
          fileExtensions.push(match[1].toLowerCase());
        }
      }
    }
  }

  // Try to extract an action from memory content
  const action = extractActionFromContent(memories);

  // Priority 1: Command name (git, npm, docker, etc.)
  const mostFrequentCommand = getMostFrequent(commandNames);
  if (mostFrequentCommand) {
    const suffix = action && action !== mostFrequentCommand ? `-${action}` : '-workflow';
    return `${mostFrequentCommand}${suffix}`;
  }

  // Priority 2: Domain (github, stackoverflow, etc.)
  const mostFrequentDomain = getMostFrequent(domains);
  if (mostFrequentDomain) {
    const simplifiedDomain = mostFrequentDomain.replace(/-com$|-org$|-io$/, '');
    const suffix = action ? `-${action}` : '-operations';
    return `${simplifiedDomain}${suffix}`;
  }

  // Priority 3: File extension (typescript, python, etc.)
  const mostFrequentExt = getMostFrequent(fileExtensions);
  if (mostFrequentExt) {
    const extName = extensionToName(mostFrequentExt);
    const suffix = action ? `-${action}` : '-exploration';
    return `${extName}${suffix}`;
  }

  // Priority 4: Tool names (fallback)
  const uniqueTools = [...new Set(toolNames)];
  if (uniqueTools.length > 0) {
    const toolPart = uniqueTools.slice(0, 2).join('-');
    const suffix = action ? `-${action}` : '-pattern';
    return `${toolPart}${suffix}`;
  }

  // Ultimate fallback
  return action ? `${action}-pattern` : `pattern-${Date.now()}`;
}

/**
 * Find user prompts associated with tool memories
 * Looks for "User prompt:" memories in the same session or temporally close
 */
async function findAssociatedUserPrompts(
  db: Database,
  toolMemories: Memory[]
): Promise<string[]> {
  if (toolMemories.length === 0) return [];

  // Get unique session IDs from tool memories
  const sessionIds = [...new Set(toolMemories.map(m => m.metadata.sessionId))];

  // Get time range (with some buffer)
  const timestamps = toolMemories.map(m => m.createdAt);
  const minTime = Math.min(...timestamps) - 60000; // 1 minute before
  const maxTime = Math.max(...timestamps) + 60000; // 1 minute after

  // Import queryMemories to find user prompts
  const { queryMemories } = await import('../db/queries/memories.ts');

  const userPrompts: string[] = [];

  for (const sessionId of sessionIds) {
    const sessionMemories = queryMemories(db, { sessionId });

    for (const mem of sessionMemories) {
      if (
        mem.content.startsWith('User prompt:') &&
        mem.createdAt >= minTime &&
        mem.createdAt <= maxTime &&
        !mem.content.includes('<task-notification>')
      ) {
        // Extract the actual prompt text
        const promptText = mem.content.replace('User prompt:', '').trim();
        if (promptText.length > 5 && promptText.length < 500) {
          userPrompts.push(promptText);
        }
      }
    }
  }

  // Deduplicate
  return [...new Set(userPrompts)];
}

/**
 * Generate a goal-based pattern name using LLM analysis of user prompts
 */
async function generateGoalBasedPatternName(
  db: Database,
  memories: Memory[]
): Promise<{ name: string; description: string }> {
  // Find user prompts associated with these memories
  const userPrompts = await findAssociatedUserPrompts(db, memories);

  if (userPrompts.length === 0) {
    // Fall back to semantic pattern naming if no user prompts found
    const name = generateSemanticPatternName(memories);
    const toolNames = [...new Set(memories.map(m => m.metadata.toolName).filter(Boolean))];
    const description = `Pattern detected from ${memories.length} similar operations using ${toolNames.join(', ') || 'various tools'}`;
    return { name, description };
  }

  try {
    // Use LLM to extract the high-level goal
    const toolMemories = memories.filter(m => m.metadata.toolName);
    const goal = await extractUserGoal(userPrompts, toolMemories);

    // Ensure the goal name is valid (lowercase, hyphenated)
    const name = goal.goal
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return {
      name: name || generateSemanticPatternName(memories),
      description: goal.goalDescription,
    };
  } catch (error) {
    console.error('[Engram] Failed to extract user goal, falling back to semantic naming:', error);
    // Fall back to semantic pattern naming
    const name = generateSemanticPatternName(memories);
    const toolNames = [...new Set(memories.map(m => m.metadata.toolName).filter(Boolean))];
    const description = `Pattern detected from ${memories.length} similar operations using ${toolNames.join(', ') || 'various tools'}`;
    return { name, description };
  }
}

/**
 * Dialectic engine configuration
 */
export interface DialecticConfig {
  similarityThreshold: number;
  minMemoriesForPattern: number;
  minAntithesesForSynthesis: number;
  autoSynthesize: boolean;
}

const DEFAULT_CONFIG: DialecticConfig = {
  similarityThreshold: 0.7,
  minMemoriesForPattern: 3,
  minAntithesesForSynthesis: 1,
  autoSynthesize: true,
};

export class DialecticEngine {
  private db: Database;
  private config: DialecticConfig;

  constructor(db: Database, config: Partial<DialecticConfig> = {}) {
    this.db = db;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process a new memory through the dialectic system
   */
  async processMemory(memory: Memory): Promise<{
    pattern: Pattern | null;
    thesis: Thesis | null;
    antithesis: Antithesis | null;
    synthesis: Synthesis | null;
    action: 'created_pattern' | 'added_evidence' | 'created_antithesis' | 'synthesized' | 'no_action';
  }> {
    // Find related patterns
    let relatedPattern = await this.findRelatedPattern(memory);

    if (!relatedPattern) {
      // No existing pattern - try to create one from similar memories
      const created = await this.maybeCreatePattern(memory);
      if (created) {
        return {
          pattern: created.pattern,
          thesis: created.thesis,
          antithesis: null,
          synthesis: null,
          action: 'created_pattern',
        };
      }

      // Not enough similar memories yet
      return {
        pattern: null,
        thesis: null,
        antithesis: null,
        synthesis: null,
        action: 'no_action',
      };
    }

    // Get active thesis for pattern
    const thesis = getActiveThesisForPattern(this.db, relatedPattern.id);

    if (!thesis) {
      // Pattern exists but no thesis - unusual state
      return {
        pattern: relatedPattern,
        thesis: null,
        antithesis: null,
        synthesis: null,
        action: 'no_action',
      };
    }

    // Check for contradiction
    const contradiction = await detectContradiction(this.db, thesis, memory);

    if (contradiction.detected) {
      // Create antithesis (uses LLM when available)
      const antithesis = await createContradictionAntithesis(
        this.db,
        thesis.id,
        contradiction,
        memory.id
      );

      // Check if ready for synthesis
      if (
        this.config.autoSynthesize &&
        isReadyForSynthesis(this.db, thesis.id, this.config.minAntithesesForSynthesis)
      ) {
        const synthesis = await synthesize(this.db, thesis.id);

        if (synthesis) {
          evaluateForSkillGeneration(this.db, synthesis.id);

          return {
            pattern: relatedPattern,
            thesis,
            antithesis,
            synthesis,
            action: 'synthesized',
          };
        }
      }

      return {
        pattern: relatedPattern,
        thesis,
        antithesis,
        synthesis: null,
        action: 'created_antithesis',
      };
    }

    // No contradiction - add as supporting evidence
    addThesisEvidence(this.db, thesis.id, memory.id);

    // Update pattern confidence
    const newConfidence = Math.min(1.0, relatedPattern.confidence + 0.05);
    updatePattern(this.db, relatedPattern.id, { confidence: newConfidence });

    return {
      pattern: relatedPattern,
      thesis,
      antithesis: null,
      synthesis: null,
      action: 'added_evidence',
    };
  }

  /**
   * Find a pattern related to a memory
   */
  async findRelatedPattern(memory: Memory): Promise<Pattern | null> {
    if (!memory.embedding) return null;

    const patterns = getPatternsWithEmbeddings(this.db);

    let bestMatch: Pattern | null = null;
    let bestSimilarity = 0;

    for (const pattern of patterns) {
      if (pattern.embedding) {
        const similarity = cosineSimilarity(memory.embedding, pattern.embedding);
        if (similarity >= this.config.similarityThreshold && similarity > bestSimilarity) {
          bestMatch = pattern;
          bestSimilarity = similarity;
        }
      }
    }

    return bestMatch;
  }

  /**
   * Try to create a pattern if we have enough similar memories
   */
  async maybeCreatePattern(memory: Memory): Promise<{ pattern: Pattern; thesis: Thesis } | null> {
    if (!memory.embedding) return null;

    // Import here to avoid circular dependency
    const { getMemoriesWithEmbeddings } = await import('../db/queries/memories.ts');

    // Find similar memories
    const allMemories = getMemoriesWithEmbeddings(this.db, {
      types: ['working', 'short_term', 'long_term'],
    });

    const similarMemories: Memory[] = [memory];

    for (const candidate of allMemories) {
      if (candidate.id === memory.id || !candidate.embedding) continue;

      const similarity = cosineSimilarity(memory.embedding, candidate.embedding);

      // Use a slightly lower threshold for grouping
      if (similarity >= this.config.similarityThreshold - 0.1) {
        similarMemories.push(candidate);
      }
    }

    // Need enough similar memories to form a pattern
    if (similarMemories.length < this.config.minMemoriesForPattern) {
      return null;
    }

    // Generate goal-based pattern name from user prompts + tool usage
    const { name, description } = await generateGoalBasedPatternName(this.db, similarMemories);

    // Create the pattern
    const { pattern, thesis } = await this.createPatternFromMemories(
      similarMemories,
      name,
      description
    );

    console.error(`[Engram] Created pattern: ${name} (${similarMemories.length} memories)`);

    return { pattern, thesis };
  }

  /**
   * Create a new pattern from a group of related memories
   */
  async createPatternFromMemories(
    memories: Memory[],
    name: string,
    description: string
  ): Promise<{ pattern: Pattern; thesis: Thesis; cycle: DialecticCycle }> {
    // Create or find pattern
    const pattern = await findOrCreatePattern(this.db, memories, name, description);

    // Generate thesis content (uses LLM when available)
    const thesisContent = await generateThesisContent(memories);

    // Create thesis
    const thesis = createPatternThesis(
      this.db,
      pattern.id,
      thesisContent,
      memories.map((m) => m.id)
    );

    // Create dialectic cycle
    const cycle = createDialecticCycle(this.db, pattern.id, thesis.id);

    return { pattern, thesis, cycle };
  }

  /**
   * Manually trigger synthesis for a thesis
   */
  async triggerSynthesis(thesisId: string): Promise<Synthesis | null> {
    return synthesize(this.db, thesisId);
  }

  /**
   * Get all active dialectic cycles
   */
  getActiveCycles(): DialecticCycle[] {
    return getActiveCycles(this.db);
  }

  /**
   * Get all skill candidates
   */
  getSkillCandidates(): Synthesis[] {
    return getSkillCandidatesReadyForGeneration(this.db);
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    totalPatterns: number;
    activeTheses: number;
    activeCycles: number;
    skillCandidates: number;
    patternsByStage: {
      conceptual: number;
      semantic: number;
      syntactic: number;
    };
  } {
    const patterns = queryPatterns(this.db);
    const activeTheses = getActiveTheses(this.db);
    const activeCycles = getActiveCycles(this.db);
    const skillCandidates = getSkillCandidatesReadyForGeneration(this.db);

    const patternsByStage = {
      conceptual: patterns.filter((p) => p.stage === 'conceptual').length,
      semantic: patterns.filter((p) => p.stage === 'semantic').length,
      syntactic: patterns.filter((p) => p.stage === 'syntactic').length,
    };

    return {
      totalPatterns: patterns.length,
      activeTheses: activeTheses.length,
      activeCycles: activeCycles.length,
      skillCandidates: skillCandidates.length,
      patternsByStage,
    };
  }
}

// Export sub-modules
export * from './thesis.ts';
export * from './antithesis.ts';
export * from './synthesis.ts';
