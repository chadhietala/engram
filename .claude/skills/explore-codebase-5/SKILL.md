---
name: explore-codebase-5
description: Performs breadth-first reconnaissance followed by depth-first investigation when modifying complex codebases.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T18:16:06.801Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: 3253964e-37f7-4bda-934e-182d33672cbe
---

# Explore Codebase 5

## Overview

Start by reading diverse files across the codebase to establish architectural understanding and identify critical components that will be affected by your changes. Once you have a concrete implementation plan, transition to focused, detailed investigation of specific target files, using paginated reads when necessary to understand implementation details. This two-phase approach ensures you understand the system's structure before making modifications, reducing the risk of breaking changes or architectural misalignment.

## When to Use

- Beginning a major refactoring that spans multiple components or modules
- Implementing a new feature that needs to integrate with existing architectural patterns
- Modifying code in an unfamiliar codebase where understanding dependencies is critical
- Making changes that could have ripple effects across the system
- Working on tasks where the initial scope is unclear and requires exploration before implementation

## Steps

1. **Follow the pattern described above**
   Apply breadth-first reconnaissance when beginning a major codebase modification to establish architectural understanding and identify critical components. Once reconnaissance yields a concrete plan, t

## Edge Cases

### When conditions differ

The contradicting evidence shows the user reading the same file (`/Users/chietala/Code/engram/src/skill-generator/index.ts`) multiple times with a line limit parameter, which indicates **depth-first focused investigation** rather than breadth-first reconnaissance. 

In systematic codebase reconnaissance, you expect to see many different files read once or twice to build a mental map of the architecture. The pattern would be: read file A, read file B, read file C, occasionally revisit A for context.

However, the evidence shows **repeated reads of the same specific file with pagination** (using `limit: 150`), which is characteristic of someone who has already identified the exact location they need to modify and is now carefully studying its implementation details. This is active problem-solving behavior, not reconnaissance.

Furthermore, the context shows a plan file was written (`luminous-meandering-stearns.md`), suggesting the reconnaissance phase has *already completed* and the user has moved into execution mode. The repeated detailed reads are implementation research, not architectural survey. (Resolution hint: These patterns represent different phases of the same workflow. The thesis likely described the user's behavior *earlier in the session* (breadth-first reconnaissance → plan writing), while the contradicting evidence captures the *current phase* (depth-first implementation). The user has progressed from "understand the architecture" (thesis) to "understand this specific file deeply enough to modify it" (evidence). They can be reconciled by recognizing this as a phase transition: reconnaissance completed → plan created → now executing with focused deep investigation of implementation targets.)

### When conditions differ

The thesis predicts breadth-first exploration with repeated visits to build understanding before refactoring. However, the evidence shows the user immediately re-reading the exact same file (`skill.ts`) twice in direct succession, with a Write operation to a plan file in the nearby context. This contradicts breadth-first reconnaissance in two critical ways:

1. **Sequential depth, not breadth**: Reading the same file twice consecutively is depth-first iteration (going deeper into one file) rather than breadth-first exploration (surveying many files shallowly). This pattern indicates active development work where the user needs the file's contents in working memory while making changes or decisions.

2. **Implementation phase, not reconnaissance**: The Write to a plan file signals the user has transitioned from exploration to execution. In reconnaissance mode, users read widely to map architecture; in implementation mode, they re-read specific files repeatedly as they code. The immediate re-read of `skill.ts` suggests the user is actively working with this file's specifics—likely referencing types or interfaces while writing code—rather than building broad architectural understanding. (Resolution hint: The thesis may describe an earlier phase that has already completed. The user likely DID conduct breadth-first reconnaissance (evidenced by the prior reads of script-generator and index.ts files), but has now transitioned into focused implementation. The repeated `skill.ts` reads represent a different working mode: iterative development where the user keeps referencing a key type definition file while actively coding the refactoring. The pattern reconciles if we recognize these as sequential phases—reconnaissance followed by implementation—rather than a single continuous reconnaissance phase.)

### When conditions differ

The thesis proposes a **breadth-first exploration pattern with repeated file visits**, suggesting the user methodically surveys the codebase architecture before diving deep. However, the contradicting evidence shows **immediate re-reading of the same file** (script-generator.ts read twice consecutively), which indicates a **depth-first, focused investigation pattern** instead.

This contradicts the thesis in two key ways:
1. **Depth-first vs breadth-first**: Rather than surveying multiple files broadly, the user is drilling down into a specific file's contents repeatedly
2. **Immediate repetition vs spaced revisits**: The thesis implies returning to files after exploring other areas to build incremental understanding, but the evidence shows consecutive reads of the same file without intervening exploration

The consecutive re-reads suggest the user is either:
- Examining different sections of the same file (using offset/limit parameters)
- Re-reading after identifying something requiring closer scrutiny
- Building deep comprehension of a critical file before proceeding

This is **focused excavation**, not reconnaissance mapping. (Resolution hint: These patterns can be reconciled by recognizing that **systematic refactoring involves phase transitions between exploration strategies**. The user likely employs a **hybrid approach**:

1. **Initial breadth-first phase**: Survey the codebase to identify key architectural boundaries (skill.ts, index.ts, etc.)
2. **Depth-first pivot**: When discovering critical files like script-generator.ts, immediately investigate deeply through repeated reads
3. **Return to breadth**: After understanding the critical component, resume broader exploration

The thesis may be partially correct but **temporally misaligned** with the contradicting evidence—the evidence may capture a depth-first excursion within an overall breadth-first strategy. Alternatively, the "repeated file visits" in the thesis might better describe **macro-level patterns** (revisiting files over days/sessions) rather than **micro-level patterns** (consecutive reads within minutes).

The reconciliation: **Reconnaissance is hierarchical**, with breadth-first at the architectural level and depth-first when examining critical implementation details.)
