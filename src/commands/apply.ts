import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import pc from "picocolors";
import type { EnsembleResult } from "../types.js";
import { cleanupBranches, getRepoRoot, removeWorktree } from "../utils/git.js";

const exec = promisify(execFile);

export interface ConflictInfo {
  appliedFiles: string[];
  conflictedFiles: string[];
}

/** Parse git apply --3way stderr to extract applied/conflicted file lists. */
export function parseApplyConflicts(stderr: string): ConflictInfo {
  const conflictedFiles: string[] = [];
  const appliedFiles: string[] = [];
  for (const line of stderr.split("\n")) {
    const patchMatch = line.match(/Applied patch to '([^']+)'/);
    if (patchMatch) {
      const file = patchMatch[1];
      if (line.includes("with conflicts")) {
        if (!conflictedFiles.includes(file)) {
          conflictedFiles.push(file);
        }
      } else if (!appliedFiles.includes(file)) {
        appliedFiles.push(file);
      }
      continue;
    }
    const failMatch = line.match(/^error: patch failed: ([^:]+)/);
    if (failMatch && !conflictedFiles.includes(failMatch[1])) {
      conflictedFiles.push(failMatch[1]);
    }
  }
  return { appliedFiles, conflictedFiles };
}

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

    // Save patch for undo
    const patchDir = join(repoRoot, ".thinktank");
    await mkdir(patchDir, { recursive: true });
    await writeFile(join(patchDir, "last-applied.patch"), agent.diff, "utf-8");

    console.log("  Changes applied successfully.");
  } catch (err: unknown) {
    const e = err as { stderr?: string; stdout?: string };
    const stderr = e.stderr ?? "";
    const { appliedFiles, conflictedFiles } = parseApplyConflicts(stderr);

    console.error();
    console.error(pc.bold(pc.red("  Apply failed — conflicts detected")));
    console.error(pc.dim("  " + "─".repeat(58)));
    console.error();

    if (appliedFiles.length > 0) {
      console.error(pc.green("  Applied cleanly:"));
      for (const f of appliedFiles) {
        console.error(pc.green(`    ✓ ${f}`));
      }
      console.error();
    }

    if (conflictedFiles.length > 0) {
      console.error(pc.red("  Conflicted:"));
      for (const f of conflictedFiles) {
        console.error(pc.red(`    ✗ ${f}`));
      }
      console.error();
    }

    // If we couldn't parse any files, show the raw stderr
    if (conflictedFiles.length === 0 && appliedFiles.length === 0 && stderr.trim()) {
      console.error(pc.dim(`  ${stderr.trim()}`));
      console.error();
    }

    const otherAgents = result.agents
      .filter((a) => a.id !== agentId && a.status === "success" && a.diff)
      .map((a) => `#${a.id}`);

    console.error("  Next steps:");
    if (otherAgents.length > 0) {
      console.error(
        `    • Try a different agent: thinktank apply --agent ${otherAgents[0].slice(1)}`,
      );
    }
    console.error(`    • Inspect the diff first: thinktank apply --preview --agent ${agentId}`);
    console.error("    • Manually merge from the worktree:");
    console.error(pc.dim(`        ${agent.worktree}`));
    if (conflictedFiles.length > 0 && appliedFiles.length > 0) {
      console.error("    • Resolve conflict markers in your working tree:");
      console.error(pc.dim("        git diff   # review conflict markers"));
      console.error(pc.dim("        git checkout --conflict=merge <file>   # re-create markers"));
    }
    console.error();
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
