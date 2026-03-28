import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EnsembleResult } from "../types.js";
import { buildRunSummary, extractRunNumber } from "./list.js";

describe("extractRunNumber", () => {
  it("returns -1 (run numbers assigned by load order, not filename)", () => {
    assert.equal(extractRunNumber("run-2026-03-28T05-58-48-564Z.json"), -1);
    assert.equal(extractRunNumber("latest.json"), -1);
  });
});

function makeResult(overrides: Partial<EnsembleResult> = {}): EnsembleResult {
  return {
    prompt: "test prompt",
    model: "sonnet",
    timestamp: "2026-03-28T10:00:00Z",
    scoring: "copeland",
    agents: [
      {
        id: 1,
        worktree: "/tmp/w1",
        status: "success",
        exitCode: 0,
        duration: 5000,
        output: "",
        diff: "diff",
        filesChanged: ["a.ts"],
        linesAdded: 10,
        linesRemoved: 2,
      },
      {
        id: 2,
        worktree: "/tmp/w2",
        status: "success",
        exitCode: 0,
        duration: 8000,
        output: "",
        diff: "diff",
        filesChanged: ["a.ts", "b.ts"],
        linesAdded: 20,
        linesRemoved: 5,
      },
    ],
    tests: [
      { agentId: 1, passed: true, output: "", exitCode: 0 },
      { agentId: 2, passed: false, output: "", exitCode: 1 },
    ],
    convergence: [
      { agents: [1, 2], similarity: 0.8, filesChanged: ["a.ts"], description: "similar" },
    ],
    recommended: 1,
    scores: [],
    ...overrides,
  };
}

describe("buildRunSummary", () => {
  it("builds summary with test pass rate and convergence", () => {
    const result = makeResult();
    const summary = buildRunSummary(3, result);

    assert.equal(summary.runNumber, 3);
    assert.equal(summary.timestamp, "2026-03-28T10:00:00Z");
    assert.equal(summary.agentCount, 2);
    assert.equal(summary.recommended, 1);
    assert.equal(summary.testPassRate, 0.5);
    assert.equal(summary.avgConvergence, 0.8);
  });

  it("returns null test pass rate when no tests", () => {
    const result = makeResult({ tests: [] });
    const summary = buildRunSummary(1, result);

    assert.equal(summary.testPassRate, null);
  });

  it("returns null convergence when no convergence groups", () => {
    const result = makeResult({ convergence: [] });
    const summary = buildRunSummary(1, result);

    assert.equal(summary.avgConvergence, null);
  });

  it("averages multiple convergence groups", () => {
    const result = makeResult({
      convergence: [
        { agents: [1, 2], similarity: 0.6, filesChanged: ["a.ts"], description: "a" },
        { agents: [1, 2], similarity: 1.0, filesChanged: ["b.ts"], description: "b" },
      ],
    });
    const summary = buildRunSummary(5, result);

    assert.equal(summary.avgConvergence, 0.8);
  });
});
