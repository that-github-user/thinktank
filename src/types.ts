export interface RunOptions {
  prompt: string;
  attempts: number;
  testCmd?: string;
  testTimeout: number;
  timeout: number;
  model: string;
  verbose: boolean;
  runner?: string;
}

export interface AgentResult {
  id: number;
  worktree: string;
  status: "success" | "error" | "timeout";
  exitCode: number;
  duration: number;
  output: string;
  error?: string;
  diff: string;
  filesChanged: string[];
  linesAdded: number;
  linesRemoved: number;
}

export interface TestResult {
  agentId: number;
  passed: boolean;
  output: string;
  exitCode: number;
}

export interface ConvergenceGroup {
  agents: number[];
  similarity: number;
  filesChanged: string[];
  description: string;
}

export interface EnsembleResult {
  prompt: string;
  model: string;
  timestamp: string;
  agents: AgentResult[];
  tests: TestResult[];
  convergence: ConvergenceGroup[];
  recommended: number | null;
}
