import type { AgentResult } from "../types.js";

export interface RunnerOptions {
  prompt: string;
  worktreePath: string;
  model: string;
  timeout: number;
  verbose: boolean;
}

/**
 * Interface for AI coding tool runners. Each runner wraps a specific
 * tool (Claude Code, Aider, etc.) and executes a task in a worktree.
 */
export interface Runner {
  /** Unique identifier for this runner (e.g., "claude-code", "aider") */
  name: string;

  /** Human-readable description */
  description: string;

  /** Check if this runner's tool is installed and available */
  available(): Promise<boolean>;

  /** Execute a task and return the result */
  run(id: number, opts: RunnerOptions): Promise<AgentResult>;
}
