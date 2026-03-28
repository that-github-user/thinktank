import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTestCommand, runTests, validateTestCommand } from "./test-runner.js";

describe("validateTestCommand", () => {
  it("accepts safe commands", () => {
    assert.equal(validateTestCommand("npm test"), null);
    assert.equal(validateTestCommand("npx jest --verbose"), null);
    assert.equal(validateTestCommand("python -m pytest"), null);
    assert.equal(validateTestCommand("go test ./..."), null);
    assert.equal(validateTestCommand("cargo test"), null);
    assert.equal(validateTestCommand("make test"), null);
  });

  it("rejects commands with semicolons", () => {
    const err = validateTestCommand("npm test; rm -rf /");
    assert.ok(err);
    assert.ok(err.includes("shell operators"));
  });

  it("rejects commands with pipes", () => {
    const err = validateTestCommand("npm test | grep fail");
    assert.ok(err);
  });

  it("rejects commands with && chaining", () => {
    const err = validateTestCommand("npm test && echo pwned");
    assert.ok(err);
  });

  it("rejects commands with backticks", () => {
    const err = validateTestCommand("npm test `whoami`");
    assert.ok(err);
  });

  it("rejects commands with redirects", () => {
    const err = validateTestCommand("npm test > /dev/null");
    assert.ok(err);
  });

  it("rejects empty commands", () => {
    const err = validateTestCommand("");
    assert.ok(err);
    assert.ok(err.includes("Empty"));
  });

  it("rejects whitespace-only commands", () => {
    const err = validateTestCommand("   ");
    assert.ok(err);
  });
});

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
  it("rejects shell injection attempts", async () => {
    const result = await runTests(1, "npm test; rm -rf /", ".");
    assert.equal(result.passed, false);
    assert.ok(result.output.includes("shell operators"));
  });

  it("returns failure for empty command", async () => {
    const result = await runTests(1, "", "/tmp");
    assert.equal(result.passed, false);
    assert.ok(result.output.includes("Empty"));
  });

  it("returns failure for non-existent command", async () => {
    const result = await runTests(1, "nonexistent-command-xyz", ".");
    assert.equal(result.passed, false);
    assert.ok(result.exitCode !== 0);
  });

  it("returns success for passing command", async () => {
    const result = await runTests(1, "node --version", ".");
    assert.equal(result.passed, true);
    assert.equal(result.exitCode, 0);
  });

  it("returns failure for failing command", async () => {
    // --require a non-existent module to trigger a guaranteed non-zero exit
    const result = await runTests(1, "node --require ./nonexistent-module.js", ".");
    assert.equal(result.passed, false);
    assert.ok(result.exitCode !== 0);
  });
});
