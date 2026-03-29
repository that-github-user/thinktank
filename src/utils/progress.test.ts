import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AgentResult } from "../types.js";
import { createProgressTracker } from "./progress.js";

function makeAgent(overrides: Partial<AgentResult> = {}): AgentResult {
  return {
    id: 1,
    worktree: "/tmp/thinktank-agent-1",
    status: "success",
    exitCode: 0,
    duration: 45000,
    output: "",
    diff: "diff --git a/file.ts b/file.ts\n+added line",
    filesChanged: ["file.ts", "other.ts"],
    linesAdded: 2,
    linesRemoved: 0,
    ...overrides,
  };
}

function createMockStream(): { write(s: string): boolean; output: string[] } {
  const output: string[] = [];
  return {
    write(s: string) {
      output.push(s);
      return true;
    },
    output,
  };
}

describe("createProgressTracker — TTY mode", () => {
  it("writes a running line for each agent on start", () => {
    const stream = createMockStream();
    const tracker = createProgressTracker([1, 2, 3], true, stream);
    tracker.start();

    assert.equal(stream.output.length, 3);
    assert.ok(stream.output[0].includes("Agent #1: running..."));
    assert.ok(stream.output[1].includes("Agent #2: running..."));
    assert.ok(stream.output[2].includes("Agent #3: running..."));
  });

  it("updates the correct line when an agent completes", () => {
    const stream = createMockStream();
    const tracker = createProgressTracker([1, 2, 3], true, stream);
    tracker.start();

    const agent = makeAgent({ id: 2, duration: 45000, filesChanged: ["a.ts", "b.ts"] });
    tracker.onAgentComplete(agent);

    // Should have ANSI escape to move up and rewrite
    const updateOutput = stream.output.slice(3).join("");
    assert.ok(updateOutput.includes("Agent #2: done (45s, 2 files)"));
  });

  it("shows singular 'file' for 1 file changed", () => {
    const stream = createMockStream();
    const tracker = createProgressTracker([1], true, stream);
    tracker.start();

    const agent = makeAgent({ id: 1, duration: 10000, filesChanged: ["a.ts"] });
    tracker.onAgentComplete(agent);

    const updateOutput = stream.output.slice(1).join("");
    assert.ok(updateOutput.includes("1 file)"), `Expected singular 'file' in: ${updateOutput}`);
  });

  it("shows status for failed agents", () => {
    const stream = createMockStream();
    const tracker = createProgressTracker([1], true, stream);
    tracker.start();

    const agent = makeAgent({ id: 1, status: "error", duration: 5000 });
    tracker.onAgentComplete(agent);

    const updateOutput = stream.output.slice(1).join("");
    assert.ok(updateOutput.includes("error (5s)"));
  });

  it("shows status for timed-out agents", () => {
    const stream = createMockStream();
    const tracker = createProgressTracker([1], true, stream);
    tracker.start();

    const agent = makeAgent({ id: 1, status: "timeout", duration: 300000 });
    tracker.onAgentComplete(agent);

    const updateOutput = stream.output.slice(1).join("");
    assert.ok(updateOutput.includes("timeout (300s)"));
  });

  it("handles all agents completing", () => {
    const stream = createMockStream();
    const tracker = createProgressTracker([1, 2], true, stream);
    tracker.start();

    tracker.onAgentComplete(makeAgent({ id: 1, duration: 30000, filesChanged: ["a.ts"] }));
    tracker.onAgentComplete(makeAgent({ id: 2, duration: 40000, filesChanged: ["b.ts", "c.ts"] }));
    tracker.finish();

    const all = stream.output.join("");
    assert.ok(all.includes("Agent #1: done (30s, 1 file)"));
    assert.ok(all.includes("Agent #2: done (40s, 2 files)"));
  });
});

describe("createProgressTracker — non-TTY mode", () => {
  it("does not write anything on start", () => {
    const stream = createMockStream();
    const tracker = createProgressTracker([1, 2, 3], false, stream);
    tracker.start();

    assert.equal(stream.output.length, 0);
  });

  it("writes progress count on each completion", () => {
    const stream = createMockStream();
    const tracker = createProgressTracker([1, 2, 3], false, stream);
    tracker.start();

    tracker.onAgentComplete(makeAgent({ id: 1 }));
    assert.ok(stream.output[0].includes("1/3 agents complete..."));

    tracker.onAgentComplete(makeAgent({ id: 2 }));
    assert.ok(stream.output[1].includes("2/3 agents complete..."));

    tracker.onAgentComplete(makeAgent({ id: 3 }));
    assert.ok(stream.output[2].includes("3/3 agents complete..."));
  });

  it("writes a trailing newline on finish", () => {
    const stream = createMockStream();
    const tracker = createProgressTracker([1, 2], false, stream);
    tracker.start();

    tracker.onAgentComplete(makeAgent({ id: 1 }));
    tracker.onAgentComplete(makeAgent({ id: 2 }));
    tracker.finish();

    const last = stream.output[stream.output.length - 1];
    assert.equal(last, "\n");
  });

  it("does not write trailing newline if no agents completed", () => {
    const stream = createMockStream();
    const tracker = createProgressTracker([1, 2], false, stream);
    tracker.start();
    tracker.finish();

    assert.equal(stream.output.length, 0);
  });

  it("uses carriage return for in-place updates", () => {
    const stream = createMockStream();
    const tracker = createProgressTracker([1, 2], false, stream);
    tracker.start();

    tracker.onAgentComplete(makeAgent({ id: 1 }));
    assert.ok(stream.output[0].startsWith("\r"));
  });
});
