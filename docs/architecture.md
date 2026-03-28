# Architecture

## System Overview

```
  User prompt                  ┌─────────────┐
  + options     ──────────────▶│   CLI       │
  (attempts, model,            │  (cli.ts)   │
   test command)               └──────┬──────┘
                                      │
                               ┌──────▼──────┐
                               │  Orchestrator│
                               │  (run.ts)    │
                               └──────┬──────┘
                                      │
              ┌───────────────┬───────┼───────┬───────────────┐
              │               │       │       │               │
        ┌─────▼─────┐  ┌─────▼─────┐ ...  ┌─────▼─────┐
        │  Agent #1  │  │  Agent #2  │      │  Agent #N  │
        │  worktree  │  │  worktree  │      │  worktree  │
        │ claude -p  │  │ claude -p  │      │ claude -p  │
        └─────┬─────┘  └─────┬─────┘      └─────┬─────┘
              │               │                   │
              └───────┬───────┴───────────────────┘
                      │
               ┌──────▼──────┐     ┌──────────────┐
               │ Test Runner  │────▶│ Pass/Fail    │
               │ (per agent)  │     │ per agent    │
               └──────┬──────┘     └──────────────┘
                      │
               ┌──────▼──────┐
               │ Convergence  │
               │  Analysis    │
               │  + Scoring   │
               └──────┬──────┘
                      │
               ┌──────▼──────┐
               │ Recommended  │
               │   Agent      │
               └─────────────┘
```

## Module Responsibilities

### CLI (`src/cli.ts`)
Entry point. Parses arguments, validates inputs, dispatches to commands.

### Commands (`src/commands/`)

- **`run.ts`** — Orchestrates the ensemble: creates worktrees → spawns agents → runs tests → analyzes convergence → recommends → saves results
- **`apply.ts`** — Applies a selected agent's diff to the main working tree. Supports `--preview` mode.
- **`list.ts`** — Displays results from the most recent run

### Runners (`src/runners/`)

- **`claude-code.ts`** — Spawns `claude -p` in headless mode in a worktree. Captures stdout, stderr, timing. Returns an `AgentResult`.

### Scoring (`src/scoring/`)

- **`convergence.ts`** — Groups agents by similarity of their code changes. Uses diff-content comparison (Jaccard similarity + union-find clustering).
- **`diff-parser.ts`** — Parses unified diffs into structured form for comparison.
- **`test-runner.ts`** — Executes test commands in each worktree. Validates commands for safety (rejects shell operators).

### Utils (`src/utils/`)

- **`git.ts`** — Git worktree creation/cleanup, diff extraction, branch management.
- **`display.ts`** — Terminal output formatting with cross-platform color support (picocolors).

## Convergence Algorithm

### Step 1: Diff Parsing
Each agent's unified diff is parsed into structured `DiffFile` objects containing added/removed lines per file.

### Step 2: Pairwise Similarity
For each pair of agents, Jaccard similarity is computed on the set of added lines:

```
similarity(A, B) = |added_lines(A) ∩ added_lines(B)| / |added_lines(A) ∪ added_lines(B)|
```

Lines are keyed by `file_path:content` for uniqueness. Similarity = 1 means identical changes, 0 means completely different.

### Step 3: Clustering
Single-linkage clustering with a threshold of 0.3. Two agents are in the same cluster if ANY pair within the cluster has similarity ≥ 0.3. Implemented via union-find for efficiency.

### Step 4: Group Scoring
Each cluster gets a composite score:

```
group_score = (cluster_size / total_agents) * 0.5 + avg_pairwise_similarity * 0.5
```

This combines "how many agents agree" with "how similar their actual changes are."

### Why Jaccard?
- Simple, interpretable (0-1 scale)
- Works on sets of lines without requiring alignment
- Handles different ordering of the same changes
- Insensitive to surrounding context (only compares what was added)

### Limitations
- Treats all added lines equally (a comment change and a logic change have equal weight)
- Doesn't detect semantic equivalence (two implementations that do the same thing differently score as 0)
- Whitespace-sensitive (reformatted code may appear different)

## Recommendation Scoring

Each agent receives a composite score:

| Signal | Points | Rationale |
|--------|--------|-----------|
| Tests pass | +100 | Strongest signal — code works |
| Convergence group | +0 to +50 | group_score × 50 — consensus is confidence |
| Smaller diff | +0 to +10 | (1 - normalized_size) × 10 — simpler is better |

The agent with the highest total score is recommended. Ties broken by the first agent.

### Why these weights?
- Tests (100) dominate because correctness trumps everything
- Convergence (50) is secondary — agreement without tests is weaker evidence
- Diff size (10) is a tiebreaker — among equally correct solutions, prefer the simpler one

## Security Model

- **Test command validation**: Commands are checked for shell operators (`;|&\`><`) before execution
- **Agent isolation**: Each agent runs in a separate git worktree with no shared state
- **Result redaction**: Saved JSON files strip stdout/stderr to prevent credential leakage
- **File permissions**: `.thinktank/` files written with mode 0o600 (owner-only)

## Data Flow

```
prompt ──▶ N × claude -p ──▶ N × git diff ──▶ pairwise similarity
                                               ──▶ clustering
                                               ──▶ scoring
                                               ──▶ recommendation
                                               ──▶ .thinktank/latest.json
```
