# Technical Report: Evaluating Recommendation Scoring Methods in Ensemble AI Coding

**thinktank project** — March 2026 (updated with n=57 dataset)

## Abstract

thinktank runs N parallel AI coding agents on the same task and must recommend the "best" result. We evaluate three recommendation scoring methods — Weighted Sum, Copeland Pairwise, and Borda Count — across **57 usable ensemble coding runs** spanning 5 task types, 2 programming languages, and 4 distinct codebases. We find that **Copeland and Borda converge on the same recommendation 81% of the time**, while the Weighted Sum disagrees with Copeland 32% of the time. Cochran's Q test confirms the agreement rates differ significantly across method pairs (Q=17.7, p<0.001). Cliff's delta indicates a small but real effect (d=0.183). These results support Copeland as the default scoring method, though the Wilcoxon signed-rank test finds no systematic ranking shift (p=0.99), suggesting the methods diverge primarily on the top-1 recommendation rather than on full rankings.

## 1. Background

### 1.1 The Recommendation Problem

When multiple AI agents independently solve the same coding task, the system must select which solution to present to the user. This is a multi-criteria decision problem: an agent's solution should be judged on correctness (tests pass), consensus (convergence with other agents), efficiency (change scope), and test coverage contribution.

No single criterion suffices — an agent might pass all tests but produce an overly complex diff, or converge with other agents on a suboptimal approach.

### 1.2 Methods Under Evaluation

**Weighted Sum**
Each criterion is assigned a point value. Total score = sum of points. Highest score wins.

| Criterion | Points | Rationale |
|-----------|--------|-----------|
| Tests pass | 100 | Correctness is paramount |
| Convergence | 0–50 | `group_similarity × 50` |
| Diff size | 0–10 | Only penalizes outliers >2× median |

**Copeland Pairwise (social choice theory)**
Compare every pair of agents head-to-head on four criteria (tests passed, convergence group size, non-test files changed, test files changed). For each pair, the agent winning more criteria gets +1, the loser gets −1. Highest cumulative score wins. Test file criterion is capped at 3 files to prevent gaming.

**Borda Count (rank aggregation)**
Rank agents on each criterion independently. Sum the ranks. Lowest total rank wins. This is equivalent to asking "across all criteria, which agent is consistently near the top?"

### 1.3 Theoretical Properties

| Property | Weighted | Copeland | Borda |
|----------|----------|----------|-------|
| Scale-independent | No — 100/50/10 weights are arbitrary | Yes — only ordinal comparisons | Yes — only ranks |
| Condorcet winner | Not guaranteed | Guaranteed | Not guaranteed |
| Sensitive to weight choice | Yes | No | No |
| Handles non-transitive preferences | Poorly | Well | Moderately |

## 2. Methodology

### 2.1 Dataset

We analyzed **57 usable ensemble coding runs** (from 83 total) collected across multiple development sessions. The dataset spans:

| Task type | Language | Codebase | Runs |
|-----------|----------|----------|------|
| Feature development | TypeScript | thinktank main | ~25 |
| Bug fixes | TypeScript | thinktank main | ~10 |
| Refactoring | TypeScript | thinktank main | ~8 |
| A* pathfinding | Python, TypeScript | examples/astar-python, examples/astar | ~6 |
| ML regression | Python | examples/ml-regression | ~3 |
| ML classification | Python | examples/ml-classification | ~3 |
| Error handling, CLI features | TypeScript | thinktank main | ~2 |

Ensemble sizes: 2-agent (4 runs), 3-agent (9 runs), 4-agent (1 run), 5-agent (43 runs).

Inclusion criteria:
- At least 2 agents produced non-trivial diffs
- Scoring data available for all agents in the run

### 2.2 Evaluation Protocol

For each run, all three scoring methods re-scored the same set of agent results. We recorded which agent each method would recommend and computed:

1. **Pairwise agreement rates** — how often do two methods pick the same agent?
2. **Unanimous agreement** — how often do all three methods agree?
3. **Disagreement patterns** — when methods disagree, which groupings form?

### 2.3 Statistical Tests

- **Cochran's Q test** — tests whether the three pairwise agreement rates are equal (generalizes McNemar's test to 3+ treatments)
- **Wilcoxon signed-rank test** — tests whether Weighted and Copeland produce systematically different agent rankings (not just different top-1 picks)
- **Cliff's delta** — effect size measure for the rank differences between methods
- **Spearman rank correlation** — per-run correlation between Weighted and Copeland full rankings

