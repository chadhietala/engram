---
name: engram
description: Save the current session's workflow as a reusable skill.
---

# Engram

Save the current session's tool operations as a reusable, parameterized skill.

## Usage

```
/engram <skill-name>
```

## Examples

```
/engram explore-codebase
/engram setup-typescript-project
/engram run-tests-and-fix
```

## What It Does

1. Captures all tool operations from the current session (Read, Bash, Edit, etc.)
2. Generates a parameterized script that can replay the workflow
3. Creates a SKILL.md so Claude can discover and invoke it
4. Saves to `.claude/skills/<skill-name>/`

## Instructions

When the user invokes `/engram <name>`:

1. Run the skill generator:
   ```bash
   bun scripts/generate-skill.ts <name>
   ```

2. Report what was created and how to use it

3. The generated skill will be available as `/<skill-name>` in future sessions

## Notes

- Skills are project-local (saved in `.claude/skills/`)
- Scripts are parameterized - hardcoded paths become `${targetDir}`
- Review generated scripts before using in production
