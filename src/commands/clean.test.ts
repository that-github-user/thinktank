import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseThinktankWorktrees } from "./clean.js";

describe("parseThinktankWorktrees", () => {
  it("extracts thinktank-agent paths from git worktree list output", () => {
    const output = [
      "/home/user/project  abc1234 [main]",
      "/tmp/thinktank-agent-1-abcd1234  def5678 [thinktank/agent-1-abcd1234]",
      "/tmp/thinktank-agent-2-efgh5678  ghi9012 [thinktank/agent-2-efgh5678]",
    ].join("\n");

    const result = parseThinktankWorktrees(output);
    assert.deepEqual(result, [
      "/tmp/thinktank-agent-1-abcd1234",
      "/tmp/thinktank-agent-2-efgh5678",
    ]);
  });

  it("returns empty array when no thinktank worktrees exist", () => {
    const output = "/home/user/project  abc1234 [main]\n";
    const result = parseThinktankWorktrees(output);
    assert.deepEqual(result, []);
  });

  it("returns empty array for empty output", () => {
    assert.deepEqual(parseThinktankWorktrees(""), []);
  });

  it("handles Windows-style paths", () => {
    const output = [
      "C:/Users/dev/project  abc1234 [main]",
      "C:/Users/dev/AppData/Local/Temp/thinktank-agent-3-xyz  def5678 [thinktank/agent-3-xyz]",
    ].join("\n");

    const result = parseThinktankWorktrees(output);
    assert.deepEqual(result, ["C:/Users/dev/AppData/Local/Temp/thinktank-agent-3-xyz"]);
  });

  it("ignores paths that contain thinktank but not thinktank-agent", () => {
    const output = [
      "/home/user/thinktank  abc1234 [main]",
      "/tmp/thinktank-agent-1-abcd  def5678 [thinktank/agent-1-abcd]",
    ].join("\n");

    const result = parseThinktankWorktrees(output);
    assert.deepEqual(result, ["/tmp/thinktank-agent-1-abcd"]);
  });
});
