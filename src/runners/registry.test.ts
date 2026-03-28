import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDefaultRunner, getRunner, listRunners } from "./registry.js";

describe("runner registry", () => {
  it("returns claude-code runner by name", () => {
    const runner = getRunner("claude-code");
    assert.ok(runner);
    assert.equal(runner.name, "claude-code");
  });

  it("returns undefined for unknown runner", () => {
    const runner = getRunner("nonexistent");
    assert.equal(runner, undefined);
  });

  it("lists all available runners", () => {
    const runners = listRunners();
    assert.ok(runners.length >= 1);
    assert.ok(runners.some((r) => r.name === "claude-code"));
  });

  it("returns claude-code as default runner", () => {
    const runner = getDefaultRunner();
    assert.equal(runner.name, "claude-code");
  });

  it("claude-code runner has required interface fields", () => {
    const runner = getRunner("claude-code");
    assert.ok(runner);
    assert.equal(typeof runner.name, "string");
    assert.equal(typeof runner.description, "string");
    assert.equal(typeof runner.available, "function");
    assert.equal(typeof runner.run, "function");
  });
});
