---
name: remove-deprecated-heuristics
description: Systematically identify and remove deprecated heuristic-based code that has been superseded by LLM-based implementations
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T14:27:48.646Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: ccc1bed0-7098-4181-ada4-8a4a76af5abd
---

# Remove Deprecated Heuristics

## Overview

This skill helps you safely remove outdated heuristic logic after migrating to LLM-based approaches. Start by reading the main implementation files to understand the current architecture and identify where heuristic code still exists. Then examine related files (templates, dependencies, tests) to understand the full scope of what needs to be removed. This ensures you don't accidentally break functionality that depends on the deprecated code.

## When to Use

- After migrating from rule-based logic to LLM-based implementations
- When cleaning up technical debt from deprecated algorithms or heuristics
- During refactoring to remove dual implementations where AI has replaced manual logic
- When consolidating code after A/B testing shows LLM approach is superior

## Steps

1. **Identify main implementation files**
   Read the primary files containing the feature logic to understand which parts use heuristics versus LLM-based approaches. Look for conditional logic, fallback mechanisms, or feature flags that toggle between implementations.

2. **Map dependencies and usage**
   Read related files including templates, configuration, and dependent modules to understand the full scope of heuristic usage. Identify all places where the deprecated code is referenced or called.

3. **Verify LLM replacement coverage**
   Confirm that the LLM-based implementation handles all cases previously covered by heuristics. Check for edge cases, error handling, and any conditional logic that might still rely on the old approach.

4. **Remove deprecated code systematically**
   Delete the heuristic-based implementations, associated helper functions, and any conditional logic that switches between approaches. Update imports and remove unused dependencies.

5. **Clean up configuration and tests**
   Remove feature flags, configuration options, and tests specific to the deprecated heuristic code. Update documentation to reflect the simplified LLM-only implementation.
