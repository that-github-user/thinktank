import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import pc from "picocolors";
import type { EnsembleResult } from "../types.js";
import { displayResults, padRight } from "../utils/display.js";

export interface RunSummary {
  runNumber: number;
  timestamp: string;
  agentCount: number;
  recommended: number | null;
  testPassRate: number | null;
  avgConvergence: number | null;
}

/** Run numbers are assigned by sort order (chronological), not embedded in filename */
export function extractRunNumber(_filename: string): number {
  return -1; // Assigned by loadAllRuns based on sort position
}

export function buildRunSummary(runNumber: number, result: EnsembleResult): RunSummary {
  const testPassRate =
    result.tests.length > 0
      ? result.tests.filter((t) => t.passed).length / result.tests.length
      : null;

  const similarities = result.convergence.map((g) => g.similarity);
  const avgConvergence =
    similarities.length > 0
      ? similarities.reduce((sum, s) => sum + s, 0) / similarities.length
      : null;

  return {
    runNumber,
    timestamp: result.timestamp,
    agentCount: result.agents.length,
    recommended: result.recommended,
    testPassRate,
    avgConvergence,
  };
}

export async function loadAllRuns(): Promise<{ filename: string; result: EnsembleResult }[]> {
  const entries = await readdir(".thinktank");
  const files = entries.filter((f) => f.startsWith("run-") && f.endsWith(".json")).sort(); // Lexicographic sort = chronological for ISO timestamps

  const runs: { filename: string; result: EnsembleResult }[] = [];
  for (const file of files) {
    try {
      const raw = await readFile(join(".thinktank", file), "utf-8");
      runs.push({ filename: file, result: JSON.parse(raw) as EnsembleResult });
    } catch {
      // skip malformed files
    }
  }
  return runs;
}

function displayRunTable(summaries: RunSummary[]): void {
  console.log();
  console.log(pc.bold("Run History"));
  console.log(pc.dim("─".repeat(72)));
  console.log(
    "  " +
      padRight("Run", 6) +
      padRight("Timestamp", 22) +
      padRight("Agents", 8) +
      padRight("Best", 6) +
      padRight("Tests", 10) +
      padRight("Convergence", 12),
  );
  console.log(`  ${pc.dim("─".repeat(64))}`);

  for (const s of summaries) {
    const testStr =
      s.testPassRate !== null ? `${Math.round(s.testPassRate * 100)}%` : pc.dim("n/a");
    const convStr =
      s.avgConvergence !== null ? `${Math.round(s.avgConvergence * 100)}%` : pc.dim("n/a");
    const bestStr = s.recommended !== null ? `#${s.recommended}` : pc.dim("n/a");

    console.log(
      "  " +
        padRight(`${s.runNumber}`, 6) +
        padRight(s.timestamp, 22) +
        padRight(String(s.agentCount), 8) +
        padRight(bestStr, 6) +
        padRight(testStr, 10) +
        padRight(convStr, 12),
    );
  }

  console.log();
  console.log(pc.dim("  View details: thinktank list <run-number>"));
  console.log();
}

export async function list(runNumber?: number): Promise<void> {
  try {
    const runs = await loadAllRuns();

    if (runs.length === 0) {
      console.log("  No results found. Run `thinktank run` first.");
      return;
    }

    if (runNumber !== undefined) {
      if (runNumber < 1 || runNumber > runs.length) {
        console.log(`  Run #${runNumber} not found. Valid range: 1-${runs.length}`);
        return;
      }
      displayResults(runs[runNumber - 1]!.result);
      return;
    }

    const summaries = runs.map((r, i) => buildRunSummary(i + 1, r.result));
    displayRunTable(summaries);
  } catch {
    console.log("  No results found. Run `thinktank run` first.");
  }
}
