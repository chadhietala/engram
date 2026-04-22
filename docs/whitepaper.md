# Engram: Dialectical Memory and Hybrid Intelligence for Self-Improving AI Agents

**Abstract**

We present Engram, a memory architecture for AI coding agents that transforms observed behavior patterns into reusable procedural knowledge through conflict-triggered refinement under a minimum-description-length (MDL) objective—cast narratively as Hegelian dialectic. Unlike traditional approaches that accumulate examples or fine-tune models, Engram evolves understanding through outcome-gated contradiction and synthesis, producing Agent Skills in the open standard format adopted by Claude, Cursor, GitHub Copilot, VS Code, OpenAI Codex, and others. These skills contain "hybrid scripts" that interleave deterministic code with targeted LLM reasoning—placing intelligence precisely where judgment is needed. A novel output type decision system determines whether mature patterns become declarative rules, procedural skills, or both; a curation layer retires skills that stop firing or succeeding; and a runtime selection loop uses top-K metadata retrieval with optional sandboxed rollouts to commit the best candidate. This creates a feedback loop where agents automatically generate tools that make them more effective, bridging the gap between System 2 (deliberate) and System 1 (automatic) cognition.

---

## 1. Introduction

Modern AI coding assistants like Claude Code support persistent memory through hierarchical configuration files—project-level `CLAUDE.md`, modular `.claude/rules/`, and user preferences. This represents significant progress: teams can document coding standards, architectural patterns, and workflows that persist across sessions.

However, this memory is **manually authored**. Developers must recognize patterns in their own behavior, articulate them clearly, and maintain documentation as practices evolve. In practice, valuable patterns often go undocumented because:

1. **Recognition burden**: Identifying which workflows are worth codifying requires meta-cognitive effort
2. **Articulation gap**: Translating implicit expertise into explicit instructions is difficult
3. **Maintenance overhead**: Documentation drifts from actual practice without active curation
4. **No procedural knowledge**: Memory files store instructions, not executable workflows

Human experts, by contrast, develop automaticity. A novice programmer consciously thinks through each git command; an expert executes complex workflows reflexively. This transition from deliberate reasoning (System 2) to automatic execution (System 1) is central to expertise development—and it happens through practice, not documentation.

Engram bridges this gap by **learning from behavior rather than requiring documentation**:
- Observing agent tool usage *and outcomes* during normal operation
- Detecting recurring patterns through semantic clustering
- Refining patterns through outcome-gated dialectical contradiction — behavior that merely *recurs* is not enough; it must also *succeed*
- Generating executable hybrid scripts that encode mature patterns
- Publishing mature knowledge to Claude Code's native memory system, and *retiring* skills that stop firing or succeeding

The result is an agent that literally writes its own tools and documentation, with a curation loop that keeps the library focused on what currently works — not a monotonically growing pile of every pattern ever observed.

---

## 2. Related Work

### 2.1 Agent Memory Systems

Existing approaches to agent memory include vector databases for embedding retrieval (MemGPT, LangChain Memory), episodic buffers with summarization, and pre-defined tool libraries. These systems accumulate information but don't transform it—a vector database returns similar past experiences; it doesn't synthesize them into new capabilities.

Recent work has advanced memory orchestration. **ENGRAM** [6] provides lightweight memory management for conversational agents, organizing data into episodic, semantic, and procedural types via a unified router/retriever. It emphasizes long-horizon consistency but lacks dialectical refinement or self-generated tools. **Mem0** [7] introduces memory primitives for agent evolution, including procedural knowledge management, but without contradiction-based synthesis or intelligence points. Wang et al. [8] propose long-term memory as a foundation for AI self-evolution, discussing continual adaptation that echoes our convergence properties—though without the dialectical mechanism.

Our work differs by transforming accumulated observations through dialectic into executable artifacts, not merely retrieving them.

### 2.2 Dialectical Approaches in LLMs

Chen et al. [9] propose a Hegelian dialectical approach for LLM self-reflection, using thesis-antithesis-synthesis to generate new ideas and correct errors in reasoning tasks. This mirrors our consolidation layer but focuses on general LLM reflection within a single reasoning chain rather than pattern detection across agent tool usage sessions. Their dialectic operates at inference time; ours operates across sessions to produce persistent artifacts.

### 2.3 Self-Improving Agents

Multiple works address self-evolving agents. **SAGE** [10] uses iterative feedback, reflection, and Ebbinghaus-based memory optimization for multi-task handling. **AgentEvolver** [11] enables autonomous evolution via self-questioning, navigation, and attribution for sample efficiency. A comprehensive survey on self-evolving agents [12] categorizes evolution across components (models, memory, tools) and stages, noting the need for hybrid neuro-symbolic approaches.

These align with our self-improvement loop but do not incorporate dialectic for pattern consolidation. Engram's contribution is the specific mechanism — conflict-triggered MDL refinement, narrated as Hegelian synthesis — that refines patterns through contradiction rather than simple accumulation or reflection.

The closest structural analogues to Engram's consolidation pipeline are **DreamCoder** [18] and **Voyager** [19]. DreamCoder alternates a waking phase (solving tasks) with a sleeping phase that refactors solutions into a reusable library and trains a neural recognizer to retrieve from it — the same wake/sleep shape we adopt, applied to lambda-calculus programs with an MDL-driven refactoring step rather than our outcome-gated dialectic. Voyager maintains a growing skill library of JavaScript functions synthesized from successful Minecraft trajectories, retrieved by embedding similarity, and is the closest prior system that produces *LLM-generated callable artifacts* from lived experience. Engram differs from both in three ways: (a) generated artifacts are emitted in the open Agent Skills format rather than a system-internal library, giving portability and human inspectability; (b) the consolidation loop is outcome-gated and employs a first-class curation/retirement mechanism, avoiding the unbounded library growth common to skill-accumulation systems; and (c) synthesized artifacts are *hybrid* — deterministic code with explicit intelligence points — rather than pure code or pure prompts.

### 2.4 Amortized Reasoning and System 1 / System 2 Distillation

The pattern of *slow deliberation producing artifacts that support fast retrieval* is central to Engram and has a direct analogue in **Expert Iteration** [20] and **AlphaZero** [21], where Monte Carlo Tree Search (System 2) produces supervision for a policy network (System 1) so subsequent decisions can be made with little or no search. Engram's consolidation-to-retrieval pipeline is the symbolic counterpart: offline synthesis produces Skills whose metadata supports cheap retrieval, and rollouts (§7.3) play the MCTS role at runtime when uncertainty demands it. The difference is the artifact — neural weights vs. inspectable code — and the learning signal — gradient descent on value estimates vs. outcome-gated dialectical refinement.

### 2.5 Procedural Knowledge

Work on procedural knowledge extraction from troubleshooting guides using VLMs [13] and benchmarks for procedural memory retrieval in agents [14] focus on identifying steps from observations, akin to our observation/encoding layers. However, they lack the full architecture connecting observation to self-generated tools.

### 2.6 Hybrid Intelligence

