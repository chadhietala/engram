# X Posts for Engram

## Launch Thread: Native Memory Integration

### Post 1 (Hook)
What if Claude Code could actually learn from how you work?

Not "store in a database and query later"—but genuinely remember, automatically, across every session.

I built Engram to make this happen.

### Post 2 (Problem)
The problem with AI coding assistants: they're stateless.

Every session starts fresh. You re-explain preferences. Re-teach workflows. Re-discover conventions.

Claude Code has CLAUDE.md files, but who actually maintains those?

### Post 3 (Solution)
Engram watches your tool usage—file reads, bash commands, edits.

It detects patterns: "you always run tests before committing."

Then it *writes that pattern to Claude's native memory system*.

Next session? Claude already knows.

### Post 4 (How it works)
The flow:
1. Tool usage → semantic memories
2. Memories cluster → patterns emerge
3. Patterns get challenged → dialectic evolution
4. Mature patterns → .claude/rules/engram/*.md

That last step is key: rules are auto-loaded by Claude.

No plugin needed to remember.

### Post 5 (Dialectic)
The Hegelian part:

Thesis: "Always run tests before commits"
Antithesis: "But sometimes you skip tests for docs"
Synthesis: "Run tests for code changes, skip for docs"

Patterns evolve. They get smarter. Not just "you did X"—but "you did X when Y."

### Post 6 (Skills)
Patterns can also generate executable skills:

```typescript
const diff = await $`git diff --cached`.text();
const message = await intelligence("Suggest commit message", { diff });
await $`git commit -m ${message}`;
```

Hybrid deterministic + LLM code. Run it directly.

### Post 7 (Native Memory)
The generated rule looks like this:

```markdown
---
paths: ["**/*.ts"]
---
# Test Before Commit

Run `bun test` before committing code changes.

## Related Skill: test-before-commit
Say: "commit my changes"
```

Path-specific. Links to skills. Self-updating.

### Post 8 (Privacy)
Everything runs locally:
- SQLite database on your machine
- Embeddings via transformers.js (no API calls)
- Rules committed to git (or gitignored)

Your patterns stay yours.

### Post 9 (CTA)
Engram is open source:

github.com/chietala/engram

Install it, use Claude Code normally, and watch it learn.

Then check .claude/rules/engram/ and see what it figured out about you.

---

## Single Posts

### Announcement
Shipped: Engram now publishes learned patterns directly to Claude's native memory system.

Your AI coding assistant can finally remember how you work—without you maintaining CLAUDE.md files.

github.com/chietala/engram

### Technical Deep-Dive
How Engram's dialectic system works:

1. Observe: "User ran tests 10x before commits"
2. Assert (Thesis): "Always test before committing"
3. Challenge (Antithesis): "But 2x they committed docs without tests"
4. Resolve (Synthesis): "Test code changes; docs can skip"

This creates *nuanced* rules, not absolute ones.

### The Key Insight
The insight behind Engram:

Learning and persistence are separate concerns.

SQLite handles learning (rich queries, relationships).
Claude's native memory handles persistence (auto-loading).

Engram bridges them. Learn in SQL, graduate to .claude/rules/.

### Why Native Memory Matters
Why does publishing to .claude/rules/ matter?

Because Claude loads those files *automatically* at session start.

Your learned patterns are in context even if Engram isn't installed.

Your team can commit them to git and share the learning.

### Hybrid Skills
Engram generates "hybrid skills"—scripts that are:

- Deterministic for file I/O, shell commands, data gathering
- LLM-powered for reasoning and judgment

Not "ask Claude to do everything."
Not "write static scripts."

The right tool for each part of the job.

---

## Visuals Suggestions

1. **Architecture diagram**: Tool Usage → SQLite → .claude/rules/ → Claude's Context
2. **Before/After**: Session 1 teaching Claude vs Session 100 Claude already knowing
3. **Rule file screenshot**: Show actual generated .md with frontmatter
4. **Dialectic flow**: Thesis → Antithesis → Synthesis with examples
