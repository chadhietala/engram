# Engram

A memory system for Claude Code that learns how you work and generates new skills from your patterns.

## The Idea

Every time you use Claude Code, you're teaching it something. Engram captures those lessons automatically:

- **Watch**: Observes your tool usage (file reads, bash commands, edits)
- **Remember**: Stores patterns with semantic understanding
- **Evolve**: Challenges and refines patterns through contradiction
- **Generate**: Creates reusable Claude Skills from mature patterns

## Features

### Automatic Pattern Detection

Engram notices when you do similar things repeatedly. Read a config file then run a command? Do it a few times and Engram recognizes the pattern.

### Hegelian Learning

Patterns evolve through dialectic:

1. **Thesis** - Initial pattern: "Always use `git status` before committing"
2. **Antithesis** - Contradiction: "But sometimes you skip it for quick fixes"
3. **Synthesis** - Resolution: "Use `git status` for multi-file changes, skip for single-line fixes"

This creates nuanced, context-aware knowledge.

### LLM-Powered Insights

Claude analyzes your patterns and generates insights like:

> "The user is building a self-improving system that observes its own tool usage patterns and automatically generates new reusable skills"

### Automatic Skill Generation

When a pattern matures enough (used consistently, survived contradictions), Engram generates a Claude Skill you can use in future sessions.

### Memory Consolidation

Like human memory:
- **Working memory** - Current session activity
- **Short-term memory** - Recent patterns, subject to decay
- **Long-term memory** - Proven patterns that persist

Old, unused memories fade. Important ones strengthen.

### Semantic Search

Query your memories naturally:

```bash
bun scripts/query.ts "how do I handle errors"
```

Finds relevant patterns even if wording differs.

## Quick Start

```bash
# Install
bun install

# Start the worker
bun src/worker/index.ts

# Configure hooks (see docs)
# Then just use Claude Code normally
```

## What Gets Captured

| Event | What's Learned |
|-------|----------------|
| File reads | What you look at to understand code |
| Bash commands | Your debugging and build workflows |
| File edits | How you modify code |
| Prompts | What you're trying to accomplish |

## Example Generated Skill

After observing you repeatedly read files then run related commands:

```markdown
# Read Bash Pattern

## Overview
This skill analyzes file characteristics (path, extension, location)
and intelligently selects appropriate operations.

## When to Use
- When you need to process files differently based on their type
- When operations require both reading file contents and executing commands
- When file analysis must inform subsequent command execution
```

## Checking Your Memory

```bash
# How many memories?
curl http://localhost:37778/status

# What's being processed?
curl http://localhost:37778/queue

# Database stats
sqlite3 data/engram.db "SELECT COUNT(*) FROM memories"
```

## How It Learns

```
You use tools → Engram remembers → Patterns emerge →
Contradictions refine → Skills generate → You get better tools
```

The more you use Claude Code, the smarter it gets about how *you* work.

## Privacy

Everything runs locally:
- SQLite database on your machine
- Embeddings generated locally (no API calls)
- LLM analysis uses Claude Agent SDK (your existing auth)

## Requirements

- Bun runtime
- Claude Code with hooks enabled

## License

MIT