The term "hybrid intelligence" typically refers to human-AI collaboration—e.g., HASHIRU's hierarchical agents for resource utilization [15], or joint decision-making frameworks [16]. This differs from our "hybrid scripts" which combine deterministic code with LLM reasoning within a single executable. We are unaware of prior work on coding-specific hybrids that interleave programmatic control flow with targeted intelligence points.

### 2.7 Learning from Demonstrations

Behavioral cloning and imitation learning extract policies from expert demonstrations. However, these approaches typically require explicit demonstration collection, separate training phases, and model weight updates. Engram operates continuously during normal use, requires no explicit demonstrations, and produces symbolic artifacts (scripts) rather than weight updates.

### 2.8 Program Synthesis

Neural program synthesis generates code from specifications. Engram differs in that:
- Input is observed behavior, not formal specifications
- Output combines generated code with LLM reasoning hooks
- The system bootstraps itself from its own usage patterns

### 2.9 Agent Skills Open Standard

Agent Skills [17] is an open standard originally developed by Anthropic and now adopted across the AI agent ecosystem—including Claude Code, Cursor, GitHub Copilot, VS Code, OpenAI Codex, Gemini CLI, Goose, and many others. Skills are directories containing `SKILL.md` (instructions with YAML frontmatter) and optional bundled scripts. Agents discover skills via metadata, load instructions on-demand when triggered, and execute scripts without loading their code into context.

The standard enables **write once, run anywhere** for agent capabilities: a skill authored for one compatible agent works across all others.

Engram generates Skills in this open format, but with a key difference: **automatic generation from observed behavior**. While Agent Skills are typically authored manually, Engram observes tool usage patterns, refines them through dialectic, and produces Skills automatically. This positions Engram as a learning layer that can populate any skills-compatible agent without requiring explicit authoring—and the generated skills are portable across the entire ecosystem.

---

## 3. Architecture

Engram processes observations through four stages, inspired by memory consolidation in cognitive science:

![Memory Process](memory-process.png)

### 3.1 Observation Layer

A hook system captures tool invocations and their *outcomes* during agent operation:

```typescript
interface ToolObservation {
  tool: string;           // "Read", "Bash", "Edit", etc.
  input: object;          // Tool parameters
  output: string;         // Tool result
  sessionId: string;      // Conversation context
  timestamp: number;

  // Outcome signal — see §3.1.1
  exitCode?: number;          // process / HTTP status where applicable
  errorClass?: string;        // normalized error taxonomy (if any)
  outcome: Outcome;           // success | failure | reverted | unknown
  outcomeSource: OutcomeSrc;  // tool | test | user | judge | timeout
  outcomeConfidence: number;  // [0,1], reflects source reliability
}

type Outcome    = "success" | "failure" | "reverted" | "unknown";
type OutcomeSrc = "tool" | "test" | "user" | "judge" | "timeout";
```

Observations include file reads, shell commands, code edits, and user prompts. This creates a complete record of agent behavior without modifying the agent itself.

#### 3.1.1 Outcome Resolution

Every observation is tagged with an outcome before it participates in consolidation. Outcomes are resolved by a cascade of sources in decreasing order of reliability:

1. **Tool-intrinsic signals** — non-zero exit codes, HTTP 4xx/5xx, stderr matching known error classes, failed `Edit` patches, or exceptions from `intelligenceWithSchema` validation.
2. **Test signals** — if a session triggers a test runner (`bun test`, `pytest`, etc.), pass/fail is propagated to the observations within the session window.
3. **Revert signals** — if a subsequent edit reverses the effect of this observation within the same session, its outcome is demoted to `reverted`. This catches "looked fine, then had to be undone" cases.
4. **User signals** — explicit acceptance (`/accept`), rejection, rollback via `git reset`, or session abandonment.
5. **LLM-as-judge fallback** — for tasks without mechanical verification, a separate judge model scores the observation's contribution to task completion. Judge outputs receive reduced `outcomeConfidence` (default 0.5) to reflect known biases.

Observations that cannot be resolved after the session closes remain `unknown` and are down-weighted in all downstream formulas. This is the central signal that distinguishes *recurrent* behavior from *effective* behavior — without it, Engram would faithfully codify bad habits.

### 3.2 Encoding Layer

Observations are transformed into semantic embeddings using a local transformer model (no API calls, preserving privacy). Similar observations cluster naturally in embedding space.

The system identifies patterns through:
1. **Temporal proximity**: Tools used in sequence
2. **Semantic similarity**: Observations with similar embeddings
3. **Structural patterns**: Recurring tool combinations (Read → Edit → Bash)

### 3.3 Consolidation Layer: Conflict-Triggered Refinement

**Mechanistic framing.** The consolidation layer implements *conflict-triggered refinement under a minimum-description-length (MDL) objective* (developed formally in §8.4). Coarse patterns are proposed, contradicted by observations they fail to cover, and replaced by conditional refinements that improve joint description length. The Hegelian thesis-antithesis-synthesis vocabulary is retained as an intuition pump — readers preferring a statistical-learning lens can treat it as *proposal → conflicting evidence → conditional refinement*. The mechanism is outcome-gated: only observations with resolved, non-`unknown` outcomes drive thesis promotion, and contradictions include outcome disagreement as a first-class signal.

**Thesis Formation**

A pattern $P$ with observations $\{o_1, o_2, \ldots, o_n\}$ forms a thesis $T$ when:

$$|P| \geq N_{\min} \land C(P) \geq \gamma \land \rho(P) \geq \rho_{\min}$$

Where:
- $N_{\min}$ = minimum observation count (default: 3)
- $C(P)$ = cohesion score of the pattern
- $\gamma$ = cohesion threshold (default: 0.7)
- $\rho(P)$ = outcome-weighted success rate of the pattern
- $\rho_{\min}$ = minimum success rate for promotion (default: 0.6)

Cohesion is defined as the average pairwise similarity:

$$C(P) = \frac{2}{n(n-1)} \sum_{i < j} \text{sim}(e_i, e_j)$$

The success rate is outcome- and confidence-weighted:

$$\rho(P) = \frac{\sum_{o \in P} w(o) \cdot \mathbb{1}[\text{outcome}(o) = \texttt{success}]}{\sum_{o \in P} w(o)}, \quad w(o) = \text{outcomeConfidence}(o) \cdot \kappa(o)$$

Where $\kappa(o) \in \{1.0, 1.0, 0.3, 0.0\}$ for $\{\texttt{success}, \texttt{failure}, \texttt{reverted}, \texttt{unknown}\}$. Failures count toward the denominator but not the numerator; reverted outcomes partially count; unknown outcomes are ignored.

The thesis confidence folds in outcome quality:

$$\text{conf}(T) = \min\left(1, \frac{|P|_{\text{resolved}}}{N_{\text{saturate}}}\right) \cdot C(P) \cdot \rho(P)$$

Where $|P|_{\text{resolved}}$ counts only observations with non-`unknown` outcomes and $N_{\text{saturate}} = 10$ is the saturation point for evidence accumulation. A pattern that is cohesive and recurrent but consistently unsuccessful ($\rho \to 0$) will never promote to a thesis — the intended behavior.

