import assert from "node:assert/strict";
import { unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { resolvePrompt } from "./prompt.js";

describe("resolvePrompt", () => {
  it("returns positional argument when provided", () => {
    const result = resolvePrompt("fix the bug", undefined);
    assert.equal(result, "fix the bug");
  });

  it("reads prompt from file via --file", () => {
    const tmpFile = join(tmpdir(), `thinktank-test-prompt-${Date.now()}.txt`);
    writeFileSync(tmpFile, "prompt from file\nwith newlines\n");
    try {
      const result = resolvePrompt(undefined, tmpFile);
      assert.equal(result, "prompt from file\nwith newlines");
    } finally {
      unlinkSync(tmpFile);
    }
  });

  it("--file takes priority over positional argument", () => {
    const tmpFile = join(tmpdir(), `thinktank-test-prompt-${Date.now()}.txt`);
    writeFileSync(tmpFile, "file wins\n");
    try {
      const result = resolvePrompt("positional", tmpFile);
      assert.equal(result, "file wins");
    } finally {
      unlinkSync(tmpFile);
    }
  });

  it("handles prompt containing flag-like strings via --file", () => {
    const tmpFile = join(tmpdir(), `thinktank-test-prompt-${Date.now()}.txt`);
    writeFileSync(tmpFile, "Fix the -n parsing bug and --timeout handling\n");
    try {
      const result = resolvePrompt(undefined, tmpFile);
      assert.equal(result, "Fix the -n parsing bug and --timeout handling");
    } finally {
      unlinkSync(tmpFile);
    }
  });

  it("handles prompt with special characters via --file", () => {
    const tmpFile = join(tmpdir(), `thinktank-test-prompt-${Date.now()}.txt`);
    const specialPrompt = "Line 1\nLine 2\n---\n- bullet with -n 5\n$VAR `backticks`";
    writeFileSync(tmpFile, specialPrompt);
    try {
      const result = resolvePrompt(undefined, tmpFile);
      assert.equal(result, specialPrompt);
    } finally {
      unlinkSync(tmpFile);
    }
  });
});
