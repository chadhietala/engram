---
name: improve-skill-naming
description: Efficiently read known files to understand implementation details and make targeted code changes
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T14:29:20.702Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: 36ae40e8-a4b8-4554-965d-d93217dd1b76
---

# Improve Skill Naming

## Overview

When you know exactly which files to examine (from prior exploration, error messages, or context), read them directly using absolute paths. This pattern is ideal for focused investigation after discovery, allowing quick access to specific implementations without searching. Skip pattern-matching tools when file locations are already certain.

## When to Use

- You need to examine specific files mentioned in error messages or stack traces
- You're following up on files discovered in a previous search
- You're reading configuration or type definition files at known standard locations
- You're investigating a specific feature and know which files implement it
- You need to understand implementation details before making changes

## Steps

1. **Identify target files**
   Determine the exact file paths you need to read from context, previous exploration, error messages, or project structure knowledge.

2. **Read files in parallel**
   Use the Read tool with absolute paths for all known files simultaneously to gather information efficiently.

3. **Analyze implementation patterns**
   Examine the code structure, dependencies, types, and logic across the files to understand how the feature or component works.

4. **Identify modification points**
   Locate the specific code sections that need changes based on your understanding of the implementation.

5. **Execute targeted changes**
   Make precise edits to the identified locations using the Edit tool, ensuring changes align with existing patterns.
