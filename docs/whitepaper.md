# Engram: Dialectical Memory and Hybrid Intelligence for Self-Improving AI Agents

**Abstract**

We present Engram, a memory architecture for AI coding agents that transforms observed behavior patterns into reusable procedural knowledge through Hegelian dialectic. Unlike traditional approaches that accumulate examples or fine-tune models, Engram evolves understanding through contradiction and synthesis, producing "hybrid scripts" that interleave deterministic code with targeted LLM reasoning. A novel output type decision system determines whether mature patterns become declarative rules, procedural skills, or both—and these artifacts are published to the host system's native memory, enabling persistence without the learning system running. This creates a feedback loop where agents automatically generate tools that make them more effective, bridging the gap between System 2 (deliberate) and System 1 (automatic) cognition.

---

## 1. Introduction

Current AI coding assistants operate primarily through in-context learning—each session starts fresh, with the model inferring user intent from conversation history. While effective, this approach has limitations:

1. **No persistent learning**: Insights from one session don't transfer to another
2. **Redundant reasoning**: The model re-derives the same conclusions repeatedly
3. **No skill accumulation**: Successful patterns aren't codified for reuse

Human experts, by contrast, develop automaticity. A novice programmer consciously thinks through each git command; an expert executes complex workflows reflexively. This transition from deliberate reasoning (System 2) to automatic execution (System 1) is central to expertise development.

Engram addresses this gap by:
- Observing agent tool usage during normal operation
- Detecting recurring patterns through semantic clustering
- Refining patterns through dialectical contradiction
- Generating executable hybrid scripts that encode mature patterns

The result is an agent that literally writes its own tools, creating a self-improvement loop bounded only by the quality of its observations.

---

## 2. Related Work

### 2.1 Agent Memory Systems

Existing approaches to agent memory include:

- **Vector databases**: Store embeddings for retrieval (MemGPT, LangChain Memory)
- **Episodic buffers**: Maintain conversation history with summarization
- **Tool libraries**: Pre-defined functions the agent can call

These systems accumulate information but don't transform it. A vector database returns similar past experiences; it doesn't synthesize them into new capabilities.

### 2.2 Learning from Demonstrations

Behavioral cloning and imitation learning extract policies from expert demonstrations. However, these approaches typically require:
- Explicit demonstration collection
- Separate training phases
- Model weight updates

Engram operates continuously during normal use, requires no explicit demonstrations, and produces symbolic artifacts (scripts) rather than weight updates.

### 2.3 Program Synthesis

Neural program synthesis generates code from specifications. Engram differs in that:
- Input is observed behavior, not formal specifications
- Output combines generated code with LLM reasoning hooks
- The system bootstraps itself from its own usage patterns

---

## 3. Architecture

Engram processes observations through four stages, inspired by memory consolidation in cognitive science:

```
Observation → Encoding → Consolidation → Procedualization
     ↓            ↓            ↓               ↓
  Tool Use    Embedding    Dialectic      Skill Script
```

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

A pattern *P* with observations {o₁, o₂, ..., oₙ} forms a thesis *T* when:

```
|P| ≥ N_min  ∧  C(P) ≥ γ
```

Where:
- **N_min** = minimum observation count (default: 3)
- **C(P)** = cohesion score of the pattern
- **γ** = cohesion threshold (default: 0.7)

Cohesion is defined as the average pairwise similarity:

```
C(P) = (2 / n(n-1)) · Σᵢ<ⱼ sim(eᵢ, eⱼ)
```

The thesis confidence is:

```
conf(T) = min(1, |P| / N_saturate) · C(P)
```

Where N_saturate = 10 is the saturation point for evidence accumulation.

**Antithesis Detection**

An observation *o* contradicts thesis *T* when:

```
sim(e_o, e_T) > τ_relevant  ∧  D(o, T) > δ
```

Where:
- **τ_relevant** = relevance threshold (0.5) — observation must be in same domain
- **D(o, T)** = divergence score measuring behavioral difference
- **δ** = contradiction threshold (0.3)

Divergence is computed as:

```
D(o, T) = 1 - Π(tool_sequence(o), expected_sequence(T))
```

Where Π is the normalized Levenshtein similarity between tool sequences.

**Synthesis Trigger**

Synthesis is triggered when antithesis accumulation reaches critical mass:

```
Σₐ weight(a) ≥ ω · conf(T)
```

Where:
- **weight(a)** = recency-weighted antithesis strength
- **ω** = synthesis threshold ratio (default: 0.4)

This means a thesis with confidence 0.8 requires antitheses totaling 0.32 weight to trigger synthesis.

**Synthesis Quality Score**

The resulting synthesis *S* is evaluated by:

```
Q(S) = coverage(S) · consistency(S) · parsimony(S)
```

Where:
- **coverage(S)** = fraction of observations (thesis + antitheses) explained
- **consistency(S)** = 1 - internal_contradiction_rate
- **parsimony(S)** = 1 / (1 + condition_count) — simpler is better

