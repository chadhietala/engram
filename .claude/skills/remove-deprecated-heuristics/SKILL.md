---
name: remove-deprecated-heuristics
description: Helps you systematically remove outdated heuristic-based code that has been replaced by modern LLM-based implementations.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T16:38:21.670Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: ccc1bed0-7098-4181-ada4-8a4a76af5abd
---

# Remove Deprecated Heuristics

## Overview

Use this skill when you need to safely remove deprecated heuristic logic from your codebase. Start by identifying the deprecated code locations, then read the relevant files to understand dependencies and usage patterns. Remove the old implementations while ensuring no active code depends on them, and verify that LLM-based replacements are properly integrated.

## When to Use

- You've replaced rule-based or heuristic logic with LLM-powered implementations
- You need to clean up legacy code patterns that are no longer maintained
- You want to remove technical debt from outdated algorithmic approaches
- You're modernizing a codebase by eliminating manual pattern-matching code
- You need to ensure deprecated heuristic functions aren't being used anywhere

## Steps

1. **Identify deprecated heuristic code**
   Search for heuristic-related patterns, function names, or comments indicating old logic. Use Grep to find keywords like 'heuristic', 'deprecated', or specific function names that were replaced.

2. **Read affected files to understand context**
   Use Read tool to examine the files containing deprecated code, focusing on understanding what the heuristic did, where it's called, and what replaced it. Read related files in parallel to build a complete picture.

3. **Verify LLM replacements are active**
   Confirm that the new LLM-based implementations are properly integrated and being used instead of the old heuristics. Check for feature flags, configuration, or routing logic.

4. **Check for remaining dependencies**
   Search the codebase for any remaining references to the deprecated heuristic functions to ensure nothing will break when they're removed.

5. **Remove the deprecated code**
   Delete the old heuristic implementations, associated tests, and any supporting utilities that are no longer needed. Update imports and exports accordingly.

6. **Verify the changes**
   Run tests and builds to ensure the removal didn't break anything. Confirm that the codebase still functions correctly with only the LLM-based implementations.
