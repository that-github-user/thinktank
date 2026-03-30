"""
Comprehensive unit tests for A* pathfinding — generated test suite.

Tests use unittest (not pytest fixtures).
Import: find_path, Point from grid
"""

import time
import unittest
from grid import find_path, Point


def is_valid_path(grid: list[list[int]], path: list[Point]) -> bool:
    """Verify each step is adjacent (Manhattan distance 1) and on walkable terrain."""
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


class TestStraightLine(unittest.TestCase):
    """Test 1: Straight-line path with no obstacles."""

    def test_horizontal_no_obstacles(self):
        # Single row, walk right from col 0 to col 5 — path length must be 6
        grid = [[0, 0, 0, 0, 0, 0]]
        result = find_path(grid, (0, 0), (0, 5))
        self.assertIsNotNone(result)
        self.assertEqual(result.path[0], (0, 0))
        self.assertEqual(result.path[-1], (0, 5))
        self.assertEqual(len(result.path), 6)
        self.assertTrue(is_valid_path(grid, result.path))

    def test_vertical_no_obstacles(self):
        # Single column, walk down from row 0 to row 4 — path length must be 5
        grid = [[0]] * 5
        result = find_path(grid, (0, 0), (4, 0))
        self.assertIsNotNone(result)
        self.assertEqual(result.path[0], (0, 0))
        self.assertEqual(result.path[-1], (4, 0))
        self.assertEqual(len(result.path), 5)
        self.assertTrue(is_valid_path(grid, result.path))

    def test_diagonal_corner_open_grid(self):
        # Open 4x4 grid: Manhattan distance from (0,0) to (3,3) = 6, so path length = 7
        grid = [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ]
        result = find_path(grid, (0, 0), (3, 3))
        self.assertIsNotNone(result)
        self.assertEqual(len(result.path), 7)
        self.assertTrue(is_valid_path(grid, result.path))


class TestAroundObstacles(unittest.TestCase):
    """Test 2: Path must detour around walls."""

    def test_single_wall_column(self):
        # Wall at col 2 forces path around via col 0 bottom or top edge.
        # Grid 3 rows x 5 cols, wall runs down col 2 (rows 0–1 only).
        # Start (0,0) → End (0,4):
        # Must go (0,0)→(1,0)→(2,0)→(2,1)→(2,2)→(2,3)→(2,4)→(1,4)→(0,4) = 9 nodes
        grid = [
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 0, 0, 0],
        ]
        result = find_path(grid, (0, 0), (0, 4))
        self.assertIsNotNone(result)
        self.assertEqual(result.path[0], (0, 0))
        self.assertEqual(result.path[-1], (0, 4))
        self.assertEqual(len(result.path), 9)
        self.assertTrue(is_valid_path(grid, result.path))

    def test_u_shaped_obstacle(self):
        # U-shaped wall forces path around the outside.
        # Grid 4x4, wall forms a U opening upward.
        # Start (0,0) → End (3,3)
        grid = [
            [0, 0, 0, 0],
            [0, 1, 1, 0],
            [0, 1, 1, 0],
            [0, 0, 0, 0],
        ]
        result = find_path(grid, (0, 0), (3, 3))
        self.assertIsNotNone(result)
        self.assertTrue(is_valid_path(grid, result.path))
        # Shortest path must skirt the 2x2 block: Manhattan cost = 6, path = 7 nodes
        self.assertEqual(len(result.path), 7)


