/**
 * Grid-based pathfinding challenge for thinktank ensemble testing.
 *
 * The grid is a 2D array where:
 *   0 = walkable
 *   1 = obstacle
 *
 * Implement findPath() to find the shortest path from start to end
 * using A* or any optimal pathfinding algorithm.
 *
 * The function should return an array of [row, col] coordinates
 * representing the path from start to end (inclusive), or null
 * if no path exists.
 *
 * Movement: 4-directional (up, down, left, right). No diagonals.
 */

export type Point = [number, number];

export interface PathResult {
  path: Point[];
  nodesExplored: number;
}

/**
 * Find the shortest path from start to end on the grid.
 *
 * YOUR TASK: Implement this function using A* pathfinding.
 * Choose your own heuristic, data structures, and optimizations.
 *
 * @param grid - 2D grid (0=walkable, 1=obstacle)
 * @param start - Starting position [row, col]
 * @param end - Target position [row, col]
 * @returns PathResult with the shortest path and nodes explored, or null if unreachable
 */
export function findPath(
  grid: number[][],
  start: Point,
  end: Point,
): PathResult | null {
  // TODO: Implement A* pathfinding
  throw new Error("Not implemented — this is your task!");
}
