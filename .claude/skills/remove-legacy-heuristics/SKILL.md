---
name: remove-legacy-heuristics
description: Identifies and removes legacy heuristic-based code that has been superseded by modern LLM-based implementations.
metadata:
  author: engram
  version: "1.1"
  generatedAt: 2026-02-02T16:46:40.089Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: bd699264-bd65-4178-b002-78aed980e1ca
---

# Remove Legacy Heuristics

## Overview

This skill helps you safely remove outdated rule-based or heuristic logic after migrating to LLM-powered solutions. Start by thoroughly reading the codebase to understand the system architecture and identify where old heuristics exist alongside newer implementations. Map the relationships between legacy code and its modern replacements, then systematically remove the deprecated logic while verifying that the LLM-based approach fully covers the previous functionality.

## When to Use

- When you've migrated from rule-based or heuristic systems to LLM-based implementations
- When you need to reduce technical debt by removing redundant code paths
- When you want to identify which legacy patterns are still in use versus which can be safely removed
- After implementing AI-powered features that replace manual logic
- After migrating from rule-based systems to LLM-powered implementations
- When cleaning up technical debt from gradual AI integration
- To remove deprecated heuristic logic that duplicates LLM functionality
- During refactoring of cognitive or reasoning systems that evolved from deterministic to AI-driven approaches
- When consolidating multiple processing pathways into unified LLM-based solutions

## Steps

1. **Map the system architecture**
   Read core configuration and entry point files to understand the overall structure, module organization, and key components of the system.

2. **Identify heuristic-based modules**
   Search for files containing rule-based logic, scoring functions, pattern matching, or manual decision trees that might be candidates for removal.

3. **Analyze replacement implementations**
   Examine the new LLM-based code to understand what functionality it provides and confirm which legacy patterns it supersedes.

4. **Trace usage and dependencies**
   Search for references to legacy code across the codebase to determine what's still actively used versus what's been fully replaced.

5. **Remove obsolete code safely**
   Delete or refactor the identified legacy heuristics while ensuring no active code paths depend on them, preserving system functionality.

## Edge Cases

### When conditions differ

The thesis asserts the user is "comprehensively exploring" the engram codebase to understand its memory/knowledge architecture and dialectical reasoning. However, the contradicting evidence shows the user is actually **building and generating** rather than just exploring. Specifically, they're reading `/src/skill-generator/script-generator.ts` - a code generation tool that transforms captured procedural patterns into executable Bun scripts. This is active development work on the skill generation pipeline itself, not passive exploration of how memory encoding works. The context further contradicts the exploration thesis by revealing the user is in the midst of a database schema migration (from denormalized to normalized many-to-many relationships) and examining `.claude/skills/build-metacognitive/script.ts` - an auto-generated skill script. These actions indicate the user is refactoring and improving engram's skill generation infrastructure, not studying its theoretical architecture. (Resolution hint: The thesis and evidence represent different phases of the same meta-cognitive development cycle. The user likely **began** with comprehensive exploration (understanding dialectical reasoning, memory encoding) and has now **transitioned** to active development (improving the skill generator that operationalizes those patterns). The "exploration" phase focused on engram's theoretical knowledge processing architecture, while the current "development" phase focuses on making that architecture generate better executable skills. This is recursive self-improvement: understanding how engram learns patterns, then improving how it transforms those learned patterns into reusable skills. Both modes serve the same ultimate goal - just at different layers of abstraction.)
