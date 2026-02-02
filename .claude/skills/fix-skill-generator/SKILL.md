---
name: fix-skill-generator
description: Fixes skill generation logic to produce valid skills that pass validation checks.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T16:43:10.602Z
  sourcePatternId: e86f3bf0-7414-460f-a131-4c1fb9836d7d
  sourceSynthesisId: bff074cc-fadf-48bf-b102-2ab762cbf395
---

# Fix Skill Generator

## Overview

Use this skill when your skill generator produces invalid output that fails validation. It guides you through identifying validation requirements, adjusting generation logic to meet those requirements, and ensuring the output structure matches expected schemas. This is particularly useful when building or maintaining metacognitive systems that generate their own operational components.

## When to Use

- When generated skills fail validation checks from agentskills or similar tools
- When building self-improving systems that need to generate valid structured output
- When schema requirements change and generation logic needs updating
- When debugging why AI-generated content doesn't match expected formats
- When implementing bootstrap phases of recursive self-improvement systems

## Steps

1. **Identify validation requirements**
   Examine the validation errors or schema definitions to understand what makes a skill valid. Look for required fields, format constraints, and structural rules.

2. **Locate generation logic**
   Find the code responsible for generating skills, typically in skill-generator files or similar components. Understand the current prompt templates and output structure.

3. **Align prompts with schema**
   Update generation prompts and instructions to explicitly request all required fields in the correct format. Ensure AI instructions match validation requirements exactly.

4. **Fix output structure**
   Modify code that processes generated content to extract and format fields correctly. Ensure JSON parsing, field mapping, and data transformation align with the schema.

5. **Validate the fix**
   Test the updated generator with real input to confirm it produces valid output. Run validation checks to verify all requirements are met.