**Antithesis Detection**

An observation $o$ contradicts thesis $T$ when:

$$\text{sim}(e_o, e_T) > \tau_{\text{relevant}} \land D(o, T) > \delta$$

Where:
- $\tau_{\text{relevant}}$ = relevance threshold (0.5) — observation must be in same domain
- $D(o, T)$ = divergence score measuring behavioral difference
- $\delta$ = contradiction threshold (0.3)

Divergence combines three orthogonal signals — structural, semantic, and outcome — because a shallow tool-sequence distance alone misses important contradiction modes (same tools used on different arguments; same tools producing different results):

$$D(o, T) = 1 - \left[\; \alpha_s \cdot \Pi(\mathrm{toolSeq}(o), \mathrm{expectedSeq}(T)) \;+\; \alpha_a \cdot \mathrm{sim}(\mathbf{e}_{\mathrm{args}}(o), \mathbf{e}_{\mathrm{args}}(T)) \;+\; \alpha_o \cdot \mathbb{1}[\mathrm{outcome}(o) = \mathrm{outcome}(T)] \;\right]$$

Where:
- $\Pi$ = normalized Levenshtein similarity between tool-name sequences (structural)
- $\mathbf{e}_{\mathrm{args}}(\cdot)$ = embedding of concatenated tool arguments and salient outputs (semantic)
- The indicator term compares the observation's outcome to $T$'s modal outcome (outcome)
- $(\alpha_s, \alpha_a, \alpha_o) = (0.4, 0.3, 0.3)$

The outcome term gives Engram a concrete notion of "same behavior, different result" — an observation whose tool sequence and arguments match $T$ but whose outcome differs is a first-class contradiction, even when structural/semantic similarity is high. This is what distinguishes refining a pattern from merely accumulating near-duplicates.

**Synthesis Trigger**

Synthesis is triggered when antithesis accumulation reaches critical mass:

$$\sum_a \text{weight}(a) \geq \omega \cdot \text{conf}(T)$$

Where:
- $\text{weight}(a)$ = recency-weighted antithesis strength
- $\omega$ = synthesis threshold ratio (default: 0.4)

This means a thesis with confidence 0.8 requires antitheses totaling 0.32 weight to trigger synthesis.

**Synthesis Quality Score**

The resulting synthesis $S$ is evaluated by:

$$Q(S) = \text{coverage}(S) \cdot \text{consistency}(S) \cdot \text{parsimony}(S)$$

Where:
- $\text{coverage}(S)$ = fraction of observations (thesis + antitheses) explained
- $\mathrm{consistency}(S) = 1 - r_{\mathrm{contradiction}}$
- $\mathrm{parsimony}(S) = \frac{1}{1 + n_{\mathrm{conditions}}}$ — simpler is better

A synthesis is accepted when $Q(S) > Q_{\min}$ (default: 0.6).

### 3.4 Procedualization Layer: Agent Skills

Mature syntheses (those that have survived multiple contradiction cycles) are transformed into Agent Skills—Claude's official format for modular, reusable capabilities. Each Skill contains a `SKILL.md` with instructions and optional bundled scripts.

Engram extends this format with "hybrid scripts" that interleave deterministic code with targeted LLM reasoning, creating Skills that are both efficient and intelligent.

---

## 4. Hybrid Scripts and Intelligence Points

### 4.1 The Problem with Pure Automation

Traditional automation is fully deterministic: given inputs, produce outputs through fixed logic. This works for well-defined tasks but fails when judgment is required:

- Should this file be included in the analysis?
- What's a good commit message for these changes?
- Is this code pattern problematic?

Conversely, pure LLM agents reason about everything, even mechanical tasks better handled by code.

### 4.2 The Hybrid Approach

Engram generates scripts that combine both paradigms:

```typescript
#!/usr/bin/env bun
import { intelligence } from "engram/skill-runtime";

// DETERMINISTIC: File discovery
const glob = new Bun.Glob("**/*.ts");
const files = [];
for await (const file of glob.scan({ cwd: targetDir })) {
  files.push(file);
}

// DETERMINISTIC: Content extraction
const contents = await Promise.all(
  files.slice(0, 20).map(f => Bun.file(f).text())
);

// INTELLIGENCE POINT: Requires judgment
const relevantFiles = await intelligence(
  "Which of these files are most relevant to understanding the authentication system?",
  { files: files.join("\n"), samples: contents }
);

// DETERMINISTIC: Output formatting
console.log("Key files for authentication:");
console.log(relevantFiles);
```

The script uses fast, reliable code for mechanical operations (globbing, file I/O, string manipulation) but invokes LLM reasoning precisely where human-like judgment adds value.

### 4.3 Intelligence Point API

The skill runtime provides three primitives:

```typescript
// Unstructured reasoning - returns free-form text
async function intelligence(
  task: string,
  context: Record<string, string>
): Promise<string>

// Structured reasoning - returns typed data
async function intelligenceWithSchema<T>(
  task: string,
  schema: ZodSchema<T>,
  context: Record<string, string>
): Promise<T>

// Binary decisions
async function decide(
  question: string,
  context: Record<string, string>
): Promise<boolean>
```

The LLM generating the script learns when to use each:

| Use Case | Approach |
|----------|----------|
| File discovery | Deterministic (glob) |
| Content parsing | Deterministic (regex, AST) |
| Relevance filtering | Intelligence point |
| Summarization | Intelligence point |
| Mathematical operations | Deterministic |
| Code quality judgment | Intelligence point |

### 4.4 Intelligence Point Placement

The decision to use deterministic code vs. an intelligence point is formalized as an optimization problem. For a task $t$ in a workflow, we compute:

**Determinism Score**

$$D(t) = \mathrm{spec}(t) \cdot \mathrm{pred}(t) \cdot (1 - \mathrm{judg}(t))$$

Where:
- $\mathrm{spec}(t) \in [0,1]$ = how well-defined the input/output contract is
- $\mathrm{pred}(t) \in [0,1]$ = consistency of correct output across instances
- $\mathrm{judg}(t) \in [0,1]$ = degree of contextual reasoning needed

**Intelligence Score**

$$I(t) = \mathrm{judg}(t) \cdot \mathrm{var}(t) \cdot \mathrm{value}(t)$$

Where:
- $\mathrm{var}(t)$ = variance in appropriate responses across contexts
- $\mathrm{value}(t)$ = improvement in outcome quality from LLM reasoning

**Decision Boundary**

Use deterministic code when:

$$\frac{D(t)}{D(t) + I(t)} > 0.5 + \text{margin}$$

Where $\text{margin} = 0.1$ biases toward deterministic code (faster, cheaper, more reliable).

In practice, this manifests as:

| Task Type | D(t) | I(t) | Decision |
|-----------|------|------|----------|
| File glob | 0.95 | 0.05 | Deterministic |
| JSON parse | 0.90 | 0.10 | Deterministic |
| Relevance filter | 0.20 | 0.85 | Intelligence |
| Commit message | 0.15 | 0.90 | Intelligence |
| String concat | 0.99 | 0.01 | Deterministic |
| Code review | 0.10 | 0.95 | Intelligence |

