import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AgentResult } from "../types.js";
import { analyzeConvergence, recommend } from "./convergence.js";

const DIFF_A = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
+const x = 1;`;

const DIFF_A_VARIANT = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
+const x = 1;
+const extra = true;`;

const DIFF_B = `diff --git a/b.ts b/b.ts
--- a/b.ts
+++ b/b.ts
@@ -1 +1 @@
+const y = 2;`;

function makeAgent(overrides: Partial<AgentResult> & { id: number }): AgentResult {
  return {
    worktree: `/tmp/agent-${overrides.id}`,
    status: "success",
    exitCode: 0,
    duration: 5000,
    output: "",
    diff: DIFF_A,
    filesChanged: ["a.ts"],
    linesAdded: 10,
    linesRemoved: 5,
    ...overrides,
  };
}

describe("analyzeConvergence", () => {
  it("returns empty for no agents", () => {
    const result = analyzeConvergence([]);
    assert.deepEqual(result, []);
  });

  it("returns empty when all agents failed", () => {
    const agents = [
      makeAgent({ id: 1, status: "error", diff: "" }),
      makeAgent({ id: 2, status: "timeout", diff: "" }),
    ];
    const result = analyzeConvergence(agents);
    assert.deepEqual(result, []);
  });

  it("groups agents with similar diffs together", () => {
    const agents = [
      makeAgent({ id: 1, diff: DIFF_A, filesChanged: ["a.ts"] }),
      makeAgent({ id: 2, diff: DIFF_A, filesChanged: ["a.ts"] }),
      makeAgent({ id: 3, diff: DIFF_B, filesChanged: ["b.ts"] }),
    ];
    const groups = analyzeConvergence(agents);

    assert.equal(groups.length, 2);
    // Agents 1,2 have identical diffs — should be in the same group
    const largestGroup = groups[0]!;
    assert.ok(largestGroup.agents.includes(1));
    assert.ok(largestGroup.agents.includes(2));
    assert.ok(largestGroup.similarity > groups[1]!.similarity);
  });

  it("clusters agents with identical diffs", () => {
    const agents = [makeAgent({ id: 1, diff: DIFF_A }), makeAgent({ id: 2, diff: DIFF_A })];
    const groups = analyzeConvergence(agents);

    assert.equal(groups.length, 1);
    assert.deepEqual(groups[0]!.agents.sort(), [1, 2]);
  });

  it("labels strong consensus correctly", () => {
    const agents = [
      makeAgent({ id: 1, diff: DIFF_A }),
      makeAgent({ id: 2, diff: DIFF_A }),
      makeAgent({ id: 3, diff: DIFF_A }),
      makeAgent({ id: 4, diff: DIFF_A }),
      makeAgent({ id: 5, diff: DIFF_B, filesChanged: ["b.ts"] }),
    ];
    const groups = analyzeConvergence(agents);

    assert.ok(groups[0]!.description.includes("Strong consensus"));
  });
});

describe("recommend", () => {
  it("returns null for no completed agents", () => {
    const agents = [makeAgent({ id: 1, status: "error", diff: "" })];
    const result = recommend(agents, [], []);
    assert.equal(result.recommended, null);
    assert.deepEqual(result.scores, []);
  });

  it("prefers agents that pass tests", () => {
    const agents = [
      makeAgent({ id: 1, diff: DIFF_A, linesAdded: 20, linesRemoved: 10 }),
      makeAgent({ id: 2, diff: DIFF_B, linesAdded: 5, linesRemoved: 2, filesChanged: ["b.ts"] }),
    ];
    const tests = [
      { agentId: 1, passed: true },
      { agentId: 2, passed: false },
    ];
    const convergence = analyzeConvergence(agents);
    const result = recommend(agents, tests, convergence);

    assert.equal(result.recommended, 1);
  });

  it("prefers agents in larger convergence group when tests are equal", () => {
    const agents = [
      makeAgent({ id: 1, diff: DIFF_A, filesChanged: ["a.ts"], linesAdded: 10, linesRemoved: 5 }),
      makeAgent({ id: 2, diff: DIFF_A, filesChanged: ["a.ts"], linesAdded: 10, linesRemoved: 5 }),
      makeAgent({
        id: 3,
        diff: DIFF_B,
        filesChanged: ["b.ts"],
        linesAdded: 10,
        linesRemoved: 5,
      }),
    ];
    const tests = [
      { agentId: 1, passed: true },
      { agentId: 2, passed: true },
      { agentId: 3, passed: true },
    ];
    const convergence = analyzeConvergence(agents);
    const result = recommend(agents, tests, convergence);

    // Should pick agent 1 or 2 (in the majority group), not 3
    assert.ok(result.recommended === 1 || result.recommended === 2);
  });

  it("prefers smaller diffs as tiebreaker", () => {
    const agents = [
      makeAgent({ id: 1, diff: DIFF_A, linesAdded: 50, linesRemoved: 20 }),
      makeAgent({ id: 2, diff: DIFF_A, linesAdded: 5, linesRemoved: 2 }),
    ];
    const convergence = analyzeConvergence(agents);
    const result = recommend(agents, [], convergence);

    assert.equal(result.recommended, 2);
  });

  it("returns per-agent score breakdowns", () => {
    const agents = [
      makeAgent({ id: 1, diff: DIFF_A, linesAdded: 20, linesRemoved: 10 }),
      makeAgent({ id: 2, diff: DIFF_B, linesAdded: 5, linesRemoved: 2, filesChanged: ["b.ts"] }),
    ];
    const tests = [
      { agentId: 1, passed: true },
      { agentId: 2, passed: false },
    ];
    const convergence = analyzeConvergence(agents);
    const result = recommend(agents, tests, convergence);

    assert.equal(result.scores.length, 2);

    const score1 = result.scores.find((s) => s.agentId === 1);
    const score2 = result.scores.find((s) => s.agentId === 2);
    assert.ok(score1);
    assert.ok(score2);

    assert.equal(score1.testPoints, 100);
    assert.equal(score2.testPoints, 0);

    assert.ok(score1.convergencePoints >= 0);
    assert.ok(score1.diffSizePoints >= 0);
    assert.equal(
      score1.total,
      score1.testPoints + score1.convergencePoints + score1.diffSizePoints,
    );
    assert.equal(
      score2.total,
      score2.testPoints + score2.convergencePoints + score2.diffSizePoints,
    );
  });

  it("gives higher diffSizePoints to smaller diffs", () => {
    const agents = [
      makeAgent({ id: 1, diff: DIFF_A, linesAdded: 50, linesRemoved: 20 }),
      makeAgent({ id: 2, diff: DIFF_A, linesAdded: 5, linesRemoved: 2 }),
    ];
    const convergence = analyzeConvergence(agents);
    const result = recommend(agents, [], convergence);

    const score1 = result.scores.find((s) => s.agentId === 1);
    const score2 = result.scores.find((s) => s.agentId === 2);
    assert.ok(score1);
    assert.ok(score2);

    assert.ok(score2.diffSizePoints > score1.diffSizePoints);
  });
});
