# thinktank — References & Theoretical Foundations

## Core Thesis
LLMs are unreliable on single-pass execution for tasks requiring correctness. Ensemble/consensus approaches — running multiple independent attempts and selecting via convergence + verification — dramatically improve reliability. This is well-established in forecasting (Superforecasting), ML (ensemble methods), and increasingly in LLM research.

---

## Kambhampati — LLM Planning & Verification

**Key contribution:** LLMs are "approximate retrieval engines," not reasoning engines. Single-pass LLM outputs have inherent error rates that cannot be eliminated by prompting alone. The solution is the **LLM-Modulo framework**: LLMs generate candidates, independent systems verify.

| Paper | Year | Key Finding |
|-------|------|-------------|
| "On the Planning Abilities of Large Language Models" (arXiv 2302.06706) | 2023 | LLMs fail frequently on autonomous planning; establishes single-pass unreliability |
| "Can LLMs Really Plan? / LLMs Can't Plan, But Can Help Planning" (arXiv 2402.01817) | 2024 | LLM-Modulo framework: generate + verify architecture. LLM self-verification is unreliable — independent verification needed |
| LLM+P (with collaborators) | 2023 | LLM translates to formal spec, symbolic planner solves — generate+verify pattern |
| AAAI Presidential Address / keynotes | 2023-24 | System 1 (LLM generation) vs System 2 (deliberative verification) framing |

**Relevance to thinktank:**
- Single-pass unreliability → motivation for multiple attempts
- Independent verification > self-verification → argues for N independent agents, not one agent checking itself
- "Approximate retrieval engine" model → if errors are somewhat independent across calls, ensemble methods reduce error rates (same principle as random forests)
- LLM-Modulo architecture = generate + verify, which is exactly what thinktank does (generate N candidates + verify via test execution + consensus)

---

## Ensemble Code Generation Research

| Paper | Year | Approach | Key Finding |
|-------|------|----------|-------------|
| **AlphaCode** (Li et al., DeepMind) | 2022 | Generate ~1M samples → cluster → filter by test execution | Competitive-programming-level performance from massive sampling + selection |
| **AlphaCode 2** (DeepMind) | 2023 | Gemini-based, more efficient sampling + filtering | More sample-efficient but same paradigm |
| **CodeT** (Chen et al., Microsoft) | 2022 | Generate N solutions + N test cases, dual execution agreement | Significant improvement on HumanEval/MBPP via cross-validation |
| **MBR-Exec** (Shi et al.) | 2022 | Minimum Bayes Risk via execution consensus — pick candidate whose outputs agree with most others | Most principled consensus-via-execution approach |
| **Self-Consistency** (Wang et al.) | 2022 | Majority voting on reasoning chains (adapted to code) | Showed consensus across samples improves over single-pass |
| **CodeRanker** (Inala et al.) | 2022 | Trained ranker model for code selection | Learned selection outperforms random among N samples |
| **LEVER** (Ni et al.) | 2023 | Learned verifier for code generation reranking | External verifier improves selection quality |
| **Parsel** (Zelikman et al.) | 2023 | Hierarchical decompose, solve parts with best-of-N, compose | Best-of-N at each decomposition level |
| **Reflexion** (Shinn et al.) | 2023 | Sequential: generate → test → reflect → regenerate | Iterative improvement (sequential, not parallel) |

---

## Forecasting & Ensemble Theory

| Source | Key Idea |
|--------|----------|
| **Superforecasting** (Tetlock & Gardner) | Aggregate of independent forecasters consistently beats individuals. Diversity of thought + aggregation = accuracy. |
| **Wisdom of Crowds** (Surowiecki) | Independent estimates, when averaged, converge on truth. Requirements: diversity, independence, decentralization. |
| **Ensemble methods in ML** (Random Forests, Boosting, Bagging) | Combining multiple weak learners produces a strong learner. Variance reduction through aggregation. |
| **Ensemble weather forecasting** | Running multiple models with perturbed initial conditions; spread indicates uncertainty, consensus indicates confidence. |

---

## pass@k Evidence

The standard HumanEval/MBPP metric pass@k explicitly measures the value of multiple attempts:

- Every model ever tested shows pass@5 >> pass@1 and pass@100 >> pass@5
- This is the most direct empirical evidence that "just run it more times" is a legitimate reliability strategy
- The gap between pass@1 and pass@k is the exact value that thinktank captures

---

## Key Insight Synthesis

Kambhampati provides the **theoretical framework** (LLMs are approximate, need independent verification).
AlphaCode/CodeT/MBR-Exec provide the **empirical evidence** (ensemble selection dramatically improves code quality).
Superforecasting provides the **intuitive analogy** (aggregate independent estimates to converge on truth).
pass@k provides the **quantitative proof** (every model benefits from multiple attempts).

**thinktank is the first tool to bring all of this to real-world software engineering.**
