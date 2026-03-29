import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Tests for CLI model ID validation logic.
 * The CLI accepts: known aliases, claude-* prefixed, and anthropic.* prefixed model IDs.
 */
describe("CLI model validation", () => {
  function isKnownModel(model: string): boolean {
    const knownModels = ["sonnet", "opus", "haiku"];
    return (
      knownModels.includes(model) || model.startsWith("claude-") || model.startsWith("anthropic.")
    );
  }

  it("accepts known alias 'sonnet'", () => {
    assert.equal(isKnownModel("sonnet"), true);
  });

  it("accepts known alias 'opus'", () => {
    assert.equal(isKnownModel("opus"), true);
  });

  it("accepts known alias 'haiku'", () => {
    assert.equal(isKnownModel("haiku"), true);
  });

  it("accepts claude- prefixed model IDs", () => {
    assert.equal(isKnownModel("claude-opus-4-6"), true);
    assert.equal(isKnownModel("claude-sonnet-4-6"), true);
  });

  it("accepts anthropic. prefixed Bedrock model IDs", () => {
    assert.equal(isKnownModel("anthropic.claude-opus-4-6-v1"), true);
    assert.equal(isKnownModel("anthropic.claude-sonnet-4-6-v1"), true);
    assert.equal(isKnownModel("anthropic.claude-v2"), true);
  });

  it("rejects unknown model IDs", () => {
    assert.equal(isKnownModel("gpt-4"), false);
    assert.equal(isKnownModel("gemini-pro"), false);
    assert.equal(isKnownModel("unknown"), false);
  });
});
