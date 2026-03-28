import type { AgentResult, ConvergenceGroup } from "../types.js";

/**
 * Analyze convergence across agent results by comparing which files
 * each agent changed. Agents that changed the same set of files are
 * grouped together — a larger group = higher confidence.
 */
export function analyzeConvergence(agents: AgentResult[]): ConvergenceGroup[] {
  const completed = agents.filter((a) => a.status === "success" && a.diff.length > 0);

  if (completed.length === 0) return [];

  // Group by file-change fingerprint
  const fingerprints = new Map<string, number[]>();

  for (const agent of completed) {
    const key = [...agent.filesChanged].sort().join("|");
    const group = fingerprints.get(key) ?? [];
    group.push(agent.id);
    fingerprints.set(key, group);
  }

  // Convert to convergence groups, sorted by size (largest first)
  const groups: ConvergenceGroup[] = [];

  for (const [key, agentIds] of fingerprints) {
    const files = key.split("|").filter(Boolean);
    const similarity = agentIds.length / completed.length;

    let description: string;
    if (similarity >= 0.8) {
      description = `Strong consensus — ${agentIds.length}/${completed.length} agents changed the same files`;
    } else if (similarity >= 0.5) {
      description = `Moderate agreement — ${agentIds.length}/${completed.length} agents took a similar approach`;
    } else {
      description = `Divergent approach — ${agentIds.length}/${completed.length} agents went a different direction`;
    }

    groups.push({
      agents: agentIds,
      similarity,
      filesChanged: files,
      description,
    });
  }

  groups.sort((a, b) => b.similarity - a.similarity);

  return groups;
}

/**
 * Recommend the best agent based on test results and convergence.
 * Priority: passing tests > convergence group size > smaller diff.
 */
export function recommend(
  agents: AgentResult[],
  testResults: Array<{ agentId: number; passed: boolean }>,
  convergence: ConvergenceGroup[],
): number | null {
  const completed = agents.filter((a) => a.status === "success" && a.diff.length > 0);
  if (completed.length === 0) return null;

  // Score each agent
  const scores = new Map<number, number>();

  for (const agent of completed) {
    let score = 0;

    // Tests passing is the strongest signal
    const test = testResults.find((t) => t.agentId === agent.id);
    if (test?.passed) score += 100;

    // Being in the largest convergence group
    const group = convergence.find((g) => g.agents.includes(agent.id));
    if (group) score += group.similarity * 50;

    // Smaller diffs preferred (normalized)
    const maxLines = Math.max(...completed.map((a) => a.linesAdded + a.linesRemoved), 1);
    const agentLines = agent.linesAdded + agent.linesRemoved;
    score += (1 - agentLines / maxLines) * 10;

    scores.set(agent.id, score);
  }

  // Return highest-scoring agent
  let bestId: number | null = null;
  let bestScore = -1;
  for (const [id, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }

  return bestId;
}
