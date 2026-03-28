import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { TestResult } from "../types.js";

const exec = promisify(execFile);

const TEST_TIMEOUT_MS = 120_000;

/**
 * Parse a test command string into command + args.
 * Handles simple quoting: `npm test`, `python -m pytest`, `go test ./...`
 */
export function parseTestCommand(testCmd: string): { cmd: string; args: string[] } {
  const parts = testCmd.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const cmd = parts[0]?.replace(/"/g, "") ?? "";
  const args = parts.slice(1).map((p) => p.replace(/"/g, ""));
  return { cmd, args };
}

/**
 * Verify the test command is likely to work in the given directory.
 * Checks for package.json (npm/npx), Makefile (make), etc.
 */
async function checkTestPrerequisites(cmd: string, worktreePath: string): Promise<string | null> {
  if (cmd === "npm" || cmd === "npx") {
    try {
      await access(join(worktreePath, "package.json"));
    } catch {
      return `No package.json found in ${worktreePath} — cannot run npm commands`;
    }
  }
  return null;
}

export async function runTests(
  agentId: number,
  testCmd: string,
  worktreePath: string,
): Promise<TestResult> {
  const { cmd, args } = parseTestCommand(testCmd);

  if (!cmd) {
    return {
      agentId,
      passed: false,
      output: "Empty test command",
      exitCode: 1,
    };
  }

  // Pre-flight check
  const prereqError = await checkTestPrerequisites(cmd, worktreePath);
  if (prereqError) {
    return {
      agentId,
      passed: false,
      output: prereqError,
      exitCode: 1,
    };
  }

  try {
    const { stdout, stderr } = await exec(cmd, args, {
      cwd: worktreePath,
      timeout: TEST_TIMEOUT_MS,
      env: { ...process.env, CI: "true" },
    });
    return {
      agentId,
      passed: true,
      output: stdout + stderr,
      exitCode: 0,
    };
  } catch (err: unknown) {
    const e = err as {
      stdout?: string;
      stderr?: string;
      code?: number | string;
      killed?: boolean;
      signal?: string;
    };

    // Distinguish timeout from test failure
    if (e.killed && e.signal === "SIGTERM") {
      return {
        agentId,
        passed: false,
        output: `Test command timed out after ${TEST_TIMEOUT_MS / 1000}s`,
        exitCode: 124,
      };
    }

    // Command not found
    if (typeof e.code === "string" && e.code === "ENOENT") {
      return {
        agentId,
        passed: false,
        output: `Command not found: ${cmd}. Is it installed?`,
        exitCode: 127,
      };
    }

    return {
      agentId,
      passed: false,
      output: (e.stdout ?? "") + (e.stderr ?? ""),
      exitCode: typeof e.code === "number" ? e.code : 1,
    };
  }
}
