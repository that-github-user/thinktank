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

  // Scoring breakdown
  if (result.scores.length > 0) {
    console.log(pc.bold("Scoring"));
    console.log(pc.dim("─".repeat(60)));
    console.log(
      "  " +
        padRight("Agent", 8) +
        padRight("Tests", 10) +
        padRight("Converge", 10) +
        padRight("Diff", 10) +
        padRight("Total", 10),
    );
    console.log("  " + pc.dim("─".repeat(48)));

    for (const score of result.scores) {
      const isRecommended = result.recommended === score.agentId;
      const prefix = isRecommended ? pc.cyan(">>") : "  ";
      console.log(
        prefix +
          padRight(`#${score.agentId}`, 8) +
          padRight(String(score.testPoints), 10) +
          padRight(String(score.convergencePoints), 10) +
          padRight(String(score.diffSizePoints), 10) +
          padRight(String(score.total), 10),
      );
    }
    console.log();
  }

  // Copeland scoring breakdown
  if (result.copelandScores && result.copelandScores.length > 0) {
    console.log(pc.bold("Copeland Pairwise Scoring"));
    console.log(pc.dim("─".repeat(60)));
    console.log(
      "  " +
        padRight("Agent", 8) +
        padRight("Tests", 10) +
        padRight("Converge", 10) +
        padRight("Files", 10) +
        padRight("Copeland", 10),
    );
    console.log("  " + pc.dim("─".repeat(48)));

    for (const score of result.copelandScores) {
      const isRecommended = result.scoring === "copeland" && result.recommended === score.agentId;
      const prefix = isRecommended ? pc.cyan(">>") : "  ";
      const fmt = (n: number): string => (n > 0 ? `+${n}` : String(n));
      console.log(
        prefix +
          padRight(`#${score.agentId}`, 8) +
          padRight(fmt(score.testsWins), 10) +
          padRight(fmt(score.convergenceWins), 10) +
          padRight(fmt(score.filesChangedWins), 10) +
          padRight(fmt(score.copelandTotal), 10),
      );
    }
    console.log();
  }

  // Recommendation
  if (result.recommended !== null) {
    const method = result.scoring === "copeland" ? "Copeland pairwise" : "weighted";
    console.log(
      pc.cyan(`  Recommended: Agent #${result.recommended}`) +
        pc.dim(` (${method} scoring: tests + convergence + diff size)`),
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

export function padRight(str: string, len: number): string {
  // Strip ANSI codes for length calculation
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional ANSI escape sequence matching
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, "");
  const padding = Math.max(0, len - stripped.length);
  return str + " ".repeat(padding);
}

export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m${remaining}s`;
}
