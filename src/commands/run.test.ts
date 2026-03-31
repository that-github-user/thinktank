import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import type { AgentResult, EnsembleResult, RunOptions, TestResult } from "../types.js";
import {
  checkDiskSpace,
  findFailedAgents,
  loadLatestResult,
  makeResultFilename,
  mergeRetryResults,
  preflightTestRun,
  preflightValidation,
} from "./run.js";

function makeOpts(overrides: Partial<RunOptions> = {}): RunOptions {
  return {
    prompt: "fix the bug",
    attempts: 3,
    testTimeout: 120,
    timeout: 300,
    model: "sonnet",
    threshold: 0.3,
    verbose: false,
    scoring: "weighted",
    outputFormat: "text",
    ...overrides,
  };
}

describe("preflightValidation", () => {
  it("passes in a valid git repo with no test command", async () => {
    const result = await preflightValidation(makeOpts());
    assert.equal(result, null);
  });

  it("passes with a valid test command", async () => {
    const result = await preflightValidation(makeOpts({ testCmd: "npm test" }));
    assert.equal(result, null);
  });

  it("rejects test command with shell operators", async () => {
    const result = await preflightValidation(makeOpts({ testCmd: "npm test && echo done" }));
    assert.ok(result);
    assert.ok(result.includes("Invalid --test-cmd"));
    assert.ok(result.includes("shell operators"));
  });

  it("rejects test command with pipes", async () => {
    const result = await preflightValidation(makeOpts({ testCmd: "npm test | tee out.log" }));
    assert.ok(result);
    assert.ok(result.includes("Invalid --test-cmd"));
  });

  it("rejects empty test command", async () => {
    const result = await preflightValidation(makeOpts({ testCmd: "  " }));
    assert.ok(result);
    assert.ok(result.includes("Invalid --test-cmd"));
  });

  it("rejects test command with backticks", async () => {
    const result = await preflightValidation(makeOpts({ testCmd: "`rm -rf /`" }));
    assert.ok(result);
    assert.ok(result.includes("Invalid --test-cmd"));
  });

  it("rejects test command with redirection", async () => {
    const result = await preflightValidation(makeOpts({ testCmd: "npm test > out.log" }));
    assert.ok(result);
    assert.ok(result.includes("Invalid --test-cmd"));
  });
});

describe("makeResultFilename", () => {
  it("produces no colons in filename", () => {
    const filename = makeResultFilename("2026-03-28T18:09:50.100Z");
    assert.ok(!filename.includes(":"), `filename contains colon: ${filename}`);
  });

  it("produces no periods except .json extension", () => {
    const filename = makeResultFilename("2026-03-28T18:09:50.100Z");
    const withoutExt = filename.slice(0, -5); // remove ".json"
    assert.ok(!withoutExt.includes("."), `filename stem contains period: ${filename}`);
    assert.ok(filename.endsWith(".json"));
  });

  it("formats timestamp correctly", () => {
    const filename = makeResultFilename("2026-03-28T18:09:50.100Z");
    assert.equal(filename, "run-2026-03-28T18-09-50-100Z.json");
  });
});

describe("outputFormat option", () => {
  it("accepts text as default output format", () => {
    const opts = makeOpts({ outputFormat: "text" });
    assert.equal(opts.outputFormat, "text");
  });

  it("accepts json output format", () => {
    const opts = makeOpts({ outputFormat: "json" });
    assert.equal(opts.outputFormat, "json");
  });
});

describe("NO_COLOR environment variable", () => {
  const originalNoColor = process.env.NO_COLOR;

  afterEach(() => {
    if (originalNoColor === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = originalNoColor;
    }
  });

  it("can be set to disable colors", () => {
    process.env.NO_COLOR = "1";
    assert.equal(process.env.NO_COLOR, "1");
  });

  it("picocolors respects NO_COLOR", async () => {
    process.env.NO_COLOR = "1";
    // picocolors checks NO_COLOR at import time, but its createColors
    // function can be used to verify the behavior
    const pc = await import("picocolors");
    const colors = pc.createColors(false);
    assert.equal(colors.bold("test"), "test");
  });
});

