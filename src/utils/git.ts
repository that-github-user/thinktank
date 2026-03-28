import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

export async function getRepoRoot(): Promise<string> {
  const { stdout } = await exec("git", ["rev-parse", "--show-toplevel"]);
  return stdout.trim();
}

export async function createWorktree(id: number): Promise<string> {
  const repoRoot = await getRepoRoot();
  const dir = await mkdtemp(join(tmpdir(), `thinktank-agent-${id}-`));
  const branchName = `thinktank/agent-${id}-${randomUUID().slice(0, 8)}`;

  await exec("git", ["worktree", "add", "-b", branchName, dir], {
    cwd: repoRoot,
  });

  return dir;
}

export async function removeWorktree(worktreePath: string): Promise<void> {
  const repoRoot = await getRepoRoot();
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
    // First add all changes so they show in the diff
    await exec("git", ["add", "-A"], { cwd: worktreePath });
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
    await exec("git", ["add", "-A"], { cwd: worktreePath });
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
  const repoRoot = await getRepoRoot();
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
