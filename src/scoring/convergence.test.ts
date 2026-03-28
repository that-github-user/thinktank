import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AgentResult } from "../types.js";
import { analyzeConvergence, copelandRecommend, recommend } from "./convergence.js";

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

  it("produces different clusters with different thresholds", () => {
    // Agent 1 and 2 have similar (but not identical) diffs; agent 3 is different
    const agents = [
      makeAgent({ id: 1, diff: DIFF_A, filesChanged: ["a.ts"] }),
      makeAgent({ id: 2, diff: DIFF_A_VARIANT, filesChanged: ["a.ts"] }),
      makeAgent({ id: 3, diff: DIFF_B, filesChanged: ["b.ts"] }),
    ];

    // Low threshold: agents 1 and 2 cluster together (Jaccard similarity = 0.5 >= 0.3)
    const lowGroups = analyzeConvergence(agents, 0.3);
    const groupWith1And2 = lowGroups.find((g) => g.agents.includes(1) && g.agents.includes(2));
    assert.ok(groupWith1And2, "At threshold 0.3, agents 1 and 2 should cluster together");

    // Very high threshold: nothing clusters (similarity < 1.0 for non-identical diffs)
    const highGroups = analyzeConvergence(agents, 1.0);
    // Each agent should be in its own group since no pair has perfect similarity
    assert.ok(
      highGroups.length > lowGroups.length,
      `Higher threshold should produce more groups (got ${highGroups.length} vs ${lowGroups.length})`,
    );
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

  it("penalizes outlier-large diffs (> 2x median) as tiebreaker", () => {
    // Agent 1 has 70 lines (> 2x median of 35), agent 2 and 3 are normal
    const agents = [
      makeAgent({ id: 1, diff: DIFF_A, linesAdded: 100, linesRemoved: 40 }),
      makeAgent({ id: 2, diff: DIFF_A, linesAdded: 10, linesRemoved: 5 }),
      makeAgent({ id: 3, diff: DIFF_A, linesAdded: 10, linesRemoved: 5 }),
    ];
    const convergence = analyzeConvergence(agents);
    const result = recommend(agents, [], convergence);

    // Agents 2 and 3 are normal-sized and should be preferred over outlier agent 1
    assert.ok(result.recommended === 2 || result.recommended === 3);
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

  it("gives equal diffSizePoints to non-outlier diffs", () => {
    // Both agents are within 2x of median — should get the same score
    const agents = [
      makeAgent({ id: 1, diff: DIFF_A, linesAdded: 20, linesRemoved: 10 }),
      makeAgent({ id: 2, diff: DIFF_A, linesAdded: 10, linesRemoved: 5 }),
    ];
    const convergence = analyzeConvergence(agents);
    const result = recommend(agents, [], convergence);

    const score1 = result.scores.find((s) => s.agentId === 1);
    const score2 = result.scores.find((s) => s.agentId === 2);
    assert.ok(score1);
    assert.ok(score2);

    assert.equal(score1.diffSizePoints, score2.diffSizePoints);
    assert.equal(score1.diffSizePoints, 10);
  });

  it("penalizes diffSizePoints for outlier-large diffs", () => {
    // Agent 1 is > 2x median, so it gets penalized
    const agents = [
      makeAgent({ id: 1, diff: DIFF_A, linesAdded: 100, linesRemoved: 50 }),
      makeAgent({ id: 2, diff: DIFF_A, linesAdded: 10, linesRemoved: 5 }),
      makeAgent({ id: 3, diff: DIFF_A, linesAdded: 10, linesRemoved: 5 }),
    ];
    const convergence = analyzeConvergence(agents);
    const result = recommend(agents, [], convergence);

    const score1 = result.scores.find((s) => s.agentId === 1);
    const score2 = result.scores.find((s) => s.agentId === 2);
    assert.ok(score1);
    assert.ok(score2);

    assert.ok(score1.diffSizePoints < score2.diffSizePoints);
    assert.equal(score2.diffSizePoints, 10);
    assert.ok(score1.diffSizePoints < 10);
  });
});

describe("copelandRecommend", () => {
  it("returns null for no completed agents", () => {
    const agents = [makeAgent({ id: 1, status: "error", diff: "" })];
    const result = copelandRecommend(agents, [], []);
    assert.equal(result.recommended, null);
    assert.deepEqual(result.scores, []);
  });

  it("recommends the agent that dominates all criteria", () => {
    // Agent 1: passes tests, in larger convergence group, fewer files
    // Agent 2: fails tests, alone, more files
    const agents = [
      makeAgent({ id: 1, diff: DIFF_A, filesChanged: ["a.ts"] }),
      makeAgent({ id: 2, diff: DIFF_B, filesChanged: ["b.ts", "c.ts"] }),
    ];
    const tests = [
      { agentId: 1, passed: true },
      { agentId: 2, passed: false },
    ];
    const convergence = analyzeConvergence(agents);
    const result = copelandRecommend(agents, tests, convergence);

    assert.equal(result.recommended, 1);
    const score1 = result.scores.find((s) => s.agentId === 1);
    assert.ok(score1);
    assert.equal(score1.copelandTotal, 1); // wins the one pairwise matchup
    assert.ok(score1.testsWins > 0);
  });

  it("all agents identical gives zero Copeland scores", () => {
    const agents = [
      makeAgent({ id: 1, diff: DIFF_A, filesChanged: ["a.ts"] }),
      makeAgent({ id: 2, diff: DIFF_A, filesChanged: ["a.ts"] }),
      makeAgent({ id: 3, diff: DIFF_A, filesChanged: ["a.ts"] }),
    ];
    const tests = [
      { agentId: 1, passed: true },
      { agentId: 2, passed: true },
      { agentId: 3, passed: true },
    ];
    const convergence = analyzeConvergence(agents);
    const result = copelandRecommend(agents, tests, convergence);

    // All agents tie on every criterion — all Copeland scores should be 0
    for (const score of result.scores) {
      assert.equal(score.copelandTotal, 0, `Agent #${score.agentId} should have Copeland score 0`);
      assert.equal(score.testsWins, 0);
      assert.equal(score.convergenceWins, 0);
      assert.equal(score.filesChangedWins, 0);
    }
    // Still recommends someone (first agent)
    assert.ok(result.recommended !== null);
  });

  it("handles agents with different strengths on different criteria (non-transitive)", () => {
    // Agent 1: passes tests, many files, small group
    // Agent 2: fails tests, few files, large group
    // Agent 3: fails tests, many files, large group
    const agents = [
      makeAgent({ id: 1, diff: DIFF_A, filesChanged: ["a.ts", "b.ts", "c.ts"] }),
      makeAgent({ id: 2, diff: DIFF_B, filesChanged: ["x.ts"] }),
      makeAgent({ id: 3, diff: DIFF_B, filesChanged: ["x.ts", "y.ts", "z.ts"] }),
    ];
    const tests = [
      { agentId: 1, passed: true },
      { agentId: 2, passed: false },
      { agentId: 3, passed: false },
    ];
    const convergence = analyzeConvergence(agents);
    const result = copelandRecommend(agents, tests, convergence);

    // Agent 1 vs Agent 2: tests(+1), convergence(-1), files(-1) → Agent 2 wins
    // Agent 1 vs Agent 3: tests(+1), convergence(-1), files(tie) → tie
    // Agent 2 vs Agent 3: tests(tie), convergence(tie), files(+1 for 2) → Agent 2 wins
    // So Agent 2 should have the best Copeland score
    assert.equal(result.recommended, 2);
  });

  it("prefers agent with test pass when other criteria are tied", () => {
    const agents = [
      makeAgent({ id: 1, diff: DIFF_A, filesChanged: ["a.ts"] }),
      makeAgent({ id: 2, diff: DIFF_A, filesChanged: ["a.ts"] }),
    ];
    const tests = [
      { agentId: 1, passed: true },
      { agentId: 2, passed: false },
    ];
    const convergence = analyzeConvergence(agents);
    const result = copelandRecommend(agents, tests, convergence);

    assert.equal(result.recommended, 1);
    const score1 = result.scores.find((s) => s.agentId === 1);
    assert.ok(score1);
    assert.equal(score1.testsWins, 1);
    assert.equal(score1.copelandTotal, 1);
  });

  it("prefers fewer files changed when other criteria are equal", () => {
    const agents = [
      makeAgent({ id: 1, diff: DIFF_A, filesChanged: ["a.ts", "b.ts", "c.ts"] }),
      makeAgent({ id: 2, diff: DIFF_A, filesChanged: ["a.ts"] }),
    ];
    const convergence = analyzeConvergence(agents);
    const result = copelandRecommend(agents, [], convergence);

    assert.equal(result.recommended, 2);
  });

  it("returns per-agent criterion breakdowns", () => {
    const agents = [
      makeAgent({ id: 1, diff: DIFF_A, filesChanged: ["a.ts"] }),
      makeAgent({ id: 2, diff: DIFF_B, filesChanged: ["b.ts", "c.ts"] }),
    ];
    const tests = [
      { agentId: 1, passed: true },
      { agentId: 2, passed: false },
    ];
    const convergence = analyzeConvergence(agents);
    const result = copelandRecommend(agents, tests, convergence);

    assert.equal(result.scores.length, 2);
    const score1 = result.scores.find((s) => s.agentId === 1);
    const score2 = result.scores.find((s) => s.agentId === 2);
    assert.ok(score1);
    assert.ok(score2);

    // Score1 wins tests and files, score2 wins neither
    assert.equal(score1.testsWins, 1);
    assert.equal(score2.testsWins, -1);
    assert.equal(score1.filesChangedWins, 1);
    assert.equal(score2.filesChangedWins, -1);
  });

  it("handles single agent", () => {
    const agents = [makeAgent({ id: 1, diff: DIFF_A })];
    const result = copelandRecommend(agents, [], []);

    assert.equal(result.recommended, 1);
    assert.equal(result.scores.length, 1);
    assert.equal(result.scores[0]!.copelandTotal, 0);
  });
});
