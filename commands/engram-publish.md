---
description: Publish mature patterns as Claude rules for automatic loading
argument-hint: [--all | --synthesis <id> | --pattern <id>] [--force] [--scope project|user]
---

# Publish Engram Rules

Publish learned patterns to Claude's native memory system (.claude/rules/).

Published rules are automatically loaded by Claude on session start, making learned patterns persistent without requiring the engram plugin to be active.

```bash
bun ${CLAUDE_PLUGIN_ROOT}/scripts/publish-rules.ts $ARGUMENTS
```