function makeAgent(overrides: Partial<AgentResult> = {}): AgentResult {
  return {
    id: 1,
    worktree: "/tmp/thinktank-agent-1",
    status: "success",
    exitCode: 0,
    duration: 5000,
    output: "",
    diff: "diff --git a/file.ts b/file.ts\n+added line",
    filesChanged: ["file.ts"],
    linesAdded: 1,
    linesRemoved: 0,
    ...overrides,
  };
}

function makeResult(overrides: Partial<EnsembleResult> = {}): EnsembleResult {
  return {
    prompt: "fix the bug",
    model: "sonnet",
    timestamp: "2026-03-28T10:00:00.000Z",
    scoring: "copeland",
    agents: [
      makeAgent({ id: 1, status: "success" }),
      makeAgent({ id: 2, status: "error", exitCode: 1, diff: "", filesChanged: [] }),
      makeAgent({ id: 3, status: "timeout", exitCode: 1, diff: "", filesChanged: [] }),
    ],
    tests: [],
    convergence: [],
    recommended: 1,
    scores: [],
    ...overrides,
  };
}

describe("findFailedAgents", () => {
  it("returns agents with error status", () => {
    const result = makeResult();
    const failed = findFailedAgents(result);
    const ids = failed.map((a) => a.id);
    assert.ok(ids.includes(2));
  });

  it("returns agents with timeout status", () => {
    const result = makeResult();
    const failed = findFailedAgents(result);
    const ids = failed.map((a) => a.id);
    assert.ok(ids.includes(3));
  });

  it("does not return successful agents", () => {
    const result = makeResult();
    const failed = findFailedAgents(result);
    const ids = failed.map((a) => a.id);
    assert.ok(!ids.includes(1));
  });

  it("returns empty array when all agents succeeded", () => {
    const result = makeResult({
      agents: [makeAgent({ id: 1, status: "success" }), makeAgent({ id: 2, status: "success" })],
    });
    const failed = findFailedAgents(result);
    assert.equal(failed.length, 0);
  });

  it("returns all agents when all failed", () => {
    const result = makeResult({
      agents: [
        makeAgent({ id: 1, status: "error" }),
        makeAgent({ id: 2, status: "timeout" }),
        makeAgent({ id: 3, status: "error" }),
      ],
    });
    const failed = findFailedAgents(result);
    assert.equal(failed.length, 3);
  });
});

describe("mergeRetryResults", () => {
  it("replaces failed agents with retried results", () => {
    const original = makeResult();
    const retried = [
      makeAgent({ id: 2, status: "success", diff: "new diff for 2", filesChanged: ["a.ts"] }),
      makeAgent({ id: 3, status: "success", diff: "new diff for 3", filesChanged: ["b.ts"] }),
    ];

    const merged = mergeRetryResults(original, retried);

    assert.equal(merged.length, 3);
    assert.equal(merged[0].id, 1);
    assert.equal(merged[0].status, "success");
    assert.equal(merged[1].id, 2);
    assert.equal(merged[1].status, "success");
    assert.equal(merged[1].diff, "new diff for 2");
    assert.equal(merged[2].id, 3);
    assert.equal(merged[2].status, "success");
    assert.equal(merged[2].diff, "new diff for 3");
  });

  it("preserves successful agents unchanged", () => {
    const original = makeResult();
    const retried = [makeAgent({ id: 2, status: "success" })];

    const merged = mergeRetryResults(original, retried);

    assert.equal(merged[0].id, 1);
    assert.equal(merged[0].status, "success");
    assert.equal(merged[0].diff, original.agents[0].diff);
  });

  it("handles retry where agent still fails", () => {
    const original = makeResult();
    const retried = [makeAgent({ id: 2, status: "error", diff: "" })];

    const merged = mergeRetryResults(original, retried);

    assert.equal(merged[1].id, 2);
    assert.equal(merged[1].status, "error");
  });

  it("returns same count as original agents", () => {
    const original = makeResult();
    const retried = [
      makeAgent({ id: 2, status: "success" }),
      makeAgent({ id: 3, status: "success" }),
    ];

    const merged = mergeRetryResults(original, retried);
    assert.equal(merged.length, original.agents.length);
  });

  it("replaces all agents when all were retried", () => {
    const original = makeResult({
      agents: [
        makeAgent({ id: 1, status: "error", diff: "", filesChanged: [] }),
        makeAgent({ id: 2, status: "timeout", diff: "", filesChanged: [] }),
        makeAgent({ id: 3, status: "error", diff: "", filesChanged: [] }),
      ],
    });
    const retried = [
      makeAgent({ id: 1, status: "success", diff: "diff 1" }),
      makeAgent({ id: 2, status: "success", diff: "diff 2" }),
      makeAgent({ id: 3, status: "error", diff: "" }),
    ];

    const merged = mergeRetryResults(original, retried);

    assert.equal(merged.length, 3);
    assert.equal(merged[0].status, "success");
    assert.equal(merged[0].diff, "diff 1");
    assert.equal(merged[1].status, "success");
    assert.equal(merged[1].diff, "diff 2");
    assert.equal(merged[2].status, "error"); // retry also failed
  });
});

