---
name: explore-codebase-6
description: Adaptively adjusts codebase exploration depth based on domain familiarity to optimize efficiency and accuracy.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T18:16:17.702Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: 6b174168-b9be-44fd-aa8d-a28582212392
---

# Explore Codebase 6

## Overview

Before modifying code, assess your familiarity with the domain and architecture. In unfamiliar territory, conduct thorough exploration using multiple Read operations, Glob patterns, and Grep searches to understand file structures, naming conventions, and architectural patterns. In well-known domains where patterns are clear, minimize exploration and proceed with confidence. Continuously evaluate whether you have sufficient context or need additional reconnaissance.

## When to Use

- Working in a new codebase or unfamiliar section where architectural patterns are unknown
- Encountering complex or unusual code organization that requires systematic mapping
- Making changes in well-understood domains where exploration would be redundant
- Needing to build mental models of module relationships and dependencies before refactoring
- Recognizing uncertainty about implementation details and requiring more context before proceeding

## Steps

1. **Follow the pattern described above**
   Developers should adjust their exploration depth inversely to their familiarity with the codebase domain. In unfamiliar or architecturally complex areas, conduct systematic reconnaissance through mult

## Edge Cases

### When conditions differ

The thesis suggests a cautious, exploration-first methodology where the user reads files extensively to understand architecture before making changes. However, the contradicting evidence shows the opposite: the user read a single file (`/Users/chietala/Code/engram/src/skill-generator/index.ts`) and then immediately executed multiple destructive operations (DELETE from database, direct bun execution) without further exploration. This indicates a confident, action-oriented approach rather than the systematic, thorough exploration pattern the thesis describes. The user appears to already understand the codebase well enough to make direct modifications without additional reconnaissance. (Resolution hint: These approaches represent different phases of codebase interaction. The thesis describes the "learning phase" where unfamiliar code requires systematic exploration to build mental models and reduce refactoring risk. The evidence shows the "execution phase" where existing knowledge enables direct action. The pattern could be reconciled by recognizing that thoroughness varies with familiarity: users explore extensively when entering new territory but act decisively in familiar domains. The same user likely exhibits both behaviors depending on whether they're working in known vs unknown parts of their codebase.)
