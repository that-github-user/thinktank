import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAndValidateResult, validateResult } from "./schema.js";

function makeValidResult(): Record<string, unknown> {
  return {
    prompt: "fix the bug",
    model: "sonnet",
    timestamp: "2025-01-01T00:00:00Z",
    scoring: "weighted",
    agents: [
      {
        id: 1,
        worktree: "/tmp/wt-1",
        status: "success",
        exitCode: 0,
        duration: 30,
        output: "done",
        diff: "--- a/file\n+++ b/file",
        filesChanged: ["file.ts"],
        linesAdded: 1,
        linesRemoved: 0,
      },
    ],
    tests: [{ agentId: 1, passed: true, output: "ok", exitCode: 0 }],
    convergence: [{ agents: [1], similarity: 1, filesChanged: ["file.ts"], description: "group" }],
    recommended: 1,
    scores: [{ agentId: 1, testPoints: 10, convergencePoints: 5, diffSizePoints: 3, total: 18 }],
  };
}

describe("validateResult", () => {
  it("returns null for a valid result", () => {
    assert.equal(validateResult(makeValidResult()), null);
  });

  it("returns null when recommended is null", () => {
    const result = makeValidResult();
    result.recommended = null;
    assert.equal(validateResult(result), null);
  });

  it("returns null with optional copelandScores", () => {
    const result = makeValidResult();
    result.copelandScores = [];
    assert.equal(validateResult(result), null);
  });

  it("rejects null", () => {
    assert.match(validateResult(null)!, /non-null object/);
  });

  it("rejects non-object", () => {
    assert.match(validateResult("string")!, /non-null object/);
  });

  it("rejects missing prompt", () => {
    const result = makeValidResult();
    delete result.prompt;
    assert.match(validateResult(result)!, /prompt/);
  });

  it("rejects non-string prompt", () => {
    const result = makeValidResult();
    result.prompt = 42;
    assert.match(validateResult(result)!, /prompt/);
  });

  it("rejects missing model", () => {
    const result = makeValidResult();
    delete result.model;
    assert.match(validateResult(result)!, /model/);
  });

  it("rejects missing timestamp", () => {
    const result = makeValidResult();
    delete result.timestamp;
    assert.match(validateResult(result)!, /timestamp/);
  });

  it("rejects invalid scoring value", () => {
    const result = makeValidResult();
    result.scoring = "invalid";
    assert.match(validateResult(result)!, /scoring/);
  });

  it("rejects missing scoring", () => {
    const result = makeValidResult();
    delete result.scoring;
    assert.match(validateResult(result)!, /scoring/);
  });

  it("rejects non-array agents", () => {
    const result = makeValidResult();
    result.agents = "not-array";
    assert.match(validateResult(result)!, /agents/);
  });

  it("rejects missing agents", () => {
    const result = makeValidResult();
    delete result.agents;
    assert.match(validateResult(result)!, /agents/);
  });

  it("rejects non-array tests", () => {
    const result = makeValidResult();
    result.tests = {};
    assert.match(validateResult(result)!, /tests/);
  });

  it("rejects non-array convergence", () => {
    const result = makeValidResult();
    result.convergence = "nope";
    assert.match(validateResult(result)!, /convergence/);
  });

  it("rejects non-number non-null recommended", () => {
    const result = makeValidResult();
    result.recommended = "bad";
    assert.match(validateResult(result)!, /recommended/);
  });

  it("rejects missing recommended", () => {
    const result = makeValidResult();
    delete result.recommended;
    assert.match(validateResult(result)!, /recommended/);
  });

  it("rejects missing scores", () => {
    const result = makeValidResult();
    delete result.scores;
    assert.match(validateResult(result)!, /scores/);
  });

  it("rejects non-array scores", () => {
    const result = makeValidResult();
    result.scores = "bad";
    assert.match(validateResult(result)!, /scores/);
  });

  it("accepts empty arrays for agents, tests, convergence, scores", () => {
    const result = makeValidResult();
    result.agents = [];
    result.tests = [];
    result.convergence = [];
    result.scores = [];
    result.recommended = null;
    assert.equal(validateResult(result), null);
  });
});

describe("parseAndValidateResult", () => {
  it("parses and returns a valid result", () => {
    const json = JSON.stringify(makeValidResult());
    const result = parseAndValidateResult(json, "test.json");
    assert.equal(result.prompt, "fix the bug");
    assert.equal(result.model, "sonnet");
  });

  it("throws on invalid JSON", () => {
    assert.throws(() => parseAndValidateResult("{bad", "test.json"), /JSON/i);
  });

  it("throws on valid JSON but invalid schema", () => {
    assert.throws(() => parseAndValidateResult('{"foo": 1}', "test.json"), /Invalid result file/);
  });

  it("includes filename in error message", () => {
    assert.throws(() => parseAndValidateResult("{}", "run-2025.json"), /run-2025\.json/);
  });
});
