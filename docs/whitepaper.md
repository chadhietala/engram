# Engram: A Memory System for AI Coding Assistants

**Abstract**: Engram is an automatic learning system for Claude Code that observes tool usage patterns, evolves understanding through dialectic reasoning, and graduates mature insights into Claude's native memory—creating persistent, context-aware knowledge that survives across sessions.

## 1. The Problem

AI coding assistants are stateless. Every session starts fresh, forcing users to re-explain preferences, re-discover project conventions, and re-teach workflows. While Claude Code offers manual memory through CLAUDE.md files, maintaining these requires conscious effort.

Meanwhile, every coding session contains implicit lessons:
- Reading a config before running a command reveals dependencies
- Repeated test-then-commit sequences reveal workflows
- Common file access patterns reveal project structure

This knowledge exists ephemerally in usage patterns but never persists.

## 2. The Solution

Engram captures tool usage automatically, detects patterns through semantic analysis, evolves understanding through a dialectic process, and publishes mature insights as native Claude rules.

### 2.1 Memory Capture

Every tool invocation is encoded as a semantic memory:

```
Tool: Bash
Input: bun test
Output: 23 pass, 0 fail
---
Semantic Keys: command=bun, subcommand=test, tool=Bash
Tags: testing, bun, success
Embedding: [0.23, -0.15, 0.89, ...]
```

Memories are stored with:
- **Raw content**: The tool interaction itself
- **Semantic keys**: Structured metadata for fast lookup
- **Embeddings**: Vector representations for similarity search
- **Session context**: When and where the interaction occurred

### 2.2 Pattern Detection

Patterns emerge when similar memories cluster:

1. **Temporal proximity**: Actions that occur together in time
2. **Semantic similarity**: Embedding distance < threshold
3. **Key overlap**: Shared semantic keys across memories

A pattern like "test-before-commit" might emerge from observing:
- Memory A: `bun test` (success)
- Memory B: `git add . && git commit -m "feat: ..."`
- Memory C: `bun test` (success)
- Memory D: `git add . && git commit -m "fix: ..."`

The system detects that testing precedes committing.

### 2.3 Dialectic Evolution

Raw patterns are naive. They require refinement through contradiction:

**Thesis**: "Always run tests before committing"
- Evidence: 10 instances of test-then-commit sequences

**Antithesis**: "But sometimes commits happen without tests"
- Evidence: 2 instances of direct commits (documentation changes)

**Synthesis**: "Run tests before committing code changes; documentation-only changes can skip tests"
- Resolution: The pattern now includes context-awareness

This Hegelian process creates nuanced, conditional knowledge rather than absolute rules.

### 2.4 Native Memory Integration

The key innovation: mature patterns graduate from Engram's SQLite database to Claude's native memory system.

Claude Code supports:
- `.claude/rules/*.md` - Path-specific instructions
- `CLAUDE.md` - Project-wide instructions
- `~/.claude/CLAUDE.md` - User-wide preferences

Engram writes to `.claude/rules/engram/`:

```markdown
---
paths:
  - "**/*.ts"
  - "src/**"
---

# Test Before Commit

Before committing code changes, run the test suite with `bun test`.
Skip tests for documentation-only changes.

## Related Skill

This pattern has an associated skill: **test-before-commit**

> Runs tests and commits changes with conventional commit messages

**To invoke this skill**, say:
- "commit my changes"
- "run tests and commit"

<!-- engram:pattern:abc123:synthesis:def456:v1:2026-02-04:confidence:0.85 -->
```

