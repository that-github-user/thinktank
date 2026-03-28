import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const exec = promisify(execFile);

export async function getRepoRoot(): Promise<string> {
  const { stdout } = await exec("git", ["rev-parse", "--show-toplevel"]);
  return stdout.trim();
}

export async function getCurrentBranch(): Promise<string> {
  const { stdout } = await exec("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  return stdout.trim();
}

export async function createWorktree(id: number): Promise<string> {
  const repoRoot = await getRepoRoot();
  const dir = await mkdtemp(join(tmpdir(), `thinktank-agent-${id}-`));
  const branchName = `thinktank/agent-${id}-${Date.now()}`;

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
    const { stdout } = await exec("git", ["diff", "HEAD"], {
      cwd: worktreePath,
    });
    return stdout;
  } catch {
    return "";
  }
}

export async function getDiffStats(
  worktreePath: string
): Promise<{ filesChanged: string[]; linesAdded: number; linesRemoved: number }> {
  try {
    const { stdout } = await exec("git", ["diff", "--stat", "HEAD"], {
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
  } catch {
    return { filesChanged: [], linesAdded: 0, linesRemoved: 0 };
  }
}

export async function applyDiff(
  diff: string,
  targetDir: string
): Promise<void> {
  const { execFile: execFileCb } = await import("node:child_process");
  const child = execFileCb("git", ["apply", "--3way", "-"], {
    cwd: targetDir,
  });
  child.stdin?.write(diff);
  child.stdin?.end();
  await new Promise<void>((resolve, reject) => {
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git apply failed with code ${code}`));
    });
  });
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
