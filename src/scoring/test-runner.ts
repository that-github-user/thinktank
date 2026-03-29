import { exec as execCb } from "node:child_process";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { TestResult } from "../types.js";

const exec = promisify(execCb);

const DEFAULT_TEST_TIMEOUT_MS = 120_000;

/** Shell operators that indicate command chaining — reject these. */
const SHELL_OPERATORS = /[;|&`><]/;

/**
 * Validate a test command for safety. Rejects commands containing
 * shell operators that could be used for injection.
 */
export function validateTestCommand(testCmd: string): string | null {
  if (!testCmd.trim()) return "Empty test command";
  if (SHELL_OPERATORS.test(testCmd)) {
    return `Test command contains shell operators which are not allowed for security: ${testCmd}`;
  }
  return null;
}

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
  timeoutMs: number = DEFAULT_TEST_TIMEOUT_MS,
): Promise<TestResult> {
  // Security: validate command before execution
  const validationError = validateTestCommand(testCmd);
  if (validationError) {
    return {
      agentId,
      passed: false,
      output: validationError,
      exitCode: 1,
    };
  }

  const { cmd } = parseTestCommand(testCmd);

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
    // Use exec (shell string) for cross-platform command resolution (npx, npm, etc.).
    // Safety: testCmd is validated by validateTestCommand() which rejects shell operators.
    // This avoids the DEP0190 deprecation from execFile + shell:true + args array.
    const { stdout, stderr } = await exec(testCmd, {
      cwd: worktreePath,
      timeout: timeoutMs,
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

    if (e.killed && e.signal === "SIGTERM") {
      return {
        agentId,
        passed: false,
        output: `Test command timed out after ${timeoutMs / 1000}s`,
        exitCode: 124,
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
