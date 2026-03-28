import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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
  const branchName = `thinktank/agent-${id}-${randomUUID().slice(0, 8)}`;

  await exec("git", ["worktree", "add", "-b", branchName, dir], {
    cwd: repoRoot,
  });

  // Symlink node_modules from the main repo so tests and tools work in worktrees.
  // Git worktrees don't include gitignored directories like node_modules.
  const mainNodeModules = join(repoRoot, "node_modules");
  const worktreeNodeModules = join(dir, "node_modules");
  try {
    const { lstat, symlink } = await import("node:fs/promises");
    await lstat(mainNodeModules);
    await symlink(mainNodeModules, worktreeNodeModules, "junction");
  } catch {
    // No node_modules in main repo or symlink failed — not critical
  }

  return dir;
}

export async function removeWorktree(worktreePath: string): Promise<void> {
  const repoRoot = await getMainRepoRoot();

  // Remove node_modules symlink/junction BEFORE removing worktree.
  // On Windows, rm -rf follows junctions and deletes the target.
  try {
    const nmPath = join(worktreePath, "node_modules");
    const { lstat, unlink } = await import("node:fs/promises");
    const stat = await lstat(nmPath);
    if (stat.isSymbolicLink() || stat.isDirectory()) {
      // unlink removes the junction/symlink without following it
      await unlink(nmPath).catch(() => {});
    }
  } catch {
    // No symlink to remove
  }

  try {
    await exec("git", ["worktree", "remove", worktreePath, "--force"], {
      cwd: repoRoot,
    });
  } catch {
    // Fallback: remove directory manually and prune
    await rm(worktreePath, { recursive: true, force: true });
    await exec("git", ["worktree", "prune"], { cwd: repoRoot });
  }
}

export async function getDiff(worktreePath: string): Promise<string> {
  try {
    // Include both staged and unstaged changes relative to HEAD
    // Exclude node_modules symlink (created by createWorktree for tool access)
    await exec("git", ["add", "-A", "--", ".", ":!node_modules"], { cwd: worktreePath });
    const { stdout } = await exec("git", ["diff", "--cached", "HEAD"], {
      cwd: worktreePath,
    });
    return stdout;
  } catch (err) {
    console.warn(
      `[thinktank] getDiff failed for worktree ${worktreePath}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return "";
  }
}

export async function getDiffStats(
  worktreePath: string,
): Promise<{ filesChanged: string[]; linesAdded: number; linesRemoved: number }> {
  try {
    await exec("git", ["add", "-A", "--", ".", ":!node_modules"], { cwd: worktreePath });
    const { stdout } = await exec("git", ["diff", "--cached", "--stat", "HEAD"], {
      cwd: worktreePath,
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
      `[thinktank] getDiffStats failed for worktree ${worktreePath}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { filesChanged: [], linesAdded: 0, linesRemoved: 0 };
  }
}

export async function cleanupBranches(): Promise<void> {
  const repoRoot = await getMainRepoRoot();
  const { stdout } = await exec("git", ["branch", "--list", "thinktank/*"], {
    cwd: repoRoot,
  });
  for (const branch of stdout.split("\n").filter(Boolean)) {
    const name = branch.trim();
    try {
      await exec("git", ["branch", "-D", name], { cwd: repoRoot });
    } catch {
      // ignore
    }
  }
}
