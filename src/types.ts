export interface RunOptions {
  prompt: string;
  attempts: number;
  testCmd?: string;
  testTimeout: number;
  timeout: number;
  model: string;
  threshold: number;
  verbose: boolean;
  runner?: string;
  scoring: "weighted" | "copeland";
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

export interface AgentScore {
  agentId: number;
  testPoints: number;
  convergencePoints: number;
  diffSizePoints: number;
  total: number;
}

export interface CopelandScore {
  agentId: number;
  testsWins: number;
  convergenceWins: number;
  filesChangedWins: number;
  copelandTotal: number;
}

export interface EnsembleResult {
  prompt: string;
  model: string;
  timestamp: string;
  scoring: "weighted" | "copeland";
  agents: AgentResult[];
  tests: TestResult[];
  convergence: ConvergenceGroup[];
  recommended: number | null;
  scores: AgentScore[];
  copelandScores?: CopelandScore[];
}
