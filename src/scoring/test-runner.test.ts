import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTestCommand, runTests } from "./test-runner.js";

describe("parseTestCommand", () => {
  it("parses simple command", () => {
    const { cmd, args } = parseTestCommand("npm test");
    assert.equal(cmd, "npm");
    assert.deepEqual(args, ["test"]);
  });

  it("parses command with multiple args", () => {
    const { cmd, args } = parseTestCommand("python -m pytest -v");
    assert.equal(cmd, "python");
    assert.deepEqual(args, ["-m", "pytest", "-v"]);
  });

  it("parses command with quoted args", () => {
    const { cmd, args } = parseTestCommand('go test "./..."');
    assert.equal(cmd, "go");
    assert.deepEqual(args, ["test", "./..."]);
  });

  it("handles empty string", () => {
    const { cmd, args } = parseTestCommand("");
    assert.equal(cmd, "");
    assert.deepEqual(args, []);
  });
});

describe("runTests", () => {
  it("returns failure for empty command", async () => {
    const result = await runTests(1, "", "/tmp");
    assert.equal(result.passed, false);
    assert.equal(result.output, "Empty test command");
  });

  it("returns failure for non-existent command", async () => {
    const result = await runTests(1, "nonexistent-command-xyz", "/tmp");
    assert.equal(result.passed, false);
    assert.equal(result.exitCode, 127);
    assert.ok(result.output.includes("Command not found"));
  });

  it("returns success for passing command", async () => {
    const result = await runTests(1, "node -e process.exit(0)", ".");
    assert.equal(result.passed, true);
    assert.equal(result.exitCode, 0);
  });

  it("returns failure for failing command", async () => {
    const result = await runTests(1, "node -e process.exit(1)", ".");
    assert.equal(result.passed, false);
    assert.ok(result.exitCode !== 0);
  });
});
