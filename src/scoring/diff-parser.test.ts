import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diffSimilarity, pairwiseSimilarity, parseDiff } from "./diff-parser.js";

const SAMPLE_DIFF = `diff --git a/src/auth.ts b/src/auth.ts
index abc1234..def5678 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -10,6 +10,8 @@ function authenticate(token: string) {
+  if (!token || token.length === 0) {
+    throw new Error("Invalid token");
+  }
   const decoded = jwt.verify(token);
-  return decoded;
+  return decoded as User;
 }`;

describe("parseDiff", () => {
  it("extracts file path", () => {
    const files = parseDiff(SAMPLE_DIFF);
    assert.equal(files.length, 1);
    assert.equal(files[0]!.path, "src/auth.ts");
  });

  it("extracts added lines", () => {
    const files = parseDiff(SAMPLE_DIFF);
    assert.equal(files[0]!.addedLines.length, 4);
    assert.ok(files[0]!.addedLines[0]!.includes("if (!token"));
  });

  it("extracts removed lines", () => {
    const files = parseDiff(SAMPLE_DIFF);
    assert.equal(files[0]!.removedLines.length, 1);
    assert.ok(files[0]!.removedLines[0]!.includes("return decoded"));
  });

  it("handles multi-file diff", () => {
    const multiDiff = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
+line in a
diff --git a/b.ts b/b.ts
--- a/b.ts
+++ b/b.ts
@@ -1 +1 @@
+line in b`;
    const files = parseDiff(multiDiff);
    assert.equal(files.length, 2);
    assert.equal(files[0]!.path, "a.ts");
    assert.equal(files[1]!.path, "b.ts");
  });

  it("handles empty diff", () => {
    assert.deepEqual(parseDiff(""), []);
  });

  it("skips binary file entries", () => {
    const binaryDiff = `diff --git a/image.png b/image.png
index abc1234..def5678 100644
Binary files a/image.png and b/image.png differ
diff --git a/src/auth.ts b/src/auth.ts
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1 +1 @@
+const x = 1;`;
    const files = parseDiff(binaryDiff);
    assert.equal(files.length, 1);
    assert.equal(files[0]!.path, "src/auth.ts");
  });

  it("handles filenames with spaces (quoted paths)", () => {
    const quotedDiff = `diff --git "a/src/my component.tsx" "b/src/my component.tsx"
--- "a/src/my component.tsx"
+++ "b/src/my component.tsx"
@@ -1 +1 @@
+export default function MyComponent() {}`;
    const files = parseDiff(quotedDiff);
    assert.equal(files.length, 1);
    assert.equal(files[0]!.path, "src/my component.tsx");
  });
});

describe("diffSimilarity", () => {
  it("returns 1 for identical diffs", () => {
    assert.equal(diffSimilarity(SAMPLE_DIFF, SAMPLE_DIFF), 1);
  });

  it("returns 0 for completely different diffs", () => {
    const diffA = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
+console.log("hello")`;
    const diffB = `diff --git a/b.ts b/b.ts
--- a/b.ts
+++ b/b.ts
@@ -1 +1 @@
+process.exit(0)`;
    assert.equal(diffSimilarity(diffA, diffB), 0);
  });

  it("returns partial similarity for overlapping diffs", () => {
    const diffA = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
+const x = 1;
+const y = 2;`;
    const diffB = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
+const x = 1;
+const z = 3;`;
    const sim = diffSimilarity(diffA, diffB);
    assert.ok(sim > 0, "should have some similarity");
    assert.ok(sim < 1, "should not be identical");
  });

  it("returns 1 for two empty diffs", () => {
    assert.equal(diffSimilarity("", ""), 1);
  });

  it("treats reformatted code as different by default", () => {
    const diffA = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
+if (x) {  return  true; }`;
    const diffB = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
+if (x) { return true; }`;
    const sim = diffSimilarity(diffA, diffB);
    assert.ok(sim < 1, "default mode should see whitespace differences");
  });

  it("whitespace-insensitive mode treats reformatted code as identical", () => {
    const diffA = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
+if (x) {  return  true; }`;
    const diffB = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
+if (x) { return true; }`;
    assert.equal(diffSimilarity(diffA, diffB, true), 1);
  });

  it("whitespace-insensitive mode normalizes indentation differences", () => {
    const diffA = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
+    const x = 1;
+        const y = 2;`;
    const diffB = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
+  const x = 1;
+  const y = 2;`;
    assert.equal(diffSimilarity(diffA, diffB, true), 1);
  });

  it("whitespace-insensitive mode still detects real code differences", () => {
    const diffA = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
+const x = 1;`;
    const diffB = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
+const y = 2;`;
    assert.equal(diffSimilarity(diffA, diffB, true), 0);
  });
});

describe("pairwiseSimilarity", () => {
  it("computes all pairs", () => {
    const agents = [
      { id: 1, diff: SAMPLE_DIFF },
      { id: 2, diff: SAMPLE_DIFF },
      { id: 3, diff: "" },
    ];
    const matrix = pairwiseSimilarity(agents);
    assert.equal(matrix.size, 3); // 3 pairs: 1-2, 1-3, 2-3
    assert.equal(matrix.get("1-2"), 1); // identical diffs
  });
});