#### 4.4.1 Placement in Practice

The scores $D(t)$ and $I(t)$ above are analytical — they explain *why* a placement is correct, not *how* the skill generator arrives at it. In the implementation, a script-authoring LLM makes the placement call during generation. Three mechanisms keep that decision honest:

1. **Meta-prompt with exemplars.** The generator's system prompt includes a tagged library of deterministic-vs-intelligence exemplars drawn from the table in §4.4, phrased as "use code for X because …; use `intelligence()` for Y because …". These are retrieved dynamically based on the current skill's domain so the generator sees the most relevant precedents.

2. **Post-hoc placement verifier.** After a draft script is produced, a verifier LLM annotates each `intelligence()` call with an *escape analysis*: can this call be replaced by deterministic code (AST walk, regex, lookup) given the inputs in scope? Calls flagged as mechanically replaceable are rewritten; deterministic blocks flagged as genuinely context-dependent are converted to `intelligence()` calls. The verifier operates on the closure of the call site, not just the call signature.

3. **Empirical recalibration.** Every `intelligence()` invocation is logged with its inputs, outputs, and the downstream outcome of the containing script. Calls whose outputs are trivially derivable from inputs (high mutual information, low entropy conditional on context) are candidates for demotion to deterministic code in the next version of the skill. Conversely, deterministic branches that produce frequent downstream failures are candidates for promotion to intelligence points.

This turns §4.4's decision boundary from a one-shot classification into a closed loop: the library learns, from its own runtime traces, where it over- or under-uses intelligence.

### 4.5 Why This Matters

Hybrid scripts occupy a unique point in the automation landscape:

![Hybrid Scripts](scripts.png)

---

## 5. Output Type Decision

When a synthesis reaches maturity, Engram must decide what artifact to produce. This decision is formalized as a classification problem over four output types.

### 5.1 Output Type Space

Let $S$ be a synthesis. The possible outputs are:

| Type | Description | Artifact |
|------|-------------|----------|
| `rule` | Declarative guideline | `.claude/rules/engram/*.md` |
| `skill` | Procedural workflow | `.claude/skills/{name}/SKILL.md` + scripts |
| `rule_with_skill` | Both representations | Rule file linking to skill |
| `none` | Insufficient confidence | No artifact |

Skills follow Claude's official Agent Skills format:

```
.claude/skills/{name}/
├── SKILL.md          # Instructions with YAML frontmatter
└── scripts/
    └── {name}.ts     # Hybrid script with intelligence points
```

The `SKILL.md` contains metadata (name, description for discovery) and instructions that Claude loads on-demand. Bundled scripts execute via bash without loading their code into context—only outputs consume tokens.

### 5.2 Content Characteristics

We extract characteristics $\chi(S)$ from synthesis content using a hybrid approach: LLM semantic analysis for judgment-based characteristics, with heuristic fallback when the LLM is unavailable.

**Semantic Characteristics (LLM-analyzed)**

For `isImperative` and `isProcedural`, we use LLM semantic analysis rather than regex pattern matching. This provides more accurate detection by understanding intent rather than matching keywords.

$$\mathcal{I}(S) = \text{LLM}_{\text{semantic}}(S, \text{"mandatory behaviors"})$$

The LLM evaluates whether content describes MANDATORY behaviors (rules that MUST be followed, things to ALWAYS or NEVER do) versus suggestions or recommendations. For example:
- "All commits must include tests" → imperative (true)
- "You should always consider..." → suggestion (false)

$$\mathcal{P}(S) = \text{LLM}_{\text{semantic}}(S, \text{"multi-step workflow"})$$

The LLM evaluates whether content describes an ORDERED SEQUENCE of steps versus parallel actions or simple rules. For example:
- "First do X, then Y, finally Z" → procedural (true)
- "When debugging, check logs and errors" → parallel, not sequential (false)

**Heuristic Fallback**

When LLM analysis is unavailable, regex patterns provide fallback detection:

$$\mathcal{I}_{\text{fallback}}(S) = \mathbb{1}[\exists w \in S : w \in W_{\text{imperative}}]$$

Where $W_{\text{imperative}}$ contains patterns like:

```
/always/i, /never/i, /must/i, /required?/i, /ensure/i, /before\s+\w+ing/i, ...
```

$$\mathcal{P}_{\text{fallback}}(S) = \mathbb{1}[\exists p \in S : p \text{ matches } R_{\text{procedural}}]$$

Where $R_{\text{procedural}}$ contains patterns like:

```
/step\s*\d/i, /first\b.*\bthen\b/i, /workflow/i, /\d+\.\s+\w/, ...
```

**Measurable Characteristics (Heuristic)**

Tool diversity and complexity remain heuristic-based as they involve countable, measurable properties:

**Tool Diversity**

$$\mathcal{T}(S) = |\{\text{tool}(o) : o \in \text{exemplars}(S)\}|$$

The count of distinct tools in supporting observations.

**Complexity Score**

$$K(S) = \alpha \cdot \text{len}(S) + \beta \cdot \mathcal{T}(S) + \gamma \cdot \text{cond}(S) + \delta \cdot \mathcal{P}(S)$$

Where:
- $\text{len}(S)$ = normalized content length
- $\text{cond}(S)$ = presence of conditional logic
- $\alpha, \beta, \gamma, \delta$ = weighting coefficients (0.3, 0.3, 0.2, 0.2)

### 5.3 Decision Function

The output type is determined by:

$$\text{output}(S) = \begin{cases}
\texttt{none} & \text{if } \text{conf}(S) < \theta_{\min} \lor |\text{exemplars}(S)| < N_{\min} \\
\texttt{rule} & \text{if } \mathcal{I}(S) > \tau_I \land \mathcal{P}(S) < \tau_P \\
\texttt{skill} & \text{if } \mathcal{P}(S) > \tau_P \land \mathcal{T}(S) > \tau_T \land K(S) > \kappa \\
\texttt{rule+skill} & \text{if } \mathcal{I}(S) > \tau_I \land \mathcal{P}(S) > \tau_P \land \mathcal{T}(S) > \tau_T \\
\texttt{rule} & \text{otherwise}
\end{cases}$$

Where:
- $\theta_{\min} = 0.5$ (minimum confidence for any output)
- $N_{\min} = 2$ (minimum exemplar count)
- $\tau_I = 0.3$ (imperative threshold)
- $\tau_P = 0.3$ (procedural threshold)
- $\tau_T = 2$ (tool diversity threshold)
- $\kappa = 0.5$ (complexity threshold)

### 5.4 Two-Level LLM Analysis

The output type decision uses LLM analysis at two levels:

**Level 1: Semantic Characteristic Analysis**

As described in §5.2, $\mathcal{I}(S)$ and $\mathcal{P}(S)$ are determined by LLM semantic analysis that understands intent rather than matching keywords. This happens for every synthesis, with heuristic fallback on LLM failure.

**Level 2: Output Type Refinement**

When the output type decision confidence is low (< 0.7), a second LLM call refines the output type choice:

