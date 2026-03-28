import type { AgentResult, AgentScore, ConvergenceGroup } from "../types.js";
import { pairwiseSimilarity } from "./diff-parser.js";

/**
 * Analyze convergence across agent results using two levels:
 * 1. File-level: which files did each agent change?
 * 2. Diff-level: how similar are the actual changes? (Jaccard on added lines)
 *
 * Agents are clustered by diff similarity using single-linkage clustering
 * with a 0.5 similarity threshold.
 */
export function analyzeConvergence(agents: AgentResult[]): ConvergenceGroup[] {
  const completed = agents.filter((a) => a.status === "success" && a.diff.length > 0);

  if (completed.length === 0) return [];

  // Compute pairwise diff similarity
  const similarities = pairwiseSimilarity(completed.map((a) => ({ id: a.id, diff: a.diff })));

  // Single-linkage clustering: merge agents with similarity >= threshold
  const SIMILARITY_THRESHOLD = 0.3;
  const clusters = clusterAgents(
    completed.map((a) => a.id),
    similarities,
    SIMILARITY_THRESHOLD,
  );

  // Convert clusters to convergence groups
  const groups: ConvergenceGroup[] = clusters.map((cluster) => {
    // Average similarity within cluster
    let totalSim = 0;
    let pairs = 0;
    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        const key = `${Math.min(cluster[i]!, cluster[j]!)}-${Math.max(cluster[i]!, cluster[j]!)}`;
        totalSim += similarities.get(key) ?? 0;
        pairs++;
      }
    }
    const avgSimilarity = pairs > 0 ? totalSim / pairs : 1;
    const groupRatio = cluster.length / completed.length;

    // Collect files changed by this cluster
    const filesSet = new Set<string>();
    for (const agentId of cluster) {
      const agent = completed.find((a) => a.id === agentId);
      if (agent) {
        for (const f of agent.filesChanged) filesSet.add(f);
      }
    }

    // Combine file-level ratio with diff-level similarity for final score
    const similarity = groupRatio * 0.5 + avgSimilarity * 0.5;

    let description: string;
    if (groupRatio >= 0.8 && avgSimilarity >= 0.5) {
      description = `Strong consensus — ${cluster.length}/${completed.length} agents made similar changes`;
    } else if (groupRatio >= 0.5 || avgSimilarity >= 0.5) {
      description = `Moderate agreement — ${cluster.length}/${completed.length} agents took a similar approach`;
    } else {
      description = `Divergent approach — ${cluster.length}/${completed.length} agents went a different direction`;
    }

    return {
      agents: cluster,
      similarity,
      filesChanged: [...filesSet].sort(),
      description,
    };
  });

  groups.sort((a, b) => b.similarity - a.similarity);
  return groups;
}

/**
 * Single-linkage clustering. Two agents are in the same cluster if
 * ANY pair within the cluster has similarity >= threshold.
 */
function clusterAgents(
  agentIds: number[],
  similarities: Map<string, number>,
  threshold: number,
): number[][] {
  // Union-Find
  const parent = new Map<number, number>();
  for (const id of agentIds) parent.set(id, id);

  function find(x: number): number {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(x, root); // path compression
    return root;
  }

  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  // Merge agents with similarity >= threshold
  for (const [key, sim] of similarities) {
    if (sim >= threshold) {
      const [a, b] = key.split("-").map(Number) as [number, number];
      union(a, b);
    }
  }

  // Collect clusters
  const clusters = new Map<number, number[]>();
  for (const id of agentIds) {
    const root = find(id);
    const cluster = clusters.get(root) ?? [];
    cluster.push(id);
    clusters.set(root, cluster);
  }

  return [...clusters.values()];
}

/**
 * Recommend the best agent based on test results and convergence.
 * Priority: passing tests > convergence group size > smaller diff.
 */
export function recommend(
  agents: AgentResult[],
  testResults: Array<{ agentId: number; passed: boolean }>,
  convergence: ConvergenceGroup[],
): { recommended: number | null; scores: AgentScore[] } {
  const completed = agents.filter((a) => a.status === "success" && a.diff.length > 0);
  if (completed.length === 0) return { recommended: null, scores: [] };

  const agentScores: AgentScore[] = [];

  for (const agent of completed) {
    // Tests passing is the strongest signal
    const test = testResults.find((t) => t.agentId === agent.id);
    const testPoints = test?.passed ? 100 : 0;

    // Being in the largest convergence group
    const group = convergence.find((g) => g.agents.includes(agent.id));
    const convergencePoints = group ? group.similarity * 50 : 0;

    // Smaller diffs preferred (normalized)
    const maxLines = Math.max(...completed.map((a) => a.linesAdded + a.linesRemoved), 1);
    const agentLines = agent.linesAdded + agent.linesRemoved;
    const diffSizePoints = (1 - agentLines / maxLines) * 10;

    const total = testPoints + convergencePoints + diffSizePoints;

    agentScores.push({
      agentId: agent.id,
      testPoints,
      convergencePoints: Math.round(convergencePoints * 100) / 100,
      diffSizePoints: Math.round(diffSizePoints * 100) / 100,
      total: Math.round(total * 100) / 100,
    });
  }

  let bestId: number | null = null;
  let bestScore = -1;
  for (const score of agentScores) {
    if (score.total > bestScore) {
      bestScore = score.total;
      bestId = score.agentId;
    }
  }

  return { recommended: bestId, scores: agentScores };
}
