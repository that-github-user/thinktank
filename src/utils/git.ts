import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

export async function getRepoRoot(): Promise<string> {
  const { stdout } = await exec("git", ["rev-parse", "--show-toplevel"]);
  return stdout.trim();
}

/**
 * Returns the root of the main repository, even when called from inside a worktree.
 * This is necessary because git does not support nested worktrees.
 */
async function getMainRepoRoot(): Promise<string> {
  const { stdout } = await exec("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  // --git-common-dir returns /path/to/main-repo/.git for both worktrees and the main repo
  return dirname(stdout.trim());
}

export async function createWorktree(id: number): Promise<string> {
  const repoRoot = await getMainRepoRoot();
  const dir = await mkdtemp(join(tmpdir(), `thinktank-agent-${id}-`));

  // Use git clone instead of git worktree to create fully independent copies.
  // Worktrees share .git metadata with the main repo, allowing agents to discover
  // and interfere with the main repo (via .git pointer file, git -C commands, or
  // git worktree add --force). Clones are completely isolated — no shared state,
  // no metadata to corrupt, no path to the main repo.
  // Local clone uses hardlinks for objects (near-zero extra disk, ~0.1s).
  // Each clone has a fully independent .git directory — no shared metadata,
  // no alternates file pointing to parent, no worktree registration to corrupt.
  // Agents with Bash access cannot interfere with other clones or the main repo.
  await exec("git", ["clone", repoRoot, dir]);

  // Symlink node_modules from the main repo so tests and tools work in clones.
  const mainNodeModules = join(repoRoot, "node_modules");
  const cloneNodeModules = join(dir, "node_modules");
  try {
    const { lstat, symlink } = await import("node:fs/promises");
    await lstat(mainNodeModules);
    await symlink(mainNodeModules, cloneNodeModules, "junction");
  } catch {
    // No node_modules in main repo or symlink failed — not critical
  }

  return dir;
}

export async function removeWorktree(worktreePath: string): Promise<void> {
  // Remove node_modules symlink/junction BEFORE removing clone directory.
  // On Windows, rm -rf follows junctions and deletes the target.
  try {
    const nmPath = join(worktreePath, "node_modules");
    const { lstat, unlink } = await import("node:fs/promises");
    const stat = await lstat(nmPath);
    if (stat.isSymbolicLink() || stat.isDirectory()) {
      await unlink(nmPath).catch(() => {});
    }
  } catch {
    // No symlink to remove
  }

  // Since we use clones (not worktrees), just delete the directory.
  await rm(worktreePath, { recursive: true, force: true });
}

export async function getDiff(worktreePath: string): Promise<string> {
  const absPath = resolve(worktreePath);
  try {
    await exec("git", ["add", "-A"], { cwd: absPath });
    await exec("git", ["reset", "HEAD", "--", "node_modules"], { cwd: absPath }).catch(() => {});
    const { stdout } = await exec("git", ["diff", "--cached", "HEAD"], { cwd: absPath });
    return stdout;
  } catch (err) {
    console.warn(
      `[thinktank] getDiff failed for ${absPath}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return "";
  }
}

export async function getDiffStats(
  worktreePath: string,
): Promise<{ filesChanged: string[]; linesAdded: number; linesRemoved: number }> {
  const absPath = resolve(worktreePath);
  try {
    await exec("git", ["add", "-A"], { cwd: absPath });
    await exec("git", ["reset", "HEAD", "--", "node_modules"], { cwd: absPath }).catch(() => {});
    const { stdout } = await exec("git", ["diff", "--cached", "--stat", "HEAD"], {
      cwd: absPath,
    });

    const filesChanged: string[] = [];
    let linesAdded = 0;
    let linesRemoved = 0;

    for (const line of stdout.split("\n")) {
      const fileMatch = line.match(/^\s*(.+?)\s+\|\s+\d+/);
      if (fileMatch?.[1]) {
        filesChanged.push(fileMatch[1].trim());
      }
      const statsMatch = line.match(/(\d+) insertions?\(\+\)/);
      const removeMatch = line.match(/(\d+) deletions?\(-\)/);
      if (statsMatch?.[1]) linesAdded = parseInt(statsMatch[1], 10);
      if (removeMatch?.[1]) linesRemoved = parseInt(removeMatch[1], 10);
    }

    return { filesChanged, linesAdded, linesRemoved };
  } catch (err) {
    console.warn(
      `[thinktank] getDiffStats failed for ${absPath}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { filesChanged: [], linesAdded: 0, linesRemoved: 0 };
  }
}

/**
 * Estimate the size of the git repo in bytes using `git count-objects -v`.
 * Returns the sum of loose object size and pack size (a rough lower bound
 * for the size of a checked-out worktree).
 */
export async function estimateRepoSize(): Promise<number> {
  const { stdout } = await exec("git", ["count-objects", "-v"]);
  let sizeKB = 0;
  for (const line of stdout.split("\n")) {
    const match = line.match(/^(size|size-pack):\s+(\d+)/);
    if (match?.[2]) {
      sizeKB += parseInt(match[2], 10);
    }
  }
  return sizeKB * 1024;
}

export async function cleanupBranches(): Promise<void> {
  // With clone-based isolation (instead of worktrees), there are no
  // thinktank/* branches in the main repo. This function remains for
  // backward compatibility but is now a no-op.
}
