---
name: read-with
description: Systematically explores a codebase through breadth-first file reading with intentional revisitation when additional context makes re-examination valuable.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T19:04:54.091Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: ebdc07da-0069-4f3d-ab80-5ff76d570c87
---

# Read With

## Overview

Start by reading diverse files across different parts of the codebase to build a mental map of the architecture, using Glob to discover file patterns when needed. As you accumulate context about relationships and patterns, intentionally revisit previously-read files to understand them in light of new discoveries or to reference specific implementation details. Use Bash sparingly for operations like checking git history or running quick verification commands. Ensure each re-read has a clear purpose—either contextual re-examination or detail reference—rather than redundant exploration.

## When to Use

- Understanding a new or unfamiliar codebase's architecture and organization
- Tracing how different modules and components interact across the system
- Building comprehensive knowledge before implementing features that span multiple files
- Investigating complex bugs or behaviors that require understanding multiple interconnected parts
- Preparing architectural refactoring plans that need full system context
- Documenting system design or creating architectural diagrams
- Onboarding to a project where relationships between components aren't immediately clear

## Steps

1. **Follow the pattern described above**
   Systematic codebase exploration combines breadth-first discovery with intentional revisitation. Initial exploration should prioritize reading diverse files across the codebase to build a mental map, b

## Edge Cases

### When conditions differ

The thesis claims the user is practicing "systematic codebase exploration" with "repeated reads and breadth-first navigation," but the contradicting evidence shows a **duplicate read of the exact same file** (`/Users/chietala/Code/engram/src/skill-runtime/index.ts`). This is not breadth-first navigation—it's a redundant operation that revisits already-explored territory. Truly systematic exploration would avoid re-reading the same file without new context or purpose, instead moving to new areas of the codebase to build comprehensive understanding. The duplicate read suggests either: (1) inefficient exploration patterns, (2) the user forgot they already read this file, or (3) the read serves a different purpose than initial exploration (like reference or verification). (Resolution hint: The thesis and evidence can be reconciled by recognizing that systematic exploration has multiple phases. The user may be transitioning from **breadth-first discovery** (reading diverse files once) to **depth-first analysis** (re-reading specific files for detailed understanding). The duplicate read could be intentional—returning to skill-runtime/index.ts after exploring related files to now understand it in fuller context. Alternatively, the exploration may be systematic at a higher level (covering all relevant modules) even if individual tool calls show inefficiencies like duplicate reads due to working memory constraints or lack of read-tracking mechanisms.)
