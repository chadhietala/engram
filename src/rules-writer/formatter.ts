/**
 * Markdown formatter for Claude rules files
 * Generates rules with YAML frontmatter and engram metadata comments
 */

import type { RuleFrontmatter, EngramRuleMetadata, RuleContent } from '../types/rules.ts';

/**
 * Generate YAML frontmatter for path-specific rules
 */
export function formatFrontmatter(frontmatter: RuleFrontmatter): string {
  if (!frontmatter.paths || frontmatter.paths.length === 0) {
    return '';
  }

  const lines = ['---'];
  lines.push('paths:');
  for (const path of frontmatter.paths) {
    lines.push(`  - "${path}"`);
  }
  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate engram metadata comment for tracking
 */
export function formatMetadataComment(metadata: EngramRuleMetadata): string {
  const parts = [
    `pattern:${metadata.patternId}`,
    metadata.synthesisId ? `synthesis:${metadata.synthesisId}` : null,
    `v${metadata.version}`,
    metadata.updatedAt,
    `confidence:${metadata.confidence.toFixed(2)}`,
  ].filter(Boolean);

  return `<!-- engram:${parts.join(':')} -->`;
}

/**
 * Parse engram metadata from a comment string
 */
export function parseMetadataComment(comment: string): EngramRuleMetadata | null {
  const match = comment.match(/<!-- engram:(.+) -->/);
  if (!match || !match[1]) return null;

  const parts = match[1].split(':');
  if (parts.length < 4) return null;

  const metadata: Partial<EngramRuleMetadata> = {};

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (part.startsWith('pattern')) {
      const nextPart = parts[++i];
      if (nextPart) metadata.patternId = nextPart;
    } else if (part.startsWith('synthesis')) {
      const nextPart = parts[++i];
      if (nextPart) metadata.synthesisId = nextPart;
    } else if (part.startsWith('v')) {
      metadata.version = parseInt(part.substring(1), 10);
    } else if (part.startsWith('confidence')) {
      const nextPart = parts[++i];
      if (nextPart) metadata.confidence = parseFloat(nextPart);
    } else if (part.match(/^\d{4}-\d{2}-\d{2}/)) {
      metadata.updatedAt = part;
    }
  }

  if (!metadata.patternId || !metadata.version || !metadata.updatedAt) {
    return null;
  }

  return metadata as EngramRuleMetadata;
}

/**
 * Format a complete rule file content
 */
export function formatRuleContent(
  content: RuleContent,
  frontmatter: RuleFrontmatter,
  metadata: EngramRuleMetadata
): string {
  const lines: string[] = [];

  // Add frontmatter if paths specified
  const frontmatterStr = formatFrontmatter(frontmatter);
  if (frontmatterStr) {
    lines.push(frontmatterStr);
  }

  // Title
  lines.push(`# ${content.title}`);
  lines.push('');

  // Summary
  lines.push(content.summary);
  lines.push('');

  // Details (if provided)
  if (content.details) {
    lines.push(content.details);
    lines.push('');
  }

  // When to apply
  if (content.whenToApply && content.whenToApply.length > 0) {
    lines.push('## When This Applies');
    lines.push('');
    for (const condition of content.whenToApply) {
      lines.push(`- ${condition}`);
    }
    lines.push('');
  }

  // Examples
  if (content.examples && content.examples.length > 0) {
    lines.push('## Examples');
    lines.push('');
    for (const example of content.examples) {
      lines.push(`- ${example}`);
    }
    lines.push('');
  }

  // Related tools
  if (content.relatedTools && content.relatedTools.length > 0) {
    lines.push('## Related Tools');
    lines.push('');
    for (const tool of content.relatedTools) {
      lines.push(`- \`${tool}\``);
    }
    lines.push('');
  }

  // Related skill (if this pattern has an associated skill)
  if (content.relatedSkill) {
    lines.push('## Related Skill');
    lines.push('');
    lines.push(`This pattern has an associated skill: **${content.relatedSkill.name}**`);
    lines.push('');
    lines.push(`> ${content.relatedSkill.description}`);
    lines.push('');
    lines.push('**To invoke this skill**, say:');
    lines.push('');
    if (content.relatedSkill.triggerPhrases && content.relatedSkill.triggerPhrases.length > 0) {
      for (const phrase of content.relatedSkill.triggerPhrases.slice(0, 3)) {
        lines.push(`- "${phrase}"`);
      }
    } else {
      lines.push(`- "run the ${content.relatedSkill.name} skill"`);
      lines.push(`- "use ${content.relatedSkill.name}"`);
    }
    lines.push('');
  }

  // Session count note
  if (content.sessionCount && content.sessionCount > 1) {
    lines.push(`*This pattern was confirmed across ${content.sessionCount} sessions.*`);
    lines.push('');
  }

  // Metadata comment at the end
  lines.push(formatMetadataComment(metadata));
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate a safe filename from a title
 */
export function titleToFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Extract paths from semantic keys (file extensions, directories)
 */
export function extractPathPatterns(
  semanticKeys: Array<{ key: string; value: string }>
): string[] {
  const patterns = new Set<string>();

  for (const { key, value } of semanticKeys) {
    if (key === 'file_path' && value) {
      // Extract extension pattern
      const extMatch = value.match(/\.([a-z0-9]+)$/i);
      if (extMatch) {
        patterns.add(`**/*.${extMatch[1]}`);
      }

      // Extract directory pattern
      const dirMatch = value.match(/^(.+?\/)/);
      if (dirMatch) {
        patterns.add(`${dirMatch[1]}**`);
      }
    }
  }

  return [...patterns];
}

/**
 * Hash content for change detection
 */
export function hashContent(content: string): string {
  // Use Bun's built-in hasher
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(content);
  return hasher.digest('hex').substring(0, 16);
}
