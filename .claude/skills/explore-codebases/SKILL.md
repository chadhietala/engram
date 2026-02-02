---
name: explore-codebases
description: Intelligently explores codebases using breadth-first or depth-first reading strategies based on task scope and familiarity.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T19:04:27.760Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: 43cc00ec-99c4-4eb6-91c6-eef3b75c857b
---

# Explore Codebases

## Overview

Use breadth-first exploration (reading across multiple modules and their dependencies) when you need holistic architectural understanding, are working with unfamiliar codebases, or need to understand system-wide patterns. Switch to depth-first exploration (focused file reading with immediate dependencies only) when addressing localized bugs, implementing targeted features in known areas, or debugging specific problems where the scope is well-defined.

## When to Use

- Understanding the architecture of a new or unfamiliar codebase
- Planning large-scale refactors that affect multiple modules
- Learning how different components interact across the system
- Debugging localized issues where the problem area is already identified
- Implementing features in specific modules without needing full system context
- Investigating a specific bug with a known reproduction path

## Steps

1. **Follow the pattern described above**
   Employ adaptive exploration strategies that match the scope and nature of the task: use breadth-first reading across multiple modules and their dependencies when building holistic architectural unders

## Edge Cases

### When conditions differ

The evidence doesn't actually contradict the thesis - it confirms it. The contradicting evidence shows a Read tool call for "/Users/chietala/Code/engram/src/skill-generator/index.ts", which is part of a series of Read operations shown in the context. The context reveals the user has been systematically reading multiple files across the codebase (skill-generator, llm, dialectic modules, and README), which is exactly the "iterative, breadth-first investigation" and "repeated reads and dependency-following" behavior described in the thesis. There's no modification attempt shown, only exploration through reading. The pattern described in the thesis is being actively demonstrated, not contradicted. The framing of this as a "contradiction" appears to be either a test of analytical reasoning or a mislabeling - the evidence actually provides strong support for the thesis. (Resolution hint: If this were truly a contradiction, reconciliation would involve recognizing that exploration patterns vary based on task context: systematic breadth-first reading applies when understanding architecture holistically, while targeted depth-first reading applies when debugging specific issues or implementing localized features. However, since the evidence actually supports rather than contradicts the thesis, the 'reconciliation' is simply acknowledging that the pattern is being consistently followed across multiple file reads.)
