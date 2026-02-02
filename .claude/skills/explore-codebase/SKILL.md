---
name: explore-codebase
description: Helps you systematically discover and understand how a feature or functionality is implemented across a codebase
metadata:
  author: engram
  version: "1.1"
  generatedAt: 2026-02-02T14:08:48.766Z
  sourcePatternId: 7a9911fe-ffe3-4437-9177-b91c57edc187
  sourceSynthesisId: cbfd1bbb-18c3-4093-8beb-bf29da2e2307
---

# Explore Codebase

## Overview

Start with broad searches using keywords, file patterns, or exported symbols to identify which files contain the target functionality. Once you've located the primary files, narrow your focus with targeted queries to understand specific implementations, type definitions, or function signatures. This two-phase approach—discovery followed by detailed inspection—efficiently navigates from "where is this?" to "how does this work?"

## When to Use

- When joining a new project and need to understand how it's organized
- When investigating how a feature works across multiple interconnected files
- When debugging complex issues that require understanding the broader system context
- When evaluating whether a codebase follows certain patterns or architectural principles
- When preparing to make changes and need to understand existing conventions and structure
- You need to understand how an existing feature works before modifying it
- You're looking for similar patterns or implementations to reuse elsewhere
- You want to trace how a specific API or function is implemented across multiple files
- You need to understand the architecture of a particular subsystem or module
- You're debugging an issue and need to find where functionality is defined and used

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

### When conditions differ

The contradicting evidence shows the user employing `grep` with very specific piped constraints (`grep -A5 "FtsResult" ... | head -10`) rather than continuing with broader search strategies. This contradicts the thesis in two key ways:

1. **Narrowing instead of broadening**: The thesis claims the user is employing "progressively broader search strategies," but the evidence shows the opposite - they're drilling down into a specific type (`FtsResult`) in a specific file (`src/memory/processing/retriever.ts`) with precise output limiting.

2. **Known target rather than discovery**: The search pattern indicates the user already knows what they're looking for (the `FtsResult` type) and where it is (specific file path). This is targeted inspection, not exploratory searching. They're examining implementation details of something already located, not trying to find where FTS functionality exists.

The context shows earlier Grep and Read operations on the same file, suggesting the user has already completed the discovery phase and is now in detailed inspection mode, examining specific types and their definitions within known FTS-related files. (Resolution hint: The thesis could be refined to distinguish between two distinct phases: (1) **Discovery phase** - progressively broader searches to locate FTS functionality across the codebase, followed by (2) **Inspection phase** - progressively narrower, targeted queries to understand implementation details once relevant files are found. The contradicting evidence represents the second phase, where the user has transitioned from "Where is FTS?" to "How does FtsResult work?" The pattern isn't contradicted if we recognize this as a natural progression from broad exploration to focused examination.)
