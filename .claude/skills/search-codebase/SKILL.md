---
name: search-codebase
description: Systematically searches codebases using a two-phase discovery-then-inspection approach to locate and understand functionality.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T14:12:18.590Z
  sourcePatternId: ca9a7667-8d0a-4d52-ac4f-99436220c3d3
  sourceSynthesisId: 86f883ac-6655-4af1-9996-9562e3306936
---

# Search Codebase

## Overview

Start with broad discovery searches using keywords, file patterns, and export statements to identify relevant files. Once you've located the primary files containing the target functionality, transition to focused inspection using specific type searches, targeted grep queries, and reading specific file sections. Progressively narrow your queries as you gain understanding, moving from "where is this feature?" to "how does this specific part work?"

## When to Use

- Understanding how a specific feature or functionality is implemented across an unfamiliar codebase
- Locating APIs, functions, or components when you don't know where they're defined
- Tracing implementation details after identifying the general area where functionality exists
- Investigating complex features that span multiple files or modules
- Learning codebase architecture by following the discovery-to-detail pattern

## Steps

1. **Follow the pattern described above**
   When a user searches for functionality across a codebase, they follow a two-phase pattern: (1) Discovery Phase - employing progressively broader search strategies (keywords, file patterns, exports) to

## Edge Cases

### When conditions differ

The contradicting evidence shows the user employing `grep` with very specific piped constraints (`grep -A5 "FtsResult" ... | head -10`) rather than continuing with broader search strategies. This contradicts the thesis in two key ways:

1. **Narrowing instead of broadening**: The thesis claims the user is employing "progressively broader search strategies," but the evidence shows the opposite - they're drilling down into a specific type (`FtsResult`) in a specific file (`src/memory/processing/retriever.ts`) with precise output limiting.

2. **Known target rather than discovery**: The search pattern indicates the user already knows what they're looking for (the `FtsResult` type) and where it is (specific file path). This is targeted inspection, not exploratory searching. They're examining implementation details of something already located, not trying to find where FTS functionality exists.

The context shows earlier Grep and Read operations on the same file, suggesting the user has already completed the discovery phase and is now in detailed inspection mode, examining specific types and their definitions within known FTS-related files. (Resolution hint: The thesis could be refined to distinguish between two distinct phases: (1) **Discovery phase** - progressively broader searches to locate FTS functionality across the codebase, followed by (2) **Inspection phase** - progressively narrower, targeted queries to understand implementation details once relevant files are found. The contradicting evidence represents the second phase, where the user has transitioned from "Where is FTS?" to "How does FtsResult work?" The pattern isn't contradicted if we recognize this as a natural progression from broad exploration to focused examination.)
