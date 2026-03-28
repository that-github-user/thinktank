import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getDefaultRunner, getRunner } from "../runners/registry.js";
import { analyzeConvergence, copelandRecommend, recommend } from "../scoring/convergence.js";
import { runTests, validateTestCommand } from "../scoring/test-runner.js";
import type { AgentResult, EnsembleResult, RunOptions } from "../types.js";
import { displayApplyInstructions, displayHeader, displayResults } from "../utils/display.js";
import { cleanupBranches, createWorktree, getRepoRoot, removeWorktree } from "../utils/git.js";

/**
 * Pre-flight validation before spawning agents.
 * Returns an error message if validation fails, or null if everything is OK.
 */
export async function preflightValidation(opts: RunOptions): Promise<string | null> {
  // Check: current directory is a git repo with an accessible working tree
  try {
    await getRepoRoot();
  } catch {
    return "Not a git repository. Run this command from inside a git repo.";
  }

  // Check: test command is valid (if specified)
  if (opts.testCmd) {
    const testError = validateTestCommand(opts.testCmd);
    if (testError) {
      return `Invalid --test-cmd: ${testError}`;
    }
  }

  return null;
}

export async function run(opts: RunOptions): Promise<void> {
  displayHeader(opts.prompt, opts.attempts, opts.model);

  // Resolve runner
  const runner = opts.runner ? getRunner(opts.runner) : getDefaultRunner();
  if (!runner) {
    console.error(`  Unknown runner: ${opts.runner}`);
    console.error("  Available runners: claude-code");
    process.exit(1);
  }

  const isAvailable = await runner.available();
  if (!isAvailable) {
    console.error(
      `  Runner "${runner.name}" is not available. Is ${runner.description} installed?`,
    );
    process.exit(1);
  }

  // Pre-flight validation
  const preflightError = await preflightValidation(opts);
  if (preflightError) {
    console.error(`  ${preflightError}`);
    process.exit(1);
  }

  // Clean up any leftover worktrees/branches from previous runs
  await cleanupBranches().catch(() => {});

  // Phase 1: Create worktrees
  console.log("  Creating worktrees...");
  const worktrees: Array<{ id: number; path: string }> = [];

  // Graceful Ctrl+C: clean up all worktrees created so far, then exit.
  // Registered before worktree creation so any interrupt is handled.
  const handleSigint = () => {
    console.log("\n\n  Interrupted — cleaning up worktrees...");
    Promise.all(worktrees.map(({ path }) => removeWorktree(path).catch(() => {})))
      .then(() => cleanupBranches().catch(() => {}))
      .then(() => process.exit(130));
  };
  process.on("SIGINT", handleSigint);

  for (let i = 1; i <= opts.attempts; i++) {
    const path = await createWorktree(i);
    worktrees.push({ id: i, path });
    console.log(`    Agent #${i}: ${path}`);
  }
  console.log();

  // Phase 2: Run agents in parallel
  console.log(`  Running ${opts.attempts} agents in parallel (${runner.name})...`);
  console.log();

  const agentPromises = worktrees.map(({ id, path }) =>
    runner.run(id, {
      prompt: opts.prompt,
      worktreePath: path,
      model: opts.model,
      timeout: opts.timeout,
      verbose: opts.verbose,
    }),
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
    const testTimeoutMs = opts.testTimeout * 1000;
    const testPromises = worktrees.map(({ id, path }) =>
      runTests(id, opts.testCmd!, path, testTimeoutMs),
    );
    testResults = await Promise.all(testPromises);

    for (const test of testResults) {
      const icon = test.passed ? "✓" : "✗";
      console.log(`    Agent #${test.agentId}: ${icon} tests ${test.passed ? "passed" : "failed"}`);
    }
    console.log();
  }

  // Phase 4: Convergence analysis
  const convergence = analyzeConvergence(agents, opts.threshold);

  // Phase 5: Recommendation
  const { recommended: weightedRec, scores } = recommend(agents, testResults, convergence);
  const copeland = copelandRecommend(agents, testResults, convergence);

  const recommended = opts.scoring === "copeland" ? copeland.recommended : weightedRec;

  // Build result object
  const result: EnsembleResult = {
    prompt: opts.prompt,
    model: opts.model,
    timestamp: new Date().toISOString(),
    scoring: opts.scoring,
    agents,
    tests: testResults,
    convergence,
    recommended,
    scores,
    copelandScores: copeland.scores,
  };

  // Display results
  displayResults(result);
  displayApplyInstructions(result);

  // Save result to .thinktank/
  await saveResult(result);

  // Deregister SIGINT handler — run completed normally, no cleanup needed.
  process.removeListener("SIGINT", handleSigint);

  // Note: we intentionally do NOT clean up worktrees here so the user
  // can inspect them. They get cleaned up on next run.
}

export function makeResultFilename(timestamp: string): string {
  const safe = timestamp.replace(/[:.]/g, "-");
  return `run-${safe}.json`;
}

async function saveResult(result: EnsembleResult): Promise<void> {
  const dir = ".thinktank";
  await mkdir(dir, { recursive: true });

  // Strip agent stdout/stderr from saved results to avoid credential exposure
  const sanitizedResult = {
    ...result,
    agents: result.agents.map((a) => ({
      ...a,
      output: a.output ? "[redacted — use worktree to inspect]" : "",
      error: a.error ? "[redacted]" : undefined,
    })),
  };

  // Save full result with restricted permissions (owner read/write only)
  const filename = makeResultFilename(result.timestamp);
  await writeFile(join(dir, filename), JSON.stringify(sanitizedResult, null, 2), { mode: 0o600 });

  // Save as latest
  await writeFile(join(dir, "latest.json"), JSON.stringify(sanitizedResult, null, 2), {
    mode: 0o600,
  });

  console.log(`  Results saved to ${join(dir, filename)}`);
  console.log();
}
