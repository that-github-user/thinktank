import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDuration, padRight } from "./display.js";

describe("padRight", () => {
  it("pads plain text to target length", () => {
    assert.equal(padRight("hello", 10), "hello     ");
  });

  it("does not pad if already at target length", () => {
    assert.equal(padRight("hello", 5), "hello");
  });

  it("does not truncate if longer than target", () => {
    assert.equal(padRight("hello world", 5), "hello world");
  });

  it("handles ANSI codes in length calculation", () => {
    const colored = "\x1b[32mok\x1b[0m"; // "ok" in green
    const padded = padRight(colored, 6);
    // Visual length is 2 ("ok"), so should add 4 spaces
    assert.ok(padded.endsWith("    "));
  });

  it("handles empty string", () => {
    assert.equal(padRight("", 5), "     ");
  });
});

describe("formatDuration", () => {
  it("formats seconds", () => {
    assert.equal(formatDuration(5000), "5s");
    assert.equal(formatDuration(45000), "45s");
  });

  it("formats minutes and seconds", () => {
    assert.equal(formatDuration(65000), "1m5s");
    assert.equal(formatDuration(125000), "2m5s");
  });

  it("handles zero", () => {
    assert.equal(formatDuration(0), "0s");
  });

  it("rounds to nearest second", () => {
    assert.equal(formatDuration(1499), "1s");
    assert.equal(formatDuration(1500), "2s");
  });
});
