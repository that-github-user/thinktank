import type { AgentResult } from "../types.js";

export interface ProgressTracker {
  start(): void;
  onAgentComplete(agent: AgentResult): void;
  finish(): void;
}

/**
 * Create a live progress tracker for parallel agent runs.
 *
 * TTY mode: writes one line per agent, updates in-place via ANSI cursor movement.
 * Non-TTY mode: writes a single "X/N agents complete..." line on each completion.
 */
export function createProgressTracker(
  agentIds: number[],
  isTTY: boolean,
  stream: { write(s: string): boolean } = process.stdout,
): ProgressTracker {
  const total = agentIds.length;
  let completed = 0;

  if (isTTY) {
    return {
      start() {
        for (const id of agentIds) {
          stream.write(`    Agent #${id}: running...\n`);
        }
      },
      onAgentComplete(agent: AgentResult) {
        completed++;
        const index = agentIds.indexOf(agent.id);
        const linesUp = total - index;
        const secs = Math.round(agent.duration / 1000);
        const files = agent.filesChanged.length;
        const label =
          agent.status === "success"
            ? `done (${secs}s, ${files} file${files !== 1 ? "s" : ""})`
            : `${agent.status} (${secs}s)`;

        // Move cursor up to the agent's line, overwrite, move back down
        stream.write(`\x1b[${linesUp}A\r    Agent #${agent.id}: ${label}\x1b[K\n`);
        if (linesUp > 1) {
          stream.write(`\x1b[${linesUp - 1}B`);
        }
      },
      finish() {
        // Cursor is already on the line after the last agent — nothing to do
      },
    };
  }

  // Non-TTY: simple one-liner
  return {
    start() {},
    onAgentComplete() {
      completed++;
      stream.write(`\r  ${completed}/${total} agents complete...`);
    },
    finish() {
      if (completed > 0) {
        stream.write("\n");
      }
    },
  };
}
