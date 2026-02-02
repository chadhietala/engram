---
name: enable-hybrid-skills
description: Understand complex codebase architecture by performing breadth-first reconnaissance followed by depth-first investigation of implementation details.
metadata:
  author: engram
  version: "1.3"
  generatedAt: 2026-02-02T16:53:55.534Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: 297eec3c-7f85-416b-b382-87617d6f76cd
---

# Enable Hybrid Skills

## Overview

When approaching major codebase modifications, first establish architectural understanding by surveying related files across the codebase to map out the overall structure. Once you've identified the critical components and formed a concrete plan, transition to focused investigation of specific implementation targets, reading files multiple times with careful attention to detail to ensure safe modification.

## When to Use

- Working with an unfamiliar codebase or architecture
- Implementing features that span multiple interconnected files
- Making changes that could have ripple effects across the system
- Refactoring code where understanding existing patterns is critical
- High-risk changes where mistakes are costly to fix later
- Building hybrid systems that combine multiple architectural patterns
- Understanding how a new feature or system is architected before implementing changes
- Exploring an unfamiliar codebase to identify key components and their interactions
- Planning refactoring work that spans multiple files
- Investigating complex bugs that may involve multiple interconnected modules
- Documenting or reviewing system design and data flow
- Understanding how a feature is implemented across multiple interconnected modules
- Investigating architectural patterns before making significant changes
- Learning how different subsystems interact in an unfamiliar codebase
- Evolving existing systems with hybrid approaches that require understanding both deterministic and intelligent components
- You need to modify or extend a major feature across multiple files
- You're working with an unfamiliar codebase and need to understand how components interact
- You want to safely refactor code by first understanding all dependencies and relationships
- You're implementing a feature that requires understanding existing patterns and architecture
- You need to identify which files are critical to modify versus which are tangentially related

## Steps

1. **Identify the scope of related files**
   Start with the primary entry point mentioned in the task, then identify all related files such as templates, utilities, configuration, and dependencies that interact with or influence the target code.

2. **Read core implementation files first**
   Begin by reading the main files that contain the central logic or patterns you'll be working with. This establishes the architectural foundation and coding conventions.

3. **Expand to supporting and dependent files**
   Read related utilities, helpers, type definitions, and modules that the core files depend on or interact with. This reveals how data flows and components communicate.

4. **Review similar patterns in the codebase**
   Look for existing implementations of similar features or patterns. Understanding what already exists helps maintain consistency and avoid reinventing solutions.

5. **Synthesize architectural understanding**
   Before implementing, mentally map out how your changes will fit into the existing architecture, which files need modification, and what new patterns might be needed.

6. **Implement with confidence**
   With comprehensive context established, proceed with implementation knowing you understand the full scope of changes and can anticipate integration points and potential issues.

## Edge Cases

### When conditions differ

The evidence doesn't actually contradict the thesis - it strongly supports it. The contradicting_evidence shows the user reading a second file ("/Users/chietala/Code/engram/src/skill-generator/template.ts"), which is part of a broader pattern demonstrated in the context of reading multiple related files. The context shows the user systematically explored the codebase by: (1) reading the main skill-generator index file, (2) reading the template file, (3) grepping for dependency patterns, (4) reading package.json for dependency information, and (5) globbing to discover the TypeScript file structure. This sequence demonstrates exactly the behavior described in the thesis - building comprehensive architectural context before making changes. The "contradiction" appears to be a labeling error, as reading a second related file is evidence FOR systematic multi-file exploration, not against it. (Resolution hint: This appears to be a mislabeled example - the evidence actually confirms the thesis rather than contradicting it. If there IS a contradiction intended, it might be reconciled by distinguishing between: (1) exploratory reading where the user systematically builds context before ANY implementation (thesis behavior), versus (2) iterative reading where the user alternates between small implementations and targeted reads of only the immediately affected files (contradicting behavior). The resolution would note that users adapt their exploration depth based on task complexity, familiarity with the code, and risk tolerance.)

### When conditions differ

The contradicting evidence shows a *single* file being read twice in succession ("/Users/chietala/Code/engram/src/skill-generator/index.ts"), rather than multiple related files being read systematically. This contradicts the thesis because it demonstrates a focused, repetitive examination of one specific file rather than broad architectural exploration across the codebase. The double-read pattern suggests either: (1) re-reading the same file after making changes to verify the edit, (2) re-examining the file after gaining context from other operations, or (3) a narrow debugging/investigation focus on a single file's implementation details rather than building comprehensive architectural understanding. (Resolution hint: These patterns can be reconciled by recognizing that comprehensive architectural reading (the thesis) and focused single-file re-reading (the evidence) serve different purposes in the development workflow. The context shows earlier exploration (Grep for SDK imports, reading package.json and template.ts, globbing TypeScript files) which represents the "building context" phase. The double-read of index.ts represents a subsequent "implementation and verification" phase where the developer narrows focus to execute changes. Both patterns are valid but occur at different stages: broad exploration → narrow implementation → verification through re-reading. The thesis describes the "before implementing changes" behavior, while the evidence shows the "during/after implementing changes" behavior.)

### When conditions differ

The thesis claims the user is systematically exploring using a "breadth-first approach" and "reading multiple related files to build comprehensive architectural understanding." However, the contradicting evidence shows the same file ("/Users/chietala/Code/engram/scripts/generate-skill.ts") being read twice in succession. This is depth-first, targeted re-reading behavior, not breadth-first exploration.

Reading the same file multiple times suggests:
1. **Targeted investigation** - The user needed specific details from that exact file, possibly after discovering something in the surrounding context
2. **Iterative refinement** - After exploring other areas (Bash find commands, Grep for Zod patterns, reading llm/index.ts), the user returned to re-examine generate-skill.ts with new understanding
3. **Reference checking** - The user may be verifying implementation details or patterns found in that file against what they discovered elsewhere

This contradicts "breadth-first" exploration because breadth-first would read many different files once before revisiting any. Instead, this shows **depth-first iterative refinement** - diving back into specific files as understanding evolves. (Resolution hint: The approaches aren't mutually exclusive but represent different phases of code exploration. Users likely start with breadth-first exploration to map the landscape, then shift to depth-first iteration when they've identified critical files. The "generate-skill.ts" file appears to be a template or generator that became a focal point after initial exploration, warranting repeated examination. The contradiction resolves if we recognize that systematic exploration includes both breadth-first discovery AND depth-first refinement of key files.)

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
