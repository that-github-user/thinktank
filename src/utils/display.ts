import type { AgentResult, ConvergenceGroup, EnsembleResult, TestResult } from "../types.js";

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function c(color: keyof typeof COLORS, text: string): string {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

export function displayHeader(prompt: string, attempts: number, model: string): void {
  console.log();
  console.log(c("bold", "thinktank") + c("dim", " — ensemble AI coding"));
  console.log();
  console.log(`  Task:     ${prompt}`);
  console.log(`  Agents:   ${attempts} parallel attempts`);
  console.log(`  Model:    ${model}`);
  console.log();
}

export function displayProgress(id: number, status: string): void {
  const icon = status === "running" ? "..." : status === "done" ? "done" : "err";
  process.stdout.write(`\r  Agent ${id}: ${icon}  `);
}

export function displayResults(result: EnsembleResult): void {
  console.log();
  console.log(c("bold", "Results"));
  console.log(c("dim", "─".repeat(60)));
  console.log();

  // Agent summary table
  console.log(
    "  " +
      padRight("Agent", 8) +
      padRight("Status", 10) +
      padRight("Tests", 8) +
      padRight("Files", 8) +
      padRight("+/-", 12) +
      padRight("Time", 8),
  );
  console.log("  " + c("dim", "─".repeat(54)));

  for (const agent of result.agents) {
    const test = result.tests.find((t) => t.agentId === agent.id);
    const statusIcon =
      agent.status === "success"
        ? c("green", "ok")
        : agent.status === "timeout"
          ? c("yellow", "timeout")
          : c("red", "error");

    const testIcon = test ? (test.passed ? c("green", "pass") : c("red", "fail")) : c("dim", "n/a");

    const isRecommended = result.recommended === agent.id;
    const prefix = isRecommended ? c("cyan", ">>") : "  ";

    console.log(
      prefix +
        padRight(`#${agent.id}`, 8) +
        padRight(statusIcon, 10) +
        padRight(testIcon, 8) +
        padRight(String(agent.filesChanged.length), 8) +
        padRight(`+${agent.linesAdded}/-${agent.linesRemoved}`, 12) +
        padRight(formatDuration(agent.duration), 8),
    );
  }

  // Convergence analysis
  if (result.convergence.length > 0) {
    console.log();
    console.log(c("bold", "Convergence"));
    console.log(c("dim", "─".repeat(60)));
    for (const group of result.convergence) {
      const pct = Math.round(group.similarity * 100);
      const bar = "█".repeat(Math.round(pct / 5)) + "░".repeat(20 - Math.round(pct / 5));
      console.log(`  Agents [${group.agents.join(", ")}]: ${bar} ${pct}%`);
      console.log(`  ${c("dim", group.description)}`);
      console.log(`  ${c("dim", "Files: " + group.filesChanged.join(", "))}`);
      console.log();
    }
  }

  // Recommendation
  if (result.recommended !== null) {
    console.log(
      c("cyan", `  Recommended: Agent #${result.recommended}`) +
        c("dim", " (highest score based on tests + convergence + diff size)"),
    );
    console.log();
  }
}

export function displayApplyInstructions(result: EnsembleResult): void {
  const completed = result.agents.filter((a) => a.status === "success" && a.diff.length > 0);
  if (completed.length === 0) {
    console.log(c("red", "  No agents produced changes."));
    return;
  }

  console.log(c("bold", "Next steps"));
  console.log(c("dim", "─".repeat(60)));
  console.log();
  console.log("  To inspect a specific agent's changes:");
  console.log(c("dim", `    cd <worktree-path> && git diff HEAD`));
  console.log();
  console.log("  To apply the recommended agent's changes:");
  console.log(c("dim", `    cd <repo-root> && git diff --no-index /dev/null <worktree>/...`));
  console.log();
  console.log(c("dim", "  Worktrees will be cleaned up automatically on next run."));
  console.log();
}

function padRight(str: string, len: number): string {
  // Strip ANSI codes for length calculation
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional ANSI escape sequence matching
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, "");
  const padding = Math.max(0, len - stripped.length);
  return str + " ".repeat(padding);
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m${remaining}s`;
}