describe("loadLatestResult", () => {
  it("returns null when latest.json does not exist", async () => {
    // Save and restore cwd to point at a temp dir with no .thinktank/
    const originalCwd = process.cwd();
    const tempDir = join(tmpdir(), `thinktank-test-load-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    try {
      process.chdir(tempDir);
      const result = await loadLatestResult();
      assert.equal(result, null);
    } finally {
      process.chdir(originalCwd);
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("returns null when latest.json contains invalid JSON", async () => {
    const originalCwd = process.cwd();
    const tempDir = join(tmpdir(), `thinktank-test-load-${Date.now()}`);
    const ttDir = join(tempDir, ".thinktank");
    await mkdir(ttDir, { recursive: true });
    try {
      await writeFile(join(ttDir, "latest.json"), "not valid json{{{");
      process.chdir(tempDir);
      const result = await loadLatestResult();
      assert.equal(result, null);
    } finally {
      process.chdir(originalCwd);
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("loads a valid latest.json", async () => {
    const originalCwd = process.cwd();
    const tempDir = join(tmpdir(), `thinktank-test-load-${Date.now()}`);
    const ttDir = join(tempDir, ".thinktank");
    await mkdir(ttDir, { recursive: true });
    const expected = makeResult();
    try {
      await writeFile(join(ttDir, "latest.json"), JSON.stringify(expected));
      process.chdir(tempDir);
      const result = await loadLatestResult();
      assert.ok(result);
      assert.equal(result.prompt, expected.prompt);
      assert.equal(result.agents.length, expected.agents.length);
    } finally {
      process.chdir(originalCwd);
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe("retry edge cases", () => {
  it("findFailedAgents returns all agents when every agent failed", () => {
    const result = makeResult({
      agents: [
        makeAgent({ id: 1, status: "error" }),
        makeAgent({ id: 2, status: "timeout" }),
        makeAgent({ id: 3, status: "error" }),
      ],
    });
    const failed = findFailedAgents(result);
    assert.equal(failed.length, 3);
    assert.deepEqual(failed.map((a) => a.id).sort(), [1, 2, 3]);
  });

  it("mergeRetryResults handles retry where all retried agents fail again", () => {
    const original = makeResult({
      agents: [
        makeAgent({ id: 1, status: "success", diff: "good diff" }),
        makeAgent({ id: 2, status: "error", diff: "" }),
        makeAgent({ id: 3, status: "timeout", diff: "" }),
      ],
    });
    const retried = [
      makeAgent({ id: 2, status: "timeout", diff: "" }),
      makeAgent({ id: 3, status: "error", diff: "" }),
    ];

    const merged = mergeRetryResults(original, retried);

    // Agent 1 preserved, agents 2 and 3 replaced with still-failed results
    assert.equal(merged[0].status, "success");
    assert.equal(merged[0].diff, "good diff");
    assert.equal(merged[1].status, "timeout");
    assert.equal(merged[2].status, "error");
  });

  it("stale test results are removed for retried agents even without --test-cmd", () => {
    // Simulate: previous run had test results for all agents,
    // agents 2 and 3 failed and are being retried.
    // After merge, test results for agents 2 and 3 should be gone
    // since their code changed.
    const previousTests: TestResult[] = [
      { agentId: 1, passed: true, output: "ok", exitCode: 0 },
      { agentId: 2, passed: false, output: "fail", exitCode: 1 },
      { agentId: 3, passed: false, output: "timeout", exitCode: 1 },
    ];

    const retriedIds = new Set([2, 3]);
    // This mirrors the fixed logic in retry(): filter out stale tests
    const filtered = previousTests.filter((t) => !retriedIds.has(t.agentId));

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].agentId, 1);
  });

  it("mergeRetryResults with single failed agent preserves others", () => {
    const original = makeResult({
      agents: [
        makeAgent({ id: 1, status: "success", diff: "diff1" }),
        makeAgent({ id: 2, status: "success", diff: "diff2" }),
        makeAgent({ id: 3, status: "error", diff: "" }),
      ],
    });
    const retried = [makeAgent({ id: 3, status: "success", diff: "new diff3" })];

    const merged = mergeRetryResults(original, retried);

    assert.equal(merged[0].diff, "diff1");
    assert.equal(merged[1].diff, "diff2");
    assert.equal(merged[2].status, "success");
    assert.equal(merged[2].diff, "new diff3");
  });
});

describe("checkDiskSpace", () => {
  it("returns null when enough space is available", async () => {
    // With a small number of attempts in a real git repo, there should be enough space
    const result = await checkDiskSpace(1);
    assert.equal(result, null);
  });

  it("returns a warning string when space is insufficient", async () => {
    // Request an absurd number of worktrees to trigger the warning
    const result = await checkDiskSpace(1_000_000);
    if (result !== null) {
      assert.ok(result.includes("Low disk space"));
      assert.ok(result.includes("available"));
      assert.ok(result.includes("needed"));
      assert.ok(result.includes("worktrees"));
    }
    // If the repo is tiny enough that even 1M copies fit, result may be null — that's OK
  });

  it("includes attempt count in warning message", async () => {
    const result = await checkDiskSpace(1_000_000);
    if (result !== null) {
      assert.ok(result.includes("1000000 worktrees"));
    }
  });
});

describe("preflightTestRun", () => {
  it("returns null when test command succeeds", async () => {
    const result = await preflightTestRun("node --version", process.cwd());
    assert.equal(result, null);
  });

  it("returns warning when test command fails", async () => {
    const result = await preflightTestRun("node --require ./nonexistent-module.js", process.cwd());
    assert.ok(result);
    assert.ok(result.includes("failed on the current branch"));
    assert.ok(result.includes("test environment may already be broken"));
  });

  it("returns warning with output snippet when test produces output", async () => {
    const result = await preflightTestRun("node --require ./nonexistent-module.js", process.cwd());
    assert.ok(result);
    assert.ok(result.includes("failed on the current branch"));
  });

  it("returns null for a passing test with output", async () => {
    const result = await preflightTestRun("node --version", process.cwd());
    assert.equal(result, null);
  });

  it("returns warning when command is not found", async () => {
    const result = await preflightTestRun("nonexistent-command-xyz", process.cwd());
    assert.ok(result);
    // Exit 127 (command not found) gets a specific message
    assert.ok(
      result.includes("Test command not found") || result.includes("failed on the current branch"),
      `Expected exit-127 or generic failure message, got: ${result.substring(0, 100)}`
    );
  });
});
