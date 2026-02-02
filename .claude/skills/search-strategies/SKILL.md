---
name: search-strategies
description: Systematically discovers and inspects functionality across a codebase using progressively refined search strategies.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T15:59:53.022Z
  sourcePatternId: ca9a7667-8d0a-4d52-ac4f-99436220c3d3
  sourceSynthesisId: 86f883ac-6655-4af1-9996-9562e3306936
---

# Search Strategies

## Overview

Start with broad discovery techniques (keyword searches, file pattern matching, export scanning) to identify files containing the target functionality. Once relevant files are located, transition to focused inspection using targeted queries (specific type definitions, line-limited reads, precise file paths) to understand implementation details. Adjust search breadth dynamically based on findings at each stage.

## When to Use

- Understanding how a feature or API is implemented across unfamiliar codebases
- Locating the source of specific functionality when file structure is unknown
- Investigating existing patterns before implementing similar features
- Tracing dependencies and relationships between components
- Exploring codebases to answer architectural questions

## Steps

1. **Follow the pattern described above**
   When a user searches for functionality across a codebase, they follow a two-phase pattern: (1) Discovery Phase - employing progressively broader search strategies (keywords, file patterns, exports) to

## Edge Cases

### When conditions differ

The contradicting evidence shows the user employing `grep` with very specific piped constraints (`grep -A5 "FtsResult" ... | head -10`) rather than continuing with broader search strategies. This contradicts the thesis in two key ways:

1. **Narrowing instead of broadening**: The thesis claims the user is employing "progressively broader search strategies," but the evidence shows the opposite - they're drilling down into a specific type (`FtsResult`) in a specific file (`src/memory/processing/retriever.ts`) with precise output limiting.

2. **Known target rather than discovery**: The search pattern indicates the user already knows what they're looking for (the `FtsResult` type) and where it is (specific file path). This is targeted inspection, not exploratory searching. They're examining implementation details of something already located, not trying to find where FTS functionality exists.

The context shows earlier Grep and Read operations on the same file, suggesting the user has already completed the discovery phase and is now in detailed inspection mode, examining specific types and their definitions within known FTS-related files. (Resolution hint: The thesis could be refined to distinguish between two distinct phases: (1) **Discovery phase** - progressively broader searches to locate FTS functionality across the codebase, followed by (2) **Inspection phase** - progressively narrower, targeted queries to understand implementation details once relevant files are found. The contradicting evidence represents the second phase, where the user has transitioned from "Where is FTS?" to "How does FtsResult work?" The pattern isn't contradicted if we recognize this as a natural progression from broad exploration to focused examination.)
