---
name: improve-skill-generation
description: Helps you understand and refactor complex systems by mapping implementation patterns across multiple interconnected files
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T14:25:46.095Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: 1e96fca7-3e46-45b8-919d-8c3ce4b66df7
---

# Improve Skill Generation

## Overview

Use this skill when you need to refactor or improve a system that spans multiple files and components. It helps you systematically explore the codebase, understand how different pieces connect, identify patterns in the current implementation, and plan changes that maintain consistency across the entire system. This is especially valuable for architectural improvements where you need to see the big picture before making changes.

## When to Use

- Refactoring a feature that touches multiple files and directories
- Understanding how a complex system is architected before making changes
- Identifying patterns and inconsistencies across related components
- Planning improvements to code organization or system design
- Investigating dependencies between different parts of the codebase

## Steps

1. **Identify the core components**
   Start by reading the main entry points and central files to understand the system's primary purpose and structure.

2. **Map related files and dependencies**
   Use glob patterns to discover related files across directories, then read key files to understand how components connect and depend on each other.

3. **Trace implementation patterns**
   Follow the flow through multiple files to identify recurring patterns, architectural decisions, and how data or logic flows through the system.

4. **Identify improvement opportunities**
   Look for inconsistencies, obsolete code, or areas where patterns could be simplified or better organized.

5. **Verify the current state**
   Use commands to check file structure, run tests, or validate assumptions about how the system currently behaves.

6. **Plan systematic changes**
   Based on your understanding, create a coherent plan for refactoring that maintains consistency across all affected files.
