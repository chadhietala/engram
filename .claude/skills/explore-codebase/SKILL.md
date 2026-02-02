---
name: explore-codebase
description: A systematic codebase exploration skill that guides you through understanding unfamiliar code by first surveying structure and documentation, then progressively drilling into implementation details.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T16:01:06.731Z
  sourcePatternId: 7a9911fe-ffe3-4437-9177-b91c57edc187
  sourceSynthesisId: cbfd1bbb-18c3-4093-8beb-bf29da2e2307
---

# Explore Codebase

## Overview

Start by reading high-level files (README, package.json, config files) and surveying the directory structure to understand the project's architecture. Next, perform complete reads of key files to build a mental model of major components and their relationships. Once you've identified areas of interest, return to specific files using targeted reads with offsets to examine particular functions, classes, or sections in detail, tracing implementation patterns and dependencies.

## When to Use

- When joining a new project or examining unfamiliar code for the first time
- When investigating bugs or features in code you didn't write
- When evaluating third-party libraries or dependencies to understand their internals
- When onboarding to a large codebase and need to build contextual understanding
- When preparing to make changes in an area of code you haven't worked with before

## Steps

1. **Follow the pattern described above**
   Users exploring unfamiliar codebases follow a two-phase workflow: (1) **Systematic Exploration** - beginning with high-level documentation, file structure surveys, and initial complete file reads to b

## Edge Cases

### When conditions differ

The contradicting evidence shows the user reading a **specific offset range (lines 57-97) of a file they've already read in full**. This contradicts the thesis of systematic top-down exploration because:

1. **Non-linear navigation**: Instead of progressively moving from overview → structure → details, the user is jumping back to re-examine a specific section of an already-visited file
2. **Targeted re-inspection**: Using offset/limit parameters indicates they're zeroing in on particular lines of interest, not conducting a broad survey
3. **Deep-dive iteration**: The context shows they previously read the entire `retriever.ts` file, and are now returning to scrutinize a narrow section (40 lines starting at line 57)

This behavior suggests **investigative debugging or feature tracing** rather than systematic exploration - the user likely found something interesting or problematic and is now iterating on specific implementation details. (Resolution hint: These patterns represent different phases of the same workflow. Users often begin with systematic top-down exploration (README → structure → initial file reads), but transition to iterative deep-diving once they identify specific areas of interest. The contradiction resolves when viewed as: **Phase 1 (Exploration)** = thesis behavior, **Phase 2 (Investigation)** = contradicting behavior. The user likely completed their initial survey and is now in an active investigation phase, repeatedly examining specific code sections that relate to their current focus (possibly the memory retrieval system, given the file name and context about a "self-referential AI memory system").)
