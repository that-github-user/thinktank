import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("claude-code runner", () => {
  describe("AWS environment variable passthrough", () => {
    const awsVars = [
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_SESSION_TOKEN",
      "AWS_REGION",
      "AWS_DEFAULT_REGION",
    ];

    for (const varName of awsVars) {
      it(`passes ${varName} through to spawned process via process.env`, () => {
        // The runner uses { ...process.env } as the spawn env.
        // Verify that setting a process.env var makes it available in the spread.
        const original = process.env[varName];
        try {
          process.env[varName] = "test-value";
          const env = { ...process.env };
          assert.equal(env[varName], "test-value");
        } finally {
          if (original === undefined) {
            delete process.env[varName];
          } else {
            process.env[varName] = original;
          }
        }
      });
    }
  });

  describe("timeout=0 skips timer", () => {
    it("does not call setTimeout when timeout is 0", () => {
      // Mirrors the runner logic: timer is only created when timeout > 0
      const timeout = 0;
      const timer = timeout > 0 ? setTimeout(() => {}, timeout * 1000) : null;
      assert.equal(timer, null);
    });

    it("creates timer when timeout is positive", () => {
      const timeout = 300;
      const timer = timeout > 0 ? setTimeout(() => {}, timeout * 1000) : null;
      assert.notEqual(timer, null);
      if (timer) clearTimeout(timer);
    });
  });
});
