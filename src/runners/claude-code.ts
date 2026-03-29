import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AgentResult } from "../types.js";
import { getDiff, getDiffStats } from "../utils/git.js";
import type { Runner, RunnerOptions } from "./base.js";

async function isClaudeInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("claude", ["--version"], { stdio: "ignore" });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

export const claudeCodeRunner: Runner = {
  name: "claude-code",
  description: "Claude Code CLI (claude -p)",

  available: isClaudeInstalled,

  async run(id: number, opts: RunnerOptions): Promise<AgentResult> {
    const start = Date.now();

    // Backup the .git pointer file. Agents can delete it via Bash/Write tools.
    // The lock (in createWorktree) protects the metadata directory in .git/worktrees/,
    // but we also need to restore the pointer file if the agent removed it.
    const gitFilePath = join(opts.worktreePath, ".git");
    let gitFileBackup: string | null = null;
    try {
      gitFileBackup = await readFile(gitFilePath, "utf-8");
    } catch {
      // Not a worktree or .git is a directory
    }

    return new Promise((resolve) => {
      let output = "";
      let error = "";
      let settled = false;

      const args = [
        "-p",
        opts.prompt,
        "--output-format",
        "text",
        "--model",
        opts.model,
        "--max-turns",
        "50",
        "--allowedTools",
        "Edit",
        "Write",
        "Read",
        "Glob",
        "Grep",
        "Bash",
      ];

      const child = spawn("claude", args, {
        cwd: opts.worktreePath,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          // Disable git auto-gc to prevent worktree pruning during parallel agent runs.
          // When gc --auto triggers, it calls "git worktree prune" which can delete
          // metadata for other concurrent agents' worktrees.
          GIT_CONFIG_COUNT: "1",
          GIT_CONFIG_KEY_0: "gc.auto",
          GIT_CONFIG_VALUE_0: "0",
        },
      });

      child.stdout.on("data", (data: Buffer) => {
        const chunk = data.toString();
        output += chunk;
        if (opts.verbose) {
          process.stdout.write(`  [agent ${id}] ${chunk}`);
        }
      });

      child.stderr.on("data", (data: Buffer) => {
        error += data.toString();
      });

      const timer =
        opts.timeout > 0
          ? setTimeout(() => {
              if (!settled) {
                settled = true;
                child.kill("SIGTERM");
                resolve({
                  id,
                  worktree: opts.worktreePath,
                  status: "timeout",
                  exitCode: -1,
                  duration: Date.now() - start,
                  output,
                  error: `Timed out after ${opts.timeout}s`,
                  diff: "",
                  filesChanged: [],
                  linesAdded: 0,
                  linesRemoved: 0,
                });
              }
            }, opts.timeout * 1000)
          : null;

      child.on("close", async (code) => {
        if (timer) clearTimeout(timer);
        if (settled) return;
        settled = true;

        // Restore .git pointer file if the agent deleted it during execution.
        // The worktree lock protects .git/worktrees/NAME/ from gc pruning,
        // but the agent can still delete the .git file in its own directory.
        if (gitFileBackup) {
          try {
            await readFile(gitFilePath, "utf-8");
          } catch {
            await writeFile(gitFilePath, gitFileBackup).catch(() => {});
          }
        }

        const duration = Date.now() - start;
        const diff = await getDiff(opts.worktreePath);
        const stats = await getDiffStats(opts.worktreePath);

        resolve({
          id,
          worktree: opts.worktreePath,
          status: code === 0 ? "success" : "error",
          exitCode: code ?? 1,
          duration,
          output,
          error: error || undefined,
          diff,
          ...stats,
        });
      });

      child.on("error", (err) => {
        if (timer) clearTimeout(timer);
        if (settled) return;
        settled = true;

        resolve({
          id,
          worktree: opts.worktreePath,
          status: "error",
          exitCode: -1,
          duration: Date.now() - start,
          output,
          error: err.message,
          diff: "",
          filesChanged: [],
          linesAdded: 0,
          linesRemoved: 0,
        });
      });
    });
  },
};
