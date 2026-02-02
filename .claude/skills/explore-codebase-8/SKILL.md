---
name: explore-codebase-8
description: Performs adaptive codebase exploration that transitions from breadth-first reconnaissance to depth-first investigation as relevant files are discovered.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T19:04:38.068Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: db17a9c4-b8b9-4403-be9b-6130794e9748
---

# Explore Codebase 8

## Overview

Start by using breadth-first tools (Glob, Bash ls/find) to survey the codebase structure and identify relevant directories and file patterns. As you discover files of interest, transition naturally to depth-first investigation by reading those files completely, potentially multiple times with different perspectives or offsets. Don't hesitate to re-read files when moving from initial reconnaissance to detailed analysis—this signals you've found important implementation details worth understanding thoroughly before making changes.

## When to Use

- Understanding an unfamiliar codebase before implementing a feature
- Investigating how a specific functionality is implemented across multiple files
- Debugging issues that require understanding both high-level architecture and specific implementation details
- Refactoring code where you need to see both the overall structure and dive deep into particular modules
- Exploring dependencies and relationships between different parts of a system

## Steps

1. **Follow the pattern described above**
   When exploring a codebase, employ adaptive exploration that begins with breadth-first reconnaissance (using Glob, Bash find/ls to survey structure) but seamlessly transitions to depth-first investigat

## Edge Cases

### When conditions differ

The contradicting evidence shows the user reading the SAME file twice in succession (`/Users/chietala/Code/engram/src/worker/index.ts` with limit: 80). This contradicts the thesis's characterization of "breadth-first reconnaissance" in two critical ways:

1. **Depth-first, not breadth-first**: Reading the same file twice consecutively represents a depth-first exploration pattern - diving deeper into a single location rather than surveying multiple locations broadly first.

2. **Redundant reading undermines "cautious" strategy**: A truly cautious, systematic approach would avoid re-reading the same file immediately. This duplication suggests either:
   - Focused investigation into a specific problem area (debugging/targeted fix)
   - The user didn't find what they needed on first read and is re-examining
   - Possible tool invocation error or uncertainty about previous results

The thesis assumes a methodical, comprehensive mapping strategy, but the evidence reveals a more targeted, iterative probing pattern where the user returns to the same artifact multiple times. (Resolution hint: These patterns can be reconciled by recognizing that codebase exploration is rarely purely breadth-first or depth-first - it's adaptive and context-switching. The user may have started with breadth-first reconnaissance (the find commands, reading SKILL.md files), but upon encountering `src/worker/index.ts`, something triggered a shift to depth-first investigation of that specific file. The duplicate read could represent: (1) reading more content after initial preview (though limit:80 appears identical), (2) the transition point where reconnaissance ended and targeted investigation began, or (3) iterative refinement where they're building mental model through repeated examination. The thesis holds for the overall session pattern but breaks down at the granular level where focus intensifies on specific files.)