$$\text{confidence}(\text{decision}) = \frac{\max(\text{margins})}{\sum \text{margins}}$$

Where margins measure the distance from each decision boundary. For uncertain cases:

$$\mathrm{output}(S) = \mathrm{LLM}_{\text{output}}(\mathrm{content}(S), \mathrm{resolution}(S), \mathrm{tools}(S))$$

This second-level analysis uses the semantic characteristics already determined by Level 1, then provides structured analysis recommending the appropriate output type (`rule`, `skill`, `rule_with_skill`, or `none`).

---

## 6. Native Memory Integration

A key innovation is the graduation of mature patterns to Claude's native memory system, enabling persistence without the plugin.

### 6.1 Claude Code's Memory Hierarchy

Claude Code implements a sophisticated memory system with multiple scopes, loaded in order of precedence:

| Scope | Location | Shared With |
|-------|----------|-------------|
| Managed policy | System-level `CLAUDE.md` | All users (IT-managed) |
| Project memory | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team via source control |
| Project rules | `./.claude/rules/*.md` | Team via source control |
| User memory | `~/.claude/CLAUDE.md` | Just you (all projects) |
| User rules | `~/.claude/rules/*.md` | Just you (all projects) |
| Local memory | `./CLAUDE.local.md` | Just you (current project) |

Project rules support path-specific activation via YAML frontmatter, allowing rules to apply only when Claude works with matching files.

Engram publishes to `.claude/rules/engram/`, creating rules that load automatically and integrate seamlessly with manually-authored rules.

### 6.2 Publication Criteria

A synthesis $S$ qualifies for publication when:

$$\text{pub}(S) = \text{conf}(S) \geq \theta_{\text{pub}} \land |\text{exemplars}(S)| \geq N_{\text{pub}} \land \text{resolution}(S) \neq \texttt{rejection}$$

Where:
- $\theta_{\text{pub}} = 0.7$ (publication confidence threshold)
- $N_{\text{pub}} = 3$ (minimum supporting memories)

### 6.3 Rule Content Generation

Published rules include:

```markdown
---
paths:
  - "{extracted_path_patterns}"
---

# {Pattern Title}

{synthesis_content}

## When to Apply

{conditions_from_resolution}

## Related Skill

{if output_type ∈ {skill, rule_with_skill}}

<!-- engram:pattern:{id}:synthesis:{id}:v{n}:{date}:confidence:{c} -->
```

The metadata comment enables tracking and updates as patterns evolve.

### 6.4 Version Evolution

When a pattern's understanding changes, the rule is updated:

$$\text{version}(R') = \text{version}(R) + 1 \quad \text{if} \quad \text{hash}(\text{content}(R')) \neq \text{hash}(\text{content}(R))$$

Previous versions are superseded in the database but the file is overwritten in place.

### 6.5 Scope Promotion

Patterns can be promoted from project to user scope:

$$\text{scope}(R) = \texttt{user} \quad \text{if} \quad |\{\text{projects} : R \text{ appears in project}\}| \geq N_{\text{cross}}$$

Where $N_{\text{cross}} = 3$. Cross-project patterns become user-level preferences.

### 6.6 Curation and Retirement

Promotion alone creates an ever-growing library, which degrades retrieval quality and encodes stale practice. Engram pairs every promotion with an *active curation* pass that runs during the same idle window as consolidation (§8.5). Curation has three levers: retirement, deduplication, and demotion.

**Skill Fitness**

For each published artifact $R$ we maintain a rolling fitness score over a sliding window of the last $W$ invocation opportunities:

$$F(R) = \phi_r \cdot f_{\text{retrieve}}(R) + \phi_s \cdot f_{\text{select}}(R) + \phi_o \cdot f_{\text{outcome}}(R) - \phi_d \cdot f_{\text{duplicate}}(R)$$

Where:
- $f_{\text{retrieve}}(R)$ = fraction of relevant tasks in which $R$ appeared in the top-K retrieval set
- $f_{\text{select}}(R)$ = fraction of retrievals in which $R$ was chosen for execution (given it was retrieved)
- $f_{\text{outcome}}(R)$ = success rate of sessions in which $R$ was selected, weighted by `outcomeConfidence`
- $f_{\text{duplicate}}(R)$ = maximum description-embedding cosine to any other skill in the library
- $(\phi_r, \phi_s, \phi_o, \phi_d) = (0.2, 0.2, 0.5, 0.3)$; window $W = 50$ invocations

**Retirement**

When $F(R) < F_{\text{retire}}$ (default 0.2) *and* the window has accumulated at least $W_{\min} = 10$ invocation opportunities, $R$ is moved to `.claude/skills/engram/.archive/` rather than deleted. Archived skills are excluded from retrieval but retained for three reasons: (a) their observations remain valid training data; (b) if a retired skill's conditions reappear, it can be *reinstated* with a version bump rather than re-synthesized from scratch; (c) archived artifacts provide an audit trail for what the agent *used to do*.

**Deduplication**

When two skills $R_i$ and $R_j$ exceed duplication threshold $\tau_{\text{dup}} = 0.92$ on description embeddings *and* their exemplar sets overlap by more than 60%, Engram triggers a merge: the higher-fitness skill absorbs the other's exemplars, a new synthesis is attempted over the combined set, and the loser is archived. This prevents slow accretion of near-duplicate skills from repeated similar sessions.

**Demotion**

Skills whose `intelligence()` calls show persistently low marginal value (§4.4.1) are demoted — either rewritten with intelligence points replaced by deterministic code, or downgraded to rule-only artifacts if the procedural content was never needed. Conversely, rules whose surrounding observations show consistent conditional structure (different actions under different contexts) are promoted to `rule_with_skill`.

Curation runs each idle cycle, bounded to $O(|\text{library}|)$ work per pass. The library size is empirically stable at 10-30 skills per active project after a few weeks of use — the combination of outcome-gated promotion (§3.3) and active retirement prevents unbounded growth.

---

## 7. The Self-Improvement Loop

Engram creates a feedback loop where the agent improves itself and its knowledge persists:

![Self-Improvement Loop](self-improvement.png)

This is bounded self-improvement: the agent can only generate tools within its observation scope and the capabilities of the hybrid script format. It cannot modify its own weights or reasoning process—only its available tools.

### 7.1 Threat Model and Safety Architecture

The relevant safety question for a self-improving agent is not *how fast does capability grow* but *what can a generated artifact do that the authoring agent could not*. For Engram the answer is: **nothing**, by construction — because every generated skill is executed by the same host agent under the same permission system. But that invariant is only useful if the path from synthesis to execution preserves inspectability and reversibility. This section specifies that path.

**Threat Classes**

