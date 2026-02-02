---
name: refactor-skill-naming
description: Performs comprehensive codebase exploration by reading multiple related files to understand system architecture before making changes.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T16:59:29.761Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: 190938b2-cc98-4776-9e7c-c6f583a16105
---

# Refactor Skill Naming

## Overview

This skill is most effective when you need deep context about how a system works before refactoring or implementing changes. Start by identifying the core files related to your goal, then systematically read through them to understand patterns, dependencies, and existing implementations. Use this approach when you lack familiarity with the codebase or when changes might have ripple effects across multiple components.

## When to Use

- Before refactoring code that spans multiple files or modules
- When you need to understand existing patterns and architecture before implementing similar features
- When fixing bugs that might be caused by interactions between different parts of the system
- When the user has domain knowledge and you need to catch up on codebase context
- Before making changes that could affect multiple components or have cascading effects

## Steps

1. **Identify core files**
   Determine which files are central to the functionality you need to understand, starting with the most directly related components.

2. **Read entry points and interfaces**
   Begin with main entry points, public APIs, and type definitions to understand the high-level structure and contracts.

3. **Explore implementation files**
   Read through the actual implementation files to understand how features work internally, including utilities and helpers.

4. **Trace dependencies**
   Follow imports and references to related files to build a complete mental model of how components interact.

5. **Identify patterns and conventions**
   Look for recurring patterns, naming conventions, and architectural decisions that should be maintained in your changes.

6. **Synthesize understanding**
   Form a coherent picture of the system's design before proceeding with modifications, ensuring your changes align with existing architecture.
