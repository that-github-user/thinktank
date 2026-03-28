import { spawn } from "node:child_process";
import type { AgentResult } from "../types.js";
import { getDiff, getDiffStats } from "../utils/git.js";

export async function runClaudeAgent(
  id: number,
  prompt: string,
  worktreePath: string,
  model: string,
  timeout: number,
  verbose: boolean,
): Promise<AgentResult> {
  const start = Date.now();

  return new Promise((resolve) => {
    let output = "";
    let error = "";
    let settled = false;

    const args = [
      "-p",
      prompt,
      "--output-format",
      "text",
      "--model",
      model,
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
      cwd: worktreePath,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    child.stdout.on("data", (data: Buffer) => {
      const chunk = data.toString();
      output += chunk;
      if (verbose) {
        process.stdout.write(`  [agent ${id}] ${chunk}`);
      }
    });

    child.stderr.on("data", (data: Buffer) => {
      error += data.toString();
    });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill("SIGTERM");
        resolve({
          id,
          worktree: worktreePath,
          status: "timeout",
          exitCode: -1,
          duration: Date.now() - start,
          output,
          error: `Timed out after ${timeout}s`,
          diff: "",
          filesChanged: [],
          linesAdded: 0,
          linesRemoved: 0,
        });
      }
    }, timeout * 1000);

    child.on("close", async (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;

      const duration = Date.now() - start;
      const diff = await getDiff(worktreePath);
      const stats = await getDiffStats(worktreePath);

      resolve({
        id,
        worktree: worktreePath,
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
      clearTimeout(timer);
      if (settled) return;
      settled = true;

      resolve({
        id,
        worktree: worktreePath,
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
}
