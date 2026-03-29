import assert from "node:assert/strict";
import { exec as execCb } from "node:child_process";
import { describe, it } from "node:test";
import { promisify } from "node:util";

const exec = promisify(execCb);
const CLI = "npx tsx src/cli.ts";

describe("CLI integration (smoke tests)", () => {
  it("--version outputs version number", async () => {
    const { stdout } = await exec(`${CLI} --version`);
    assert.match(stdout.trim(), /^\d+\.\d+\.\d+$/);
  });

  it("--help shows all commands", async () => {
    const { stdout } = await exec(`${CLI} --help`);
    assert.ok(stdout.includes("Ensemble AI coding"));
    assert.ok(stdout.includes("run"));
    assert.ok(stdout.includes("apply"));
    assert.ok(stdout.includes("list"));
    assert.ok(stdout.includes("stats"));
    assert.ok(stdout.includes("clean"));
    assert.ok(stdout.includes("undo"));
    assert.ok(stdout.includes("config"));
  });

  it("run --help shows options", async () => {
    const { stdout } = await exec(`${CLI} run --help`);
    assert.ok(stdout.includes("--attempts"));
    assert.ok(stdout.includes("--model"));
    assert.ok(stdout.includes("--scoring"));
  });

  it("apply --help shows options", async () => {
    const { stdout } = await exec(`${CLI} apply --help`);
    assert.ok(stdout.includes("--agent"));
    assert.ok(stdout.includes("--preview"));
    assert.ok(stdout.includes("--dry-run"));
  });

  it("config list runs without error", async () => {
    const { stdout } = await exec(`${CLI} config list`);
    assert.ok(stdout.includes("attempts") || stdout.includes("model"));
  });

  it("clean runs without error", async () => {
    await exec(`${CLI} clean`);
  });
});