| Class | Description | Example |
|-------|-------------|---------|
| T1. Faulty synthesis | Skill encodes behavior that succeeded in observations but is incorrect in general | Pattern learned from a happy path that breaks on edge cases |
| T2. Stale codification | Skill reflects workflow the user has since abandoned | Old deployment command that now fails silently |
| T3. Data-poisoning | Observations from a compromised session bias synthesis toward harmful patterns | Attacker runs scripted sessions that teach `rm -rf` as a "cleanup" pattern |
| T4. Prompt injection in content | Tool outputs contain adversarial text that influences `intelligence()` calls inside generated scripts | Fetched document instructs skill to exfiltrate secrets |
| T5. Permission drift | A skill bundled into `.claude/skills/` runs with the host agent's current permissions, which may exceed those under which it was synthesized | Skill synthesized in read-only session later executes with write access |

**Mitigations**

1. **No new primitives.** Generated skills may only invoke tools already available to the host agent; they introduce no new capability surface. Formally, for any skill $R$, the set of host operations reachable from executing $R$ is a subset of the host's existing permission set $\mathcal{P}$. The agent's effective capability closure is $\mathcal{P}$, not a function of $R$.

2. **Publication review gate.** Before a synthesis is written to `.claude/rules/engram/` or `.claude/skills/`, it is diffed and optionally presented to the user. A project-level `engram.config.json` controls the gate: `auto` (publish immediately), `review` (present diff, require approval), or `pr` (open a pull request). The default is `review` for skills with intelligence points and `auto` for rule-only artifacts.

3. **Outcome gate (T1, T3).** §3.3's outcome-weighted confidence requires $\rho(P) \geq \rho_{\min}$ before thesis promotion. A pattern drawn from a compromised or unsuccessful session will not accumulate the success rate needed to publish. Observations from sessions marked as suspect (e.g., novel tool combinations, anomalous token counts) can be excluded from consolidation via a session-level trust flag.

4. **Retirement and archive (T2).** The curation loop (§6.6) retires skills whose fitness falls below $F_{\text{retire}}$, catching stale codifications before they accumulate downstream failures.

5. **Intelligence-point sandboxing (T4).** Every `intelligence()` call runs in a sub-context with a scoped system prompt that marks tool outputs as untrusted. Generated scripts that pass raw external content to `intelligence()` without marking it as untrusted fail the placement verifier (§4.4.1). Scripts that touch the filesystem or network based on `intelligence()` output require explicit confirmation via `decide()` with a safety-framed question.

6. **Permission invariance (T5).** Published skills carry a `permissions` manifest listing the tools they exercise, derived automatically from static analysis of the script. At execution time, the host refuses to run a skill whose declared permissions exceed the current session's grants. Upgrading a skill to broader permissions triggers a re-review.

7. **Reversible artifacts.** Skills and rules are files in the repository. Reversal is `git revert`. Archived skills (§6.6) are retained so reinstatement does not require re-synthesis.

**What is *not* claimed.** Engram does not guarantee synthesized skills are correct, only that they are inspectable, revocable, and constrained to the host's existing permission surface. Errors of correctness are caught by the same mechanisms that catch human-authored rule errors: outcome signals, user rejection, and the curation loop.

**Convergence (revisited).** The earlier version of this section claimed monotone convergence to a stable skill set. In practice the library reaches a *dynamic equilibrium* rather than a fixed point: promotions and retirements roughly balance once the user's workflow has been covered, but drift (new tools, new idioms, new project phases) keeps the library churning at a low rate. Empirically we observe 10-30 active skills per project after a few weeks, with ~1-2 skills entering and exiting archive per week of active use.

### 7.2 Emergence of Meta-Skills

An interesting property: Engram observes its own skill generation process. If a developer repeatedly refines generated skills in certain ways, Engram can learn that pattern and generate skills that help with skill generation.

In our testing, we observed the emergence of:
- `validate-skill-generator`: Checks generated skills against specifications
- `evolve-skill-generation`: Improves the skill generation process itself

This is recursive self-improvement within safe bounds.

### 7.3 Runtime: Retrieval, Rollout, and Selection

Consolidation (§3) produces a library; a separate runtime loop decides *which* skills fire and *whether* they are committed to the real environment. The runtime is structured as three stages, mirroring the Kahneman System-1 / System-2 split.

**Stage 1 — Retrieval (System 1, cheap).**

On each task, the host agent matches the task description and recent observation window against skill metadata:

$$\text{topK}(q) = \underset{R \in \mathcal{L}}{\mathrm{argtop\text{-}K}} \; \left[\lambda_e \cdot \mathrm{sim}(\mathbf{e}_q, \mathbf{e}_{R.\mathrm{desc}}) + \lambda_p \cdot \mathbb{1}[\mathrm{paths}(R) \cap \mathrm{paths}(q) \neq \emptyset] + \lambda_f \cdot F(R) \right]$$

Where $F(R)$ is the skill fitness from §6.6 and $(\lambda_e, \lambda_p, \lambda_f) = (0.6, 0.2, 0.2)$. Retrieval uses only the `SKILL.md` frontmatter and description — the body is not loaded. This preserves Agent Skills' progressive-disclosure property: retrieval cost scales with the library, not with skill size. Typical $K = 8$.

**Stage 2 — Rollout (optional, parallel, bounded).**

When the top-K contains multiple candidates within a confidence margin, or the task is flagged high-stakes, Engram forks the environment and runs each candidate in parallel. Modern sandbox runtimes (Firecracker-class microVMs, container-backed sandboxes) achieve sub-100 ms cold starts, making top-K rollout tractable within interactive latency budgets:

$$\tilde{o}_i = \mathrm{execute}(R_i, \mathrm{fork}(\mathrm{env}))$$

Each fork inherits the task state but commits nowhere. Rollouts are scored by a verifier:

$$\mathrm{score}(\tilde{o}_i) = \mathcal{V}(\tilde{o}_i, \mathrm{task})$$

$\mathcal{V}$ is a composition of (a) mechanical checks where available (tests pass, types check, no errors), (b) `intelligenceWithSchema` judging for subjective tasks, and (c) the candidate's own declared success predicate (a skill can advertise what "done" looks like in its metadata). When no signal is available, rollout is skipped and the top-1 retrieval is executed directly.

**Stage 3 — Commit and Update.**

The highest-scoring rollout is replayed against the true environment. Its outcome — the *committed* outcome, not the fork outcome — feeds back into $F(R)$ for the selected skill and into a softer update for unselected candidates:

- **Winner:** $F(R^\star) \leftarrow F(R^\star) + \eta \cdot (\mathrm{score} - \bar{F})$
- **Near-winners:** candidates within the confidence margin of $R^\star$ receive a dampened update scaled by their rollout score, to avoid starving genuinely useful alternates.
- **Near-duplicates:** candidates with high description-embedding overlap with $R^\star$ are *decayed* — not because they were wrong, but because they are redundant and compete for retrieval slots. This is the diversity-preservation mechanism noted in §6.6.

Where rollout is not feasible (side-effectful actions on external systems, long-horizon tasks, irreversible operations), the runtime degenerates to Stage 1 + 3: top-1 retrieval, direct execution, outcome update. The library can still improve, but without the multi-arm advantage.

