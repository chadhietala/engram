# X Thread: Teaching AI to Learn Through Contradictions

## Current Stats (from database)

```
684 memories → 220 theses → 49 antitheses → 48 syntheses → 28 skills
```

The pipeline is working. Each session contributes to continuous learning.

---

## What's Genuinely Novel

### 1. Hegelian Dialectic for Pattern Evolution

Most learning systems try to find consistent patterns. Engram treats contradictions as **refinement opportunities**:

- **Thesis**: "User does broad file searches first"
- **Antithesis**: "User did a narrow targeted search this time"
- **Synthesis**: "Discovery phase (broad) → Inspection phase (narrow)"

The contradiction **improved** the pattern by adding nuance.

### 2. Parameterized Tools, Not Macro Replays

Generated scripts are **tools you invoke with your intent**, not recordings that replay exact commands:

```bash
bun explore-codebase --query "authentication"
bun remove-deprecated-heuristics --dry-run
```

Inside, they call Claude at decision points:
```typescript
// Gather all files
const glob = new Glob(includePattern);
const allFiles: string[] = [];
for await (const file of glob.scan({ cwd: targetDir })) {
  allFiles.push(file);
}

// Intelligence point: Ask Claude which ones matter for THIS query
const relevanceAnalysis = await intelligence(
  `Analyze these files and identify which are most relevant to: "${query}"`,
  { files: validFiles.map(f => ({ path: f.file, preview: f.content.slice(0, 500) })) }
);
```

The system learned the workflow. You provide the intent.

### 3. Goal-Based Naming (Intent, Not Tools)

Skills are named by what the user was trying to accomplish:
- `explore-codebase` (not "grep-read-grep")
- `remove-deprecated-heuristics` (not "search-edit-delete")

The system extracts user prompts temporally near tool usage and asks: "What were they *trying* to do?"

### 4. Memory Decay + Promotion (Cognitive Model)

Memories decay with a 12-hour half-life. But memories that become part of a synthesis get **promoted to long-term** - they survive decay.

This mimics how human memory consolidation works: important experiences (ones that led to insights) are retained.

---

## The X Thread (7 Posts)

---

### Post 1
I built a system that learns from how I use @ClaudeCode using Hegelian dialectics.

It watches my workflows, notices when I contradict myself, and synthesizes the contradictions into reusable skills.

28 skills so far. All of them are about building engram. It's fully recursive - learned to improve itself by watching me improve it.

---

### Post 2
So here's the thing. Most "AI learns from you" stuff tries to find consistent patterns.

But when I do X sometimes and Y other times, that's not noise. That's me knowing when each approach works better.

---

### Post 3
The system notices "user always searches broadly."

Then it sees me do a narrow targeted search. Instead of discarding, it asks: when does broad make sense? When does narrow?

Result: "broad for discovery, narrow when you know what you're looking for."

---

### Post 4
Turns out there's a name for this. Hegel called it dialectic synthesis - thesis meets contradiction, you get a more nuanced understanding.

I basically built thesis-antithesis-synthesis in TypeScript. 200 years later it's useful for watching how developers use tools.

---

### Post 5
What it learned from watching me:

684 things I did
→ 220 patterns it noticed
→ 49 times I contradicted myself
→ 48 "oh that's when each applies"
→ 28 reusable skills

4% of what I do becomes a skill. High bar on purpose.

---

### Post 6
The skills aren't macros. They're tools.

`explore-codebase --query "authentication"`

It calls @AnthropicAI Claude to figure out which files matter for *your* query. Learned the workflow, you bring the problem.

---

### Post 7
When it sees a pattern similar to an existing skill, it doesn't make a new one. It merges the insight and bumps the version.

`explore-codebase` is already at v1.1. Kinda feels like this is where @ClaudeCode is heading.

Still a bit of a WIP but here's the repo: https://github.com/hirefrank/engram

---

## Supporting Visual Ideas

### Diagram 1: The Pipeline
```
Tool Usage → Memory → Thesis → [Contradiction?] → Antithesis → Synthesis → Skill
                                    ↓
                              (no) Thesis strengthened
```

### Diagram 2: Intelligence Points
Show a script with clear sections:
- `// deterministic` (file gathering)
- `// intelligence point` (LLM reasoning)
- `// deterministic` (action based on LLM output)

### Screenshot: Real Skill Output
The `explore-codebase/SKILL.md` edge case showing the discovery/inspection phase distinction.

---

## Key Talking Points for Replies

1. **"Why not just fine-tune?"** - Fine-tuning averages behavior. Dialectic synthesis preserves the nuance of WHEN different approaches apply.

2. **"Why Hegel?"** - Expertise develops through encountering exceptions. Hegel's framework formally models how contradictions lead to higher understanding.

3. **"Is this just prompt engineering?"** - No. The system detects contradictions automatically, generates antitheses, and synthesizes resolutions. It's a learning loop, not a static prompt.

4. **"How is this different from RAG?"** - RAG retrieves. Engram synthesizes. A RAG system would return both contradictory patterns. Engram reasons about when each applies.

---

## Thread Timing

Best posted on a weekday morning (PST). Technical/philosophical content performs well Tue-Thu.

Consider a follow-up thread later showing a specific skill in action with before/after.

---

## Character Counts (for reference)

| Post | Characters | Under 280? |
|------|------------|------------|
| 1    | 274        | ✓          |
| 2    | 195        | ✓          |
| 3    | 231        | ✓          |
| 4    | 262        | ✓          |
| 5    | 181        | ✓          |
| 6    | 209        | ✓          |
| 7    | 249        | ✓          |

All posts fit within X's character limit.
