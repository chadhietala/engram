# Engram: Dialectical Memory and Hybrid Intelligence for Self-Improving AI Agents

**Abstract**

We present Engram, a memory architecture for AI coding agents that transforms observed behavior patterns into reusable procedural knowledge through Hegelian dialectic. Unlike traditional approaches that accumulate examples or fine-tune models, Engram evolves understanding through contradiction and synthesis, producing Agent Skills compatible with Claude's official format. These skills contain "hybrid scripts" that interleave deterministic code with targeted LLM reasoning—placing intelligence precisely where judgment is needed. A novel output type decision system determines whether mature patterns become declarative rules, procedural skills, or both—publishing artifacts to Claude Code's native memory and skills directories. This creates a feedback loop where agents automatically generate tools that make them more effective, bridging the gap between System 2 (deliberate) and System 1 (automatic) cognition.

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
- Observing agent tool usage during normal operation
- Detecting recurring patterns through semantic clustering
- Refining patterns through dialectical contradiction
- Generating executable hybrid scripts that encode mature patterns
- Publishing mature knowledge to Claude Code's native memory system

The result is an agent that literally writes its own tools and documentation, creating a self-improvement loop bounded only by the quality of its observations.

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

These align with our self-improvement loop but do not incorporate dialectic for pattern consolidation. Engram's contribution is the specific mechanism—Hegelian synthesis—that refines patterns through contradiction rather than simple accumulation or reflection.

### 2.4 Procedural Knowledge

Work on procedural knowledge extraction from troubleshooting guides using VLMs [13] and benchmarks for procedural memory retrieval in agents [14] focus on identifying steps from observations, akin to our observation/encoding layers. However, they lack the full architecture connecting observation to self-generated tools.

### 2.5 Hybrid Intelligence

The term "hybrid intelligence" typically refers to human-AI collaboration—e.g., HASHIRU's hierarchical agents for resource utilization [15], or joint decision-making frameworks [16]. This differs from our "hybrid scripts" which combine deterministic code with LLM reasoning within a single executable. We are unaware of prior work on coding-specific hybrids that interleave programmatic control flow with targeted intelligence points.

### 2.6 Learning from Demonstrations

Behavioral cloning and imitation learning extract policies from expert demonstrations. However, these approaches typically require explicit demonstration collection, separate training phases, and model weight updates. Engram operates continuously during normal use, requires no explicit demonstrations, and produces symbolic artifacts (scripts) rather than weight updates.

### 2.7 Program Synthesis

Neural program synthesis generates code from specifications. Engram differs in that:
- Input is observed behavior, not formal specifications
- Output combines generated code with LLM reasoning hooks
- The system bootstraps itself from its own usage patterns

### 2.8 Claude's Agent Skills

Claude's Agent Skills [17] provide a standard format for extending Claude with modular capabilities. Skills are directories containing `SKILL.md` (instructions with YAML frontmatter) and optional bundled scripts. Claude discovers skills via metadata at startup, loads instructions on-demand when triggered, and executes scripts via bash without loading their code into context.

Engram generates Skills in this official format, but with a key difference: **automatic generation from observed behavior**. While Agent Skills are typically authored manually, Engram observes tool usage patterns, refines them through dialectic, and produces Skills automatically. This positions Engram as a learning layer that populates Claude's skill system without requiring explicit authoring.

---

## 3. Architecture

Engram processes observations through four stages, inspired by memory consolidation in cognitive science:

![Memory Process](memory-process.png)

### 3.1 Observation Layer

A hook system captures tool invocations during agent operation:

```typescript
interface ToolObservation {
  tool: string;           // "Read", "Bash", "Edit", etc.
  input: object;          // Tool parameters
  output: string;         // Tool result
  sessionId: string;      // Conversation context
  timestamp: number;
}
```

Observations include file reads, shell commands, code edits, and user prompts. This creates a complete record of agent behavior without modifying the agent itself.

### 3.2 Encoding Layer

Observations are transformed into semantic embeddings using a local transformer model (no API calls, preserving privacy). Similar observations cluster naturally in embedding space.

The system identifies patterns through:
1. **Temporal proximity**: Tools used in sequence
2. **Semantic similarity**: Observations with similar embeddings
3. **Structural patterns**: Recurring tool combinations (Read → Edit → Bash)

### 3.3 Consolidation Layer: Hegelian Dialectic

This is Engram's core innovation. Rather than simply accumulating patterns, the system evolves understanding through contradiction:

**Thesis Formation**

A pattern $P$ with observations $\{o_1, o_2, \ldots, o_n\}$ forms a thesis $T$ when:

$$|P| \geq N_{\min} \land C(P) \geq \gamma$$

Where:
- $N_{\min}$ = minimum observation count (default: 3)
- $C(P)$ = cohesion score of the pattern
- $\gamma$ = cohesion threshold (default: 0.7)