### 2.4 Limitations

- The majority of runs (~43/57) are from a single codebase (thinktank itself); cross-project runs (A*, ML) add diversity but are a minority
- No ground truth for "which agent is actually best" — we compare methods against each other, not against an oracle
- The Borda implementation uses a simplified ranking (tied ranks get first-available position, not averaged)
- Runs without test commands generate scoring data with less discriminative power on the test-pass criterion

## 3. Results

### 3.1 Agreement Rates

| Comparison | n=21 (original) | n=57 (updated) |
|------------|-----------------|-----------------|
| All three unanimous | 11/21 (52%) | 32/57 (**56%**) |
| Weighted = Copeland | 13/21 (62%) | 39/57 (**68%**) |
| Weighted = Borda | 12/21 (57%) | 34/57 (**60%**) |
| **Copeland = Borda** | **18/21 (86%)** | **46/57 (81%)** |

### 3.2 Agreement by Ensemble Size

| Ensemble size | Runs | W=C | C=B |
|---------------|------|-----|-----|
| 2-agent | 4 | 100% | 100% |
| 3-agent | 9 | 78% | 100% |
| 5-agent | 43 | 63% | 77% |

Disagreement concentrates in larger ensembles. With 2–3 agents, all methods converge. With 5 agents, the ranking space is larger and methods diverge — particularly Weighted vs Copeland (37% disagreement).

### 3.3 Statistical Tests

#### Cochran's Q Test

Tests whether the three pairwise agreement rates (W=C, W=B, C=B) differ significantly.

- Q = 17.7, df = 2, **p < 0.001**
- **Significant**: The agreement rates are not equal. Copeland-Borda agreement (81%) is significantly higher than Weighted-Copeland agreement (68%) and Weighted-Borda agreement (60%).

#### Wilcoxon Signed-Rank Test

Tests whether Weighted and Copeland produce systematically different rankings (across all agents in all runs, not just the top-1 pick).

- n = 71 non-zero rank differences (from 157 total paired observations; 86 ties)
- W+ = 1280, W- = 1276
- z = -0.011, **p = 0.99**
- **Not significant**: The methods do not systematically rank agents differently across the full ranking. They diverge on the *top-1 recommendation* but produce similar overall orderings.

This combination — significant Cochran's Q but non-significant Wilcoxon — means the methods agree on which agents are generally good or bad, but disagree on which is *best*. The top-1 recommendation is the contentious decision.

#### Cliff's Delta (Effect Size)

Measures the magnitude of rank differences between Weighted and Copeland.

- 42 positive differences (Weighted ranks agent lower) vs 29 negative (Copeland ranks lower)
- **d = 0.183 (small effect)**
- Thresholds: negligible < 0.147, small < 0.33, medium < 0.474, large ≥ 0.474

The effect is small but real — a step up from negligible at the earlier n=20 sample.

#### Spearman Rank Correlation

Per-run correlation between Weighted and Copeland full rankings (n=36 runs with stored score data):

- Mean ρ = 0.528
- Median ρ = 1.000 (most runs have perfect agreement)
- Min = -0.700, Max = 1.000
- 50% of runs have perfect correlation; 31% have low or negative correlation

The bimodal distribution — most runs perfectly correlated, a meaningful minority anti-correlated — explains the paradox of "methods usually agree, but when they disagree it's dramatically."

### 3.4 Interpretation

**Copeland-Borda concordance remains strong.** At 81% (n=57), two mathematically independent methods — pairwise tournament and rank aggregation — converge on the same recommendation. This is lower than the original 86% (n=21) but still demonstrates that pairwise comparison methods produce robust recommendations.

**Weighted is the outlier.** Weighted Sum disagrees with Copeland 32% of the time and with Borda 40% of the time. Cochran's Q confirms this is statistically significant (p<0.001). The disagreement is driven by:

1. **Weight sensitivity**: The 100/50/10 point allocation over-emphasizes test pass/fail. Two agents that both pass tests are differentiated only by convergence (50 pts) and diff outlier penalty (0–10 pts), creating thin margins.
2. **Scale distortion**: Weighted conflates ordinal preferences with cardinal magnitudes. A 4-point gap may reflect arbitrary weight choices rather than meaningful quality.
3. **Ensemble size effect**: 5-agent runs produce 37% W≠C disagreement vs 0% for 2-agent runs. More agents create more ranking permutations where weight sensitivity matters.

