---
name: build-context
description: Systematically explore and understand unfamiliar codebases by building context progressively from high-level structure to specific implementation details
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T14:27:02.885Z
  sourcePatternId: 7a9911fe-ffe3-4437-9177-b91c57edc187
  sourceSynthesisId: cbfd1bbb-18c3-4093-8beb-bf29da2e2307
---

# Build Context

## Overview

Start by surveying the codebase structure and reading foundational files completely to build your mental model. Once you understand the layout and identify areas of interest, return to specific files with targeted reads to examine particular sections in detail. This two-phase approach prevents information overload while ensuring thorough understanding.

## When to Use

- Learning how a new codebase is organized and structured
- Understanding an unfamiliar feature's implementation across multiple files
- Onboarding to a new project and building mental models of its architecture
- Investigating how specific functionality works when you don't know where to start
- Tracing implementation details after identifying relevant components

## Steps

1. **Survey the high-level structure**
   Begin by reading documentation files (README, CONTRIBUTING), examining directory structure with glob patterns, and identifying key configuration files to understand the project's organization and conventions.

2. **Build initial context with complete reads**
   Read entire files of interest from top to bottom without offsets to grasp overall structure, patterns, and relationships between components. Focus on entry points, core modules, and files that appear frequently referenced.

3. **Identify areas requiring deeper investigation**
   As you build your mental model, note which specific functions, classes, or sections warrant closer examination based on your exploration goals.

4. **Perform targeted deep dives**
   Return to previously read files using offset-based reads to re-examine specific sections, trace function implementations, and understand detailed logic without re-reading entire files.

5. **Trace connections across files**
   Use keyword searches to follow how components interact, tracking imports, function calls, and data flow between the files you've identified as relevant.
