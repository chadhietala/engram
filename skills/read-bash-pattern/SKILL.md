---
name: read-bash-pattern
description: Performs context-aware file operations by reading files and executing bash commands based on file paths, extensions, and directory structures.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T02:25:31.077Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: 1e96fca7-3e46-45b8-919d-8c3ce4b66df7
---

# Read Bash Pattern

## Overview

This skill analyzes file characteristics (path, extension, location) and intelligently selects appropriate operations. It first reads the target file to understand its contents, then executes relevant bash commands tailored to the file type and context. The skill adapts its behavior based on the file's extension and directory, ensuring operations are appropriate for the specific file being processed.

## When to Use

- When you need to process files differently based on their type or location
- When operations require both reading file contents and executing commands in sequence
- When working with multiple file types that each need specialized handling
- When file analysis must inform subsequent command execution

## Steps

1. **Follow the pattern described above**
   Abstracted pattern from "Complex operation involving Read, Bash tools following observed sequence.": Incorporates variations: Pattern refined with additional condition: file_path, file_extension, dire

## Edge Cases

### When conditions differ

Pattern refined with additional condition: file_path, file_extension, directory
