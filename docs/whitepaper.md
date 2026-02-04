# Engram: A Memory System for AI Coding Assistants

**Abstract**: Engram is a distributable Claude Code plugin that observes tool usage patterns, evolves understanding through dialectic reasoning, and graduates mature insights into Claude's native memory system—creating persistent, context-aware knowledge that survives across sessions without the plugin running.

## 1. The Problem

AI coding assistants are stateless. Every session starts fresh, forcing users to re-explain preferences, re-discover project conventions, and re-teach workflows. While Claude Code offers manual memory through CLAUDE.md files and `.claude/rules/`, maintaining these requires conscious effort.

Meanwhile, every coding session contains implicit lessons:
- Reading a config before running a command reveals dependencies
- Repeated test-then-commit sequences reveal workflows
- Common file access patterns reveal project structure

This knowledge exists ephemerally in usage patterns but never persists.

## 2. The Solution

Engram is a Claude Code plugin that captures tool usage automatically, detects patterns through semantic analysis, evolves understanding through a dialectic process, and publishes mature insights as native Claude rules and executable skills.

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

### 2.4 Output Type Decision

A key innovation is the explicit output type decision system. When a synthesis is created, Engram analyzes the content to determine the most appropriate output:

| Output Type | When Used | Result |
|-------------|-----------|--------|
| `rule` | Imperative, declarative patterns | Published to `.claude/rules/engram/` |
| `skill` | Procedural, multi-tool workflows | Generated as executable skill |
| `rule_with_skill` | Complex patterns needing both | Rule links to executable skill |
| `none` | Low confidence or rejected | No artifact generated |

The decision uses characteristics analysis:
- **Imperative language**: "always", "never", "must", "ensure"
- **Procedural language**: "step 1", "first...then", "workflow"
- **Tool diversity**: How many different tools are involved
- **Complexity score**: Content length, conditions, tool count

For uncertain cases (confidence < 0.7), the LLM provides additional analysis.

### 2.5 Native Memory Integration

Mature patterns graduate from Engram's SQLite database to Claude's native memory system.

Claude Code supports:
- `.claude/rules/*.md` - Path-specific instructions
- `CLAUDE.md` - Project-wide instructions
- `~/.claude/rules/` - User-wide rules

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

### 3.1 Plugin Structure

Engram is distributed as a Claude Code plugin with the following structure:

```
engram/
├── .claude-plugin/
│   ├── plugin.json          # Plugin metadata
│   └── marketplace.json     # Marketplace listing
├── commands/                 # Slash commands
│   ├── engram-status.md
│   ├── engram-query.md
│   ├── engram-generate.md
│   └── engram-publish.md
├── hooks/
│   └── hooks.json           # Hook definitions
├── skills/                  # Plugin-provided skills
│   └── memory-recall/
└── src/                     # Core implementation
```

### 3.2 Hook System

Engram uses Claude Code's hook system to observe tool usage:

| Hook | Purpose |
|------|---------|
| `SessionStart` | Initialize session, create working memory |
| `UserPromptSubmit` | Capture user intent for pattern context |
| `PostToolUse` | Record tool invocations (Bash, Read, Write, Edit, Glob, Grep, WebFetch, Task) |
| `Stop` | Trigger pattern detection |
| `SessionEnd` | Run dialectic processing, consolidate memories |

### 3.3 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Code Session                          │
│                   (Plugin Hook Integration)                      │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    SessionStart / PostToolUse / SessionEnd
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
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Output Type Decision                          │
│   • Analyze imperative/procedural language                       │
│   • Calculate tool diversity and complexity                      │
│   • Decide: rule | skill | rule_with_skill | none               │
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
│   • Hybrid deterministic/LLM   │  │   • Linked skills reference    │
└───────────────────────────────┘  └───────────────────────────────┘
                    │                           │
                    └───────────┬───────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Claude's Native Memory                        │
│            (Auto-loaded at session start)                        │
│         Persists even when plugin is not active                  │
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

When patterns involve executable workflows (output type `skill` or `rule_with_skill`), Engram generates hybrid skills that combine deterministic code with LLM intelligence.

### 5.1 Skill Structure

Generated skills are placed in `.claude/skills/{skill-name}/`:

```
.claude/skills/test-before-commit/
├── SKILL.md      # Instructions and trigger phrases
└── script.ts     # Executable hybrid script
```

### 5.2 Hybrid Scripts

Skills combine deterministic code with intelligence points:

