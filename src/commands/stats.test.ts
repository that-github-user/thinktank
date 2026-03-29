import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EnsembleResult } from "../types.js";
import { filterResults } from "./stats.js";

function makeResult(overrides: Partial<EnsembleResult> = {}): EnsembleResult {
  return {
    prompt: "test prompt",
    model: "sonnet",
    timestamp: "2026-03-15T10:00:00Z",
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
    ],
    tests: [{ agentId: 1, passed: true, output: "", exitCode: 0 }],
    convergence: [{ agents: [1], similarity: 0.9, filesChanged: ["a.ts"], description: "group" }],
    recommended: 1,
    scores: [],
    ...overrides,
  };
}

describe("filterResults", () => {
  const results: EnsembleResult[] = [
    makeResult({ model: "sonnet", timestamp: "2026-03-10T10:00:00Z" }),
    makeResult({
      model: "opus",
      timestamp: "2026-03-15T10:00:00Z",
      tests: [{ agentId: 1, passed: false, output: "", exitCode: 1 }],
    }),
    makeResult({ model: "sonnet", timestamp: "2026-03-20T10:00:00Z" }),
  ];

  it("returns all results with no filters", () => {
    const filtered = filterResults(results, {});
    assert.equal(filtered.length, 3);
  });

  it("filters by model name (case-insensitive substring)", () => {
    const filtered = filterResults(results, { model: "Opus" });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].model, "opus");
  });

  it("filters by --since date", () => {
    const filtered = filterResults(results, { since: "2026-03-12" });
    assert.equal(filtered.length, 2);
  });

  it("filters by --until date", () => {
    const filtered = filterResults(results, { until: "2026-03-15T10:00:00Z" });
    assert.equal(filtered.length, 2);
  });

  it("filters by --since and --until together", () => {
    const filtered = filterResults(results, {
      since: "2026-03-12",
      until: "2026-03-18",
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].timestamp, "2026-03-15T10:00:00Z");
  });

  it("filters by --passed-only", () => {
    const filtered = filterResults(results, { passedOnly: true });
    assert.equal(filtered.length, 2);
    for (const r of filtered) {
      assert.ok(r.tests.some((t) => t.passed));
    }
  });

  it("combines model and passed-only filters", () => {
    const filtered = filterResults(results, { model: "opus", passedOnly: true });
    assert.equal(filtered.length, 0);
  });

  it("combines model and date filters", () => {
    const filtered = filterResults(results, {
      model: "sonnet",
      since: "2026-03-15",
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].timestamp, "2026-03-20T10:00:00Z");
  });

  it("returns empty array when no results match", () => {
    const filtered = filterResults(results, { model: "haiku" });
    assert.equal(filtered.length, 0);
  });
});
