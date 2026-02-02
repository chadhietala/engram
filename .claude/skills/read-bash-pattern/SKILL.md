---
name: read-bash-pattern
description: Dynamically switches between breadth-first exploration and depth-first implementation modes to optimize meta-learning system development.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T14:58:29.049Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: 8b79a2e3-e065-4c57-8393-46f5934e274e
---

# Read Bash Pattern

## Overview

Use breadth-first exploration when surveying unknown codebases, discovering patterns, performing meta-analysis, or validating changes across multiple files. Use depth-first implementation when building meta-learning infrastructure, fixing specific bugs, or iterating on individual components. The system should cycle between modes: explore broadly to identify opportunities, implement deeply to build improvements, then explore again to validate and discover new patterns.

## When to Use

- Starting work in an unfamiliar codebase where you need to understand architecture and patterns
- Building or refining meta-learning systems that need to balance discovery and implementation
- Optimizing development workflow by identifying when to survey broadly vs. focus deeply
- Validating that implemented changes work correctly across the system
- Discovering new improvement opportunities after completing focused implementation work

## Steps

1. **Follow the pattern described above**
   A meta-learning system requires both **exploratory breadth-first analysis** (for discovering patterns and building architectural understanding) and **exploitative depth-first implementation** (for ref

## Edge Cases

### When conditions differ

The thesis claims the user is building a system that performs "systematic breadth-first architectural analysis" to explore and improve codebase patterns. However, the contradicting evidence shows a **depth-first, targeted exploration pattern** - the same specific file (`/Users/chietala/Code/engram/src/worker/index.ts`) was read twice in succession, rather than systematically surveying the architecture breadth-first.

This is contradictory because:
1. **Breadth-first** would involve reading many different files at the same level before diving deeper (e.g., reading all files in `/src/` before examining specific subdirectories)
2. **Systematic architectural analysis** would show evidence of structured exploration (like reading package.json, then top-level modules, then dependencies)
3. The **repeated read of the same file** suggests iterative refinement or debugging of a specific component, not meta-level pattern observation

The actual behavior indicates focused implementation work or debugging on a particular module (the worker), rather than the broad, systematic architectural survey that a meta-learning system would perform. (Resolution hint: These approaches could be reconciled if the system is in a **transitional or hybrid state**: the user may be implementing meta-learning capabilities incrementally, where they're currently doing targeted depth-first work to build or fix the meta-learning infrastructure itself (particularly the worker module that might eventually perform breadth-first analysis). The repeated reads of `worker/index.ts` could be implementing the very exploration engine that will later perform systematic architectural analysis. Alternatively, the project might use breadth-first analysis as a tool invoked periodically, while day-to-day development follows normal depth-first patterns.)
