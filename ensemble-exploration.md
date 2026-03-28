# Ensemble AI Coding: Deep Exploration

## The Core Concept

Run N parallel Claude Code agents on the same task, each in an isolated worktree, then select/merge the best result using test execution as the oracle.

**Academic backing:**
- AlphaCode: 1M samples → filter → top 10. Competitive programming performance.
- CodeT: Dual execution agreement (code + generated tests) for ranking.
- MBR-Exec: Majority voting on execution output, not code text.
- pass@k research: pass@5 dramatically beats pass@1 for every model tested.
- Superforecasting principle: aggregate of independent attempts beats any single attempt.

**The gap:** Nobody has productized this for real-world software engineering (only competitive programming benchmarks). No AI coding tool has ensemble/parallel mode.

---

## Key Design Questions

### Q1: What is the selection oracle?

AlphaCode had test cases. Real-world tasks often don't have comprehensive tests. What do we use?

**Options:**
a) **Existing test suite** — run `npm test` / `pytest` after each attempt. Pick the attempt(s) that pass.
b) **AI-generated tests** — before running the task, generate test cases for the EXPECTED behavior. Use those to filter. (CodeT approach)
c) **Consensus/convergence** — if 4/5 agents changed the same files in similar ways, that's likely correct.
d) **Multi-signal scoring** — combine: tests pass + diff size (smaller = better) + no new warnings + convergence with other attempts.
e) **Human selection** — present the top 2-3 candidates, human picks.

**Best approach for v0.1:** (a) + (c) + (e). Run tests, check convergence, present candidates to human.

### Q2: What does "parallel" actually mean technically?

**Option A: N separate `claude` CLI processes**
- Spawn N `claude -p "task" --output-format json` processes
- Each in its own git worktree
- Fully isolated, truly parallel
- PRO: Simple, uses existing CLI
- CON: Each process pays full context-loading cost (reads codebase N times)

**Option B: N subagents within one Claude Code session**
- Use Claude Code's native Agent tool with `isolation: "worktree"`
- Spawn from a parent orchestrator session
- PRO: Native to Claude Code, could share initial codebase understanding
- CON: Subagents may not be fully independent (shared context could reduce diversity)

**Option C: Hybrid — one planning agent, N execution agents**
- Agent 0 reads the codebase and creates a task brief
- Agents 1-N each receive the brief and execute independently in worktrees
- PRO: Amortizes codebase reading cost, agents are still independent in execution
- CON: More complex orchestration

**Best for v0.1:** Option A (simplest, most isolated, most diverse results). Option C for v0.2.

### Q3: How do you present results?

After N runs complete:
1. Show which passed tests, which didn't
2. Show convergence map (which agents made similar changes)
3. Show diff size comparison
4. Let user inspect any candidate's diff
5. Apply the selected candidate (or merge elements from multiple)

### Q4: What's the cost model?

If a typical Claude Code task costs $0.50:
- 3 parallel runs = $1.50
- 5 parallel runs = $2.50

Is this worth it? Depends on the task:
- Fixing a production bug at 2am? Absolutely.
- Adding a button? Probably not.

The tool should help users choose: "This task has high complexity/risk, consider running ensemble mode."

### Q5: When is ensemble MOST valuable?

- **High-stakes changes** (auth, payments, security)
- **Ambiguous tasks** (multiple valid approaches, need to see the spread)
- **Complex refactors** (many files, easy to miss something)
- **Unfamiliar codebases** (agent might go wrong direction)
- **When tests exist** (oracle is available for free)

When is it LEAST valuable?
- Simple, mechanical changes
- Tasks with one obvious approach
- Codebases with no test suite (no oracle)

---

## Possible Product Shapes

### Shape A: "Ensemble Mode" — a CLI wrapper/plugin for Claude Code
```
ensemble "fix the authentication bypass" --attempts 5
```
- Spawns 5 parallel Claude Code processes in worktrees
- Waits for all to complete
- Runs tests on each result
- Presents ranked candidates
- User picks one, it gets applied to main branch

### Shape B: "Consensus Coding" — emphasize the convergence angle
```
consensus "add rate limiting to the API" --spread 5
```
- Same mechanism but framed around CONVERGENCE
- Output emphasizes: "4/5 agents used token bucket algorithm. 1 used sliding window."
- Convergence = confidence signal
- Divergence = the task is ambiguous, needs clarification

### Shape C: "AI Code Review via Parallel Execution" — the verification angle
```
verify "refactor auth middleware to use sessions" --alternatives 3
```
- Framed as: "I already have Claude Code's solution, but I want to VERIFY it by seeing if independent agents arrive at the same answer"
- More defensive positioning: not "get better code" but "validate the code you got"

### Shape D: Full research platform — combine A+B+C with data collection
- All of the above, PLUS:
- Collect anonymized ensemble data (convergence rates, pass rates, cost)
- Build a dataset of "what kinds of tasks benefit most from ensemble"
- Community contributes findings
- This becomes the RESEARCH angle — the open-source project isn't just a tool, it's advancing the field

---

## Name Exploration

| Name | Pitch | Vibe |
|------|-------|------|
| `ensemble` | Direct, descriptive | Academic |
| `consensus` | Emphasizes convergence | Collaborative |
| `quorum` | "A quorum of agents agrees" | Clever, memorable |
| `swarm` | Multiple agents working together | Overused in AI |
| `spread` | Like ensemble forecasting / running the spread | Financial/forecasting |
| `chorus` | Multiple voices, one harmony | Musical, distinctive |
| `council` | "A council of agents deliberated" | Authoritative |
| `thinktank` | Already the repo name, fits "multiple minds" | Perfect? |