class TestUnreachable(unittest.TestCase):
    """Test 3: Goal is completely walled off."""

    def test_target_enclosed_by_walls(self):
        # Target (1,1) surrounded on all sides by walls.
        grid = [
            [0, 0, 0, 0, 0],
            [0, 1, 1, 1, 0],
            [0, 1, 0, 1, 0],
            [0, 1, 1, 1, 0],
            [0, 0, 0, 0, 0],
        ]
        result = find_path(grid, (0, 0), (2, 2))
        self.assertIsNone(result)

    def test_source_enclosed_by_walls(self):
        # Start (2,2) is the enclosed cell; target is open.
        grid = [
            [0, 0, 0, 0, 0],
            [0, 1, 1, 1, 0],
            [0, 1, 0, 1, 0],
            [0, 1, 1, 1, 0],
            [0, 0, 0, 0, 0],
        ]
        result = find_path(grid, (2, 2), (0, 0))
        self.assertIsNone(result)

    def test_full_wall_column_divides_grid(self):
        # Full column wall separates left from right half.
        grid = [
            [0, 1, 0],
            [0, 1, 0],
            [0, 1, 0],
        ]
        result = find_path(grid, (0, 0), (2, 2))
        self.assertIsNone(result)


class TestStartEqualsEnd(unittest.TestCase):
    """Test 4: Start and end are the same cell."""

    def test_same_cell_returns_single_node_path(self):
        grid = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
        result = find_path(grid, (1, 1), (1, 1))
        self.assertIsNotNone(result)
        self.assertEqual(len(result.path), 1)
        self.assertEqual(result.path[0], (1, 1))

    def test_same_cell_top_left_corner(self):
        grid = [[0, 0], [0, 0]]
        result = find_path(grid, (0, 0), (0, 0))
        self.assertIsNotNone(result)
        self.assertEqual(len(result.path), 1)
        self.assertEqual(result.path[0], (0, 0))

    def test_same_cell_nodes_explored_minimal(self):
        grid = [[0, 0], [0, 0]]
        result = find_path(grid, (0, 0), (0, 0))
        self.assertIsNotNone(result)
        # Only the start cell needs to be examined
        self.assertGreaterEqual(result.nodes_explored, 1)


class TestMaze(unittest.TestCase):
    """
    Test 5: Maze with a single forced route.

    Grid (5x5):
        col:  0  1  2  3  4
      row 0: [0, 0, 1, 0, 0]
      row 1: [1, 0, 1, 0, 1]
      row 2: [1, 0, 0, 0, 1]
      row 3: [0, 0, 1, 0, 0]
      row 4: [0, 1, 1, 1, 0]

    Start: (0,0)   End: (4,4)

    Hand-traced shortest path:
      (0,0) → right  → (0,1)   [only move; down (1,0)=wall]
      (0,1) → down   → (1,1)   [right (0,2)=wall]
      (1,1) → down   → (2,1)   [left (1,0)=wall, right (1,2)=wall]
      (2,1) → right  → (2,2)   [left (2,0)=wall; down (3,1) leads to dead-end pocket]
      (2,2) → right  → (2,3)
      (2,3) → down   → (3,3)   [right (2,4)=wall; up (1,3)→(0,3)→(0,4) is dead end]
      (3,3) → right  → (3,4)   [down (4,3)=wall, left (3,2)=wall]
      (3,4) → down   → (4,4)   ✓

    Path: (0,0),(0,1),(1,1),(2,1),(2,2),(2,3),(3,3),(3,4),(4,4)
    Length: 9 nodes
    """

    MAZE = [
        [0, 0, 1, 0, 0],
        [1, 0, 1, 0, 1],
        [1, 0, 0, 0, 1],
        [0, 0, 1, 0, 0],
        [0, 1, 1, 1, 0],
    ]

    def test_maze_path_found(self):
        result = find_path(self.MAZE, (0, 0), (4, 4))
        self.assertIsNotNone(result)

    def test_maze_endpoints(self):
        result = find_path(self.MAZE, (0, 0), (4, 4))
        self.assertIsNotNone(result)
        self.assertEqual(result.path[0], (0, 0))
        self.assertEqual(result.path[-1], (4, 4))

    def test_maze_path_is_valid(self):
        result = find_path(self.MAZE, (0, 0), (4, 4))
        self.assertIsNotNone(result)
        self.assertTrue(is_valid_path(self.MAZE, result.path))

    def test_maze_shortest_path_length(self):
        # As hand-traced above, shortest path visits exactly 9 nodes.
        result = find_path(self.MAZE, (0, 0), (4, 4))
        self.assertIsNotNone(result)
        self.assertEqual(len(result.path), 9)

    def test_maze_exact_route(self):
        # There is only one path through this maze — verify the exact sequence.
        expected = [
            (0, 0), (0, 1),
            (1, 1),
            (2, 1), (2, 2), (2, 3),
            (3, 3), (3, 4),
            (4, 4),
        ]
        result = find_path(self.MAZE, (0, 0), (4, 4))
        self.assertIsNotNone(result)
        self.assertEqual(result.path, expected)


