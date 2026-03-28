import type { Runner } from "./base.js";
import { claudeCodeRunner } from "./claude-code.js";

const runners = new Map<string, Runner>([["claude-code", claudeCodeRunner]]);

export function getRunner(name: string): Runner | undefined {
  return runners.get(name);
}

export function listRunners(): Runner[] {
  return [...runners.values()];
}

export function getDefaultRunner(): Runner {
  return claudeCodeRunner;
}
