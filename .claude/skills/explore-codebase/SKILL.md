---
name: explore-codebase
description: Helps you systematically discover and understand how specific functionality is implemented across a codebase.
metadata:
  author: engram
  version: "1.1"
  generatedAt: 2026-02-02T16:36:58.167Z
  sourcePatternId: 7a9911fe-ffe3-4437-9177-b91c57edc187
  sourceSynthesisId: cbfd1bbb-18c3-4093-8beb-bf29da2e2307
---

# Explore Codebase

## Overview

This skill guides you through a two-phase exploration process: first casting a wide net to discover where functionality lives, then narrowing focus to understand implementation details. Start with broad searches using keywords, file patterns, or export statements to locate relevant files. Once you've identified the primary files, switch to targeted queries that examine specific types, functions, or code sections to understand how the feature actually works.

## When to Use

- When exploring a new codebase for the first time
- When trying to understand how a feature is implemented across multiple files
- When you need to locate where specific functionality lives before making changes
- When debugging unfamiliar code and need to trace execution flow
- When evaluating codebase architecture or patterns before starting work
- You need to understand how an existing feature is implemented
- You're looking for APIs or functions related to specific functionality
- You want to locate all files involved in a particular system or workflow
- You're debugging and need to trace how something works across multiple files
- You're planning to modify or extend existing functionality and need context

## Steps

1. **Survey the landscape**
   Begin by reading high-level documentation (README files, architecture docs) and examining the directory structure to understand the project's organization and key components.

2. **Build initial understanding**
   Read complete versions of core files to grasp overall structure, patterns, and conventions used throughout the codebase.

3. **Identify focus areas**
   Use file structure insights and initial reads to pinpoint which components, modules, or files are most relevant to your goal.

4. **Trace implementation details**
   Return to specific files with targeted reads, examining particular functions, classes, or sections that implement the functionality you're investigating.

5. **Connect the pieces**
   Follow references and dependencies between files to understand how components interact and data flows through the system.

## Edge Cases

### When conditions differ

The contradicting evidence shows the user employing `grep` with very specific piped constraints (`grep -A5 "FtsResult" ... | head -10`) rather than continuing with broader search strategies. This contradicts the thesis in two key ways:

1. **Narrowing instead of broadening**: The thesis claims the user is employing "progressively broader search strategies," but the evidence shows the opposite - they're drilling down into a specific type (`FtsResult`) in a specific file (`src/memory/processing/retriever.ts`) with precise output limiting.

2. **Known target rather than discovery**: The search pattern indicates the user already knows what they're looking for (the `FtsResult` type) and where it is (specific file path). This is targeted inspection, not exploratory searching. They're examining implementation details of something already located, not trying to find where FTS functionality exists.

The context shows earlier Grep and Read operations on the same file, suggesting the user has already completed the discovery phase and is now in detailed inspection mode, examining specific types and their definitions within known FTS-related files. (Resolution hint: The thesis could be refined to distinguish between two distinct phases: (1) **Discovery phase** - progressively broader searches to locate FTS functionality across the codebase, followed by (2) **Inspection phase** - progressively narrower, targeted queries to understand implementation details once relevant files are found. The contradicting evidence represents the second phase, where the user has transitioned from "Where is FTS?" to "How does FtsResult work?" The pattern isn't contradicted if we recognize this as a natural progression from broad exploration to focused examination.)
