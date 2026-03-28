import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Config {
  attempts: number;
  model: string;
  timeout: number;
  runner: string;
  threshold: number;
  testTimeout: number;
}

export const BUILT_IN_DEFAULTS: Config = {
  attempts: 3,
  model: "sonnet",
  timeout: 300,
  runner: "claude-code",
  threshold: 0.3,
  testTimeout: 120,
};

const CONFIG_DIR = ".thinktank";
const CONFIG_FILE = "config.json";

function configPath(): string {
  return join(CONFIG_DIR, CONFIG_FILE);
}

export function isValidConfigKey(key: string): key is keyof Config {
  return key in BUILT_IN_DEFAULTS;
}

function parseValue(key: keyof Config, raw: string): Config[keyof Config] {
  const defaults = BUILT_IN_DEFAULTS;
  if (typeof defaults[key] === "number") {
    const num = Number(raw);
    if (Number.isNaN(num)) {
      throw new Error(`Value for "${key}" must be a number, got "${raw}"`);
    }
    return num;
  }
  return raw;
}

function validateConfig(partial: Partial<Config>): string | null {
  if (partial.attempts !== undefined) {
    if (!Number.isInteger(partial.attempts) || partial.attempts < 1 || partial.attempts > 20) {
      return "attempts must be an integer between 1 and 20";
    }
  }
  if (partial.timeout !== undefined) {
    if (!Number.isInteger(partial.timeout) || partial.timeout < 10 || partial.timeout > 600) {
      return "timeout must be an integer between 10 and 600";
    }
  }
  if (partial.testTimeout !== undefined) {
    if (
      !Number.isInteger(partial.testTimeout) ||
      partial.testTimeout < 10 ||
      partial.testTimeout > 600
    ) {
      return "testTimeout must be an integer between 10 and 600";
    }
  }
  if (partial.threshold !== undefined) {
    if (typeof partial.threshold !== "number" || partial.threshold < 0 || partial.threshold > 1) {
      return "threshold must be a number between 0.0 and 1.0";
    }
  }
  if (partial.model !== undefined) {
    if (typeof partial.model !== "string" || partial.model.length === 0) {
      return "model must be a non-empty string";
    }
  }
  if (partial.runner !== undefined) {
    if (typeof partial.runner !== "string" || partial.runner.length === 0) {
      return "runner must be a non-empty string";
    }
  }
  return null;
}

export function loadFileConfig(): Partial<Config> {
  try {
    const raw = readFileSync(configPath(), "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Partial<Config> = {};
    for (const key of Object.keys(BUILT_IN_DEFAULTS) as Array<keyof Config>) {
      if (key in parsed) {
        (result as Record<string, unknown>)[key] = parsed[key];
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function loadConfig(): Config {
  const fileConfig = loadFileConfig();
  return { ...BUILT_IN_DEFAULTS, ...fileConfig };
}

export function saveFileConfig(partial: Partial<Config>): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(configPath(), JSON.stringify(partial, null, 2) + "\n", { mode: 0o600 });
}

export function setConfigValue(key: string, rawValue: string): string | null {
  if (!isValidConfigKey(key)) {
    return `Unknown config key "${key}". Valid keys: ${Object.keys(BUILT_IN_DEFAULTS).join(", ")}`;
  }

  let value: Config[keyof Config];
  try {
    value = parseValue(key, rawValue);
  } catch (e) {
    return (e as Error).message;
  }
  const partial: Partial<Config> = { [key]: value };

  const error = validateConfig(partial);
  if (error) {
    return error;
  }

  const existing = loadFileConfig();
  const merged = { ...existing, ...partial };
  saveFileConfig(merged);
  return null;
}

export function getConfigValue(
  key: string,
): { value: string; source: "config" | "default" } | string {
  if (!isValidConfigKey(key)) {
    return `Unknown config key "${key}". Valid keys: ${Object.keys(BUILT_IN_DEFAULTS).join(", ")}`;
  }

  const fileConfig = loadFileConfig();
  if (key in fileConfig) {
    return { value: String(fileConfig[key]), source: "config" };
  }
  return { value: String(BUILT_IN_DEFAULTS[key]), source: "default" };
}
