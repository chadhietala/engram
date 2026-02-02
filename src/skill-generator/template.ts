/**
 * SKILL.md template generation
 */

import type {
  Skill,
  SkillFrontmatter,
  SkillInstructions,
  SkillStep,
  SkillExample,
  SkillEdgeCase,
  SkillComplexity,
} from '../types/skill.ts';

/**
 * Generate YAML frontmatter
 */
function generateFrontmatter(skill: Skill): string {
  const frontmatter: SkillFrontmatter = {
    name: skill.name,
    description: skill.description,
    metadata: {
      author: 'engram',
      version: skill.version,
      generatedAt: new Date().toISOString(),
      sourcePatternId: skill.sourcePatternId,
      sourceSynthesisId: skill.sourceSynthesisId,
      confidence: 0, // Will be set by generator
      exemplarCount: 0, // Will be set by generator
    },
  };

  const lines: string[] = ['---'];
  lines.push(`name: ${frontmatter.name}`);
  lines.push(`description: ${frontmatter.description}`);
  lines.push('metadata:');
  lines.push(`  author: ${frontmatter.metadata.author}`);
  lines.push(`  version: "${frontmatter.metadata.version}"`);
  lines.push(`  generatedAt: ${frontmatter.metadata.generatedAt}`);
  lines.push(`  sourcePatternId: ${frontmatter.metadata.sourcePatternId}`);
  lines.push(`  sourceSynthesisId: ${frontmatter.metadata.sourceSynthesisId}`);
  lines.push('---');

  return lines.join('\n');
}

/**
 * Generate overview section
 */
function generateOverview(instructions: SkillInstructions): string {
  const lines: string[] = [];
  lines.push('## Overview');
  lines.push('');
  lines.push(instructions.overview);
  return lines.join('\n');
}

/**
 * Generate "when to use" section
 */
function generateWhenToUse(instructions: SkillInstructions): string {
  const lines: string[] = [];
  lines.push('## When to Use');
  lines.push('');

  for (const condition of instructions.whenToUse) {
    lines.push(`- ${condition}`);
  }

  return lines.join('\n');
}

/**
 * Generate steps section
 */
function generateSteps(instructions: SkillInstructions): string {
  const lines: string[] = [];
  lines.push('## Steps');
  lines.push('');

  for (const step of instructions.steps) {
    lines.push(`${step.order}. **${step.action}**`);
    if (step.details) {
      lines.push(`   ${step.details}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate examples section
 */
function generateExamples(
  instructions: SkillInstructions,
  complexity: SkillComplexity
): string {
  if (instructions.examples.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('## Examples');
  lines.push('');

  // For moderate/complex, include more examples
  const exampleCount =
    complexity === 'simple' ? 1 : complexity === 'moderate' ? 2 : 3;

  for (let i = 0; i < Math.min(exampleCount, instructions.examples.length); i++) {
    const example = instructions.examples[i];
    if (!example) continue;

    lines.push(`### Example ${i + 1}: ${example.scenario}`);
    lines.push('');

    for (let j = 0; j < example.steps.length; j++) {
      lines.push(`${j + 1}. ${example.steps[j]}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate edge cases section
 */
function generateEdgeCases(
  instructions: SkillInstructions,
  complexity: SkillComplexity
): string {
  // Only include edge cases for complex skills
  if (complexity !== 'complex' || instructions.edgeCases.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('## Edge Cases');
  lines.push('');

  for (const edgeCase of instructions.edgeCases) {
    lines.push(`### ${edgeCase.condition}`);
    lines.push('');
    lines.push(edgeCase.handling);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate title from skill name
 */
function generateTitle(name: string): string {
  // Convert hyphenated to title case
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate complete SKILL.md content
 */
export function generateSkillMarkdown(skill: Skill): string {
  const sections: string[] = [];

  // Frontmatter
  sections.push(generateFrontmatter(skill));
  sections.push('');

  // Title
  sections.push(`# ${generateTitle(skill.name)}`);
  sections.push('');

  // Overview
  sections.push(generateOverview(skill.instructions));
  sections.push('');

  // When to Use
  sections.push(generateWhenToUse(skill.instructions));
  sections.push('');

  // Steps
  sections.push(generateSteps(skill.instructions));

  // Examples (for moderate/complex)
  const examples = generateExamples(skill.instructions, skill.complexity);
  if (examples) {
    sections.push(examples);
  }

  // Edge Cases (for complex)
  const edgeCases = generateEdgeCases(skill.instructions, skill.complexity);
  if (edgeCases) {
    sections.push(edgeCases);
  }

  return sections.join('\n').trim() + '\n';
}

/**
 * Build skill instructions from synthesis data
 */
export function buildInstructionsFromSynthesis(
  synthesisContent: string,
  thesisContent: string,
  antithesisContents: string[],
  exemplarContents: string[]
): SkillInstructions {
  // Extract overview from synthesis
  const overview = synthesisContent.length > 200
    ? synthesisContent.substring(0, 200) + '...'
    : synthesisContent;

  // Extract "when to use" from thesis
  const whenToUse: string[] = [thesisContent];

  // Extract steps from exemplar contents
  const steps: SkillStep[] = [];
  let stepOrder = 1;

  for (const content of exemplarContents.slice(0, 10)) {
    // Extract tool actions from content
    const toolMatch = content.match(/Tool: (\w+)/);
    if (toolMatch) {
      steps.push({
        order: stepOrder++,
        action: `Use ${toolMatch[1]} tool`,
        details: content.substring(0, 100),
      });
    }
  }

  // If no steps extracted, add generic step
  if (steps.length === 0) {
    steps.push({
      order: 1,
      action: 'Follow the pattern described in the overview',
    });
  }

  // Build examples from exemplars
  const examples: SkillExample[] = [];
  if (exemplarContents.length > 0) {
    examples.push({
      scenario: 'Basic usage',
      steps: exemplarContents.slice(0, 3).map((c) =>
        c.substring(0, 80).replace(/\n/g, ' ')
      ),
    });
  }

  // Build edge cases from antitheses
  const edgeCases: SkillEdgeCase[] = antithesisContents.map((content) => ({
    condition: 'When conditions differ',
    handling: content,
  }));

  return {
    overview,
    whenToUse,
    steps,
    examples,
    edgeCases,
  };
}

/**
 * Determine skill complexity based on instructions
 */
export function determineComplexity(instructions: SkillInstructions): SkillComplexity {
  const stepCount = instructions.steps.length;
  const hasEdgeCases = instructions.edgeCases.length > 0;
  const hasMultipleConditions = instructions.whenToUse.length > 2;

  if (stepCount <= 2 && !hasEdgeCases && !hasMultipleConditions) {
    return 'simple';
  }

  if (stepCount > 5 || hasEdgeCases || (hasMultipleConditions && stepCount > 3)) {
    return 'complex';
  }

  return 'moderate';
}
