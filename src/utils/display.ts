import pc from "picocolors";
import type { EnsembleResult } from "../types.js";

export function displayHeader(prompt: string, attempts: number, model: string): void {
  console.log();
  console.log(pc.bold("thinktank") + pc.dim(" — ensemble AI coding"));
  console.log();
  console.log(`  Task:     ${prompt}`);
  console.log(`  Agents:   ${attempts} parallel attempts`);
  console.log(`  Model:    ${model}`);
  console.log();
}

export function displayResults(result: EnsembleResult): void {
  console.log();
  console.log(pc.bold("Results"));
  console.log(pc.dim("─".repeat(60)));
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
  console.log("  " + pc.dim("─".repeat(54)));

  for (const agent of result.agents) {
    const test = result.tests.find((t) => t.agentId === agent.id);
    const statusIcon =
      agent.status === "success"
        ? pc.green("ok")
        : agent.status === "timeout"
          ? pc.yellow("timeout")
          : pc.red("error");

    const testIcon = test ? (test.passed ? pc.green("pass") : pc.red("fail")) : pc.dim("n/a");

    const isRecommended = result.recommended === agent.id;
    const prefix = isRecommended ? pc.cyan(">>") : "  ";

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
    console.log(pc.bold("Convergence"));
    console.log(pc.dim("─".repeat(60)));
    for (const group of result.convergence) {
      const pct = Math.round(group.similarity * 100);
      const bar = "█".repeat(Math.round(pct / 5)) + "░".repeat(20 - Math.round(pct / 5));
      console.log(`  Agents [${group.agents.join(", ")}]: ${bar} ${pct}%`);
      console.log(`  ${pc.dim(group.description)}`);
      console.log(`  ${pc.dim("Files: " + group.filesChanged.join(", "))}`);
      console.log();
    }
  }

  // Recommendation
  if (result.recommended !== null) {
    console.log(
      pc.cyan(`  Recommended: Agent #${result.recommended}`) +
        pc.dim(" (highest score based on tests + convergence + diff size)"),
    );
    console.log();
  }
}

export function displayApplyInstructions(result: EnsembleResult): void {
  const completed = result.agents.filter((a) => a.status === "success" && a.diff.length > 0);
  if (completed.length === 0) {
    console.log(pc.red("  No agents produced changes."));
    return;
  }

  console.log(pc.bold("Next steps"));
  console.log(pc.dim("─".repeat(60)));
  console.log();
  console.log("  To apply the recommended result:");
  console.log(pc.dim("    thinktank apply"));
  console.log();
  console.log("  To apply a specific agent:");
  console.log(pc.dim("    thinktank apply --agent N"));
  console.log();
  console.log(pc.dim("  Worktrees will be cleaned up on next run or after apply."));
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
