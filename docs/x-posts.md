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

## Thread: The Math Behind Learning

### Post 1 (Hook)
Most "AI learns from you" systems are vibes.

Engram has actual math.

Cohesion scores. Confidence thresholds. Formal decision functions.

A 🧵 on the theory:

### Post 2 (Pattern Detection)
How do you know when random actions become a pattern?

Engram measures cohesion—average pairwise similarity of observations:

C(P) = (2/n(n-1)) · Σ sim(eᵢ, eⱼ)

Pattern forms when |P| ≥ 3 and C(P) ≥ 0.7

Not arbitrary. Measurable.

### Post 3 (Dialectic Math)
When does a pattern get challenged?

When an observation is *relevant* (similar domain) but *divergent* (different behavior):

sim(o, T) > 0.5 ∧ D(o, T) > 0.3

Contradiction detected. Time for synthesis.

### Post 4 (Output Decision)
The key innovation: Engram decides *what* to generate.

Four outputs:
- `rule` (declarative guideline)
- `skill` (executable workflow)
- `rule+skill` (both)
- `none` (not confident enough)

Based on imperative score, procedural score, tool diversity, complexity.

### Post 5 (The Decision Function)
The actual decision:

```
if imperative && !procedural → rule
if procedural && multi-tool && complex → skill
if imperative && procedural && multi-tool → rule+skill
else → rule (default)
```

"Always do X" → rule
"First do X, then Y, then Z" → skill

### Post 6 (Bounded Self-Improvement)
Can it run away? No.

Capability growth is bounded:

dK/dt ≤ O(t) · E(t) · G(t)

And converges: lim(t→∞) dK/dt = 0

The system can only compose existing primitives. It can't exceed them.

### Post 7 (CTA)
Want the full formalization?

Whitepaper: github.com/chietala/engram/docs/whitepaper.md

16 references. LaTeX equations. Information-theoretic foundations.

This isn't a side project—it's a research contribution.

---

## Thread: Not Just Another Memory System

### Post 1 (Hook)
"Another agent memory system?"

No. Let me explain what makes Engram different from ENGRAM, Mem0, SAGE, and the rest.

🧵

### Post 2 (vs ENGRAM)
ENGRAM (2025) does memory orchestration—episodic, semantic, procedural via a router.

But it *retrieves* memories. It doesn't *transform* them.

Engram's dialectic creates new artifacts that didn't exist in the observations.

### Post 3 (vs Dialectical Reflection)
Chen et al. (2025) use Hegelian dialectic for LLM self-reflection.

But that's inference-time—within a single reasoning chain.

Engram's dialectic operates *across sessions* to produce *persistent artifacts*.

### Post 4 (vs Self-Improving Agents)
SAGE, AgentEvolver—they use feedback loops for self-improvement.

But they accumulate or reflect. They don't contradict.

Engram specifically uses *antithesis* to refine patterns. "You do X" becomes "You do X *except when* Y."

### Post 5 (vs Hybrid Intelligence)
"Hybrid intelligence" usually means human + AI collaboration.

Engram's "hybrid scripts" mean code + LLM *within a single executable*.

Deterministic file I/O. LLM for judgment calls. Same script.

### Post 6 (The Unique Combo)
What's actually new:

1. Dialectic that produces artifacts (not just retrieval)
2. Persistent artifacts (survives without plugin)
3. Hybrid scripts (code + LLM, not human + AI)
4. Bounded self-improvement (formal safety guarantees)

That combination doesn't exist elsewhere.

---

## Thread: Plugin Architecture

### Post 1 (Hook)
Engram is now a proper Claude Code plugin.

One command to install. Zero config. Just use Claude normally.

Here's the architecture:

### Post 2 (Installation)
```bash
/plugin marketplace add chietala/engram
/plugin install engram@engram-marketplace
```

Or for your team, add to .claude/settings.json:

```json
{
  "enabledPlugins": {
    "engram@engram-marketplace": true
  }
}
```

Done.

### Post 3 (Hooks)
Engram uses Claude Code's hook system:

- SessionStart → initialize
- PostToolUse → capture observations
- Stop → detect patterns
- SessionEnd → run dialectic

No prompts injected. No context bloat. Just watching.

### Post 4 (Commands)
Four commands:

/engram-status → memory counts
/engram-query → semantic search
/engram-generate → create skill from patterns
/engram-publish → push to native memory

Most of the time you use zero commands. It just works.

### Post 5 (Output)
Mature patterns graduate to:

.claude/rules/engram/*.md → declarative rules
.claude/skills/{name}/ → executable scripts

These load automatically. Even without the plugin.

Your learning persists.

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

### Intelligence Points API
Three primitives for hybrid scripts:

```typescript
await intelligence("Summarize this", { code })
await intelligenceWithSchema("Review", Schema, { diff })
await decide("Is this safe?", { changes })
```

Free-form text. Structured data. Yes/no decisions.

LLM reasoning exactly where you need it.

### Output Type Decision
Engram doesn't just learn—it decides *how* to express what it learned.

"Always do X" → declarative rule
"First X, then Y, then Z" → executable skill
Both patterns? → rule linking to skill

The form matches the content.

### Formal Guarantees
Engram's self-improvement is bounded:

K(t) ⊆ Closure(tools ∪ LLM)

The agent can only compose existing primitives in new ways.

It can't exceed them. It can't modify its own weights.

Safe by construction.

### Memory Decay (Like Humans)
Engram memories decay over time:

S(m,t) = S₀ · e^(-λt) · (1 + α·access) · (1 + β·validation)

Unused memories fade. Important ones strengthen.

Just like human memory consolidation.

### The Whitepaper
Shipped a proper academic whitepaper for Engram.

11 sections. 16 references. LaTeX equations.

Covers: dialectic formalization, hybrid scripts, output type decision, memory decay, bounded self-improvement.

github.com/chietala/engram/docs/whitepaper.md

---

## Visuals Suggestions

1. **Architecture diagram**: Tool Usage → SQLite → .claude/rules/ → Claude's Context
2. **Before/After**: Session 1 teaching Claude vs Session 100 Claude already knowing
3. **Rule file screenshot**: Show actual generated .md with frontmatter
4. **Dialectic flow**: Thesis → Antithesis → Synthesis with examples
5. **Output type decision tree**: Flowchart showing rule vs skill vs both
6. **Comparison table**: Engram vs ENGRAM vs Mem0 vs SAGE (feature matrix)
7. **Memory decay curve**: Exponential decay with access/validation boosts
8. **Self-improvement bounds**: dK/dt curve converging to zero
9. **Plugin install GIF**: Three commands to working system
10. **LaTeX equations screenshot**: Show the formal math (academic credibility)
