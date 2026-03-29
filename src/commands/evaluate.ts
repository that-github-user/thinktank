import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import pc from "picocolors";
import { analyzeConvergence, copelandRecommend, recommend } from "../scoring/convergence.js";
import type { EnsembleResult } from "../types.js";
import { padRight } from "../utils/display.js";
import { parseAndValidateResult } from "../utils/schema.js";

interface RunEvaluation {
  file: string;
  agentCount: number;
  agentsWithDiffs: number;
  hasTests: boolean;
  weightedPick: number | null;
  copelandPick: number | null;
  bordaPick: number | null;
  agree: boolean;
}

/**
 * Borda count: rank agents on each criterion, sum ranks. Lowest total rank wins.
 */
function bordaRecommend(result: EnsembleResult): {
  recommended: number | null;
  ranks: Map<number, number>;
} {
  const completed = result.agents.filter((a) => a.status === "success" && a.diff.length > 10);
  if (completed.length === 0) return { recommended: null, ranks: new Map() };

  // Criterion 1: tests passed (passed=0 rank, failed=1 rank)
  const testRanks = new Map<number, number>();
  const passers = completed.filter((a) => result.tests.find((t) => t.agentId === a.id)?.passed);
  const failers = completed.filter((a) => !result.tests.find((t) => t.agentId === a.id)?.passed);
  for (const a of passers) testRanks.set(a.id, 0);
  for (const a of failers) testRanks.set(a.id, 1);

  // Criterion 2: convergence group size (larger = better = lower rank)
  const groupSizes = completed.map((a) => {
    const group = result.convergence.find((g) => g.agents.includes(a.id));
    return { id: a.id, size: group ? group.agents.length : 0 };
  });
  groupSizes.sort((a, b) => b.size - a.size);
  const convRanks = new Map<number, number>();
  for (let i = 0; i < groupSizes.length; i++) convRanks.set(groupSizes[i]!.id, i);

  // Criterion 3: files changed (fewer = better = lower rank)
  const fileCounts = completed.map((a) => ({ id: a.id, files: a.filesChanged.length }));
  fileCounts.sort((a, b) => a.files - b.files);
  const fileRanks = new Map<number, number>();
  for (let i = 0; i < fileCounts.length; i++) fileRanks.set(fileCounts[i]!.id, i);

  // Sum ranks
  const totalRanks = new Map<number, number>();
  for (const a of completed) {
    const total =
      (testRanks.get(a.id) ?? 0) + (convRanks.get(a.id) ?? 0) + (fileRanks.get(a.id) ?? 0);
    totalRanks.set(a.id, total);
  }

  // Lowest rank sum wins
  let bestId: number | null = null;
  let bestRank = Infinity;
  for (const [id, rank] of totalRanks) {
    if (rank < bestRank) {
      bestRank = rank;
      bestId = id;
    }
  }

  return { recommended: bestId, ranks: totalRanks };
}

