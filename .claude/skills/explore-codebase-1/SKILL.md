---
name: explore-codebase-1
description: Performs systematic codebase exploration and analysis through phased investigation before implementation.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T16:03:54.385Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: bd699264-bd65-4178-b002-78aed980e1ca
---

# Explore Codebase 1

## Overview

Use this skill when approaching unfamiliar or complex codebases where you need to build understanding before making changes. Start with broad architectural exploration using Read and Glob to map the system structure, then progressively narrow focus to specific modules relevant to your task. Allow your understanding to crystallize through iterative reading before transitioning to implementation decisions.

## When to Use

- Working with an unfamiliar codebase for the first time
- Planning significant refactoring or architectural changes
- Investigating how specific patterns or systems are implemented across multiple modules
- Building context before implementing features that touch multiple parts of the system
- Understanding dependencies and relationships between components before making modifications

## Steps

1. **Follow the pattern described above**
   When engaging with a complex codebase, employ a phased approach: (1) Begin with broad exploration using Read and Glob to understand system architecture and identify areas of interest, (2) Transition t

## Edge Cases

### When conditions differ

The thesis claims the user is investigating the Engram system through systematic exploration (broad scanning → focused analysis on dialectic synthesis). However, the contradicting evidence shows the user is actively **editing and refactoring code** rather than just investigating. The evidence reveals:

1. **Active modification** of database schema (Edit on `/src/db/schema.ts`) - refactoring from array-based to relational structure
2. **Type system changes** (Edit on `/src/types/dialectic.ts`) - updating type definitions
3. **Database migration work** (Bash with sqlite3 commands) - transforming existing data
4. **Script development** (Read on `.claude/skills/improve-skill-generation/scripts/script.ts`) - building tooling

This is **implementation and refactoring work**, not investigative exploration. The user has already investigated the codebase and is now in the execution phase of a coordinated refactoring effort. The "focused analysis" interpretation misreads code modification as code study. (Resolution hint: The thesis and evidence represent **different phases of the same workflow**. The thesis may have been accurate earlier in the session when the user was investigating. Now, the user has transitioned from investigation to implementation. They likely: (1) explored the codebase to understand the dialectic system, (2) identified the need for array→relational refactoring, and (3) are now executing that refactoring. The contradiction resolves by recognizing this is a **temporal progression** - investigation preceded implementation. The current activity should be described as "executing a coordinated database refactoring based on prior investigation of the Engram system.")
