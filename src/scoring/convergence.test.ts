import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeConvergence, recommend } from "./convergence.js";
import type { AgentResult } from "../types.js";

function makeAgent(overrides: Partial<AgentResult> & { id: number }): AgentResult {
  return {
    worktree: `/tmp/agent-${overrides.id}`,
    status: "success",
    exitCode: 0,
    duration: 5000,
    output: "",
    diff: "some diff",
    filesChanged: ["src/index.ts"],
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

  it("groups agents that changed the same files", () => {
    const agents = [
      makeAgent({ id: 1, filesChanged: ["a.ts", "b.ts"] }),
      makeAgent({ id: 2, filesChanged: ["a.ts", "b.ts"] }),
      makeAgent({ id: 3, filesChanged: ["c.ts"] }),
    ];
    const groups = analyzeConvergence(agents);

    assert.equal(groups.length, 2);
    assert.deepEqual(groups[0]!.agents, [1, 2]);
    assert.ok(groups[0]!.similarity > groups[1]!.similarity);
    assert.deepEqual(groups[1]!.agents, [3]);
  });

  it("handles file order differences", () => {
    const agents = [
      makeAgent({ id: 1, filesChanged: ["b.ts", "a.ts"] }),
      makeAgent({ id: 2, filesChanged: ["a.ts", "b.ts"] }),
    ];
    const groups = analyzeConvergence(agents);

    assert.equal(groups.length, 1);
    assert.deepEqual(groups[0]!.agents, [1, 2]);
    assert.equal(groups[0]!.similarity, 1);
  });

  it("labels strong consensus at 80%+", () => {
    const agents = [
      makeAgent({ id: 1, filesChanged: ["a.ts"] }),
      makeAgent({ id: 2, filesChanged: ["a.ts"] }),
      makeAgent({ id: 3, filesChanged: ["a.ts"] }),
      makeAgent({ id: 4, filesChanged: ["a.ts"] }),
      makeAgent({ id: 5, filesChanged: ["b.ts"] }),
    ];
    const groups = analyzeConvergence(agents);

    assert.ok(groups[0]!.description.includes("Strong consensus"));
    assert.ok(groups[1]!.description.includes("Divergent"));
  });
});

describe("recommend", () => {
  it("returns null for no completed agents", () => {
    const agents = [makeAgent({ id: 1, status: "error", diff: "" })];
    assert.equal(recommend(agents, [], []), null);
  });

  it("prefers agents that pass tests", () => {
    const agents = [
      makeAgent({ id: 1, linesAdded: 20, linesRemoved: 10 }),
      makeAgent({ id: 2, linesAdded: 5, linesRemoved: 2 }),
    ];
    const tests = [
      { agentId: 1, passed: true },
      { agentId: 2, passed: false },
    ];
    const convergence = analyzeConvergence(agents);

    assert.equal(recommend(agents, tests, convergence), 1);
  });

  it("prefers agents in larger convergence group when tests are equal", () => {
    const agents = [
      makeAgent({ id: 1, filesChanged: ["a.ts"], linesAdded: 10, linesRemoved: 5 }),
      makeAgent({ id: 2, filesChanged: ["a.ts"], linesAdded: 10, linesRemoved: 5 }),
      makeAgent({ id: 3, filesChanged: ["b.ts"], linesAdded: 10, linesRemoved: 5 }),
    ];
    const tests = [
      { agentId: 1, passed: true },
      { agentId: 2, passed: true },
      { agentId: 3, passed: true },
    ];
    const convergence = analyzeConvergence(agents);
    const rec = recommend(agents, tests, convergence);

    // Should pick agent 1 or 2 (in the majority group), not 3
    assert.ok(rec === 1 || rec === 2);
  });

  it("prefers smaller diffs as tiebreaker", () => {
    const agents = [
      makeAgent({ id: 1, filesChanged: ["a.ts"], linesAdded: 50, linesRemoved: 20 }),
      makeAgent({ id: 2, filesChanged: ["a.ts"], linesAdded: 5, linesRemoved: 2 }),
    ];
    const convergence = analyzeConvergence(agents);

    // No test results — convergence is equal, so diff size decides
    assert.equal(recommend(agents, [], convergence), 2);
  });
});