```typescript
#!/usr/bin/env bun
import { intelligence, intelligenceWithSchema, z } from "engram/skill-runtime";

// Deterministic: gather context
const diff = await Bun.$`git diff --cached`.text();
const files = diff.match(/\+\+\+ b\/(.+)/g)?.map(f => f.slice(6)) || [];

// Intelligence point: analyze changes
const analysis = await intelligence(
  "Analyze these changes and suggest a commit message",
  { diff, files }
);

// Structured intelligence: get typed response
const ReviewSchema = z.object({
  approved: z.boolean(),
  issues: z.array(z.string()),
  message: z.string(),
});

const review = await intelligenceWithSchema(
  "Review this commit for issues",
  ReviewSchema,
  { diff }
);

// Deterministic: execute based on intelligence
if (review.approved) {
  await Bun.$`git commit -m ${review.message}`;
}
```

### 5.3 Intelligence API

The skill runtime provides three functions:

| Function | Purpose | Return Type |
|----------|---------|-------------|
| `intelligence(prompt, context)` | Free-form LLM reasoning | `string` |
| `intelligenceWithSchema(prompt, schema, context)` | Structured response | Schema type |
| `decide(question, context)` | Yes/no decision | `boolean` |

Skills use deterministic code for:
- File I/O and glob patterns
- Shell commands and process execution
- Data gathering and transformation

Skills use intelligence for:
- Judgment calls and analysis
- Natural language generation
- Context-dependent decisions

## 6. Privacy & Security

- All data stored locally (SQLite)
- Embeddings generated locally (transformers.js)
- No external API calls for learning
- LLM analysis uses existing Claude authentication
- Rules are committed to git (team-shareable) or gitignored (personal)

## 7. Installation

### 7.1 As a Claude Code Plugin

**From GitHub Marketplace:**
```bash
/plugin marketplace add chietala/engram
/plugin install engram@engram-marketplace
```

**Local Development:**
```bash
git clone https://github.com/chietala/engram.git
cd engram && bun install
claude --plugin-dir /path/to/engram
```

**Team Auto-Install (in `.claude/settings.json`):**
```json
{
  "extraKnownMarketplaces": {
    "engram-marketplace": {
      "source": { "source": "github", "repo": "chietala/engram" }
    }
  },
  "enabledPlugins": { "engram@engram-marketplace": true }
}
```

### 7.2 Plugin Commands

| Command | Description |
|---------|-------------|
| `/engram-status` | Show memory counts and system status |
| `/engram-query <search>` | Search memories semantically |
| `/engram-generate <name>` | Generate a skill from recent patterns |
| `/engram-publish` | Publish mature patterns as Claude rules |

## 8. Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ENGRAM_DATA_DIR` | `.engram/` | Local database storage |
| `ENGRAM_RULES_AUTO_PUBLISH` | `true` | Auto-publish mature patterns |
| `ENGRAM_RULES_MIN_CONFIDENCE` | `0.7` | Confidence threshold for publishing |
| `ENGRAM_RULES_MIN_MEMORIES` | `3` | Minimum evidence required |
| `ENGRAM_RULES_DIR` | `.claude/rules/engram` | Project rules directory |
| `ENGRAM_USER_RULES_DIR` | `~/.claude/rules` | User-level rules |

## 9. Future Directions

### 9.1 Cross-Project Learning
Patterns that appear across multiple projects could be promoted to user-level rules (`~/.claude/rules/engram/`), creating personal coding preferences that follow users across projects.

### 9.2 Team Learning
In team contexts, shared patterns could be identified and proposed as team rules, subject to review before committing. The plugin's rules could be checked into source control for team-wide adoption.

### 9.3 Pattern Marketplace
High-confidence patterns could be shared across users via the Claude Code plugin marketplace, creating a community of learned workflows.

### 9.4 Active Contradiction Seeking
Rather than waiting for contradictions to emerge naturally, the system could actively probe for edge cases during synthesis, asking clarifying questions to build more robust patterns.

### 9.5 Skill Evolution
Generated skills could themselves be observed and improved over time, with the system learning from how users modify or extend generated code.

## 10. Conclusion

Engram transforms ephemeral coding sessions into persistent knowledge. By observing tool usage, detecting patterns, evolving understanding through Hegelian dialectic, and publishing to Claude's native memory system, Engram creates AI coding assistants that genuinely learn from experience.

The key insight is that **learning and persistence are separate concerns**:
- **SQLite** handles learning—with rich query capabilities and relationship tracking
- **Claude's native memory** handles persistence—with automatic context loading
- **The plugin** bridges them—observing, processing, and graduating knowledge

The explicit output type decision system ensures that patterns become the right kind of artifact: declarative rules for guidelines, executable skills for workflows, or both when appropriate.

Once patterns graduate to `.claude/rules/`, they persist even without the plugin running—Claude remembers what you taught it.

---

*Engram is open source under the MIT license.*
*Repository: https://github.com/chietala/engram*
