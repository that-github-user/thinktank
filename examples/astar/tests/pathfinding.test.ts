import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findPath, type Point } from "../src/grid.js";

// Helper: verify path is valid (each step is adjacent and on walkable terrain)
function isValidPath(grid: number[][], path: Point[]): boolean {
  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i]!;
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0]!.length) return false;
    if (grid[r]![c] !== 0) return false;
    if (i > 0) {
      const [pr, pc] = path[i - 1]!;
      const dr = Math.abs(r - pr);
      const dc = Math.abs(c - pc);
      if (dr + dc !== 1) return false; // must be 4-directional adjacent
    }
  }
  return true;
}

describe("A* Pathfinding", () => {
  it("finds a straight-line path", () => {
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ];
    const result = findPath(grid, [0, 0], [0, 4]);
    assert.ok(result, "should find a path");
    assert.deepEqual(result.path[0], [0, 0], "starts at start");
    assert.deepEqual(result.path[result.path.length - 1], [0, 4], "ends at end");
    assert.equal(result.path.length, 5, "shortest path is 5 cells");
    assert.ok(isValidPath(grid, result.path), "path must be valid");
  });

  it("navigates around obstacles", () => {
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ];
    const result = findPath(grid, [0, 0], [2, 4]);
    assert.ok(result, "should find a path");
    assert.deepEqual(result.path[0], [0, 0]);
    assert.deepEqual(result.path[result.path.length - 1], [2, 4]);
    assert.ok(isValidPath(grid, result.path), "path must be valid");
    assert.equal(result.path.length, 7, "shortest path around obstacle is 7");
  });

  it("returns null for unreachable target", () => {
    const grid = [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ];
    const result = findPath(grid, [0, 0], [0, 2]);
    assert.equal(result, null, "should return null when target is unreachable");
  });

  it("handles start equals end", () => {
    const grid = [[0, 0], [0, 0]];
    const result = findPath(grid, [1, 1], [1, 1]);
    assert.ok(result, "should find a path");
    assert.equal(result.path.length, 1, "path is just the start/end point");
    assert.deepEqual(result.path[0], [1, 1]);
  });

  it("solves a maze", () => {
    const grid = [
      [0, 1, 0, 0, 0],
      [0, 1, 0, 1, 0],
      [0, 0, 0, 1, 0],
      [1, 1, 0, 0, 0],
      [0, 0, 0, 1, 0],
    ];
    const result = findPath(grid, [0, 0], [4, 4]);
    assert.ok(result, "should find a path through the maze");
    assert.deepEqual(result.path[0], [0, 0]);
    assert.deepEqual(result.path[result.path.length - 1], [4, 4]);
    assert.ok(isValidPath(grid, result.path), "path must be valid");
    assert.equal(result.path.length, 9, "shortest maze path is 9");
  });

  it("handles large grid efficiently", () => {
    // 50x50 grid with a clear path
    const size = 50;
    const grid: number[][] = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => 0)
    );
    // Add some obstacles but leave a clear path
    for (let i = 1; i < size - 1; i++) {
      grid[i]![Math.floor(size / 2)] = 1; // vertical wall with gap at top and bottom
    }

    const start = performance.now();
    const result = findPath(grid, [0, 0], [size - 1, size - 1]);
    const elapsed = performance.now() - start;

    assert.ok(result, "should find a path on large grid");
    assert.ok(isValidPath(grid, result.path), "path must be valid");
    assert.ok(elapsed < 1000, `should complete in < 1 second (took ${elapsed.toFixed(0)}ms)`);
    assert.ok(result.nodesExplored < size * size, "A* should not explore every cell");
  });

  it("tracks nodes explored accurately", () => {
    const grid = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const result = findPath(grid, [0, 0], [2, 2]);
    assert.ok(result, "should find a path");
    assert.ok(result.nodesExplored > 0, "should explore at least 1 node");
    assert.ok(result.nodesExplored <= 9, "should not explore more than grid size");
  });
});