**Relation to classical methods.** This is a three-level hierarchy: retrieval is contextual-bandit arm selection over skill metadata (amortized from offline consolidation); rollout is bounded Monte Carlo simulation over a cheap model of the environment; commit-and-update is a standard bandit update with diversity-preserving decay. What's distinctive is the stack: the slow consolidation loop produces structured arms (skills) whose descriptions are themselves the retrieval features, which makes contextual retrieval tractable in a way that raw tool-level RL is not.

---

## 8. Memory Consolidation and Decay

Engram implements biologically-inspired memory dynamics with formal mathematical foundations.

### 8.1 Memory Types

| Type | Duration | Purpose |
|------|----------|---------|
| Working | Current session | Immediate context |
| Short-term | Days | Recent patterns, subject to decay |
| Long-term | Permanent | Proven patterns that survived dialectic |

### 8.2 Memory Strength Model

Each memory $m$ has a strength value $S(m, t)$ that evolves over time:

$$S(m, t) = S_0 \cdot e^{-\lambda(t - t_0)} \cdot (1 + \alpha \cdot A(m)) \cdot (1 + \beta \cdot V(m))$$

Where:
- $S_0$ = initial strength at encoding (typically 1.0)
- $\lambda$ = decay constant (we use $\lambda = 0.1$ per day)
- $t_0$ = timestamp of memory creation
- $A(m)$ = access count (number of retrievals) — a usage signal
- $V(m)$ = validation score — an *outcome* signal
- $\alpha, \beta$ = weighting coefficients ($\alpha = 0.2$, $\beta = 0.5$)

The validation score combines three components and is bounded to $[0, 1]$:

$$V(m) = \beta_o \cdot v_{\text{outcome}}(m) + \beta_s \cdot v_{\text{synthesis}}(m) + \beta_r \cdot v_{\text{runtime}}(m)$$

Where:
- $v_{\text{outcome}}(m)$ = the observation's own resolved outcome, weighted by `outcomeConfidence` (§3.1.1)
- $v_{\text{synthesis}}(m)$ = contribution to a successful synthesis (survived antithesis, promoted)
- $v_{\text{runtime}}(m)$ = downstream outcomes of skills whose exemplars include $m$ (§7.3 feedback)
- $(\beta_o, \beta_s, \beta_r) = (0.5, 0.3, 0.2)$

Decoupling usage from validation matters: a memory may be retrieved often but consistently mislead the agent. Under the old formulation ($V$ = "contribution to syntheses") such a memory would gain strength simply from being reused. The revised $V$ down-weights memories whose downstream outcomes are poor, regardless of retrieval frequency.

A memory is pruned when $S(m, t) < \theta$ (threshold = 0.1).

### 8.3 Semantic Similarity

Given two observations with embeddings $\mathbf{e}_1, \mathbf{e}_2 \in \mathbb{R}^d$, similarity is computed as:

$$\text{sim}(\mathbf{e}_1, \mathbf{e}_2) = \frac{\mathbf{e}_1 \cdot \mathbf{e}_2}{\|\mathbf{e}_1\| \cdot \|\mathbf{e}_2\|}$$

Observations cluster into pattern $P$ when:

$$\forall \, e_i, e_j \in P : \text{sim}(e_i, e_j) > \tau$$

Where $\tau = 0.75$ is the clustering threshold.

### 8.4 Information-Theoretic View

Pattern detection can be viewed as compression. Given observation sequence $O = \{o_1, o_2, \ldots, o_n\}$, we seek patterns $P$ that minimize description length:

$$L(O) = L(P) + L(O \mid P)$$

Where:
- $L(P)$ = bits to describe the pattern set
- $L(O \mid P)$ = bits to describe observations given patterns

A pattern is valuable when:

$$L(O \mid P) < L(O \mid \emptyset) - L(P)$$

The information gain from pattern $p$ is:

$$IG(p) = H(O) - H(O \mid p)$$

Where $H$ denotes entropy. Patterns with higher information gain are prioritized for thesis formation.

**Dialectic as Refinement Coding**

The thesis-antithesis-synthesis cycle implements a form of refinement coding:

1. **Thesis** = coarse approximation, low $L(T)$ but high $L(O \mid T)$
2. **Antithesis** = residual signal not captured by thesis
3. **Synthesis** = refined code with better $L(S) + L(O \mid S)$ tradeoff

The synthesis improves compression by capturing conditional structure:

$$L(O \mid S) < L(O \mid T) \quad \text{when } S \text{ encodes "} T \text{, except when conditions } C \text{"}$$

### 8.5 Consolidation During Idle

Like human sleep, Engram consolidates memories during idle periods:
- Clusters similar observations
- Identifies thesis candidates
- Detects contradictions
- Generates syntheses

This background processing means the system improves even when not actively used.

### 8.6 Parameter Calibration

The formulas above contain a number of free scalars — thresholds ($\gamma = 0.7$, $\delta = 0.3$, $\tau = 0.75$, $\rho_{\min} = 0.6$, $F_{\text{retire}} = 0.2$, $\tau_{\text{dup}} = 0.92$), counts ($N_{\min}$, $N_{\text{saturate}}$, $W$, $K$), and weighting coefficients in the divergence, fitness, validation, and retrieval equations. The defaults listed are those we observed to work on a TypeScript coding corpus over several weeks of use; they are not claimed optimal.

Three classes of parameter behave differently and warrant different calibration strategies:

1. **Decision thresholds** ($\gamma$, $\delta$, $\rho_{\min}$, $F_{\text{retire}}$, $\tau_{\text{dup}}$) directly gate publication and retirement. These are most sensitive to corpus properties and should be learned per-project from a small calibration set of human-labeled (promote | retire) decisions. We expose them as project-level configuration; defaults are conservative (biased toward fewer, higher-confidence publications).

2. **Mixing weights** ($(\alpha_s, \alpha_a, \alpha_o)$ for divergence, $(\phi_r, \phi_s, \phi_o, \phi_d)$ for fitness, $(\beta_o, \beta_s, \beta_r)$ for validation, $(\lambda_e, \lambda_p, \lambda_f)$ for retrieval) combine signals of different units into a scalar. These are less sensitive to corpus choice but can be refined via gradient-free search (CMA-ES over a held-out evaluation task set) once sufficient data accumulates.

3. **Shape parameters** ($\lambda = 0.1/\text{day}$ decay, saturation points, margins) govern dynamics rather than decisions. These are inherited from cognitive-science analogues (Ebbinghaus, spacing effect) and have less reason to require per-project tuning.

For the current release we expose (1) as configuration, provide tooling to run (2) when sufficient labeled outcomes exist, and treat (3) as fixed.

---

## 9. Evaluation

### 9.1 Qualitative Results

After several weeks of use on a TypeScript codebase, Engram generated 11 skills covering:

- Codebase exploration strategies
- Skill validation and improvement
- Pattern detection in code
- Code review workflows

Each skill demonstrated appropriate use of intelligence points—using deterministic code for file operations and LLM reasoning for judgment calls.

### 9.2 Dialectic Refinement

We observed the thesis-antithesis-synthesis cycle in practice:

**Initial thesis**: "Always perform breadth-first exploration when understanding a codebase"

**Observed contradiction**: Multiple sessions where depth-first exploration was used for debugging