export async function evaluate(): Promise<void> {
  let files: string[];
  try {
    const entries = await readdir(".thinktank");
    files = entries.filter((f) => f.startsWith("run-") && f.endsWith(".json"));
  } catch {
    console.log(pc.yellow("  No .thinktank/ directory found. Run thinktank run first."));
    return;
  }

  // Load all runs
  const runs: EnsembleResult[] = [];
  for (const file of files) {
    try {
      const raw = await readFile(join(".thinktank", file), "utf-8");
      runs.push(parseAndValidateResult(raw, file));
    } catch (err) {
      console.warn(`  Skipping ${file}: ${(err as Error).message}`);
    }
  }

  // Filter to runs with 2+ agents with diffs and test results
  const usable = runs.filter((r) => {
    const withDiffs = r.agents.filter((a) => a.status === "success" && a.diff.length > 10);
    return withDiffs.length >= 2 && r.tests.length > 0;
  });

  if (usable.length === 0) {
    console.log(pc.yellow("  No runs with 2+ agents and test results found."));
    return;
  }

  console.log();
  console.log(pc.bold("  Scoring Method Evaluation"));
  console.log(pc.dim("  ─".repeat(30)));
  console.log(`  Usable runs: ${pc.cyan(String(usable.length))} (of ${runs.length} total)`);
  console.log();

  // Evaluate each run with all three methods
  const evals: RunEvaluation[] = [];

  for (const run of usable) {
    const convergence = analyzeConvergence(run.agents);
    const weighted = recommend(run.agents, run.tests, convergence);
    const copeland = copelandRecommend(run.agents, run.tests, convergence);
    const borda = bordaRecommend(run);

    const agentsWithDiffs = run.agents.filter(
      (a) => a.status === "success" && a.diff.length > 10,
    ).length;
    const agree =
      weighted.recommended === copeland.recommended && copeland.recommended === borda.recommended;

    evals.push({
      file: run.timestamp,
      agentCount: run.agents.length,
      agentsWithDiffs,
      hasTests: run.tests.length > 0,
      weightedPick: weighted.recommended,
      copelandPick: copeland.recommended,
      bordaPick: borda.recommended,
      agree,
    });
  }

  // Display per-run comparison
  console.log(
    "  " +
      pc.dim(padRight("Run", 10)) +
      padRight("Agents", 8) +
      padRight("Weighted", 10) +
      padRight("Copeland", 10) +
      padRight("Borda", 8) +
      padRight("Agree?", 8),
  );
  console.log("  " + pc.dim("─".repeat(54)));

  for (let i = 0; i < evals.length; i++) {
    const e = evals[i]!;
    const agreeStr = e.agree ? pc.green("yes") : pc.red("NO");
    console.log(
      "  " +
        pc.dim(padRight(`#${i + 1}`, 10)) +
        padRight(String(e.agentsWithDiffs), 8) +
        padRight(e.weightedPick !== null ? `#${e.weightedPick}` : "-", 10) +
        padRight(e.copelandPick !== null ? `#${e.copelandPick}` : "-", 10) +
        padRight(e.bordaPick !== null ? `#${e.bordaPick}` : "-", 8) +
        padRight(agreeStr, 8),
    );
  }

  // Agreement statistics
  const totalRuns = evals.length;
  const allAgree = evals.filter((e) => e.agree).length;
  const wcAgree = evals.filter((e) => e.weightedPick === e.copelandPick).length;
  const wbAgree = evals.filter((e) => e.weightedPick === e.bordaPick).length;
  const cbAgree = evals.filter((e) => e.copelandPick === e.bordaPick).length;

  console.log();
  console.log(pc.bold("  Agreement Rates"));
  console.log(pc.dim("  ─".repeat(30)));
  console.log(`  All three agree:         ${pc.cyan(pct(allAgree, totalRuns))}`);
  console.log(`  Weighted = Copeland:     ${pc.cyan(pct(wcAgree, totalRuns))}`);
  console.log(`  Weighted = Borda:        ${pc.cyan(pct(wbAgree, totalRuns))}`);
  console.log(`  Copeland = Borda:        ${pc.cyan(pct(cbAgree, totalRuns))}`);
  console.log();

  // Kendall's W (coefficient of concordance)
  // W = 12 * S / (k^2 * (n^3 - n)) where k = number of judges, n = items per block
  // Simplified: compute variance of rank sums across agents per run, then average
  const disagreements = evals.filter((e) => !e.agree);
  if (disagreements.length > 0) {
    console.log(pc.bold("  Disagreements"));
    console.log(pc.dim("  ─".repeat(30)));
    for (let i = 0; i < evals.length; i++) {
      const e = evals[i]!;
      if (!e.agree) {
        console.log(
          `  Run #${i + 1}: Weighted→#${e.weightedPick} Copeland→#${e.copelandPick} Borda→#${e.bordaPick}`,
        );
      }
    }
    console.log();
    console.log(
      pc.dim(
        "  When methods disagree, consider using --scoring copeland or manually\n" +
          "  reviewing with thinktank compare to pick the best agent.",
      ),
    );
  } else {
    console.log(
      pc.green("  All methods agree on every run — scoring method choice doesn't matter!"),
    );
  }

  console.log();
}

function pct(n: number, total: number): string {
  return `${n}/${total} (${Math.round((n / total) * 100)}%)`;
}