A synthesis is accepted when Q(S) > Q_min (default: 0.6).

### 3.4 Procedualization Layer: Hybrid Scripts

Mature syntheses (those that have survived multiple contradiction cycles) are transformed into executable scripts. This is where Engram introduces "intelligence points."

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

The decision to use deterministic code vs. an intelligence point is formalized as an optimization problem. For a task *t* in a workflow, we compute:

**Determinism Score**

```
D(t) = specificity(t) · predictability(t) · (1 - judgment_required(t))
```

Where:
- **specificity(t)** ∈ [0,1] = how well-defined the input/output contract is
- **predictability(t)** ∈ [0,1] = consistency of correct output across instances
- **judgment_required(t)** ∈ [0,1] = degree of contextual reasoning needed

**Intelligence Score**

```
I(t) = judgment_required(t) · variability(t) · value_of_reasoning(t)
```

Where:
- **variability(t)** = variance in appropriate responses across contexts
- **value_of_reasoning(t)** = improvement in outcome quality from LLM reasoning

**Decision Boundary**

Use deterministic code when:

```
D(t) / (D(t) + I(t)) > 0.5 + margin
```

Where margin = 0.1 biases toward deterministic code (faster, cheaper, more reliable).

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

```
Fully Deterministic ←——————————————————→ Fully Agentic
     Scripts                                  LLM Agents
        ↑                                         ↑
   Predictable                              Flexible
   Fast                                     Slow
   Brittle                                  Robust
   No judgment                              All judgment

                    Hybrid Scripts
                          ↓
                   Best of both:
                   - Fast for mechanical tasks
                   - Intelligent for judgment calls
                   - Predictable control flow
                   - Flexible decision points
```

---

## 5. Output Type Decision

When a synthesis reaches maturity, Engram must decide what artifact to produce. This decision is formalized as a classification problem over four output types.

### 5.1 Output Type Space

Let *S* be a synthesis. The possible outputs are:

| Type | Description | Artifact |
|------|-------------|----------|
| `rule` | Declarative guideline | `.claude/rules/engram/*.md` |
| `skill` | Procedural workflow | `.claude/skills/{name}/` |
| `rule_with_skill` | Both representations | Rule file linking to skill |
| `none` | Insufficient confidence | No artifact |

### 5.2 Content Characteristics

We extract characteristics *χ(S)* from synthesis content:

**Imperative Score**

```
I(S) = |{w ∈ S : w ∈ W_imperative}| / |S|
```

Where W_imperative = {"always", "never", "must", "ensure", "required", "do not", ...}

**Procedural Score**

```
P(S) = |{p ∈ S : p matches R_procedural}| / |S|
```

Where R_procedural = {/step\s*\d/, /first.*then/, /workflow/, /\d+\.\s+\w/, ...}

**Tool Diversity**

```
T(S) = |{tool(o) : o ∈ exemplars(S)}|
```

The count of distinct tools in supporting observations.

**Complexity Score**

```
K(S) = α·len(S) + β·T(S) + γ·cond(S) + δ·P(S)
```

Where:
- len(S) = normalized content length
- cond(S) = presence of conditional logic
- α, β, γ, δ = weighting coefficients (0.3, 0.3, 0.2, 0.2)

### 5.3 Decision Function

The output type is determined by:

```
output(S) =
  | none           if conf(S) < θ_min ∨ |exemplars(S)| < N_min
  | rule           if I(S) > τ_I ∧ P(S) < τ_P
  | skill          if P(S) > τ_P ∧ T(S) > τ_T ∧ K(S) > κ
  | rule_with_skill if I(S) > τ_I ∧ P(S) > τ_P ∧ T(S) > τ_T
  | rule           otherwise
```

Where:
- **θ_min** = 0.5 (minimum confidence for any output)
- **N_min** = 2 (minimum exemplar count)
- **τ_I** = 0.3 (imperative threshold)
- **τ_P** = 0.3 (procedural threshold)
- **τ_T** = 2 (tool diversity threshold)
- **κ** = 0.5 (complexity threshold)

### 5.4 LLM Refinement for Uncertain Cases

When the decision confidence is low (< 0.7), the LLM provides additional analysis:

```
confidence(decision) = max(margins) / Σ(margins)
```

Where margins measure the distance from each decision boundary. For uncertain cases:

```
output(S) = LLM_classify(content(S), resolution(S), tools(S))
```

The LLM returns structured analysis including imperative/procedural assessment and recommended output type.

---

## 6. Native Memory Integration

A key innovation is the graduation of mature patterns to Claude's native memory system, enabling persistence without the plugin.

### 6.1 Claude's Memory Hierarchy

Claude Code loads context from:

