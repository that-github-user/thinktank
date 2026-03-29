import { readFile } from "node:fs/promises";
import { join } from "node:path";
import pc from "picocolors";
import { diffSimilarity, parseDiff } from "../scoring/diff-parser.js";
import type { AgentResult, EnsembleResult } from "../types.js";

interface CompareOptions {
  agentA: number;
  agentB: number;
}

export async function compare(opts: CompareOptions): Promise<void> {
  let result: EnsembleResult;
  try {
    const raw = await readFile(join(".thinktank", "latest.json"), "utf-8");
    result = JSON.parse(raw);
  } catch {
    console.error("  No results found. Run `thinktank run` first.");
    process.exit(1);
  }

  const agentA = result.agents.find((a) => a.id === opts.agentA);
  const agentB = result.agents.find((a) => a.id === opts.agentB);

  if (!agentA) {
    console.error(`  Agent #${opts.agentA} not found.`);
    console.error(`  Available: ${result.agents.map((a) => `#${a.id}`).join(", ")}`);
    process.exit(1);
  }
  if (!agentB) {
    console.error(`  Agent #${opts.agentB} not found.`);
    console.error(`  Available: ${result.agents.map((a) => `#${a.id}`).join(", ")}`);
    process.exit(1);
  }

  console.log();
  console.log(pc.bold(`  Comparing Agent #${opts.agentA} vs Agent #${opts.agentB}`));
  console.log(pc.dim("  " + "─".repeat(58)));
  console.log();

  // Summary table
  printAgentSummary(agentA, result);
  printAgentSummary(agentB, result);
  console.log();

  // Similarity score
  const sim = diffSimilarity(agentA.diff, agentB.diff);
  const pct = Math.round(sim * 100);
  const bar = "█".repeat(Math.round(pct / 5)) + "░".repeat(20 - Math.round(pct / 5));
  console.log(`  Similarity: ${bar} ${pct}%`);
  console.log();

  // File comparison
  const filesA = new Set(agentA.filesChanged);
  const filesB = new Set(agentB.filesChanged);
  const allFiles = new Set([...filesA, ...filesB]);

  console.log(pc.bold("  Files changed:"));
  for (const file of [...allFiles].sort()) {
    const inA = filesA.has(file);
    const inB = filesB.has(file);
    if (inA && inB) {
      console.log(`    ${pc.green("both")}  ${file}`);
    } else if (inA) {
      console.log(`    ${pc.cyan(`#${opts.agentA} only`)}  ${file}`);
    } else {
      console.log(`    ${pc.yellow(`#${opts.agentB} only`)}  ${file}`);
    }
  }
  console.log();

  // Unique lines comparison
  const parsedA = parseDiff(agentA.diff);
  const parsedB = parseDiff(agentB.diff);
  const linesA = new Set(parsedA.flatMap((f) => f.addedLines.map((l) => `${f.path}:${l.trim()}`)));
  const linesB = new Set(parsedB.flatMap((f) => f.addedLines.map((l) => `${f.path}:${l.trim()}`)));

  let shared = 0;
  let onlyA = 0;
  let onlyB = 0;
  for (const line of linesA) {
    if (linesB.has(line)) shared++;
    else onlyA++;
  }
  for (const line of linesB) {
    if (!linesA.has(line)) onlyB++;
  }

  console.log(pc.bold("  Added lines:"));
  console.log(`    Shared:        ${shared}`);
  console.log(`    Only #${opts.agentA}:      ${onlyA}`);
  console.log(`    Only #${opts.agentB}:      ${onlyB}`);
  console.log();
}

function printAgentSummary(agent: AgentResult, result: EnsembleResult): void {
  const test = result.tests.find((t) => t.agentId === agent.id);
  const testStr = test ? (test.passed ? pc.green("pass") : pc.red("fail")) : pc.dim("n/a");
  const rec = result.recommended === agent.id ? pc.cyan(" (recommended)") : "";
  console.log(
    `  Agent #${agent.id}${rec}: ${agent.status} | tests: ${testStr} | +${agent.linesAdded}/-${agent.linesRemoved} | ${agent.filesChanged.length} files`,
  );
}
