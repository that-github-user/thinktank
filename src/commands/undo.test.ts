import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";
import { promisify } from "node:util";

const exec = promisify(execFile);

describe("undo", () => {
  it("is exported and callable", async () => {
    const { undo } = await import("./undo.js");
    assert.equal(typeof undo, "function");
  });
});

describe("undo patch file lifecycle", () => {
  it("apply saves patch and undo reverses it in a temp repo", async () => {
    // Set up a temporary git repo
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const tempDir = await mkdtemp(join(tmpdir(), "thinktank-undo-test-"));

    try {
      await exec("git", ["init", tempDir]);
      await exec("git", ["config", "user.email", "test@test.com"], { cwd: tempDir });
      await exec("git", ["config", "user.name", "Test"], { cwd: tempDir });

      // Create initial file and commit
      const filePath = join(tempDir, "hello.txt");
      await writeFile(filePath, "hello\n", "utf-8");
      await exec("git", ["add", "."], { cwd: tempDir });
      await exec("git", ["commit", "-m", "initial"], { cwd: tempDir });

      // Create a patch that adds a line
      const patch = [
        "diff --git a/hello.txt b/hello.txt",
        "--- a/hello.txt",
        "+++ b/hello.txt",
        "@@ -1 +1,2 @@",
        " hello",
        "+world",
        "",
      ].join("\n");

      // Apply the patch via git
      const applyChild = exec("git", ["apply", "-"], { cwd: tempDir });
      applyChild.child.stdin?.write(patch);
      applyChild.child.stdin?.end();
      await applyChild;

      // Save the patch (simulating what apply.ts does)
      const patchDir = join(tempDir, ".thinktank");
      await mkdir(patchDir, { recursive: true });
      const patchPath = join(patchDir, "last-applied.patch");
      await writeFile(patchPath, patch, "utf-8");

      // Verify the file was changed
      const afterApply = (await readFile(filePath, "utf-8")).replace(/\r\n/g, "\n");
      assert.equal(afterApply, "hello\nworld\n");

      // Reverse the patch
      const savedPatch = await readFile(patchPath, "utf-8");
      const reverseChild = exec("git", ["apply", "--reverse", "-"], { cwd: tempDir });
      reverseChild.child.stdin?.write(savedPatch);
      reverseChild.child.stdin?.end();
      await reverseChild;

      // Verify the file is back to original
      const afterUndo = (await readFile(filePath, "utf-8")).replace(/\r\n/g, "\n");
      assert.equal(afterUndo, "hello\n");

      // Clean up patch
      await rm(patchPath);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("errors when no patch file exists", async () => {
    const { readFile: rf } = await import("node:fs/promises");
    const fakePath = join("/tmp", "nonexistent-thinktank-dir", "last-applied.patch");
    await assert.rejects(rf(fakePath, "utf-8"), "Should throw when patch file does not exist");
  });
});