**`thinktank` actually fits this concept better than the benchmark concept.** A think tank IS an ensemble of independent thinkers producing recommendations. "Run a thinktank on your coding task" = spawn N agents, get the consensus.

---

## Competitive Advantage Analysis

### Why Claude Code specifically?

1. **Worktree isolation is native** — `isolation: "worktree"` in Agent tool
2. **Headless CLI mode** — `claude -p` enables scripted parallel runs
3. **Subagent architecture** — designed for spawning child agents
4. **Cost visibility** — token usage is trackable per session
5. **Hooks system** — can instrument pre/post session for data collection

No other AI coding tool has ALL of these. Cursor can't spawn parallel isolated instances. Copilot doesn't have headless mode. This is a Claude Code structural advantage.

### Why won't this be absorbed by Anthropic?

It might — and that could be GOOD. If Anthropic adds `--ensemble 5` to Claude Code, the project wins by being the proof-of-concept that drove the feature. In the meantime:
- The ensemble orchestration + selection logic is non-trivial
- The convergence analysis is a novel contribution
- The research data (what tasks benefit from ensemble) is the moat

### Moat analysis

1. **Technical moat:** Medium — the orchestration is buildable by others, but the selection/merge algorithms and heuristics improve with usage data
2. **Data moat:** HIGH — anonymized ensemble data (convergence rates by task type, pass rates by attempt count, optimal N for different complexities) doesn't exist ANYWHERE
3. **Community moat:** Medium-high — contributors share findings, selection strategies, merge algorithms
4. **Research moat:** HIGH — first to publish real-world ensemble coding results (not competitive programming)

---

## Stress Test

### Attack 1: "Just run Claude Code twice manually and pick the better result"
**Counter:** You could, but: (a) you wouldn't run them in parallel (2x wall time), (b) you wouldn't have structured comparison, (c) you wouldn't have convergence analysis, (d) you wouldn't run tests automatically, (e) you wouldn't have historical data on what works. The tool makes the obvious-but-tedious thing effortless.

### Attack 2: "N runs = Nx cost, most people won't pay"
**Counter:** (a) Users choose when to use ensemble mode — it's opt-in for high-stakes tasks, (b) even N=3 dramatically improves reliability per the research, (c) $1.50 vs $0.50 for a fix that otherwise takes 30 min of debugging is cheap, (d) the cost of deploying a bad fix is much higher than 2 extra API calls.

### Attack 3: "Without comprehensive tests, the selection oracle is weak"
**Counter:** True, but: (a) convergence alone is valuable even without tests, (b) the tool can auto-generate lightweight acceptance tests before running (CodeT approach), (c) for repos WITH tests, this is immediately valuable with zero setup.

### Attack 4: "Agents aren't truly independent — same model, same training, same biases"
**Counter:** (a) Temperature variation creates real diversity in approach, (b) research shows even same-model samples produce meaningfully different solutions, (c) the codebase exploration order varies (which files Claude reads first), creating path-dependent diversity, (d) future: could mix models (Claude + GPT) for true diversity.

### Attack 5: "This is just AlphaCode for real coding — why hasn't DeepMind/Google done it?"
**Counter:** (a) They optimized for competitive programming with perfect test oracles — real coding is harder and they may not see it as their lane, (b) they don't have an agent coding product, (c) the infrastructure (worktrees, CLI, hooks) didn't exist until Claude Code matured, (d) being second to market with a better implementation is fine — nobody has done it PERIOD.

**Verdict: Survives all attacks.** The weakest point is the test-oracle dependency, but convergence analysis partially compensates even without tests.

---

## Scoring

- Usefulness: 4.5/5 (anyone doing high-stakes AI coding wants more reliable results)
- Moat: 4.5/5 (ensemble data + research findings + Claude Code structural advantage)
- Shippability: 4/5 (CLI wrapper + parallel spawning + test runner + diff comparison)
- Community potential: 4.5/5 (contribute selection strategies, share ensemble data, publish findings)
- **Total: 17.5/20**

**But wait — there's an adjustment.** This idea has something none of the previous 34 had:

**ACADEMIC VALIDATION + ZERO COMPETITORS + PLATFORM STRUCTURAL FIT**

The research says this works. Nobody has built it. And Claude Code is the only platform where it's naturally possible. That combination is unique in this entire ideation process.

**Adjusted score: 19/20** — the highest of any idea explored.

---

## v0.1 Implementation Sketch

### Saturday Morning Plan

**Hour 1-2: Scaffold**
- TypeScript CLI project
- `thinktank run "task description" --attempts N`
- Configuration: default N, test command, worktree directory

**Hour 3-4: Parallel Runner**
- Spawn N `claude -p "task"` processes in separate git worktrees
- Capture output, timing, exit codes
- Wait for all to complete (with timeout)

**Hour 5-6: Evaluator**
- For each completed attempt:
  - Run test suite, capture pass/fail
  - Generate git diff
  - Compute diff stats (files changed, lines added/removed)
- Compare diffs across attempts for convergence

**Hour 7-8: Reporter + Selection**
- Display results table (pass/fail, diff size, convergence)
- Show convergence map ("Agents 1,3,5 took similar approach; Agent 2 diverged")
- Let user select which to apply
- Apply selected diff to main worktree

**End of Day 1:** Working CLI that runs N parallel Claude Code agents and helps you pick the best result.
