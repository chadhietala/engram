---
name: improve-skill-generation
description: Refactors code generation logic by analyzing implementation patterns across multiple files to identify and remove obsolete heuristics.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T14:07:33.146Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: 1e96fca7-3e46-45b8-919d-8c3ce4b66df7
---

# Improve Skill Generation

## Overview

Use this skill when you need to understand how a complex system works before making architectural changes. It systematically reads related files (types, core logic, utilities, and scripts) to build a complete picture of the implementation, then makes targeted improvements to the codebase. The skill is particularly useful for removing outdated logic and improving code quality based on the actual patterns found in the code.

## When to Use

- When refactoring a code generation or templating system that has accumulated technical debt
- When you need to understand implementation patterns across multiple interconnected files before making changes
- When removing obsolete heuristics or logic that no longer aligns with the system's goals
- When improving naming conventions or generation logic in a codebase with scattered related files
- When you need to trace how types, core logic, and utilities interact before making architectural decisions

## Steps

1. **Follow the pattern described above**
   Abstracted pattern from "Complex operation involving Read, Bash tools following observed sequence.": Incorporates variations: Pattern refined with additional condition: file_path, file_extension, dire

## Edge Cases

### When conditions differ

Pattern refined with additional condition: file_path, file_extension, directory