**The methods diverge on top-1, not on overall ranking.** The Wilcoxon non-significance (p=0.99) combined with Cochran's Q significance (p<0.001) reveals a nuanced picture: all three methods generally agree on which agents are good and which are bad, but disagree on which single agent is *best*. Since thinktank must pick one agent to recommend, this top-1 divergence is the decision that matters.

## 4. Recommendations

### 4.1 Default to Copeland

Based on these findings, thinktank defaults to Copeland scoring:

1. **Theoretically principled**: Copeland is Condorcet-consistent and scale-independent
2. **Empirically validated**: 81% agreement with Borda (n=57) across diverse tasks and languages
3. **No arbitrary weights**: Eliminates the 100/50/10 point allocation debate
4. **Transparent**: Each criterion is a clear "win" or "loss" — easier for users to understand why an agent was recommended
5. **Statistically supported**: Cochran's Q (p<0.001) confirms Copeland-Borda agreement is significantly higher than Weighted-Copeland agreement

### 4.2 Retain Weighted as Option

Weighted Sum remains useful when users want to explicitly emphasize one criterion (e.g., "I only care about tests passing"). The `--scoring weighted` flag remains available.

### 4.3 Future Work

1. **Ground truth validation**: Use LLM-as-judge or human evaluation to independently rate solution quality, then correlate with each scoring method's recommendations
2. **Multi-codebase evaluation**: Expand the A* and ML examples to more languages and problem domains
3. **Kendall's W concordance**: With controlled N=5 runs, compute inter-method concordance coefficient
4. **Multi-model ensembles**: Test whether Claude + GPT + Gemini ensembles produce different scoring dynamics than single-model ensembles

## 5. References

1. Merlin, V., & Valognes, F. (2004). "On the coincidence of Condorcet and Borda winners." *Theory and Decision*, 57(3), 249–273.
2. Tetlock, P., & Gardner, D. (2015). *Superforecasting: The Art and Science of Prediction*. Crown.
3. Kambhampati, S. (2024). "LLMs Can't Plan, But Can Help Planning." arXiv:2402.01817.
4. Li, Y., et al. (2022). "Competition-Level Code Generation with AlphaCode." *Science*, 378(6624).
5. Arrow, K. J. (1951). *Social Choice and Individual Values*. Wiley.
6. Chen, M., et al. (2021). "Evaluating Large Language Models Trained on Code." arXiv:2107.03374.
7. Romano, J., Kromrey, J. D., Coraggio, J., & Skowronek, J. (2006). "Appropriate statistics for ordinal level data: Should we really be using t-test and Cohen's d?" *AERA Annual Meeting*.

## Appendix A: Reproducibility

```bash
# From the thinktank repository with .thinktank/ run data:
thinktank evaluate

# For the full statistical analysis:
python scripts/scoring-analysis.py
```

The `evaluate` command re-scores all past runs with all three methods and displays the comparison table. The Python script adds Wilcoxon, Cliff's delta, Cochran's Q, and Spearman correlation tests.

## Appendix B: Dataset Composition

```
Total run files:    83
Usable for scoring: 57 (69%)
Excluded:           26 (no diffs, single agent, or missing scoring data)

By task type:
  TypeScript feature dev:  ~25 runs
  TypeScript bug fixes:    ~10 runs
  TypeScript refactoring:  ~8 runs
  A* pathfinding (Py/TS):  ~6 runs
  ML regression (Python):  ~3 runs
  ML classification (Py):  ~3 runs
  CLI/error handling:      ~2 runs

By ensemble size:
  2-agent:  4 runs
  3-agent:  9 runs
  4-agent:  1 run
  5-agent:  43 runs
```

## Appendix C: Statistical Details

**Cochran's Q test**: Generalization of McNemar's test to k>2 matched groups. Each run is a block; the three treatments are whether each method pair agrees. Q follows chi-squared with k-1 df under H₀.

**Wilcoxon signed-rank test**: Non-parametric test for paired samples. We pair each agent's Weighted rank with its Copeland rank across all runs. Normal approximation used for n=71 non-zero differences.

**Cliff's delta**: Non-parametric effect size. Computed as (n_concordant - n_discordant) / n_total on the paired rank differences. Thresholds per Romano et al. (2006): negligible < 0.147, small < 0.33, medium < 0.474, large ≥ 0.474.
