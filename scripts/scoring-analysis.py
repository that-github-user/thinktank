"""
Statistical analysis of thinktank scoring method agreement.
Compares Weighted, Copeland, and Borda scoring across all usable runs.
"""

import json
import glob
import os
import math
from pathlib import Path

runs_dir = Path(__file__).parent.parent / ".thinktank"
run_files = sorted(glob.glob(str(runs_dir / "run-*.json")))
print(f"Found {len(run_files)} total run files\n")

usable_runs = []

for f in run_files:
    with open(f, encoding="utf-8") as fh:
        data = json.load(fh)

    agents = data.get("agents", [])
    scores = data.get("scores")      # list of {agentId, total, ...}
    cop_scores = data.get("copelandScores")  # list of {agentId, copelandTotal, ...}

    if len(agents) < 2:
        continue
    if not scores or not cop_scores:
        continue
    if not isinstance(scores, list) or not isinstance(cop_scores, list):
        continue

    # Build dicts: agentId -> score
    w_dict = {}
    for s in scores:
        aid = s.get("agentId")
        total = s.get("total", 0)
        if aid is not None:
            w_dict[aid] = total

    c_dict = {}
    for s in cop_scores:
        aid = s.get("agentId")
        total = s.get("copelandTotal", 0)
        if aid is not None:
            c_dict[aid] = total

    if len(w_dict) < 2 or len(c_dict) < 2:
        continue

    # Who does each method recommend?
    w_rec = max(w_dict, key=lambda k: w_dict[k])
    c_rec = max(c_dict, key=lambda k: c_dict[k])

    # Borda: sum of ranks across criteria (from copeland detail)
    # Compute from the per-criterion wins data
    b_dict = {}
    for s in cop_scores:
        aid = s.get("agentId")
        if aid is None:
            continue
        # Borda = sum of individual criterion wins (not the pairwise total)
        borda = (s.get("testsWins", 0) +
                 s.get("convergenceWins", 0) +
                 s.get("nonTestFilesWins", 0) +
                 s.get("testFilesWins", 0))
        b_dict[aid] = borda

    b_rec = max(b_dict, key=lambda k: b_dict[k]) if b_dict else c_rec

    usable_runs.append({
        "file": os.path.basename(f),
        "n_agents": len(agents),
        "weighted": w_rec,
        "copeland": c_rec,
        "borda": b_rec,
        "w_dict": w_dict,
        "c_dict": c_dict,
        "b_dict": b_dict,
    })

n = len(usable_runs)
print(f"Usable runs: {n}\n")

# ─── Agreement Analysis ───
print("=" * 60)
print("AGREEMENT ANALYSIS")
print("=" * 60)

wc = [1 if r["weighted"] == r["copeland"] else 0 for r in usable_runs]
wb = [1 if r["weighted"] == r["borda"] else 0 for r in usable_runs]
cb = [1 if r["copeland"] == r["borda"] else 0 for r in usable_runs]
all3 = [1 if r["weighted"] == r["copeland"] == r["borda"] else 0 for r in usable_runs]

print(f"  All three agree:     {sum(all3)}/{n} ({100*sum(all3)/n:.1f}%)")
print(f"  Weighted = Copeland: {sum(wc)}/{n} ({100*sum(wc)/n:.1f}%)")
print(f"  Weighted = Borda:    {sum(wb)}/{n} ({100*sum(wb)/n:.1f}%)")
print(f"  Copeland = Borda:    {sum(cb)}/{n} ({100*sum(cb)/n:.1f}%)")

by_size = {}
for r in usable_runs:
    k = r["n_agents"]
    by_size.setdefault(k, {"wc": 0, "cb": 0, "n": 0})
    by_size[k]["n"] += 1
    if r["weighted"] == r["copeland"]:
        by_size[k]["wc"] += 1
    if r["copeland"] == r["borda"]:
        by_size[k]["cb"] += 1

print(f"\nBy ensemble size:")
for k in sorted(by_size):
    d = by_size[k]
    print(f"  {k}-agent runs (n={d['n']}): W=C {d['wc']}/{d['n']} ({100*d['wc']/d['n']:.0f}%), C=B {d['cb']}/{d['n']} ({100*d['cb']/d['n']:.0f}%)")