**Resulting synthesis**: "Use breadth-first exploration for architectural understanding; use depth-first exploration when investigating specific issues"

This nuanced understanding would not emerge from simple pattern accumulation.

### 9.3 Limitations

- **Cold start.** Requires sufficient observations before useful patterns emerge; the outcome-gated thesis promotion (§3.3) extends cold-start duration relative to pure accumulation, trading time-to-first-skill for skill quality.
- **Domain specificity.** Patterns learned in one codebase may not transfer. Cross-project promotion (§6.5) partially addresses this but relies on multiple projects contributing similar patterns.
- **LLM dependency.** Intelligence points require model access at runtime, and the consolidation layer itself uses LLM calls for semantic characteristics (§5.2) and output-type refinement (§5.4). Degraded-mode heuristics are provided but produce coarser artifacts.
- **Outcome signal noise.** The pipeline is only as good as its outcome resolver. Mechanical signals (exit codes, tests) are reliable; LLM-as-judge outcomes (§3.1.1) inherit known judge biases and sycophancy. When a project has few mechanical signals available, consolidation quality degrades in a way that is hard to detect without ground-truth evaluation.
- **Fork fidelity.** Runtime rollouts (§7.3) assume the forked environment matches the true environment closely enough that rollout scores predict committed outcomes. This holds well for local code operations but breaks for skills that touch external stateful systems (production databases, rate-limited APIs, services with persistent side effects). The runtime degrades to top-1 execution in these cases, forfeiting the multi-arm advantage.
- **Parameter sensitivity.** Several thresholds (§8.6) are empirically set on a single corpus. Deployments in new domains should run the calibration protocol before trusting default values, particularly $\rho_{\min}$, $F_{\text{retire}}$, and $\tau_{\text{dup}}$.
- **Curation latency.** Retirement requires $W_{\min}$ invocation opportunities to trigger, which can be weeks for infrequently-used skills. Bad skills may therefore persist longer than desirable in low-traffic areas of the library.

---

## 10. Future Work

### 10.1 Cross-Session Transfer

Currently, patterns are learned per-project. Future work could identify universal patterns that transfer across codebases.

### 10.2 Collaborative Learning

Multiple developers' observations could be aggregated (with privacy considerations) to accelerate pattern discovery.

### 10.3 Formal Verification

Intelligence points could include confidence bounds, allowing scripts to fall back to human judgment when uncertain.

### 10.4 Hierarchical Skills

Skills that compose other skills, enabling complex workflows from simple primitives.

---

## 11. Conclusion

Engram demonstrates that AI agents can systematically convert experiential knowledge into procedural tools through *outcome-gated conflict-triggered refinement*, narrated as Hegelian dialectic and grounded in a minimum-description-length objective. The hybrid script architecture—combining deterministic code with targeted LLM reasoning—offers a practical middle ground between brittle automation and expensive full-agent reasoning.

The key contributions are:

1. **Outcome-gated dialectical memory.** Thesis promotion, antithesis detection, and synthesis quality are all conditioned on resolved outcome signals (§3.1.1, §3.3), so the system refines patterns based on what *worked*, not merely what *recurred*. The Hegelian vocabulary is a scaffold over an MDL-style refinement objective (§8.4).

2. **Hybrid scripts with closed-loop placement.** A new execution model that places intelligence where judgment is needed, with an explicit empirical recalibration loop (§4.4.1) that demotes unneeded intelligence points and promotes deterministic branches that fail in practice.

3. **Output-type decision.** A formal system for determining whether patterns become rules, skills, or both, using LLM semantic analysis rather than keyword matching.

4. **Curation and retirement.** A first-class fitness, deduplication, and archival mechanism (§6.6) that prevents unbounded library growth and catches stale codifications — the missing half of most skill-accumulation systems.

5. **Runtime selection loop.** Top-K metadata retrieval, optional sandboxed parallel rollouts, and bandit-style updates with diversity decay (§7.3) — the System-1 counterpart to the consolidation System-2.

6. **Open standard compatibility.** Generating Agent Skills in the open format adopted across the ecosystem, enabling portability without vendor lock-in.

7. **Concrete safety architecture.** A threat-model-driven safety story (§7.1) — permission invariance, publication review gates, outcome-gated promotion, intelligence-point sandboxing — replacing aspirational convergence claims with enforceable mechanisms.

As AI agents become more prevalent in software development, systems like Engram offer a path toward agents that genuinely learn from experience—not through weight updates or prompt engineering, but through the autonomous generation, curation, and selection of callable capabilities. The adoption of Agent Skills as an open standard means these learned capabilities can flow across the entire agent ecosystem.

---

## References

1. Kahneman, D. (2011). Thinking, Fast and Slow. Farrar, Straus and Giroux.
2. Hegel, G.W.F. (1807). Phenomenology of Spirit.
3. Anderson, J.R. (1982). Acquisition of cognitive skill. Psychological Review.
4. Sumers, T.R., et al. (2023). Cognitive Architectures for Language Agents. arXiv.
5. Park, J.S., et al. (2023). Generative Agents: Interactive Simulacra of Human Behavior. arXiv.
6. ENGRAM (2025). Lightweight Memory Orchestration for Conversational Agents. arXiv.
7. Mem0 (2025). Memory Primitives for Agent Evolution. arXiv.
8. Wang, Z., et al. (2024). Long-Term Memory as a Foundation for AI Self-Evolution. arXiv.
9. Chen, Y., et al. (2025). Dialectical Self-Reflection in Large Language Models: A Hegelian Approach. arXiv.
10. SAGE (2024). Self-Evolving Agents with Iterative Feedback and Ebbinghaus Memory Optimization. arXiv.
11. AgentEvolver (2025). Autonomous Agent Evolution via Self-Questioning and Navigation. arXiv.
12. Zhang, L., et al. (2025). A Survey on Self-Evolving Agents: Components, Stages, and Hybrid Approaches. arXiv.
13. Li, H., et al. (2026). Procedural Knowledge Extraction from Troubleshooting Guides using Vision-Language Models. arXiv.
14. ProcMem (2025). Benchmarks for Procedural Memory Retrieval in Autonomous Agents. arXiv.
15. HASHIRU (2025). Hierarchical Agents for Shared Human-AI Resource Utilization. arXiv.
16. Hybrid Intelligence (2025). Frameworks for Joint Human-AI Decision Making. arXiv.
17. Agent Skills Open Standard (2025). https://agentskills.io
18. Ellis, K., et al. (2021). DreamCoder: Bootstrapping Inductive Program Synthesis with Wake-Sleep Library Learning. PLDI.
19. Wang, G., et al. (2023). Voyager: An Open-Ended Embodied Agent with Large Language Models. arXiv.
20. Anthony, T., Tian, Z., Barber, D. (2017). Thinking Fast and Slow with Deep Learning and Tree Search. NeurIPS.
21. Silver, D., et al. (2018). A general reinforcement learning algorithm that masters chess, shogi, and Go through self-play. Science.

---

*Engram is open source and available at github.com/chadhietala/engram*
