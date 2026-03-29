import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import pc from "picocolors";
import type { EnsembleResult } from "../types.js";
import { parseAndValidateResult } from "../utils/schema.js";

interface StatsOptions {
  model?: string;
  since?: string;
  until?: string;
  passedOnly?: boolean;
}

export function filterResults(results: EnsembleResult[], opts: StatsOptions): EnsembleResult[] {
  let filtered = results;

  if (opts.model) {
    const model = opts.model.toLowerCase();
    filtered = filtered.filter((r) => r.model.toLowerCase().includes(model));
  }

  if (opts.since) {
    const since = new Date(opts.since);
    if (Number.isNaN(since.getTime())) {
      console.log(pc.red(`  Invalid --since date: ${opts.since}`));
      process.exit(1);
    }
    filtered = filtered.filter((r) => new Date(r.timestamp) >= since);
  }

  if (opts.until) {
    const until = new Date(opts.until);
    if (Number.isNaN(until.getTime())) {
      console.log(pc.red(`  Invalid --until date: ${opts.until}`));
      process.exit(1);
    }
    filtered = filtered.filter((r) => new Date(r.timestamp) <= until);
  }

  if (opts.passedOnly) {
    filtered = filtered.filter((r) => r.tests.some((t) => t.passed));
  }

  return filtered;
}

export async function stats(opts: StatsOptions = {}): Promise<void> {
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

  const allResults: EnsembleResult[] = [];
  for (const file of files) {
    try {
      const raw = await readFile(join(".thinktank", file), "utf-8");
      allResults.push(parseAndValidateResult(raw, file));
    } catch (err) {
      console.warn(`  Skipping ${file}: ${(err as Error).message}`);
    }
  }

  const results = filterResults(allResults, opts);

  if (results.length === 0) {
    console.log(pc.yellow("  No runs match the specified filters."));
    return;
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

  const hasFilters = opts.model || opts.since || opts.until || opts.passedOnly;

  console.log();
  console.log(pc.bold("  thinktank stats"));
  console.log(pc.dim("  ─────────────────────────────"));
  if (hasFilters) {
    const parts: string[] = [];
    if (opts.model) parts.push(`model=${pc.cyan(opts.model)}`);
    if (opts.since) parts.push(`since=${pc.cyan(opts.since)}`);
    if (opts.until) parts.push(`until=${pc.cyan(opts.until)}`);
    if (opts.passedOnly) parts.push(pc.cyan("passed-only"));
    console.log(`  Filters:             ${parts.join(pc.dim(", "))}`);
  }
  console.log(`  Total runs:          ${pc.cyan(String(totalRuns))}`);
  console.log(`  Avg agents/run:      ${pc.cyan(avgAgents.toFixed(1))}`);
  console.log(`  Avg convergence:     ${pc.cyan((avgConvergence * 100).toFixed(1) + "%")}`);
  if (avgTestPass !== null) {
    console.log(`  Avg test pass rate:  ${pc.cyan((avgTestPass * 100).toFixed(1) + "%")}`);
  }
  console.log();
}
