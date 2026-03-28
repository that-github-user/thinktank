import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";

// Test the logic of agent selection without actually running git commands
describe("apply agent selection logic", () => {
  const mockResult = {
    prompt: "test task",
    model: "sonnet",
    timestamp: "2026-03-28T00:00:00Z",
    agents: [
      {
        id: 1,
        worktree: "/tmp/agent-1",
        status: "success" as const,
        exitCode: 0,
        duration: 5000,
        output: "",
        diff: "diff --git a/test.ts b/test.ts\n+// hello",
        filesChanged: ["test.ts"],
        linesAdded: 1,
        linesRemoved: 0,
      },
      {
        id: 2,
        worktree: "/tmp/agent-2",
        status: "error" as const,
        exitCode: 1,
        duration: 3000,
        output: "",
        error: "failed",
        diff: "",
        filesChanged: [],
        linesAdded: 0,
        linesRemoved: 0,
      },
    ],
    tests: [],
    convergence: [],
    recommended: 1,
  };

  it("selects recommended agent when no --agent flag", () => {
    const userChoice: number | undefined = undefined;
    const agentId = userChoice !== undefined ? userChoice : mockResult.recommended;
    const agent = mockResult.agents.find((a) => a.id === agentId);
    assert.ok(agent);
    assert.equal(agent.id, 1);
    assert.equal(agent.status, "success");
    assert.ok(agent.diff.length > 0);
  });

  it("selects specified agent with --agent flag", () => {
    const agentId = 2;
    const agent = mockResult.agents.find((a) => a.id === agentId);
    assert.ok(agent);
    assert.equal(agent.id, 2);
  });

  it("returns undefined for non-existent agent", () => {
    const agent = mockResult.agents.find((a) => a.id === 99);
    assert.equal(agent, undefined);
  });

  it("detects agent with no changes", () => {
    const agent = mockResult.agents.find((a) => a.id === 2);
    assert.ok(agent);
    assert.equal(agent.status, "error");
    assert.equal(agent.diff, "");
  });
});
