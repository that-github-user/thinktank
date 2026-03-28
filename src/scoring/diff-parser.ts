/**
 * Lightweight unified diff parser. Extracts changed lines per file
 * for convergence comparison across agents.
 */

export interface DiffFile {
  path: string;
  addedLines: string[];
  removedLines: string[];
}

/**
 * Parse a unified diff string into structured file changes.
 */
export function parseDiff(diff: string): DiffFile[] {
  const files: DiffFile[] = [];
  let current: DiffFile | null = null;

  for (const line of diff.split("\n")) {
    // New file header: diff --git a/path b/path
    if (line.startsWith("diff --git")) {
      // Handle both quoted and unquoted paths (spaces in filenames)
      const match = line.match(/diff --git "?a\/(.+?)"? "?b\/(.+?)"?$/);
      if (match?.[2]) {
        current = { path: match[2], addedLines: [], removedLines: [] };
        files.push(current);
      }
      continue;
    }

    if (!current) continue;

    // Skip binary file entries — git emits "Binary files a/x and b/x differ"
    if (line.startsWith("Binary files ") && line.endsWith(" differ")) {
      current = null;
      files.pop();
      continue;
    }

    // Skip metadata lines
    if (line.startsWith("index ") || line.startsWith("---") || line.startsWith("+++")) {
      continue;
    }
    if (line.startsWith("@@")) continue;

    // Collect added/removed lines (strip the +/- prefix)
    if (line.startsWith("+")) {
      current.addedLines.push(line.slice(1));
    } else if (line.startsWith("-")) {
      current.removedLines.push(line.slice(1));
    }
  }

  return files;
}

/**
 * Compute similarity between two diffs using Jaccard similarity
 * on the set of added lines. Returns 0-1 where 1 = identical changes.
 */
export function diffSimilarity(diffA: string, diffB: string): number {
  const filesA = parseDiff(diffA);
  const filesB = parseDiff(diffB);

  // Collect all added lines as a set (file:line for uniqueness)
  const setA = new Set<string>();
  const setB = new Set<string>();

  for (const f of filesA) {
    for (const line of f.addedLines) {
      setA.add(`${f.path}:${line.trim()}`);
    }
  }
  for (const f of filesB) {
    for (const line of f.addedLines) {
      setB.add(`${f.path}:${line.trim()}`);
    }
  }

  if (setA.size === 0 && setB.size === 0) return 1; // Both empty = same

  // Jaccard similarity: |A ∩ B| / |A ∪ B|
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;

  return union === 0 ? 1 : intersection / union;
}

/**
 * Compute pairwise similarity matrix for a list of diffs.
 * Returns a Map of "agentA-agentB" -> similarity score.
 */
export function pairwiseSimilarity(
  agents: Array<{ id: number; diff: string }>,
): Map<string, number> {
  const matrix = new Map<string, number>();

  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const a = agents[i]!;
      const b = agents[j]!;
      const sim = diffSimilarity(a.diff, b.diff);
      matrix.set(`${a.id}-${b.id}`, sim);
    }
  }

  return matrix;
}
