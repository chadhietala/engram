---
name: fix-skill-naming-logic
description: Read known files directly to understand their structure and implementation details
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T14:10:17.611Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: 36ae40e8-a4b8-4554-965d-d93217dd1b76
---

# Fix Skill Naming Logic

## Overview

When you know the exact file paths you need to examine, use this approach to efficiently read and analyze their contents. Start by reading the primary file you're investigating, then read related files to understand dependencies, types, and implementation patterns. This works best when you have a clear target (like a specific module or feature) and know where the relevant code lives.

## When to Use

- You need to understand how a specific module or feature is implemented
- You're investigating code in known file locations to fix a bug or improve functionality
- You want to trace the flow between related files when you already know their paths
- You're reviewing type definitions, interfaces, or contracts used across multiple known files

## Steps

1. **Follow the pattern described above**
   When reading files, use the Read tool directly with explicit absolute paths when the file location is known. Use pattern-matching tools (Glob/Grep) first to discover file locations when paths are unkn

## Edge Cases

### When conditions differ

The thesis states "When performing read, file operations, use Read tool with observed patterns" - implying that the Read tool should be used in conjunction with pattern matching or searching. However, the contradicting evidence shows the Read tool being invoked with a direct, explicit file path ("/Users/chietala/Code/engram/src/skill-generator/script-generator.ts") without any pattern matching, globbing, or searching behavior. This is a straightforward file read operation using an absolute path, not a pattern-based approach. (Resolution hint: The thesis may be ambiguous about what "observed patterns" means. It could be clarified as: "When the file location is unknown, use pattern-matching tools (Glob/Grep) to discover files before reading. When the file path is known explicitly, use Read directly with the absolute path." The contradiction resolves if we interpret "observed patterns" as referring to patterns discovered through prior exploration rather than a requirement to always use pattern-matching tools alongside Read.)
