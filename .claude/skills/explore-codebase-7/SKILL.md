---
name: explore-codebase-7
description: Adaptively calibrates codebase exploration depth based on domain familiarity to optimize efficiency and accuracy.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T18:16:19.167Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: 6b174168-b9be-44fd-aa8d-a28582212392
---

# Explore Codebase 7

## Overview

Before modifying code, assess your familiarity with the domain and architectural patterns. In unfamiliar territory, conduct thorough exploration using multiple Read operations, Glob patterns, and Grep searches to build a complete mental model of the system's structure, conventions, and dependencies. In well-understood domains where you recognize patterns and idioms, proceed more directly with minimal exploration. Continuously evaluate whether you have sufficient context or need deeper investigation.

## When to Use

- Working in an unfamiliar codebase where you don't understand the architectural patterns or conventions
- Encountering complex domain-specific logic that requires understanding multiple interconnected components
- Modifying systems with non-standard or custom architectures that differ from typical patterns
- Beginning work on a new project where establishing accurate mental models is critical
- Switching between familiar and unfamiliar parts of the same codebase during a single task
- Recognizing that your initial assumptions about code structure were incorrect and deeper exploration is needed

## Steps

1. **Follow the pattern described above**
   Developers should adjust their exploration depth inversely to their familiarity with the codebase domain. In unfamiliar or architecturally complex areas, conduct systematic reconnaissance through mult

## Edge Cases

### When conditions differ

The thesis suggests a cautious, exploration-first methodology where the user reads files extensively to understand architecture before making changes. However, the contradicting evidence shows the opposite: the user read a single file (`/Users/chietala/Code/engram/src/skill-generator/index.ts`) and then immediately executed multiple destructive operations (DELETE from database, direct bun execution) without further exploration. This indicates a confident, action-oriented approach rather than the systematic, thorough exploration pattern the thesis describes. The user appears to already understand the codebase well enough to make direct modifications without additional reconnaissance. (Resolution hint: These approaches represent different phases of codebase interaction. The thesis describes the "learning phase" where unfamiliar code requires systematic exploration to build mental models and reduce refactoring risk. The evidence shows the "execution phase" where existing knowledge enables direct action. The pattern could be reconciled by recognizing that thoroughness varies with familiarity: users explore extensively when entering new territory but act decisively in familiar domains. The same user likely exhibits both behaviors depending on whether they're working in known vs unknown parts of their codebase.)