Cohesion is defined as the average pairwise similarity:

$$C(P) = \frac{2}{n(n-1)} \sum_{i < j} \text{sim}(e_i, e_j)$$

The thesis confidence is:

$$\text{conf}(T) = \min\left(1, \frac{|P|}{N_{\text{saturate}}}\right) \cdot C(P)$$

Where $N_{\text{saturate}} = 10$ is the saturation point for evidence accumulation.

**Antithesis Detection**

An observation $o$ contradicts thesis $T$ when:

$$\text{sim}(e_o, e_T) > \tau_{\text{relevant}} \land D(o, T) > \delta$$

Where:
- $\tau_{\text{relevant}}$ = relevance threshold (0.5) — observation must be in same domain
- $D(o, T)$ = divergence score measuring behavioral difference
- $\delta$ = contradiction threshold (0.3)

Divergence is computed as:

$$D(o, T) = 1 - \Pi(\mathrm{toolSeq}(o), \mathrm{expectedSeq}(T))$$

Where $\Pi$ is the normalized Levenshtein similarity between tool sequences.

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

---

## 7. The Self-Improvement Loop

Engram creates a feedback loop where the agent improves itself and its knowledge persists:

![Self-Improvement Loop](self-improvement.png)

This is bounded self-improvement: the agent can only generate tools within its observation scope and the capabilities of the hybrid script format. It cannot modify its own weights or reasoning process—only its available tools.

### 7.1 Formal Bounds on Self-Improvement

Let $K(t)$ represent the agent's capability at time $t$, measured as the set of tasks it can perform. The growth rate is bounded by:

$$\frac{dK}{dt} \leq O(t) \cdot E(t) \cdot G(t)$$

Where:
- $O(t)$ = observation rate (new patterns per unit time)
- $E(t)$ = extraction efficiency (fraction of patterns that become skills)
- $G(t)$ = generalization factor (reusability of generated skills)

**Convergence Property**

As the agent's skill set grows, the marginal value of new observations decreases:

$$\lim_{t \to \infty} \frac{dK}{dt} = 0$$

This occurs because:
1. Common patterns are captured early (diminishing returns on $O(t)$)
2. New observations increasingly match existing skills ($E(t)$ decreases)
3. The space of useful skills for a domain is finite

The system converges to a stable skill set $K^*$ representing comprehensive coverage of the user's workflow patterns.

**Safety Bound**

The agent's capabilities are strictly bounded by:

$$K(t) \subseteq \mathrm{Closure}(\mathcal{A} \cup \mathcal{L})$$

Where:
- $\mathcal{A}$ = API tools (file I/O, shell execution, network requests)
- $\mathcal{L}$ = LLM reasoning capabilities

The agent cannot exceed this closure—it can only compose existing primitives in new ways.

### 7.2 Emergence of Meta-Skills

An interesting property: Engram observes its own skill generation process. If a developer repeatedly refines generated skills in certain ways, Engram can learn that pattern and generate skills that help with skill generation.

In our testing, we observed the emergence of:
- `validate-skill-generator`: Checks generated skills against specifications
- `evolve-skill-generation`: Improves the skill generation process itself

This is recursive self-improvement within safe bounds.

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
- $A(m)$ = access count (number of retrievals)
- $V(m)$ = validation score (contribution to successful syntheses)
- $\alpha, \beta$ = weighting coefficients ($\alpha = 0.2$, $\beta = 0.5$)

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

- **Cold start**: Requires sufficient observations before useful patterns emerge
- **Domain specificity**: Patterns learned in one codebase may not transfer
- **LLM dependency**: Intelligence points require API access at runtime

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

Engram demonstrates that AI agents can systematically convert experiential knowledge into procedural tools through dialectical refinement. The hybrid script architecture—combining deterministic code with targeted LLM reasoning—offers a practical middle ground between brittle automation and expensive full-agent reasoning.

The key contributions are:

1. **Dialectical memory**: Using thesis-antithesis-synthesis to evolve understanding rather than accumulate examples

2. **Hybrid scripts**: A new execution model that places intelligence precisely where judgment is needed

3. **Output type decision**: A formal system for determining whether patterns become rules, skills, or both, using LLM semantic analysis to understand content intent rather than keyword matching

4. **Native memory integration**: Graduating mature patterns to the host system's memory, enabling persistence without the learning system active

5. **Bounded self-improvement**: Agents that generate their own tools within safe, observable limits

As AI agents become more prevalent in software development, systems like Engram offer a path toward agents that genuinely learn from experience—not through weight updates or prompt engineering, but through the autonomous generation of new capabilities.

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
17. Anthropic (2025). Agent Skills. https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview

---

*Engram is open source and available at github.com/chadhietala/engram*
