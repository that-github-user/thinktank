import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import pc from "picocolors";
import type { EnsembleResult } from "../types.js";

export async function stats(): Promise<void> {
  let files: string[];
  try {
    const entries = await readdir(".thinktank");
    files = entries.filter((f) => f.startsWith("run-") && f.endsWith(".json"));
  } catch {
    console.log(pc.yellow("  No .thinktank/ directory found. Run `thinktank run` first."));
    return;
  }

  if (files.length === 0) {
    console.log(pc.yellow("  No run files found. Run `thinktank run` first."));
    return;
  }

  const results: EnsembleResult[] = [];
  for (const file of files) {
    try {
      const raw = await readFile(join(".thinktank", file), "utf-8");
      results.push(JSON.parse(raw) as EnsembleResult);
    } catch {
      // skip malformed files
    }
  }

  const totalRuns = results.length;
  const avgAgents = results.reduce((sum, r) => sum + r.agents.length, 0) / totalRuns;

  const allScores = results.flatMap((r) => r.convergence.map((g) => g.similarity));
  const avgConvergence =
    allScores.length > 0 ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length : 0;

  const testPassRates = results
    .filter((r) => r.tests.length > 0)
    .map((r) => r.tests.filter((t) => t.passed).length / r.tests.length);
  const avgTestPass =
    testPassRates.length > 0
      ? testPassRates.reduce((sum, r) => sum + r, 0) / testPassRates.length
      : null;

  console.log();
  console.log(pc.bold("  thinktank stats"));
  console.log(pc.dim("  ─────────────────────────────"));
  console.log(`  Total runs:          ${pc.cyan(String(totalRuns))}`);
  console.log(`  Avg agents/run:      ${pc.cyan(avgAgents.toFixed(1))}`);
  console.log(`  Avg convergence:     ${pc.cyan((avgConvergence * 100).toFixed(1) + "%")}`);
  if (avgTestPass !== null) {
    console.log(`  Avg test pass rate:  ${pc.cyan((avgTestPass * 100).toFixed(1) + "%")}`);
  }
  console.log();
}
