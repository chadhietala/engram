---
name: evolve-skill-generation
description: Refactor complex systems by conducting breadth-first architectural reconnaissance followed by depth-first analysis of critical components.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T16:57:59.873Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: 5f73041c-17ce-43e8-afd8-a1fce7bbe050
---

# Evolve Skill Generation

## Overview

Start with broad exploration to map system boundaries and identify all components involved in your refactoring scope. When you discover files central to the change, perform deep investigations with multiple reads to fully understand their implementation. Complete your architectural survey before transitioning to focused implementation with intensive analysis of target files.

## When to Use

- When refactoring systems that span multiple architectural layers
- When you need to understand how components interact before making structural changes
- When evolving a feature that combines multiple patterns or paradigms
- When the full scope of changes isn't immediately clear from initial requirements
- When changes require maintaining compatibility with existing interfaces

## Steps

1. **Map system boundaries broadly**
   Start with breadth-first exploration to identify all components, interfaces, and boundaries related to your refactoring scope. Get a high-level understanding of the system's architecture.

2. **Identify critical components**
   As you explore, mark files and modules that are central to your refactoring goal. These are candidates for deeper investigation.

3. **Investigate critical files deeply**
   Switch to depth-first mode for components you've identified as critical. Read these files multiple times to understand implementation details, patterns, and dependencies.

4. **Complete architectural survey**
   Return to breadth-first exploration to ensure you haven't missed any important components or connections in the system.

5. **Enter focused implementation mode**
   Once you understand the full architecture, perform intensive depth-first reads of your specific target files to guide your refactoring implementation.
