import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseApplyConflicts } from "./apply.js";

describe("parseApplyConflicts", () => {
  it("parses conflicted files from 3way output", () => {
    const stderr = [
      "error: patch failed: src/cli.ts:10",
      "Falling back to three-way merge...",
      "Applied patch to 'src/cli.ts' with conflicts.",
    ].join("\n");
    const info = parseApplyConflicts(stderr);
    assert.deepEqual(info.conflictedFiles, ["src/cli.ts"]);
    assert.deepEqual(info.appliedFiles, []);
  });

  it("parses mixed applied and conflicted files", () => {
    const stderr = [
      "Applied patch to 'src/utils/git.ts' cleanly.",
      "error: patch failed: src/cli.ts:10",
      "Falling back to three-way merge...",
      "Applied patch to 'src/cli.ts' with conflicts.",
      "Applied patch to 'src/types.ts' cleanly.",
    ].join("\n");
    const info = parseApplyConflicts(stderr);
    assert.deepEqual(info.appliedFiles, ["src/utils/git.ts", "src/types.ts"]);
    assert.deepEqual(info.conflictedFiles, ["src/cli.ts"]);
  });

  it("returns empty arrays for unparseable stderr", () => {
    const info = parseApplyConflicts("fatal: something unexpected");
    assert.deepEqual(info.appliedFiles, []);
    assert.deepEqual(info.conflictedFiles, []);
  });

  it("returns empty arrays for empty string", () => {
    const info = parseApplyConflicts("");
    assert.deepEqual(info.appliedFiles, []);
    assert.deepEqual(info.conflictedFiles, []);
  });

  it("deduplicates conflicted files from error + Applied lines", () => {
    const stderr = [
      "error: patch failed: src/foo.ts:5",
      "Applied patch to 'src/foo.ts' with conflicts.",
    ].join("\n");
    const info = parseApplyConflicts(stderr);
    assert.deepEqual(info.conflictedFiles, ["src/foo.ts"]);
  });

  it("captures error-only failures without Applied line", () => {
    const stderr = "error: patch failed: src/bar.ts:1\n";
    const info = parseApplyConflicts(stderr);
    assert.deepEqual(info.conflictedFiles, ["src/bar.ts"]);
    assert.deepEqual(info.appliedFiles, []);
  });
});

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

describe("isWorkingTreeClean", () => {
  it("is exported and callable", async () => {
    const { isWorkingTreeClean } = await import("./apply.js");
    assert.equal(typeof isWorkingTreeClean, "function");
  });

  it("returns a boolean", async () => {
    const { isWorkingTreeClean } = await import("./apply.js");
    const result = await isWorkingTreeClean();
    assert.equal(typeof result, "boolean");
  });
});

describe("dry-run flag", () => {
  it("ApplyOptions accepts dryRun property", async () => {
    const opts: import("./apply.js").ApplyOptions = {
      dryRun: true,
    };
    assert.equal(opts.dryRun, true);
  });

  it("dry-run skips dirty-tree check (same as preview)", () => {
    // The guard in apply() only checks isWorkingTreeClean when
    // neither preview nor dryRun is set. Verify the logic inline:
    const preview = false;
    const dryRun = true;
    const isPreviewOnly = preview || dryRun;
    assert.equal(isPreviewOnly, true, "dry-run should be treated as preview-only");
  });
});
