"""
Grid-based pathfinding challenge for thinktank ensemble testing.

The grid is a 2D list where:
  0 = walkable
  1 = obstacle

Implement find_path() to find the shortest path from start to end
using A* or any optimal pathfinding algorithm.

Movement: 4-directional (up, down, left, right). No diagonals.
"""

from typing import Optional
from dataclasses import dataclass

Point = tuple[int, int]


@dataclass
class PathResult:
    path: list[Point]
    nodes_explored: int


def find_path(
    grid: list[list[int]],
    start: Point,
    end: Point,
) -> Optional[PathResult]:
    """
    Find the shortest path from start to end on the grid.

    YOUR TASK: Implement this function using A* pathfinding.
    Choose your own heuristic, data structures, and optimizations.

    Args:
        grid: 2D grid (0=walkable, 1=obstacle)
        start: Starting position (row, col)
        end: Target position (row, col)

    Returns:
        PathResult with the shortest path and nodes explored, or None if unreachable
    """
    # TODO: Implement A* pathfinding
    raise NotImplementedError("This is your task!")
