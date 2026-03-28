import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeResultFilename } from "./run.js";

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
