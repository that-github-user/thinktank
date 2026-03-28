import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { TestResult } from "../types.js";

const exec = promisify(execFile);

export async function runTests(
  agentId: number,
  testCmd: string,
  worktreePath: string,
): Promise<TestResult> {
  const parts = testCmd.split(" ");
  const cmd = parts[0]!;
  const args = parts.slice(1);

  try {
    const { stdout, stderr } = await exec(cmd, args, {
      cwd: worktreePath,
      timeout: 120_000,
      env: { ...process.env, CI: "true" },
    });
    return {
      agentId,
      passed: true,
      output: stdout + stderr,
      exitCode: 0,
    };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      agentId,
      passed: false,
      output: (e.stdout ?? "") + (e.stderr ?? ""),
      exitCode: e.code ?? 1,
    };
  }
}