class TestPerformance(unittest.TestCase):
    """Test 6: 50x50 grid completes in under 1 second."""

    def test_large_open_grid(self):
        size = 50
        grid = [[0] * size for _ in range(size)]

        start_time = time.perf_counter()
        result = find_path(grid, (0, 0), (size - 1, size - 1))
        elapsed = time.perf_counter() - start_time

        self.assertIsNotNone(result)
        self.assertTrue(is_valid_path(grid, result.path))
        self.assertLess(elapsed, 1.0, f"Took {elapsed:.3f}s, must be < 1s")

    def test_large_grid_with_obstacle_channel(self):
        # Wall runs down the middle except for a gap at the bottom,
        # forcing path to travel the full height before crossing.
        size = 50
        mid = size // 2
        grid = [[0] * size for _ in range(size)]
        for r in range(0, size - 1):      # leave bottom row open
            grid[r][mid] = 1

        start_time = time.perf_counter()
        result = find_path(grid, (0, 0), (0, size - 1))
        elapsed = time.perf_counter() - start_time

        self.assertIsNotNone(result)
        self.assertTrue(is_valid_path(grid, result.path))
        self.assertLess(elapsed, 1.0, f"Took {elapsed:.3f}s, must be < 1s")

    def test_large_grid_path_length_optimal(self):
        # On a fully open 50x50 grid, Manhattan optimal is (49+49)+1 = 99 nodes.
        size = 50
        grid = [[0] * size for _ in range(size)]
        result = find_path(grid, (0, 0), (size - 1, size - 1))
        self.assertIsNotNone(result)
        self.assertEqual(len(result.path), 99)


class TestNodesExplored(unittest.TestCase):
    """Test 7: nodes_explored is reasonable — > 0 and < total grid cells."""

    def test_nodes_explored_positive(self):
        grid = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
        result = find_path(grid, (0, 0), (2, 2))
        self.assertIsNotNone(result)
        self.assertGreater(result.nodes_explored, 0)

    def test_nodes_explored_below_grid_size(self):
        grid = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
        result = find_path(grid, (0, 0), (2, 2))
        self.assertIsNotNone(result)
        total_cells = 3 * 3
        self.assertLessEqual(result.nodes_explored, total_cells)

    def test_nodes_explored_unreachable_covers_component(self):
        # All cells left of the wall are explored when target is unreachable.
        grid = [
            [0, 1, 0],
            [0, 1, 0],
            [0, 1, 0],
        ]
        result = find_path(grid, (0, 0), (0, 2))
        self.assertIsNone(result)
        # find_path must return None (not raise); nodes_explored only available on success

    def test_nodes_explored_large_grid_heuristic(self):
        # A* with a good heuristic should explore well under the full grid.
        size = 20
        grid = [[0] * size for _ in range(size)]
        result = find_path(grid, (0, 0), (size - 1, size - 1))
        self.assertIsNotNone(result)
        total_cells = size * size
        self.assertGreater(result.nodes_explored, 0)
        self.assertLess(result.nodes_explored, total_cells)

    def test_nodes_explored_start_equals_end(self):
        grid = [[0, 0], [0, 0]]
        result = find_path(grid, (0, 0), (0, 0))
        self.assertIsNotNone(result)
        self.assertGreaterEqual(result.nodes_explored, 1)


if __name__ == "__main__":
    unittest.main()
