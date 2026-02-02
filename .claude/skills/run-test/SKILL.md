---
name: run-test
description: Implements defensive error handling and validation in LLM API abstraction layers, then verifies system reliability through end-to-end execution testing.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T18:16:29.776Z
  sourcePatternId: e86f3bf0-7414-460f-a131-4c1fb9836d7d
  sourceSynthesisId: 258e844b-6cc3-4e13-b1f4-1ff8828db036
---

# Run Test

## Overview

Start by reading the critical abstraction layer files (query builders, validators, schema handlers) to understand how LLM API calls are structured. Add comprehensive error boundaries, input validation, and fallback mechanisms to these layers. Then execute runtime tests using direct invocations (like `bun -e` for TypeScript or equivalent for other languages) to verify that the error handling works correctly in real scenarios and that the system degrades gracefully under failure conditions.

## When to Use

- Building or maintaining systems where LLM API calls are in the critical path and failures would break core functionality
- Refactoring code generation, skill synthesis, or other AI-powered automation tools that need resilient LLM interactions
- Debugging flaky LLM integrations where errors are inconsistent and need better observability through defensive coding
- Creating infrastructure that wraps LLM APIs with schema validation, query templating, or result parsing that must handle malformed responses
- Iteratively improving system reliability by first hardening the abstraction layer, then validating improvements through execution

## Steps

1. **Follow the pattern described above**
   The user is enhancing the reliability of LLM-based skill generation infrastructure through iterative development: implementing defensive error handling in query layers while validating changes through

## Edge Cases

### When conditions differ

The thesis states the user is refactoring error handling across LLM query functions with try-catch patterns, which implies a focus on error management infrastructure and code quality improvements. However, the contradicting evidence shows the user executing a Bun script that instantiates a SkillGenerator, accesses a database, and checks stats - activities that relate to testing or running a skill generation system rather than refactoring error handling. The command is performing actual feature execution/testing rather than implementing defensive error handling patterns. (Resolution hint: These could be reconciled if the error handling refactoring applies specifically to the LLM query infrastructure that the SkillGenerator uses. The user may be following a test-driven approach: first running the system to observe its behavior (the Bash command), then implementing error handling improvements based on what they observe, or vice versa - testing that newly-added error handling works correctly. The thesis might be too narrow; the actual pattern could be "improving the robustness of the LLM-based skill generation system" where error handling refactoring is one component and functional testing is another.)
