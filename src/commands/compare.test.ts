import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diffSimilarity, parseDiff } from "../scoring/diff-parser.js";

describe("compare logic", () => {
  const diffA = "diff --git a/a.ts b/a.ts\n--- a/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n+const x = 1;";
  const diffB = "diff --git a/b.ts b/b.ts\n--- a/b.ts\n+++ b/b.ts\n@@ -1 +1 @@\n+const y = 2;";

  it("computes similarity between two diffs", () => {
    const sim = diffSimilarity(diffA, diffA);
    assert.equal(sim, 1);
  });

  it("returns 0 for completely different diffs", () => {
    const sim = diffSimilarity(diffA, diffB);
    assert.equal(sim, 0);
  });

  it("identifies files changed by each agent", () => {
    const filesA = new Set(parseDiff(diffA).map((f) => f.path));
    const filesB = new Set(parseDiff(diffB).map((f) => f.path));
    const allFiles = new Set([...filesA, ...filesB]);

    assert.equal(allFiles.size, 2);
    assert.ok(allFiles.has("a.ts"));
    assert.ok(allFiles.has("b.ts"));
  });

  it("counts shared vs unique added lines", () => {
    const linesA = new Set(parseDiff(diffA).flatMap((f) => f.addedLines.map((l) => l.trim())));
    const linesB = new Set(parseDiff(diffB).flatMap((f) => f.addedLines.map((l) => l.trim())));

    let shared = 0;
    for (const line of linesA) {
      if (linesB.has(line)) shared++;
    }
    assert.equal(shared, 0); // completely different
  });
});
