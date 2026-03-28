import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import pc from "picocolors";
import type { EnsembleResult } from "../types.js";
import { cleanupBranches, getRepoRoot, removeWorktree } from "../utils/git.js";

const exec = promisify(execFile);

export interface ApplyOptions {
  agent?: number;
  preview?: boolean;
  dryRun?: boolean;
}

export async function isWorkingTreeClean(): Promise<boolean> {
  const repoRoot = await getRepoRoot();
  const { stdout } = await exec("git", ["status", "--porcelain"], { cwd: repoRoot });
  return stdout.trim() === "";
}

export async function apply(opts: ApplyOptions): Promise<void> {
  // Check for clean working tree before applying
  const isPreviewOnly = opts.preview || opts.dryRun;
  if (!isPreviewOnly) {
    const clean = await isWorkingTreeClean();
    if (!clean) {
      console.error("  Your working tree has uncommitted changes.");
      console.error("  Please commit or stash them before running `thinktank apply`.");
      console.error();
      console.error("  Quick fix:");
      console.error("    git stash        # stash changes temporarily");
      console.error("    thinktank apply  # apply agent changes");
      console.error("    git stash pop    # restore your changes");
      process.exit(1);
    }
  }

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
    console.error(`  Available agents: ${result.agents.map((a) => `#${a.id}`).join(", ")}`);
    process.exit(1);
  }

  if (agent.status !== "success" || !agent.diff) {
    console.error(`  Agent #${agentId} has no changes to apply (status: ${agent.status}).`);
    process.exit(1);
  }

  // Preview / dry-run mode: show diff and exit
  if (opts.preview || opts.dryRun) {
    const label = opts.dryRun ? "Dry run" : "Preview";
    console.log();
    console.log(pc.bold(`  ${label} — Agent #${agentId} diff:`));
    console.log(pc.dim("  " + "─".repeat(58)));
    console.log();
    for (const line of agent.diff.split("\n")) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        console.log(pc.green(`  ${line}`));
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        console.log(pc.red(`  ${line}`));
      } else if (line.startsWith("@@")) {
        console.log(pc.cyan(`  ${line}`));
      } else {
        console.log(pc.dim(`  ${line}`));
      }
    }
    console.log();
    console.log(`  Files: ${agent.filesChanged.join(", ")}`);
    console.log(`  Changes: +${agent.linesAdded}/-${agent.linesRemoved}`);
    console.log();
    console.log(
      pc.dim("  To apply: thinktank apply" + (opts.agent ? ` --agent ${opts.agent}` : "")),
    );
    console.log();
    return;
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
