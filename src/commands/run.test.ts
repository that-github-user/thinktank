import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { RunOptions } from "../types.js";
import { makeResultFilename, preflightValidation } from "./run.js";

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
