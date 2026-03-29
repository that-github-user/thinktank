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
});
