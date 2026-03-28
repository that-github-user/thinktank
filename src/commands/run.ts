import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runClaudeAgent } from "../runners/claude-code.js";
import { analyzeConvergence, recommend } from "../scoring/convergence.js";
import { runTests } from "../scoring/test-runner.js";
import type { AgentResult, EnsembleResult, RunOptions } from "../types.js";
import { displayApplyInstructions, displayHeader, displayResults } from "../utils/display.js";
import { cleanupBranches, createWorktree, removeWorktree } from "../utils/git.js";

export async function run(opts: RunOptions): Promise<void> {
  displayHeader(opts.prompt, opts.attempts, opts.model);

  // Clean up any leftover worktrees/branches from previous runs
  await cleanupBranches().catch(() => {});

  // Phase 1: Create worktrees
  console.log("  Creating worktrees...");
  const worktrees: Array<{ id: number; path: string }> = [];

  for (let i = 1; i <= opts.attempts; i++) {
    const path = await createWorktree(i);
    worktrees.push({ id: i, path });
    console.log(`    Agent #${i}: ${path}`);
  }
  console.log();

  // Phase 2: Run agents in parallel
  console.log(`  Running ${opts.attempts} agents in parallel...`);
  console.log();

  const agentPromises = worktrees.map(({ id, path }) =>
    runClaudeAgent(id, opts.prompt, path, opts.model, opts.timeout, opts.verbose),
  );

  const agents: AgentResult[] = await Promise.all(agentPromises);

  // Report completion
  for (const agent of agents) {
    const icon = agent.status === "success" ? "✓" : agent.status === "timeout" ? "⏱" : "✗";
    const files = agent.filesChanged.length;
    console.log(
      `    Agent #${agent.id}: ${icon} ${agent.status} — ${files} files changed in ${Math.round(agent.duration / 1000)}s`,
    );
  }
  console.log();

  // Phase 3: Run tests (if test command provided)
  let testResults: Array<{ agentId: number; passed: boolean; output: string; exitCode: number }> =
    [];

  if (opts.testCmd) {
    console.log(`  Running tests: ${opts.testCmd}`);
    const testPromises = worktrees.map(({ id, path }) => runTests(id, opts.testCmd!, path));
    testResults = await Promise.all(testPromises);

    for (const test of testResults) {
      const icon = test.passed ? "✓" : "✗";
      console.log(`    Agent #${test.agentId}: ${icon} tests ${test.passed ? "passed" : "failed"}`);
    }
    console.log();
  }

  // Phase 4: Convergence analysis
  const convergence = analyzeConvergence(agents);

  // Phase 5: Recommendation
  const recommended = recommend(agents, testResults, convergence);

  // Build result object
  const result: EnsembleResult = {
    prompt: opts.prompt,
    model: opts.model,
    timestamp: new Date().toISOString(),
    agents,
    tests: testResults,
    convergence,
    recommended,
  };

  // Display results
  displayResults(result);
  displayApplyInstructions(result);

  // Save result to .thinktank/
  await saveResult(result);

  // Note: we intentionally do NOT clean up worktrees here so the user
  // can inspect them. They get cleaned up on next run.
}

async function saveResult(result: EnsembleResult): Promise<void> {
  const dir = ".thinktank";
  await mkdir(dir, { recursive: true });

  // Save full result
  const filename = `run-${result.timestamp.replace(/[:.]/g, "-")}.json`;
  await writeFile(join(dir, filename), JSON.stringify(result, null, 2));

  // Save as latest
  await writeFile(join(dir, "latest.json"), JSON.stringify(result, null, 2));

  console.log(`  Results saved to ${join(dir, filename)}`);
  console.log();
}