# ─── Spearman Rank Correlations ───
print(f"\n{'=' * 60}")
print("SPEARMAN RANK CORRELATION (Weighted vs Copeland per run)")
print("=" * 60)

rank_correlations = []
rank_diffs = []

for r in usable_runs:
    common = set(r["w_dict"].keys()) & set(r["c_dict"].keys())
    if len(common) < 2:
        continue

    agents_w = sorted(common, key=lambda a: r["w_dict"].get(a, 0), reverse=True)
    agents_c = sorted(common, key=lambda a: r["c_dict"].get(a, 0), reverse=True)
    rank_w = {a: i+1 for i, a in enumerate(agents_w)}
    rank_c = {a: i+1 for i, a in enumerate(agents_c)}

    n_a = len(common)
    d_sq = sum((rank_w[a] - rank_c[a])**2 for a in common)

    if n_a > 1:
        rho = 1 - (6 * d_sq) / (n_a * (n_a**2 - 1))
        rank_correlations.append(rho)

    for a in common:
        rank_diffs.append(rank_w[a] - rank_c[a])

if rank_correlations:
    mean_rho = sum(rank_correlations) / len(rank_correlations)
    sorted_rho = sorted(rank_correlations)
    median_rho = sorted_rho[len(sorted_rho)//2]

    print(f"  Runs analyzed: {len(rank_correlations)}")
    print(f"  Mean rho:      {mean_rho:.3f}")
    print(f"  Median rho:    {median_rho:.3f}")
    print(f"  Min:           {min(rank_correlations):.3f}")
    print(f"  Max:           {max(rank_correlations):.3f}")

    perfect = sum(1 for r in rank_correlations if r >= 0.99)
    high = sum(1 for r in rank_correlations if 0.7 <= r < 0.99)
    moderate = sum(1 for r in rank_correlations if 0.3 <= r < 0.7)
    low = sum(1 for r in rank_correlations if r < 0.3)

    print(f"\n  Distribution:")
    print(f"    Perfect (rho>=0.99):   {perfect}/{len(rank_correlations)}")
    print(f"    High (0.7-0.99):      {high}/{len(rank_correlations)}")
    print(f"    Moderate (0.3-0.7):   {moderate}/{len(rank_correlations)}")
    print(f"    Low/Negative (<0.3):  {low}/{len(rank_correlations)}")

# ─── Wilcoxon Signed-Rank Test ───
print(f"\n{'=' * 60}")
print("WILCOXON SIGNED-RANK TEST")
print("=" * 60)
print("H0: Weighted and Copeland rankings are exchangeable")

nonzero = [d for d in rank_diffs if d != 0]
n_nz = len(nonzero)

print(f"  Total paired observations: {len(rank_diffs)}")
print(f"  Ties (diff=0):             {len(rank_diffs) - n_nz}")
print(f"  Non-zero differences:      {n_nz}")

if n_nz > 0:
    abs_signed = [(abs(d), 1 if d > 0 else -1) for d in nonzero]
    abs_signed.sort(key=lambda x: x[0])

    ranked = []
    i = 0
    while i < len(abs_signed):
        j = i
        while j < len(abs_signed) and abs_signed[j][0] == abs_signed[i][0]:
            j += 1
        avg_rank = (i + 1 + j) / 2
        for k in range(i, j):
            ranked.append((avg_rank, abs_signed[k][1]))
        i = j

    W_plus = sum(r for r, s in ranked if s > 0)
    W_minus = sum(r for r, s in ranked if s < 0)
    W = min(W_plus, W_minus)

    print(f"\n  W+ (weighted ranked lower): {W_plus:.1f}")
    print(f"  W- (copeland ranked lower): {W_minus:.1f}")
    print(f"  W (test statistic):         {W:.1f}")

    if n_nz >= 10:
        mean_W = n_nz * (n_nz + 1) / 4
        std_W = (n_nz * (n_nz + 1) * (2 * n_nz + 1) / 24) ** 0.5
        z = (W - mean_W) / std_W
        p = 2 * (1 - 0.5 * (1 + math.erf(abs(z) / math.sqrt(2))))

        print(f"\n  z = {z:.3f}")
        print(f"  p-value (two-tailed) ~ {p:.4f}")
        if p < 0.001:
            print(f"  -> SIGNIFICANT at a=0.001 (***)")
        elif p < 0.01:
            print(f"  -> SIGNIFICANT at a=0.01 (**)")
        elif p < 0.05:
            print(f"  -> SIGNIFICANT at a=0.05 (*)")
        else:
            print(f"  -> NOT significant at a=0.05")

# ─── Cliff's Delta ───
print(f"\n{'=' * 60}")
print("CLIFF'S DELTA (Effect Size)")
print("=" * 60)

if nonzero:
    n_pos = sum(1 for d in nonzero if d > 0)
    n_neg = sum(1 for d in nonzero if d < 0)
    delta = (n_pos - n_neg) / n_nz
    abs_d = abs(delta)

    if abs_d < 0.147:
        size = "negligible"
    elif abs_d < 0.33:
        size = "small"
    elif abs_d < 0.474:
        size = "medium"
    else:
        size = "large"

    print(f"  Positive diffs (weighted ranks agent lower): {n_pos}")
    print(f"  Negative diffs (copeland ranks agent lower): {n_neg}")
    print(f"  Cliff's d = {delta:.3f}")
    print(f"  Effect size: {size} (|d|={abs_d:.3f})")
    print(f"  Thresholds: negligible<0.147, small<0.33, medium<0.474, large>=0.474")

# ─── Cochran's Q Test ───
print(f"\n{'=' * 60}")
print("COCHRAN'S Q TEST")
print("=" * 60)
print("H0: The three pairwise agreement rates are equal")

# Each run is a block; 3 treatments = wc_agree, wb_agree, cb_agree
k = 3  # treatments
T = [wc, wb, cb]  # binary vectors
N = n  # blocks

# Cochran's Q = (k-1) * [k * sum(Tj^2) - (sum(Tj))^2] / [k * sum(Li) - sum(Li^2)]
# where Tj = column sum, Li = row sum

col_sums = [sum(t) for t in T]
row_sums = [sum(T[j][i] for j in range(k)) for i in range(N)]

numerator = (k - 1) * (k * sum(cj**2 for cj in col_sums) - sum(col_sums)**2)
denominator = k * sum(row_sums) - sum(li**2 for li in row_sums)

if denominator > 0:
    Q = numerator / denominator
    # Q follows chi-squared with k-1 = 2 df
    # p-value approximation using chi-squared survival function
    # For df=2: P(X>x) = e^(-x/2)
    p_cochran = math.exp(-Q / 2)

    print(f"  Q = {Q:.3f}")
    print(f"  df = {k - 1}")
    print(f"  p-value ~ {p_cochran:.4f}")
    if p_cochran < 0.05:
        print(f"  -> SIGNIFICANT: agreement rates differ across method pairs")
    else:
        print(f"  -> NOT significant: no evidence agreement rates differ")
else:
    print("  Cannot compute (denominator = 0)")

# ─── Final Summary ───
print(f"\n{'=' * 60}")
print("SUMMARY")
print("=" * 60)

print(f"""
Sample: {n} usable runs (of {len(run_files)} total)
  2-agent: {sum(1 for r in usable_runs if r['n_agents']==2)}
  3-agent: {sum(1 for r in usable_runs if r['n_agents']==3)}
  4-agent: {sum(1 for r in usable_runs if r['n_agents']==4)}
  5-agent: {sum(1 for r in usable_runs if r['n_agents']==5)}

Agreement rates:
  All three:     {sum(all3)}/{n} ({100*sum(all3)/n:.1f}%)
  W = C:         {sum(wc)}/{n} ({100*sum(wc)/n:.1f}%)
  W = B:         {sum(wb)}/{n} ({100*sum(wb)/n:.1f}%)
  C = B:         {sum(cb)}/{n} ({100*sum(cb)/n:.1f}%)

vs. previous (n=21):
  C = B was 86%, now {100*sum(cb)/n:.0f}% (dropped with more data)
  W = C was 62%, now {100*sum(wc)/n:.0f}% (rose with more data)
  "Weighted disagrees ~40%" -> now ~{100-100*sum(wc)//n:.0f}% disagreement

Mean Spearman rho (W vs C): {mean_rho:.3f}
Cliff's delta: {delta:.3f} ({size})
""")
