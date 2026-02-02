---
name: remove-legacy-heuristics
description: Systematically reads and analyzes multiple related files to understand implementation details before making changes.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T14:09:02.840Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: ccc1bed0-7098-4181-ada4-8a4a76af5abd
---

# Remove Legacy Heuristics

## Overview

Use this skill when you need to understand existing code structure before modifying it. First, use Glob or Grep to discover relevant files based on patterns or content. Then read the identified files in logical order—starting with core dependencies and moving to dependent files. Read related files together in parallel when they don't have dependencies on each other to improve efficiency.

## When to Use

- Removing outdated code that has been replaced with newer implementations
- Understanding how a feature is implemented across multiple files before refactoring
- Analyzing dependencies between files before making architectural changes
- Investigating code patterns to ensure consistency when making updates

## Steps

1. **Follow the pattern described above**
   When performing file read operations, distinguish between file discovery and file reading phases. Use pattern-based search tools (Glob for file patterns like "**/*.ts", Grep for content patterns) to d

## Edge Cases

### When conditions differ

The thesis suggests that when performing read operations, the Read tool should be used "with observed patterns" - implying that file reads should follow some previously observed pattern or convention. However, the contradicting evidence shows a Read tool invocation with a direct, absolute file path ("/Users/chietala/Code/engram/src/skill-generator/index.ts") that doesn't appear to follow any special pattern. The Read call is straightforward and doesn't demonstrate any pattern-based behavior - it's just reading a specific file by its explicit path. (Resolution hint: The thesis should be clarified to distinguish between two types of patterns: (1) file path patterns for discovery (use Glob tool with patterns like '*.ts'), and (2) workflow patterns for proper tool usage (read before edit, read related files together). The Read tool itself operates on explicit paths and doesn't use patterns - pattern matching happens before calling Read, during the file discovery phase. The thesis could be reconciled by stating: "When discovering files to read, use pattern-based search tools (Glob/Grep). When reading known files, use Read tool with absolute paths, following observed workflow patterns like reading dependencies in order or reading related files together.")
