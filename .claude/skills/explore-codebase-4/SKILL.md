---
name: explore-codebase-4
description: This skill uses a two-phase exploration strategy to efficiently understand codebases by mapping architecture broadly first, then diving deep into critical areas.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T18:15:58.895Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: 70fd7b82-bf9d-4210-942f-1e4ce1969fd6
---

# Explore Codebase 4

## Overview

Start with breadth-first exploration by reading files across multiple domains to build a mental map of the codebase structure and key components. Use Glob to discover file patterns when needed. Once you identify critical files, patterns, or areas of interest, switch to depth-first investigation by re-reading those key files with your new contextual understanding and exploring their related dependencies in detail.

## When to Use

- When first exploring an unfamiliar codebase and you need to understand its overall architecture
- When investigating how different parts of a system interact across multiple domains
- When you need to understand both high-level structure and specific implementation details
- When debugging complex issues that require understanding both context and specific code paths
- When onboarding to a new project and need to build mental models of how components relate

## Steps

1. **Follow the pattern described above**
   Apply a two-phase exploration strategy: begin with breadth-first traversal to map the codebase architecture across multiple domains, then transition to depth-first iterative refinement when critical f

## Edge Cases

### When conditions differ

The thesis claims the user is systematically exploring using a "breadth-first approach" and "reading multiple related files to build comprehensive architectural understanding." However, the contradicting evidence shows the same file ("/Users/chietala/Code/engram/scripts/generate-skill.ts") being read twice in succession. This is depth-first, targeted re-reading behavior, not breadth-first exploration.

Reading the same file multiple times suggests:
1. **Targeted investigation** - The user needed specific details from that exact file, possibly after discovering something in the surrounding context
2. **Iterative refinement** - After exploring other areas (Bash find commands, Grep for Zod patterns, reading llm/index.ts), the user returned to re-examine generate-skill.ts with new understanding
3. **Reference checking** - The user may be verifying implementation details or patterns found in that file against what they discovered elsewhere

This contradicts "breadth-first" exploration because breadth-first would read many different files once before revisiting any. Instead, this shows **depth-first iterative refinement** - diving back into specific files as understanding evolves. (Resolution hint: The approaches aren't mutually exclusive but represent different phases of code exploration. Users likely start with breadth-first exploration to map the landscape, then shift to depth-first iteration when they've identified critical files. The "generate-skill.ts" file appears to be a template or generator that became a focal point after initial exploration, warranting repeated examination. The contradiction resolves if we recognize that systematic exploration includes both breadth-first discovery AND depth-first refinement of key files.)
