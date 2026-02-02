---
name: modernize-skill-generation
description: Performs comprehensive architectural reconnaissance before refactoring or modernizing complex multi-module codebases.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T16:56:22.032Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: b1231c76-4915-49a7-bb54-e712f93bc599
---

# Modernize Skill Generation

## Overview

When you need to understand how different parts of a system interact before making significant changes, use this skill to systematically explore the codebase. Start with broad exploration across multiple modules to understand architecture and dependencies, then narrow focus to specific implementation targets. This two-phase approach prevents premature optimization and ensures changes align with existing patterns.

## When to Use

- Modernizing or refactoring code that spans multiple modules or architectural layers
- Replacing existing implementations (like heuristic algorithms) with new approaches (like LLM-based solutions)
- Understanding how a feature or system is implemented across different files before making changes
- Planning significant architectural changes that require understanding cross-module dependencies
- Investigating unfamiliar codebases before implementing new features

## Steps

1. **Survey architectural boundaries**
   Read entry points and core modules across different parts of the system to understand the overall architecture, module responsibilities, and key interfaces.

2. **Map cross-module dependencies**
   Identify how components interact by examining imports, shared utilities, and data flow patterns between modules to understand coupling and integration points.

3. **Identify modification targets**
   Based on the user's goal, pinpoint the specific files and functions that need to be changed, replaced, or extended.

4. **Create an implementation plan**
   Document your findings and proposed approach in a plan that marks the transition from exploration to execution, including identified files, dependencies, and modification strategy.

5. **Execute focused changes**
   With architectural context established, make targeted modifications to the identified files, reading them in detail as needed for precise edits.