1. **CLAUDE.md** — Project-wide instructions
2. **.claude/rules/*.md** — Path-triggered rules with YAML frontmatter
3. **~/.claude/rules/*.md** — User-level rules

Engram publishes to `.claude/rules/engram/`, creating rules that load automatically.

### 6.2 Publication Criteria

A synthesis *S* qualifies for publication when:

```
pub(S) = conf(S) ≥ θ_pub ∧ |exemplars(S)| ≥ N_pub ∧ resolution(S) ≠ rejection
```

Where:
- **θ_pub** = 0.7 (publication confidence threshold)
- **N_pub** = 3 (minimum supporting memories)

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

```
version(R') = version(R) + 1  if  hash(content(R')) ≠ hash(content(R))
```

Previous versions are superseded in the database but the file is overwritten in place.

### 6.5 Scope Promotion

Patterns can be promoted from project to user scope:

```
scope(R) = user  if  |{projects : R appears in project}| ≥ N_cross
```

Where N_cross = 3. Cross-project patterns become user-level preferences.

---

## 7. The Self-Improvement Loop

Engram creates a feedback loop where the agent improves itself and its knowledge persists:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Agent uses tools → Engram observes → Patterns form →  │
│                                                         │
│  Contradictions refine → Syntheses mature →            │
│                                                         │
│  Skills generate → Agent gets new tools →              │
│                                                         │
│  Agent uses new tools → Engram observes → ...          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

This is bounded self-improvement: the agent can only generate tools within its observation scope and the capabilities of the hybrid script format. It cannot modify its own weights or reasoning process—only its available tools.

### 7.1 Formal Bounds on Self-Improvement

Let *K(t)* represent the agent's capability at time *t*, measured as the set of tasks it can perform. The growth rate is bounded by:

```
dK/dt ≤ O(t) · E(t) · G(t)
```

Where:
- **O(t)** = observation rate (new patterns per unit time)
- **E(t)** = extraction efficiency (fraction of patterns that become skills)
- **G(t)** = generalization factor (reusability of generated skills)

**Convergence Property**

As the agent's skill set grows, the marginal value of new observations decreases:

```
lim(t→∞) dK/dt = 0
```

This occurs because:
1. Common patterns are captured early (diminishing returns on O(t))
2. New observations increasingly match existing skills (E(t) decreases)
3. The space of useful skills for a domain is finite

The system converges to a stable skill set *K** representing comprehensive coverage of the user's workflow patterns.

**Safety Bound**

The agent's capabilities are strictly bounded by:

```
K(t) ⊆ Closure(API_tools ∪ LLM_reasoning)
```

Where:
- **API_tools** = {file I/O, shell execution, network requests}
- **LLM_reasoning** = capabilities of the underlying language model

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

Each memory *m* has a strength value *S(m, t)* that evolves over time:

```
S(m, t) = S₀ · e^(-λ(t - t₀)) · (1 + α·A(m)) · (1 + β·V(m))
```

Where:
- **S₀** = initial strength at encoding (typically 1.0)
- **λ** = decay constant (we use λ = 0.1 per day)
- **t₀** = timestamp of memory creation
- **A(m)** = access count (number of retrievals)
- **V(m)** = validation score (contribution to successful syntheses)
- **α, β** = weighting coefficients (α = 0.2, β = 0.5)

A memory is pruned when S(m, t) < θ (threshold = 0.1).

### 8.3 Semantic Similarity

Given two observations with embeddings **e₁**, **e₂** ∈ ℝᵈ, similarity is computed as:

```
sim(e₁, e₂) = (e₁ · e₂) / (‖e₁‖ · ‖e₂‖)
```

Observations cluster into pattern *P* when:

```
∀ eᵢ, eⱼ ∈ P : sim(eᵢ, eⱼ) > τ
```

Where τ = 0.75 is the clustering threshold.

### 8.4 Information-Theoretic View

Pattern detection can be viewed as compression. Given observation sequence *O* = {o₁, o₂, ..., oₙ}, we seek patterns *P* that minimize description length:

```
L(O) = L(P) + L(O | P)
```

Where:
- **L(P)** = bits to describe the pattern set
- **L(O | P)** = bits to describe observations given patterns

A pattern is valuable when:

```
L(O | P) < L(O | ∅) - L(P)
```

The information gain from pattern *p* is:

```
IG(p) = H(O) - H(O | p)
```

Where H denotes entropy. Patterns with higher information gain are prioritized for thesis formation.

**Dialectic as Refinement Coding**

The thesis-antithesis-synthesis cycle implements a form of refinement coding:

1. **Thesis** = coarse approximation, low L(T) but high L(O | T)
2. **Antithesis** = residual signal not captured by thesis
3. **Synthesis** = refined code with better L(S) + L(O | S) tradeoff

The synthesis improves compression by capturing conditional structure:

```
L(O | S) < L(O | T)  when  S encodes "T, except when conditions C"
```

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

3. **Output type decision**: A formal system for determining whether patterns become rules, skills, or both based on content characteristics

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

---

*Engram is open source and available at github.com/chadhietala/engram*
