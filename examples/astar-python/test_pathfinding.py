"""Tests for A* pathfinding implementation."""

import time
import unittest
from grid import find_path, Point


def is_valid_path(grid: list[list[int]], path: list[Point]) -> bool:
    """Verify path is valid: each step is adjacent and on walkable terrain."""
    for i, (r, c) in enumerate(path):
        if r < 0 or r >= len(grid) or c < 0 or c >= len(grid[0]):
            return False
        if grid[r][c] != 0:
            return False
        if i > 0:
            pr, pc = path[i - 1]
            if abs(r - pr) + abs(c - pc) != 1:
                return False
    return True


class TestPathfinding(unittest.TestCase):

    def test_straight_line(self):
        grid = [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
        ]
        result = find_path(grid, (0, 0), (0, 4))
        self.assertIsNotNone(result)
        self.assertEqual(result.path[0], (0, 0))
        self.assertEqual(result.path[-1], (0, 4))
        self.assertEqual(len(result.path), 5)
        self.assertTrue(is_valid_path(grid, result.path))

    def test_around_obstacles(self):
        grid = [
            [0, 0, 0, 0, 0],
            [0, 1, 1, 1, 0],
            [0, 0, 0, 0, 0],
        ]
        result = find_path(grid, (0, 0), (2, 4))
        self.assertIsNotNone(result)
        self.assertEqual(result.path[0], (0, 0))
        self.assertEqual(result.path[-1], (2, 4))
        self.assertTrue(is_valid_path(grid, result.path))
        self.assertEqual(len(result.path), 7)

    def test_unreachable(self):
        grid = [
            [0, 1, 0],
            [0, 1, 0],
            [0, 1, 0],
        ]
        result = find_path(grid, (0, 0), (0, 2))
        self.assertIsNone(result)

    def test_start_equals_end(self):
        grid = [[0, 0], [0, 0]]
        result = find_path(grid, (1, 1), (1, 1))
        self.assertIsNotNone(result)
        self.assertEqual(len(result.path), 1)
        self.assertEqual(result.path[0], (1, 1))

    def test_maze(self):
        grid = [
            [0, 1, 0, 0, 0],
            [0, 1, 0, 1, 0],
            [0, 0, 0, 1, 0],
            [1, 1, 0, 0, 0],
            [0, 0, 0, 1, 0],
        ]
        result = find_path(grid, (0, 0), (4, 4))
        self.assertIsNotNone(result)
        self.assertEqual(result.path[0], (0, 0))
        self.assertEqual(result.path[-1], (4, 4))
        self.assertTrue(is_valid_path(grid, result.path))
        self.assertEqual(len(result.path), 9)

    def test_large_grid_performance(self):
        size = 50
        grid = [[0] * size for _ in range(size)]
        for i in range(1, size - 1):
            grid[i][size // 2] = 1

        start = time.perf_counter()
        result = find_path(grid, (0, 0), (size - 1, size - 1))
        elapsed = time.perf_counter() - start

        self.assertIsNotNone(result)
        self.assertTrue(is_valid_path(grid, result.path))
        self.assertLess(elapsed, 1.0, f"Should complete in < 1 second (took {elapsed:.3f}s)")
        self.assertLess(result.nodes_explored, size * size)

    def test_nodes_explored(self):
        grid = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
        ]
        result = find_path(grid, (0, 0), (2, 2))
        self.assertIsNotNone(result)
        self.assertGreater(result.nodes_explored, 0)
        self.assertLessEqual(result.nodes_explored, 9)


if __name__ == "__main__":
    unittest.main()
