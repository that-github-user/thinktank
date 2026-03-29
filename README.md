<p align="center">
  <img src="assets/logo.png" alt="thinktank" width="200" />
</p>

<h3 align="center">Ensemble AI coding — multiple agents, one best answer</h3>

<p align="center">
  <a href="https://github.com/that-github-user/thinktank/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/that-github-user/thinktank/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI"></a>
  <a href="https://github.com/that-github-user/thinktank/blob/main/LICENSE"><img src="https://img.shields.io/github/license/that-github-user/thinktank?style=for-the-badge" alt="License"></a>
  <a href="https://github.com/that-github-user/thinktank/releases"><img src="https://img.shields.io/github/v/release/that-github-user/thinktank?style=for-the-badge&include_prereleases&label=version" alt="Version"></a>
  <a href="https://github.com/that-github-user/thinktank/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge" alt="PRs Welcome"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#how-it-works">How It Works</a> &middot;
  <a href="CONTRIBUTING.md">Contributing</a> &middot;
  <a href="#references">References</a>
</p>

---

Run N parallel Claude Code agents on the same task, then select the best result via test execution and convergence analysis. Based on the principle that **the aggregate of independent attempts outperforms any single attempt** — proven in [ensemble ML](https://en.wikipedia.org/wiki/Ensemble_learning), [superforecasting](https://en.wikipedia.org/wiki/Superforecasting), and [LLM code generation research](#references).

## Quick start

```bash
# Install from source (npm package coming soon)
git clone https://github.com/that-github-user/thinktank.git
cd thinktank && npm install && npm run build
npm link  # makes `thinktank` available globally

# Run 3 parallel agents on a task
thinktank run "fix the authentication bypass"

# Run 5 agents with test verification
thinktank run "fix the race condition" -n 5 -t "npm test"

# Apply the best result
thinktank apply
```

Requires [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated.

### Models

Use `--model` to select a Claude model: `sonnet` (default), `opus`, `haiku`, or a full model ID like `claude-opus-4-6`.

**Amazon Bedrock**: Pass a Bedrock model ID such as `anthropic.claude-opus-4-6-v1` and set the standard AWS environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, etc.). See `.env.example` for details.

## How it works

```
            ┌───────────────┐
            │   Your task   │
            └───────┬───────┘
                    │
         ┌──────────┼──────────┐
         │          │          │
         ▼          ▼          ▼
    ┌─────────┐┌─────────┐┌─────────┐
    │Agent #1 ││Agent #2 ││Agent #3 │
    │worktree ││worktree ││worktree │
    └────┬────┘└────┬────┘└────┬────┘
         │          │          │
         ▼          ▼          ▼
    ┌──────────────────────────────┐
    │     Test & Convergence       │
    │ ┌────────┐┌────────────────┐ │
    │ │npm test││Agents 1,3 agree│ │
    │ └────────┘└────────────────┘ │
    └──────────────┬───────────────┘
                   │
                   ▼
          ┌─────────────────┐
          │   Best result   │
          │   recommended   │
          └─────────────────┘
```

1. Spawns **N parallel Claude Code agents**, each in an isolated git worktree
2. Each agent independently solves the task (no shared context = true independence)
3. Runs your **test suite** on each result
4. Analyzes **convergence** — did the agents agree on an approach?
5. **Recommends** the best candidate (tests passing + consensus + smallest diff)
6. You review and `thinktank apply`

## Why this works

Every model ever benchmarked shows **pass@5 >> pass@1**. The gap between "one attempt" and "best of five" is one of the largest free reliability gains in AI coding. But no tool exposes this — until now.

| Metric | Single attempt | 5 parallel attempts |
|--------|---------------|---------------------|
| Reliability | Whatever pass@1 gives you | Approaches pass@5 |
| Confidence | "Did it get it right?" | "4/5 agents agree — high confidence" |
| Coverage | One approach explored | Multiple approaches, pick the best |

The key insight: **parallel attempts cost more tokens but not more time.** All agents run simultaneously.

## When to use it

- **High-stakes changes** — auth, payments, security, data migrations
- **Ambiguous tasks** — multiple valid approaches, need to see the spread
- **Complex refactors** — many files, easy to miss something
- **Unfamiliar codebases** — agents might go the wrong direction

## Usage

```bash
# Run with defaults (3 agents, sonnet model)
thinktank run "add rate limiting to the API"

# Run 5 agents with test verification
thinktank run "fix the race condition in the cache layer" -n 5 -t "npm test"

# Use a specific model
thinktank run "migrate callbacks to async/await" --model opus -n 3

# Apply the recommended result
thinktank apply

# Apply a specific agent's result
thinktank apply --agent 2

# View the last run's results
thinktank list
```

## Example output

```
thinktank — ensemble AI coding

  Task:     fix the authentication bypass
  Agents:   5 parallel attempts
  Model:    sonnet

Results
────────────────────────────────────────────────────────────

  Agent    Status    Tests   Files   +/-          Time
  ──────────────────────────────────────────────────────────
>> #1      ok        pass    2       +15/-3       45s
  #2      ok        pass    2       +18/-3       52s
  #3      ok        pass    3       +22/-5       61s
  #4      ok        fail    1       +8/-2        38s
  #5      ok        pass    2       +14/-3       47s

Convergence
────────────────────────────────────────────────────────────
  Agents [1, 2, 5]: ████████████████░░░░ 60%
  Strong consensus — 3/5 agents changed the same files
  Files: src/middleware/auth.ts, tests/auth.test.ts

  Agents [3]:       ████░░░░░░░░░░░░░░░░ 20%
  Divergent approach — 1/5 agents went a different direction
  Files: src/middleware/auth.ts, src/utils/jwt.ts, tests/auth.test.ts

  Recommended: Agent #1 (highest score based on tests + convergence + diff size)
```

## How it compares

| Approach | Reliability | Cost | Speed |
|----------|-------------|------|-------|
| Single Claude Code run | pass@1 | 1x | Fastest |
| **thinktank (N=3)** | **~pass@3** | **3x** | **Same wall time** |
| **thinktank (N=5)** | **~pass@5** | **5x** | **Same wall time** |
| Manual retry loop | pass@k (sequential) | kx | k × slower |

## References

### Ensemble coding research
- [AlphaCode](https://deepmind.google/discover/blog/competitive-programming-with-alphacode/) — DeepMind, 2022. Massive parallel generation + clustering + test-based filtering.
- [CodeT](https://arxiv.org/abs/2207.10397) — Microsoft, 2022. Dual execution agreement: generate N solutions + N tests, cross-validate.
- [MBR-Exec](https://arxiv.org/abs/2211.11501) — 2022. Minimum Bayes Risk via execution consensus.
- [Self-Consistency](https://arxiv.org/abs/2203.11171) — Wang et al., 2022. Majority voting across samples improves over single-pass.

### LLM planning & verification
- [On the Planning Abilities of Large Language Models](https://arxiv.org/abs/2302.06706) — Kambhampati et al., 2023. Empirical evidence that single-pass LLM reasoning is unreliable.
- [LLMs Can't Plan, But Can Help Planning](https://arxiv.org/abs/2402.01817) — Kambhampati et al., 2024. The LLM-Modulo framework: LLMs as generators, external systems as verifiers.

### Ensemble theory
- *Superforecasting* — Tetlock & Gardner. The aggregate of independent forecasters consistently beats individuals.
- *The Wisdom of Crowds* — Surowiecki. Independent estimates, when aggregated, converge on truth.
