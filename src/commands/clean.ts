import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
import { promisify } from "node:util";
import pc from "picocolors";
import { cleanupBranches, getRepoRoot, removeWorktree } from "../utils/git.js";

const exec = promisify(execFile);

interface CleanOptions {
  all?: boolean;
}

/**
 * Parse `git worktree list` output and return paths of thinktank worktrees.
 */
export function parseThinktankWorktrees(worktreeOutput: string): string[] {
  const paths: string[] = [];
  for (const line of worktreeOutput.split("\n")) {
    // Each line: /path/to/worktree  <hash> [branch]
    const worktreePath = line.split(/\s+/)[0];
    if (worktreePath && /thinktank-agent/.test(worktreePath)) {
      paths.push(worktreePath);
    }
  }
  return paths;
}

export async function clean(opts: CleanOptions): Promise<void> {
  const repoRoot = await getRepoRoot();
  let removedCount = 0;

  // Step 1: List and remove thinktank worktrees
  console.log();
  console.log(pc.bold("  Cleaning thinktank worktrees..."));

  let worktrees: string[] = [];
  try {
    const { stdout } = await exec("git", ["worktree", "list"], { cwd: repoRoot });
    worktrees = parseThinktankWorktrees(stdout);
  } catch {
    console.log(pc.yellow("  Could not list worktrees."));
  }

  if (worktrees.length === 0) {
    console.log(pc.dim("  No thinktank worktrees found."));
  } else {
    for (const wt of worktrees) {
      try {
        await removeWorktree(wt);
        console.log(`  ${pc.green("✓")} Removed ${pc.dim(wt)}`);
        removedCount++;
      } catch {
        console.log(`  ${pc.yellow("!")} Failed to remove ${pc.dim(wt)}`);
      }
    }
  }

  // Step 2: Prune orphaned worktrees
  console.log(pc.bold("  Pruning orphaned worktrees..."));
  try {
    await exec("git", ["worktree", "prune"], { cwd: repoRoot });
    console.log(`  ${pc.green("✓")} Pruned`);
  } catch {
    console.log(pc.yellow("  Could not prune worktrees."));
  }

  // Step 3: Delete thinktank/* branches
  console.log(pc.bold("  Deleting thinktank/* branches..."));
  try {
    const { stdout } = await exec("git", ["branch", "--list", "thinktank/*"], { cwd: repoRoot });
    const branches = stdout
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean);
    if (branches.length === 0) {
      console.log(pc.dim("  No thinktank branches found."));
    } else {
      await cleanupBranches();
      console.log(
        `  ${pc.green("✓")} Deleted ${branches.length} branch${branches.length === 1 ? "" : "es"}`,
      );
    }
  } catch {
    console.log(pc.dim("  No thinktank branches found."));
  }

  // Step 4: Optionally delete .thinktank/ run history
  if (opts.all) {
    console.log(pc.bold("  Deleting .thinktank/ run history..."));
    try {
      await rm(".thinktank", { recursive: true, force: true });
      console.log(`  ${pc.green("✓")} Deleted .thinktank/`);
    } catch {
      console.log(pc.dim("  No .thinktank/ directory found."));
    }
  }

  // Summary
  console.log();
  console.log(
    pc.bold("  Done.") +
      (removedCount > 0
        ? ` Removed ${removedCount} worktree${removedCount === 1 ? "" : "s"}.`
        : " Nothing to clean up."),
  );
  console.log();
}
