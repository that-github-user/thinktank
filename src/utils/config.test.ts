import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  BUILT_IN_DEFAULTS,
  getConfigValue,
  isValidConfigKey,
  loadConfig,
  loadFileConfig,
  setConfigValue,
} from "./config.js";

const CONFIG_DIR = ".thinktank";
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

describe("config", () => {
  let originalCwd: string;
  let tmpDir: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpDir = join(
      process.env.TEMP || process.env.TMPDIR || "/tmp",
      `thinktank-config-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(tmpDir, { recursive: true });
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("BUILT_IN_DEFAULTS", () => {
    it("has expected default values", () => {
      assert.equal(BUILT_IN_DEFAULTS.attempts, 3);
      assert.equal(BUILT_IN_DEFAULTS.model, "sonnet");
      assert.equal(BUILT_IN_DEFAULTS.timeout, 300);
      assert.equal(BUILT_IN_DEFAULTS.runner, "claude-code");
      assert.equal(BUILT_IN_DEFAULTS.threshold, 0.3);
      assert.equal(BUILT_IN_DEFAULTS.testTimeout, 120);
    });
  });

  describe("isValidConfigKey", () => {
    it("returns true for valid keys", () => {
      assert.equal(isValidConfigKey("attempts"), true);
      assert.equal(isValidConfigKey("model"), true);
      assert.equal(isValidConfigKey("timeout"), true);
      assert.equal(isValidConfigKey("runner"), true);
      assert.equal(isValidConfigKey("threshold"), true);
      assert.equal(isValidConfigKey("testTimeout"), true);
    });

    it("returns false for invalid keys", () => {
      assert.equal(isValidConfigKey("invalid"), false);
      assert.equal(isValidConfigKey(""), false);
      assert.equal(isValidConfigKey("ATTEMPTS"), false);
    });
  });

  describe("loadFileConfig", () => {
    it("returns empty object when no config file exists", () => {
      const result = loadFileConfig();
      assert.deepEqual(result, {});
    });

    it("loads config from .thinktank/config.json", () => {
      mkdirSync(CONFIG_DIR, { recursive: true });
      writeFileSync(CONFIG_FILE, JSON.stringify({ attempts: 5, model: "opus" }));
      const result = loadFileConfig();
      assert.equal(result.attempts, 5);
      assert.equal(result.model, "opus");
    });

    it("ignores unknown keys in config file", () => {
      mkdirSync(CONFIG_DIR, { recursive: true });
      writeFileSync(CONFIG_FILE, JSON.stringify({ attempts: 5, unknownKey: "value" }));
      const result = loadFileConfig();
      assert.equal(result.attempts, 5);
      assert.equal((result as Record<string, unknown>).unknownKey, undefined);
    });

    it("returns empty object for invalid JSON", () => {
      mkdirSync(CONFIG_DIR, { recursive: true });
      writeFileSync(CONFIG_FILE, "not json{{{");
      const result = loadFileConfig();
      assert.deepEqual(result, {});
    });
  });

  describe("loadConfig", () => {
    it("returns built-in defaults when no config file exists", () => {
      const result = loadConfig();
      assert.deepEqual(result, BUILT_IN_DEFAULTS);
    });

    it("merges file config with defaults", () => {
      mkdirSync(CONFIG_DIR, { recursive: true });
      writeFileSync(CONFIG_FILE, JSON.stringify({ attempts: 7 }));
      const result = loadConfig();
      assert.equal(result.attempts, 7);
      assert.equal(result.model, "sonnet");
      assert.equal(result.timeout, 300);
    });
  });

  describe("setConfigValue", () => {
    it("sets a numeric value", () => {
      const error = setConfigValue("attempts", "5");
      assert.equal(error, null);
      const config = loadFileConfig();
      assert.equal(config.attempts, 5);
    });

    it("sets a string value", () => {
      const error = setConfigValue("model", "opus");
      assert.equal(error, null);
      const config = loadFileConfig();
      assert.equal(config.model, "opus");
    });

    it("preserves existing values when setting new ones", () => {
      setConfigValue("attempts", "5");
      setConfigValue("model", "opus");
      const config = loadFileConfig();
      assert.equal(config.attempts, 5);
      assert.equal(config.model, "opus");
    });

    it("returns error for unknown key", () => {
      const error = setConfigValue("bogus", "123");
      assert.ok(error);
      assert.match(error, /Unknown config key/);
    });

    it("returns error for non-numeric value on numeric key", () => {
      const error = setConfigValue("attempts", "abc");
      assert.ok(error);
      assert.match(error, /must be a number/);
    });

    it("returns error for out-of-range attempts", () => {
      const error = setConfigValue("attempts", "25");
      assert.ok(error);
      assert.match(error, /attempts must be an integer between 1 and 20/);
    });

    it("returns error for out-of-range timeout", () => {
      const error = setConfigValue("timeout", "5");
      assert.ok(error);
      assert.match(error, /timeout must be an integer between 10 and 600/);
    });

    it("returns error for out-of-range threshold", () => {
      const error = setConfigValue("threshold", "1.5");
      assert.ok(error);
      assert.match(error, /threshold must be a number between 0.0 and 1.0/);
    });
  });

  describe("getConfigValue", () => {
    it("returns default value when no config file exists", () => {
      const result = getConfigValue("attempts");
      assert.deepEqual(result, { value: "3", source: "default" });
    });

    it("returns config value when set", () => {
      setConfigValue("attempts", "7");
      const result = getConfigValue("attempts");
      assert.deepEqual(result, { value: "7", source: "config" });
    });

    it("returns error for unknown key", () => {
      const result = getConfigValue("bogus");
      assert.equal(typeof result, "string");
      assert.match(result as string, /Unknown config key/);
    });
  });
});
