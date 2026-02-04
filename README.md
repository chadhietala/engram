# Engram

A memory system for Claude Code that learns how you work and generates new skills from your patterns.

## Installation

### As a Claude Code Plugin (Recommended)

**Local Development:**
```bash
# Clone the repo
git clone https://github.com/chietala/engram.git
cd engram
bun install

# Run Claude Code with the plugin
claude --plugin-dir /path/to/engram
```

**From GitHub:**
```bash
# Add the marketplace
/plugin marketplace add chietala/engram

# Install the plugin
/plugin install engram@engram-marketplace
```

**Team Auto-Install:**
Add to your project's `.claude/settings.json`:
```json
{
  "extraKnownMarketplaces": {
    "engram-marketplace": {
      "source": {
        "source": "github",
        "repo": "chietala/engram"
      }
    }
  },
  "enabledPlugins": {
    "engram@engram-marketplace": true
  }
}
```

## The Idea

Every time you use Claude Code, you're teaching it something. Engram captures those lessons automatically:

- **Watch**: Observes your tool usage (file reads, bash commands, edits)
- **Remember**: Stores patterns with semantic understanding
- **Evolve**: Challenges and refines patterns through contradiction
- **Generate**: Creates reusable Claude Skills from mature patterns

## Plugin Commands

Once installed, these commands are available:

| Command | Description |
|---------|-------------|
| `/engram-status` | Show memory counts and system status |
| `/engram-query <search>` | Search memories semantically |
| `/engram-generate <name>` | Generate a skill from recent patterns |
| `/engram-publish` | Publish mature patterns as Claude rules |

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

### Native Memory Integration

When patterns reach synthesis, Engram automatically publishes them as Claude rules—meaning **Claude remembers your patterns without the plugin running**:

```
.claude/rules/engram/
├── testing-workflow.md      # "Run tests before committing"
├── error-handling.md        # "Check logs after deployments"
└── code-review.md           # "Read tests before reviewing PRs"
```

Rules include:
- **Path-specific triggers**: Only activate for relevant file types
- **Linked skills**: Reference executable skills for automation
- **Confidence tracking**: Update as patterns evolve

Example generated rule:

```markdown
---
paths:
  - "**/*.ts"
  - "src/**"
---

# Test Before Commit

Before committing any code changes, always run the test suite with `bun test`.

## Related Skill

This pattern has an associated skill: **test-before-commit**

> Runs tests and commits changes with conventional commit messages

**To invoke this skill**, say:
- "commit my changes"
- "run tests and commit"
- "safe commit"
```

### Automatic Skill Generation

When a pattern matures enough (used consistently, survived contradictions), Engram generates a Claude Skill you can use in future sessions.

### Hybrid Skill Scripts

Generated skills aren't just static instructions—they're executable scripts that combine:

- **Deterministic code** for file operations, glob patterns, shell commands
- **Intelligence points** for LLM-powered reasoning where judgment is needed

```typescript
// Deterministic: gather data
const files = await glob.scan({ pattern: "**/*.ts" });
const diff = await $`git diff --cached`.text();

// Intelligence point: generate insights
const summary = await intelligence(
  "Summarize the key patterns in this codebase",
  { files: fileList, diff }
);

// Deterministic: output results
console.log(summary);
```

This creates scripts that are both reliable and intelligent.

### Memory Consolidation

Like human memory:
- **Working memory** - Current session activity
- **Short-term memory** - Recent patterns, subject to decay
- **Long-term memory** - Proven patterns that persist

Old, unused memories fade. Important ones strengthen.

### Semantic Search

Query your memories naturally:

```bash
/engram-query "how do I handle errors"
```

Finds relevant patterns even if wording differs.

## What Gets Captured

| Event | What's Learned |
|-------|----------------|
| File reads | What you look at to understand code |
| Bash commands | Your debugging and build workflows |
| File edits | How you modify code |
| Prompts | What you're trying to accomplish |

## Example Generated Skill

After observing codebase exploration patterns, Engram generates a hybrid script:

```typescript
#!/usr/bin/env bun
import { intelligence } from "engram/skill-runtime";

// Deterministic: discover files
const glob = new Bun.Glob("**/*.ts");
const files = [];
for await (const file of glob.scan({ cwd: targetDir })) {
  files.push(file);
}

// Deterministic: read contents
const contents = await Promise.all(
  files.map(f => Bun.file(f).text())
);

// Intelligence point: analyze with LLM reasoning
const analysis = await intelligence(
  "Identify the key architectural patterns in this codebase",
  { files: files.join("\n"), sampleCode: contents[0] }
);

console.log(analysis);
```

The script uses deterministic code for file operations but calls `intelligence()` when human-like judgment is needed.

## Data Storage

Engram stores data in a project-local `.engram/` directory:
- Each project gets its own isolated memory
- Configure with `ENGRAM_DATA_DIR` environment variable if needed

### Rules Publishing

Mature patterns are automatically published to `.claude/rules/engram/`:

| Config | Default | Description |
|--------|---------|-------------|
| `ENGRAM_RULES_AUTO_PUBLISH` | `true` | Auto-publish on synthesis |
| `ENGRAM_RULES_MIN_CONFIDENCE` | `0.7` | Minimum confidence to publish |
| `ENGRAM_RULES_MIN_MEMORIES` | `3` | Minimum supporting memories |
| `ENGRAM_RULES_DIR` | `.claude/rules/engram` | Project rules directory |
| `ENGRAM_USER_RULES_DIR` | `~/.claude/rules` | User-level rules |

Published rules are tracked in the database and updated when patterns evolve.

## Using Generated Skills

Generated skills are placed in `.claude/skills/` and can be run directly:

```bash
# Run a generated skill
bun .claude/skills/explore-codebase/script.ts ./src

# Skills support --help
bun .claude/skills/explore-codebase/script.ts --help
```

### Skill Runtime

Generated scripts can import intelligence helpers:

```typescript
import { intelligence, intelligenceWithSchema, decide, z } from "engram/skill-runtime";

// Simple text response
const summary = await intelligence("Summarize this code", { code });

// Structured response with schema
const ReviewSchema = z.object({
  approved: z.boolean(),
  issues: z.array(z.string()),
});
const review = await intelligenceWithSchema("Review this PR", ReviewSchema, { diff });

// Yes/no decision
const shouldProceed = await decide("Is this safe to deploy?", { changes });
```

## Architecture

```
                    ┌─────────────────────────┐
                    │   Tool Usage (Hooks)    │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   SQLite (Learning)     │
                    │   - Raw memories        │
                    │   - Pattern detection   │
                    │   - Dialectic cycles    │
                    └───────────┬─────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
         ▼                      ▼                      ▼
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│  .claude/rules/   │  │  .claude/skills/  │  │    CLAUDE.md      │
│  engram/*.md      │  │  {skillName}/     │  │    (optional)     │
│  (insights)       │  │  (procedures)     │  │                   │
└───────────────────┘  └───────────────────┘  └───────────────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │  Claude's Native Memory │
                    │  (auto-loaded context)  │
                    └─────────────────────────┘
```

The key insight: learning happens in SQLite, but mature knowledge graduates to Claude's native memory system—meaning it persists even without the plugin.

## Privacy

Everything runs locally:
- SQLite database on your machine
- Embeddings generated locally (no API calls)
- LLM analysis uses Claude Agent SDK (your existing auth)

## Requirements

- Bun runtime
- Claude Code CLI

## License

MIT
