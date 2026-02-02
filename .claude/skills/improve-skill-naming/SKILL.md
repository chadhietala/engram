---
name: improve-skill-naming
description: Improves code generation systems by analyzing implementation patterns across multiple files to understand architectural decisions and naming conventions.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T16:33:45.973Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: 1e96fca7-3e46-45b8-919d-8c3ce4b66df7
---

# Improve Skill Naming

## Overview

Use this skill when you need to enhance a code generation or naming system by studying how similar functionality is implemented elsewhere in the codebase. Start by examining the system's current implementation, then explore related files to identify patterns in naming, structure, and logic. Use insights from existing code to inform better semantic naming and architectural decisions.

## When to Use

- You want to improve automated naming or code generation to be more semantically meaningful
- You need to understand how a system currently works before making improvements
- You're refactoring a feature and want to align with existing codebase patterns
- You need to analyze multiple related files to understand architectural conventions
- You want to make a code generator produce outputs consistent with the project's style

## Steps

1. **Examine the target system**
   Read the main implementation files of the system you want to improve to understand its current logic, structure, and limitations.

2. **Discover related patterns**
   Use glob patterns and file searches to find related files, such as type definitions, utilities, or similar features that follow the conventions you want to adopt.

3. **Analyze implementation details**
   Read through discovered files to identify naming conventions, architectural patterns, and structural decisions used elsewhere in the codebase.

4. **Identify improvement opportunities**
   Compare the current implementation against discovered patterns to pinpoint where semantic naming, better abstractions, or architectural alignment could help.

5. **Validate with testing**
   Run existing tests or scripts to ensure your understanding is correct and that any proposed changes align with the system's behavior.
