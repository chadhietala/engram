---
name: memory-recall
description: Use when user asks "what did I do before", "how did I solve this", "remind me", or wants to recall past solutions and patterns from previous sessions.
---

# Memory Recall

## Overview
Searches engram's memory bank to recall relevant past experiences, solutions, and patterns.

## When to Use
- User asks "what did I do before?"
- User says "how did I solve this last time?"
- User wants to recall a past solution
- User says "remind me how..."

## Workflow

### Step 1: Query Memory
Run the engram query command with the user's question:
```bash
bun ${CLAUDE_PLUGIN_ROOT}/scripts/query.ts "$USER_QUERY"
```

### Step 2: Present Results
Show the user relevant memories with context about when and how they were recorded.

### Step 3: Apply if Relevant
If a past solution is found, offer to apply it to the current situation.
