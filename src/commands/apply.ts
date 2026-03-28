import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { EnsembleResult } from "../types.js";
import { removeWorktree, cleanupBranches, getRepoRoot } from "../utils/git.js";

const exec = promisify(execFile);

export interface ApplyOptions {
  agent?: number;
}

export async function apply(opts: ApplyOptions): Promise<void> {
  // Load latest result
  let result: EnsembleResult;
  try {
    const raw = await readFile(join(".thinktank", "latest.json"), "utf-8");
    result = JSON.parse(raw);
  } catch {
    console.error("  No results found. Run `thinktank run` first.");
    process.exit(1);
  }

  // Determine which agent to apply
  const agentId = opts.agent ?? result.recommended;
  if (agentId === null || agentId === undefined) {
    console.error("  No recommended agent and no --agent specified.");
    process.exit(1);
  }

  const agent = result.agents.find((a) => a.id === agentId);
  if (!agent) {
    console.error(`  Agent #${agentId} not found in results.`);
    console.error(
      `  Available agents: ${result.agents.map((a) => `#${a.id}`).join(", ")}`
    );
    process.exit(1);
  }

  if (agent.status !== "success" || !agent.diff) {
    console.error(`  Agent #${agentId} has no changes to apply (status: ${agent.status}).`);
    process.exit(1);
  }

  // Apply the diff
  const repoRoot = await getRepoRoot();
  console.log(`  Applying changes from Agent #${agentId}...`);

  try {
    const child = exec("git", ["apply", "--3way", "-"], { cwd: repoRoot });
    child.child.stdin?.write(agent.diff);
    child.child.stdin?.end();
    await child;
    console.log("  Changes applied successfully.");
  } catch (err: unknown) {
    const e = err as { stderr?: string };
    console.error("  Failed to apply diff. There may be conflicts.");
    if (e.stderr) console.error(`  ${e.stderr}`);
    console.error(`  You can manually inspect the diff at: ${agent.worktree}`);
    process.exit(1);
  }

  // Clean up worktrees
  console.log("  Cleaning up worktrees...");
  for (const a of result.agents) {
    try {
      await removeWorktree(a.worktree);
    } catch {
      // Best effort cleanup
    }
  }
  await cleanupBranches().catch(() => {});

  console.log("  Done. Worktrees cleaned up.");
  console.log();
  console.log("  Review the changes with: git diff");
  console.log("  Commit when ready: git add -A && git commit");
  console.log();
}
