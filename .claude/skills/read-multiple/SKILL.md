---
name: read-multiple
description: Performs comprehensive multi-file exploration by reading multiple related files in parallel to understand system architecture, dependencies, and interaction patterns.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T18:15:48.223Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: 45b422ca-851a-4e8b-9146-613d8112484b
---

# Read Multiple

## Overview

Use this skill when you need to understand a codebase area before making changes or implementing features. The skill reads multiple related files simultaneously to build a complete picture of how components interact, what patterns are used, and where boundaries exist. Start with core files and expand outward to dependencies, utilities, and related modules until you have sufficient context for your task.

## When to Use

- Initial architectural discovery when working in an unfamiliar codebase
- Understanding system boundaries and component interactions before implementing a new feature
- Investigating dependencies and patterns across multiple related modules
- Planning complex changes that may impact multiple parts of the system
- Building context before refactoring or modifying existing functionality

## Steps

1. **Follow the pattern described above**
   Developers employ different file reading strategies at different phases of the development workflow. Comprehensive multi-file exploration occurs during the initial architectural discovery phase to und

## Edge Cases

### When conditions differ

The evidence doesn't actually contradict the thesis - it strongly supports it. The contradicting_evidence shows the user reading a second file ("/Users/chietala/Code/engram/src/skill-generator/template.ts"), which is part of a broader pattern demonstrated in the context of reading multiple related files. The context shows the user systematically explored the codebase by: (1) reading the main skill-generator index file, (2) reading the template file, (3) grepping for dependency patterns, (4) reading package.json for dependency information, and (5) globbing to discover the TypeScript file structure. This sequence demonstrates exactly the behavior described in the thesis - building comprehensive architectural context before making changes. The "contradiction" appears to be a labeling error, as reading a second related file is evidence FOR systematic multi-file exploration, not against it. (Resolution hint: This appears to be a mislabeled example - the evidence actually confirms the thesis rather than contradicting it. If there IS a contradiction intended, it might be reconciled by distinguishing between: (1) exploratory reading where the user systematically builds context before ANY implementation (thesis behavior), versus (2) iterative reading where the user alternates between small implementations and targeted reads of only the immediately affected files (contradicting behavior). The resolution would note that users adapt their exploration depth based on task complexity, familiarity with the code, and risk tolerance.)

### When conditions differ

The contradicting evidence shows a *single* file being read twice in succession ("/Users/chietala/Code/engram/src/skill-generator/index.ts"), rather than multiple related files being read systematically. This contradicts the thesis because it demonstrates a focused, repetitive examination of one specific file rather than broad architectural exploration across the codebase. The double-read pattern suggests either: (1) re-reading the same file after making changes to verify the edit, (2) re-examining the file after gaining context from other operations, or (3) a narrow debugging/investigation focus on a single file's implementation details rather than building comprehensive architectural understanding. (Resolution hint: These patterns can be reconciled by recognizing that comprehensive architectural reading (the thesis) and focused single-file re-reading (the evidence) serve different purposes in the development workflow. The context shows earlier exploration (Grep for SDK imports, reading package.json and template.ts, globbing TypeScript files) which represents the "building context" phase. The double-read of index.ts represents a subsequent "implementation and verification" phase where the developer narrows focus to execute changes. Both patterns are valid but occur at different stages: broad exploration → narrow implementation → verification through re-reading. The thesis describes the "before implementing changes" behavior, while the evidence shows the "during/after implementing changes" behavior.)
