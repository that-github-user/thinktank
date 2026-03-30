import type { AgentResult, AgentScore, ConvergenceGroup, CopelandScore } from "../types.js";
import { pairwiseSimilarity } from "./diff-parser.js";

/**
 * Analyze convergence across agent results using two levels:
 * 1. File-level: which files did each agent change?
 * 2. Diff-level: how similar are the actual changes? (Jaccard on added lines)
 *
 * Agents are clustered by diff similarity using single-linkage clustering
 * with a 0.5 similarity threshold.
 */
export function analyzeConvergence(
  agents: AgentResult[],
  threshold = 0.3,
  whitespaceInsensitive = false,
): ConvergenceGroup[] {
  const completed = agents.filter((a) => a.status === "success" && a.diff.length > 0);

  if (completed.length === 0) return [];

  // Compute pairwise diff similarity
  const similarities = pairwiseSimilarity(
    completed.map((a) => ({ id: a.id, diff: a.diff })),
    whitespaceInsensitive,
  );

  // Single-linkage clustering: merge agents with similarity >= threshold
  const clusters = clusterAgents(
    completed.map((a) => a.id),
    similarities,
    threshold,
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
 * Priority: passing tests > convergence group size > diff size outlier penalty.
 */
export function recommend(
  agents: AgentResult[],
  testResults: Array<{ agentId: number; passed: boolean }>,
  convergence: ConvergenceGroup[],
): { recommended: number | null; scores: AgentScore[] } {
  const completed = agents.filter((a) => a.status === "success" && a.diff.length > 0);
  if (completed.length === 0) return { recommended: null, scores: [] };

  // Compute median diff size for outlier detection
  const sortedLines = completed.map((a) => a.linesAdded + a.linesRemoved).sort((a, b) => a - b);
  const mid = Math.floor(sortedLines.length / 2);
  const medianLines =
    sortedLines.length % 2 === 0
      ? (sortedLines[mid - 1]! + sortedLines[mid]!) / 2
      : sortedLines[mid]!;

  const agentScores: AgentScore[] = [];

  for (const agent of completed) {
    // Tests passing is the strongest signal
    const test = testResults.find((t) => t.agentId === agent.id);
    const testPoints = test?.passed ? 100 : 0;

    // Being in the largest convergence group
    const group = convergence.find((g) => g.agents.includes(agent.id));
    const convergencePoints = group ? group.similarity * 50 : 0;

    // Penalize outlier-large diffs (> 2x median), otherwise no penalty
    const agentLines = agent.linesAdded + agent.linesRemoved;
    const ratio = medianLines > 0 ? agentLines / medianLines : 1;
    const diffSizePoints = ratio > 2 ? Math.max(0, 10 - (ratio - 2) * 5) : 10;

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

const TEST_FILE_PATTERN = /[./](?:test|spec)\./;

/** Cap for test file criterion — prevents gaming with many test files */
const TEST_FILE_CAP = 3;

/**
 * Count test files (matching *.test.* or *.spec.*) and non-test files separately.
 */
function splitFilesByType(files: string[]): { testFiles: number; nonTestFiles: number } {
  let testFiles = 0;
  let nonTestFiles = 0;
  for (const f of files) {
    if (TEST_FILE_PATTERN.test(f)) {
      testFiles++;
    } else {
      nonTestFiles++;
    }
  }
  return { testFiles, nonTestFiles };
}

/**
 * Effective test file count for scoring: capped at TEST_FILE_CAP, and only
 * counts when the agent also changed non-test files (prevents gaming).
 */
function effectiveTestFiles(testFiles: number, nonTestFiles: number): number {
  if (nonTestFiles === 0) return 0;
  return Math.min(testFiles, TEST_FILE_CAP);
}

/**
 * Copeland pairwise scoring: compare every pair of agents head-to-head
 * on four criteria (tests passed, convergence group size, non-test files changed, test files).
 * For each pair, the agent winning more criteria gets +1, the loser gets -1, ties get 0.
 * The agent with the highest Copeland score is recommended.
 */
export function copelandRecommend(
  agents: AgentResult[],
  testResults: Array<{ agentId: number; passed: boolean }>,
  convergence: ConvergenceGroup[],
): { recommended: number | null; scores: CopelandScore[] } {
  const completed = agents.filter((a) => a.status === "success" && a.diff.length > 0);
  if (completed.length === 0) return { recommended: null, scores: [] };

  // Pre-compute per-agent criteria values
  const agentData = completed.map((agent) => {
    const test = testResults.find((t) => t.agentId === agent.id);
    // Skipped tests (exit 127 = command not found) are treated as neutral —
    // don't penalize agents when the test infrastructure itself is broken.
    const testsSkipped = (test as { skipped?: boolean } | undefined)?.skipped === true;
    const testsPassed = testsSkipped ? -1 : test?.passed ? 1 : 0;
    const group = convergence.find((g) => g.agents.includes(agent.id));
    const groupSize = group ? group.agents.length : 0;
    const { testFiles, nonTestFiles } = splitFilesByType(agent.filesChanged);
    const cappedTestFiles = effectiveTestFiles(testFiles, nonTestFiles);
    return { id: agent.id, testsPassed, testsSkipped, groupSize, nonTestFiles, cappedTestFiles };
  });

  // Initialize scores
  const scoreMap = new Map<number, CopelandScore>();
  for (const data of agentData) {
    scoreMap.set(data.id, {
      agentId: data.id,
      testsWins: 0,
      convergenceWins: 0,
      nonTestFilesWins: 0,
      testFilesWins: 0,
      copelandTotal: 0,
    });
  }

  // Pairwise comparison
  for (let i = 0; i < agentData.length; i++) {
    for (let j = i + 1; j < agentData.length; j++) {
      const a = agentData[i]!;
      const b = agentData[j]!;

      let aWins = 0;
      let bWins = 0;

      // Criterion 1: tests passed (more is better)
      // Skip this criterion entirely when both agents have skipped tests
      // (exit 127 = test command not found — not a code quality signal).
      if (!(a.testsSkipped && b.testsSkipped)) {
        if (a.testsPassed > b.testsPassed) {
          aWins++;
          scoreMap.get(a.id)!.testsWins++;
          scoreMap.get(b.id)!.testsWins--;
        } else if (b.testsPassed > a.testsPassed) {
          bWins++;
          scoreMap.get(b.id)!.testsWins++;
          scoreMap.get(a.id)!.testsWins--;
        }
      }

      // Criterion 2: convergence group size (larger is better)
      if (a.groupSize > b.groupSize) {
        aWins++;
        scoreMap.get(a.id)!.convergenceWins++;
        scoreMap.get(b.id)!.convergenceWins--;
      } else if (b.groupSize > a.groupSize) {
        bWins++;
        scoreMap.get(b.id)!.convergenceWins++;
        scoreMap.get(a.id)!.convergenceWins--;
      }

      // Criterion 3: non-test files changed (fewer is better — minimal code scope)
      if (a.nonTestFiles < b.nonTestFiles) {
        aWins++;
        scoreMap.get(a.id)!.nonTestFilesWins++;
        scoreMap.get(b.id)!.nonTestFilesWins--;
      } else if (b.nonTestFiles < a.nonTestFiles) {
        bWins++;
        scoreMap.get(b.id)!.nonTestFilesWins++;
        scoreMap.get(a.id)!.nonTestFilesWins--;
      }

      // Criterion 4: test files added/modified (more is better, capped, only with prod changes)
      if (a.cappedTestFiles > b.cappedTestFiles) {
        aWins++;
        scoreMap.get(a.id)!.testFilesWins++;
        scoreMap.get(b.id)!.testFilesWins--;
      } else if (b.cappedTestFiles > a.cappedTestFiles) {
        bWins++;
        scoreMap.get(b.id)!.testFilesWins++;
        scoreMap.get(a.id)!.testFilesWins--;
      }

      // Overall Copeland: winner of more criteria gets +1, loser -1
      if (aWins > bWins) {
        scoreMap.get(a.id)!.copelandTotal++;
        scoreMap.get(b.id)!.copelandTotal--;
      } else if (bWins > aWins) {
        scoreMap.get(b.id)!.copelandTotal++;
        scoreMap.get(a.id)!.copelandTotal--;
      }
    }
  }

  const copelandScores = [...scoreMap.values()];

  let bestId: number | null = null;
  let bestScore = -Infinity;
  for (const score of copelandScores) {
    if (score.copelandTotal > bestScore) {
      bestScore = score.copelandTotal;
      bestId = score.agentId;
    }
  }

  return { recommended: bestId, scores: copelandScores };
}
