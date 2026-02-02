---
name: validate-skill-generator
description: Validates that generated skills conform to the agentskills specification and fixes any issues.
metadata:
  author: engram
  version: "1.0"
  generatedAt: 2026-02-02T16:41:17.159Z
  sourcePatternId: 477c9c94-e6e4-4a67-9316-92ec0b157bde
  sourceSynthesisId: 8b79a2e3-e065-4c57-8393-46f5934e274e
---

# Validate Skill Generator

## Overview

This skill helps ensure skill generator output meets specification requirements through systematic validation. Use it when building or refining meta-learning infrastructure to catch schema violations, missing required fields, or format inconsistencies. The skill combines exploratory analysis (breadth-first) to understand specifications with targeted fixes (depth-first) to resolve discovered issues.

## When to Use

- After generating new skills to verify they meet specifications
- When debugging skill generator to identify schema or format violations
- Before deploying skill changes to catch validation errors early
- When refining meta-learning infrastructure to ensure quality
- After modifying skill templates to validate output still conforms

## Steps

1. **Load specification requirements**
   Read the agentskills specification documentation to understand required fields, valid schemas, and format constraints for generated skills.

2. **Examine skill generator implementation**
   Review the skill generator code and templates to understand how skills are constructed and what validation already exists.

3. **Analyze generated skill output**
   Read sample generated skills to identify potential specification violations, missing fields, or format issues.

4. **Compare against specification**
   Cross-reference generated skill structure with specification requirements to identify discrepancies in schema, required fields, or data types.

5. **Fix identified issues**
   Apply depth-first implementation to modify generator code or templates to resolve discovered violations and ensure compliance.

6. **Validate corrections**
   Re-examine generated output to confirm fixes resolved issues and no new violations were introduced.
