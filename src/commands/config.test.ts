import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { config } from "./config.js";

const CONFIG_DIR = ".thinktank";
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

describe("config command", () => {
  let originalCwd: string;
  let tmpDir: string;
  let logs: string[];
  let originalLog: typeof console.log;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpDir = join(
      process.env.TEMP || process.env.TMPDIR || "/tmp",
      `thinktank-config-cmd-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(tmpDir, { recursive: true });
    process.chdir(tmpDir);

    logs = [];
    originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };
  });

  afterEach(() => {
    console.log = originalLog;
    process.chdir(originalCwd);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("set", () => {
    it("creates config file and sets value", () => {
      config("set", "attempts", "5");
      const raw = readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      assert.equal(parsed.attempts, 5);
      assert.ok(logs.some((l) => l.includes("Set") && l.includes("attempts")));
    });
  });

  describe("get", () => {
    it("shows default value when not configured", () => {
      config("get", "attempts");
      assert.ok(logs.some((l) => l.includes("attempts") && l.includes("3")));
    });

    it("shows configured value after set", () => {
      config("set", "attempts", "7");
      logs = [];
      config("get", "attempts");
      assert.ok(logs.some((l) => l.includes("attempts") && l.includes("7")));
    });
  });

  describe("list", () => {
    it("shows all config keys with defaults", () => {
      config("list");
      assert.ok(logs.some((l) => l.includes("attempts")));
      assert.ok(logs.some((l) => l.includes("model")));
      assert.ok(logs.some((l) => l.includes("timeout")));
      assert.ok(logs.some((l) => l.includes("runner")));
      assert.ok(logs.some((l) => l.includes("threshold")));
      assert.ok(logs.some((l) => l.includes("testTimeout")));
    });

    it("shows custom values after set", () => {
      mkdirSync(CONFIG_DIR, { recursive: true });
      writeFileSync(CONFIG_FILE, JSON.stringify({ attempts: 10 }));
      config("list");
      assert.ok(logs.some((l) => l.includes("attempts") && l.includes("10")));
    });
  });
});
