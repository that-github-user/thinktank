import { mkdir, readFile, writeFile } from "node:fs/promises";
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

/**
 * Load the latest ensemble result from .thinktank/latest.json.
 * Returns null if the file doesn't exist or can't be parsed.
 */
export async function loadLatestResult(): Promise<EnsembleResult | null> {
  try {
    const data = await readFile(join(".thinktank", "latest.json"), "utf-8");
    return JSON.parse(data) as EnsembleResult;
  } catch {
    return null;
  }
}

/**
 * Identify agents from a previous result that failed (error or timeout).
 */
export function findFailedAgents(result: EnsembleResult): AgentResult[] {
  return result.agents.filter((a) => a.status === "error" || a.status === "timeout");
}

/**
 * Merge retried agent results back into the original result set,
 * replacing agents that were retried.
 */
export function mergeRetryResults(
  original: EnsembleResult,
  retriedAgents: AgentResult[],
): AgentResult[] {
  const retriedIds = new Set(retriedAgents.map((a) => a.id));
  return original.agents.map((a) => {
    if (retriedIds.has(a.id)) {
      const retried = retriedAgents.find((r) => r.id === a.id);
      return retried!;
    }
    return a;
  });
}

export async function retry(opts: RunOptions): Promise<void> {
  // Load previous result
  const previous = await loadLatestResult();
  if (!previous) {
    console.error("  No previous run found. Run 'thinktank run' first.");
    process.exit(1);
  }

  const failed = findFailedAgents(previous);
  if (failed.length === 0) {
    console.log("  All agents succeeded in the last run — nothing to retry.");
    return;
  }

  const failedIds = failed.map((a) => a.id);
  console.log();
  console.log(
    `  Retrying ${failed.length} failed agent(s): ${failedIds.map((id) => `#${id}`).join(", ")}`,
  );
  console.log(`  Prompt:   ${previous.prompt}`);
  console.log(`  Model:    ${previous.model}`);
  console.log();

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

  // Pre-flight validation (use previous prompt)
  const preflightError = await preflightValidation({
    ...opts,
    prompt: previous.prompt,
  });
  if (preflightError) {
    console.error(`  ${preflightError}`);
    process.exit(1);
  }

  // Clean up old worktrees
  await cleanupBranches().catch(() => {});

  // Phase 1: Create worktrees only for failed agents
  console.log("  Creating worktrees for failed agents...");
  const worktrees: Array<{ id: number; path: string }> = [];

  const handleSigint = () => {
    console.log("\n\n  Interrupted — cleaning up worktrees...");
    Promise.all(worktrees.map(({ path }) => removeWorktree(path).catch(() => {})))
      .then(() => cleanupBranches().catch(() => {}))
      .then(() => process.exit(130));
  };
  process.on("SIGINT", handleSigint);

  try {
    const worktreeResults = await Promise.all(
      failedIds.map((id) => createWorktree(id).then((path) => ({ id, path }))),
    );
    for (const wt of worktreeResults) {
      worktrees.push(wt);
      console.log(`    Agent #${wt.id}: ${wt.path}`);
    }
  } catch (err) {
    // Clean up any worktrees that were created before the failure
    console.error("  Failed to create worktrees — cleaning up...");
    await Promise.all(worktrees.map(({ path }) => removeWorktree(path).catch(() => {})));
    await cleanupBranches().catch(() => {});
    process.removeListener("SIGINT", handleSigint);
    throw err;
  }
  console.log();

  // Phase 2: Re-run failed agents with original prompt
  console.log(`  Re-running ${failed.length} agent(s) in parallel (${runner.name})...`);
  console.log();

  const agentPromises = worktrees.map(({ id, path }) =>
    runner.run(id, {
      prompt: previous.prompt,
      worktreePath: path,
      model: previous.model,
      timeout: opts.timeout,
      verbose: opts.verbose,
    }),
  );

  const retriedAgents: AgentResult[] = await Promise.all(agentPromises);

  for (const agent of retriedAgents) {
    const icon = agent.status === "success" ? "✓" : agent.status === "timeout" ? "⏱" : "✗";
    const files = agent.filesChanged.length;
    console.log(
      `    Agent #${agent.id}: ${icon} ${agent.status} — ${files} files changed in ${Math.round(agent.duration / 1000)}s`,
    );
  }
  console.log();

  // Phase 3: Merge retried agents back into original results
  const mergedAgents = mergeRetryResults(previous, retriedAgents);

  // Phase 4: Run tests — always discard stale test results for retried agents,
  // since they now have different code regardless of whether --test-cmd is provided.
  const retriedIdSet = new Set(failedIds);
  const testResults = previous.tests.filter((t) => !retriedIdSet.has(t.agentId));

  if (opts.testCmd) {
    console.log(`  Running tests: ${opts.testCmd}`);
    const testTimeoutMs = opts.testTimeout * 1000;

    // Run tests only on retried agents' worktrees
    const retryTestPromises = worktrees.map(({ id, path }) =>
      runTests(id, opts.testCmd!, path, testTimeoutMs),
    );
    const retryTestResults = await Promise.all(retryTestPromises);
    testResults.push(...retryTestResults);

    for (const test of retryTestResults) {
      const icon = test.passed ? "✓" : "✗";
      console.log(`    Agent #${test.agentId}: ${icon} tests ${test.passed ? "passed" : "failed"}`);
    }
    console.log();
  }

  // Phase 5: Convergence analysis on full merged set
  const convergence = analyzeConvergence(mergedAgents, opts.threshold);

  // Phase 6: Recommendation
  const { recommended: weightedRec, scores } = recommend(mergedAgents, testResults, convergence);
  const copeland = copelandRecommend(mergedAgents, testResults, convergence);

  const recommended = opts.scoring === "copeland" ? copeland.recommended : weightedRec;

  // Build result object
  const result: EnsembleResult = {
    prompt: previous.prompt,
    model: previous.model,
    timestamp: new Date().toISOString(),
    scoring: opts.scoring,
    agents: mergedAgents,
    tests: testResults,
    convergence,
    recommended,
    scores,
    copelandScores: copeland.scores,
  };

  // Display results
  if (opts.outputFormat === "json") {
    console.log(JSON.stringify(result));
  } else {
    displayResults(result);
    displayApplyInstructions(result);
  }

  // Save result
  await saveResult(result);

  process.removeListener("SIGINT", handleSigint);
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

  try {
    const worktreeResults = await Promise.all(
      Array.from({ length: opts.attempts }, (_, i) =>
        createWorktree(i + 1).then((path) => ({ id: i + 1, path })),
      ),
    );
    for (const wt of worktreeResults) {
      worktrees.push(wt);
      console.log(`    Agent #${wt.id}: ${wt.path}`);
    }
  } catch (err) {
    console.error("  Failed to create worktrees — cleaning up...");
    await Promise.all(worktrees.map(({ path }) => removeWorktree(path).catch(() => {})));
    await cleanupBranches().catch(() => {});
    process.removeListener("SIGINT", handleSigint);
    throw err;
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
  if (opts.outputFormat === "json") {
    console.log(JSON.stringify(result));
  } else {
    displayResults(result);
    displayApplyInstructions(result);
  }

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
