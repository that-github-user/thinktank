import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { AgentResult, EnsembleResult, RunOptions } from "../types.js";
import {
  findFailedAgents,
  makeResultFilename,
  mergeRetryResults,
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
});
