import assert from "node:assert/strict";
import { exec } from "node:child_process";
import { describe, it } from "node:test";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const CLI = "npx tsx src/cli.ts";

async function run(args: string): Promise<{ stdout: string; stderr: string }> {
  return execAsync(`${CLI} ${args}`, { timeout: 30_000 });
}

describe("CLI integration — smoke tests", () => {
  it("--version outputs the version", async () => {
    const { stdout } = await run("--version");
    assert.match(stdout.trim(), /^\d+\.\d+\.\d+$/);
  });

  it("--help shows usage and lists commands", async () => {
    const { stdout } = await run("--help");
    assert.ok(stdout.includes("thinktank"), "should mention program name");
    assert.ok(stdout.includes("run"), "should list run command");
    assert.ok(stdout.includes("list"), "should list list command");
    assert.ok(stdout.includes("config"), "should list config command");
  });

  it("list exits cleanly", async () => {
    const { stdout } = await run("list");
    // May show "No runs found" or a run table — either is fine
    assert.ok(stdout.length > 0, "should produce output");
  });

  it("stats exits cleanly", async () => {
    const { stdout } = await run("stats");
    assert.ok(stdout.length > 0, "should produce output");
  });

  it("clean exits cleanly", async () => {
    const { stdout } = await run("clean");
    assert.ok(stdout.length > 0, "should produce output");
  });

  it("config list shows defaults", async () => {
    const { stdout } = await run("config list");
    assert.ok(stdout.includes("attempts"), "should show attempts setting");
    assert.ok(stdout.includes("model"), "should show model setting");
    assert.ok(stdout.includes("timeout"), "should show timeout setting");
  });
});
