import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import {
  cleanupBranches,
  createWorktree,
  getDiff,
  getDiffStats,
  getRepoRoot,
  removeWorktree,
} from "./git.js";

describe("getRepoRoot", () => {
  it("returns the repository root", async () => {
    const root = await getRepoRoot();
    assert.ok(root.length > 0);
    assert.ok(root.includes("thinktank"));
  });
});

describe("worktree lifecycle", () => {
  let worktreePath: string;

  it("creates a worktree", async () => {
    worktreePath = await createWorktree(99);
    assert.ok(worktreePath.length > 0);
    assert.ok(worktreePath.includes("thinktank-agent-99"));
  });

  it("gets empty diff for unchanged worktree", async () => {
    const diff = await getDiff(worktreePath);
    assert.equal(diff, "");
  });

  it("gets empty diff stats for unchanged worktree", async () => {
    const stats = await getDiffStats(worktreePath);
    assert.deepEqual(stats.filesChanged, []);
    assert.equal(stats.linesAdded, 0);
    assert.equal(stats.linesRemoved, 0);
  });

  it("removes the worktree", async () => {
    await removeWorktree(worktreePath);
    // Should not throw
  });

  after(async () => {
    // Clean up any leftover branches
    await cleanupBranches().catch(() => {});
  });
});

describe("cleanupBranches", () => {
  it("runs without error even when no thinktank branches exist", async () => {
    await cleanupBranches();
    // Should not throw
  });
});

describe("getDiff warning on failure", () => {
  it("warns to stderr and returns empty string for invalid worktree path", async () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(args.join(" "));
    try {
      const result = await getDiff("/nonexistent/path/thinktank-test");
      assert.equal(result, "");
      assert.ok(warnings.length >= 1);
      assert.ok(warnings[0]!.includes("getDiff"));
      assert.ok(warnings[0]!.includes("thinktank-test"));
    } finally {
      console.warn = originalWarn;
    }
  });
});

describe("getDiffStats warning on failure", () => {
  it("warns to stderr and returns empty stats for invalid worktree path", async () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(args.join(" "));
    try {
      const result = await getDiffStats("/nonexistent/path/thinktank-test");
      assert.deepEqual(result, { filesChanged: [], linesAdded: 0, linesRemoved: 0 });
      assert.ok(warnings.length >= 1);
      assert.ok(warnings[0]!.includes("getDiffStats"));
      assert.ok(warnings[0]!.includes("thinktank-test"));
    } finally {
      console.warn = originalWarn;
    }
  });
});
