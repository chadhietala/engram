---
name: debug-skill-naming
description: Investigate code behavior by reading multiple related files in sequence when you know their exact locations.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T16:40:05.550Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: 36ae40e8-a4b8-4554-965d-d93217dd1b76
---

# Debug Skill Naming

## Overview

When you need to understand how a specific feature or system works and you already know which files to examine, read them directly in a logical order. Start with the main entry point or core logic, then follow dependencies or related components. This approach works best when file paths are clear from context, documentation, or previous exploration.

## When to Use

- Debugging unexpected behavior in code you're familiar with
- Following a code path through known files to understand execution flow
- Investigating how a specific feature is implemented across multiple files
- Reading configuration, type definitions, and implementation files in sequence
- Examining related files when paths are documented or provided

## Steps

1. **Identify the relevant files**
   Determine which files contain the code you need to investigate based on the issue description, error messages, or your knowledge of the codebase structure.

2. **Read the primary file first**
   Start with the main entry point, configuration file, or the file most directly related to the behavior you're investigating.

3. **Follow dependencies sequentially**
   Read imported modules, type definitions, or related components in the order that helps you build understanding of the system.

4. **Re-read files if needed**
   Return to previously read files with specific line ranges or focus areas once you have better context from other files.

5. **Synthesize findings**
   Connect insights from all files to form a complete picture of how the feature works or why the issue is occurring.