This rule is automatically loaded in future Claude sessions—no plugin required.

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Tool Usage Layer                          │
│                   (Claude Code Hook System)                      │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Memory Encoding                            │
│   • Semantic key extraction (per-tool-type)                      │
│   • Embedding generation (transformers.js, local)                │
│   • Memory classification (working → short-term → long-term)     │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Pattern Detection                          │
│   • Clustering by embedding similarity                           │
│   • Temporal sequence analysis                                   │
│   • Cross-session pattern validation                             │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Dialectic Processing                        │
│   • Thesis: Initial pattern assertion                            │
│   • Antithesis: Counter-evidence detection                       │
│   • Synthesis: Integrated understanding                          │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
┌───────────────────────────────┐  ┌───────────────────────────────┐
│        Skills Generation       │  │        Rules Publishing        │
│   .claude/skills/{name}/       │  │   .claude/rules/engram/*.md    │
│   • SKILL.md (instructions)    │  │   • YAML frontmatter (paths)   │
│   • script.ts (executable)     │  │   • Markdown content           │
│   • Hybrid deterministic/LLM   │  │   • Metadata tracking          │
└───────────────────────────────┘  └───────────────────────────────┘
                    │                           │
                    └───────────┬───────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Claude's Native Memory                        │
│            (Auto-loaded at session start)                        │
└─────────────────────────────────────────────────────────────────┘
```

## 4. Memory Lifecycle

### 4.1 Working Memory
- Current session only
- High-frequency, low-significance
- Candidates for pattern detection

### 4.2 Short-Term Memory
- Recent sessions
- Subject to decay over time
- Promoted on reuse, demoted on irrelevance

### 4.3 Long-Term Memory
- Proven patterns
- Survive across sessions
- Foundation for skills and rules

### 4.4 Native Memory (New)
- Published to `.claude/rules/`
- Loaded automatically by Claude
- Persistent without Engram active

## 5. Skill Generation

When patterns involve executable workflows, Engram generates hybrid skills:

```typescript
#!/usr/bin/env bun
import { intelligence } from "engram/skill-runtime";

// Deterministic: gather context
const diff = await Bun.$`git diff --cached`.text();
const files = diff.match(/\+\+\+ b\/(.+)/g)?.map(f => f.slice(6)) || [];

// Intelligence: decide what to do
const analysis = await intelligence(
  "Analyze these changes and suggest a commit message",
  { diff, files }
);

// Deterministic: execute
await Bun.$`git commit -m ${analysis.message}`;
```

Skills combine:
- **Deterministic code** for file I/O, shell commands, data gathering
- **Intelligence points** for LLM reasoning where judgment is needed

## 6. Privacy & Security

- All data stored locally (SQLite)
- Embeddings generated locally (transformers.js)
- No external API calls for learning
- LLM analysis uses existing Claude authentication
- Rules are committed to git (team-shareable) or gitignored (personal)

## 7. Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ENGRAM_DATA_DIR` | `.engram/` | Local database storage |
| `ENGRAM_RULES_AUTO_PUBLISH` | `true` | Auto-publish mature patterns |
| `ENGRAM_RULES_MIN_CONFIDENCE` | `0.7` | Confidence threshold for publishing |
| `ENGRAM_RULES_MIN_MEMORIES` | `3` | Minimum evidence required |

## 8. Future Directions

### 8.1 Cross-Project Learning
Patterns that appear across multiple projects could be promoted to user-level rules (`~/.claude/rules/engram-prefs.md`).

### 8.2 Team Learning
In team contexts, shared patterns could be identified and proposed as team rules, subject to review before committing.

### 8.3 Pattern Marketplace
High-confidence patterns could be shared across users, creating a marketplace of learned workflows.

### 8.4 Active Contradiction Seeking
Rather than waiting for contradictions to emerge naturally, the system could actively probe for edge cases.

## 9. Conclusion

Engram transforms ephemeral coding sessions into persistent knowledge. By observing tool usage, detecting patterns, evolving understanding through dialectic, and publishing to Claude's native memory system, Engram creates AI coding assistants that genuinely learn from experience.

The key insight is that learning and persistence are separate concerns. SQLite handles learning (with its rich query capabilities and relationship tracking). Claude's native memory handles persistence (with its automatic context loading). Engram bridges them.

---

*Engram is open source under the MIT license.*
