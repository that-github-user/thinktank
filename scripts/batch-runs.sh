#!/bin/bash
# Batch thinktank runs for scoring evaluation diversity
# Each run generates scoring data in .thinktank/
set -e

REPO="C:/Users/silon/Documents/repos/thinktank"
cd "$REPO"

run_task() {
  local desc="$1"
  local prompt="$2"
  local test_cmd="$3"
  local agents="${4:-5}"
  local model="${5:-sonnet}"

  echo ""
  echo "================================================================"
  echo "RUN: $desc"
  echo "Agents: $agents | Model: $model | Test: $test_cmd"
  echo "================================================================"

  npx tsx src/cli.ts run "$prompt" \
    -n "$agents" \
    -t "$test_cmd" \
    --model "$model" \
    --timeout 300 \
    2>&1 || echo "[WARN] Run failed or had errors — continuing"

  echo "--- Completed: $desc ---"
}

# ═══════════════════════════════════════════════════════════
# ROUND 1: A* Pathfinding — Python (known good test suite)
# ═══════════════════════════════════════════════════════════

run_task "Python A* #1" \
  "Implement A* pathfinding in examples/astar-python/grid.py. Use Manhattan distance heuristic and a min-heap priority queue. The function should return a PathResult with the shortest path and nodes_explored count, or None if unreachable." \
  "cd examples/astar-python && python -m pytest test_pathfinding.py -v" \
  5 sonnet

run_task "Python A* #2 (creative freedom)" \
  "Implement the find_path function in examples/astar-python/grid.py using any optimal pathfinding algorithm. You may use A*, Dijkstra, or any approach that finds shortest paths. Optimize for clarity and efficiency." \
  "cd examples/astar-python && python -m pytest test_pathfinding.py -v" \
  5 sonnet

run_task "Python A* #3 (performance focus)" \
  "Implement A* pathfinding in examples/astar-python/grid.py. Focus on performance: use efficient data structures, minimize memory allocations, and add heap tiebreaking to reduce explored nodes." \
  "cd examples/astar-python && python -m pytest test_pathfinding.py -v" \
  3 sonnet

# ═══════════════════════════════════════════════════════════
# ROUND 2: A* Pathfinding — TypeScript (different language)
# ═══════════════════════════════════════════════════════════

run_task "TypeScript A* #1" \
  "Implement the findPath function in examples/astar/src/grid.ts using A* pathfinding with Manhattan distance heuristic. Use a min-heap or priority queue. Return a PathResult with path and nodesExplored, or null if unreachable." \
  "cd examples/astar && npx tsx --test tests/pathfinding.test.ts" \
  5 sonnet

run_task "TypeScript A* #2 (creative freedom)" \
  "Implement findPath in examples/astar/src/grid.ts. Use any optimal pathfinding approach. Prioritize clean, idiomatic TypeScript." \
  "cd examples/astar && npx tsx --test tests/pathfinding.test.ts" \
  5 sonnet

# ═══════════════════════════════════════════════════════════
# ROUND 3: Main repo tasks — varied complexity
# ═══════════════════════════════════════════════════════════

run_task "Main repo: add --quiet flag" \
  "Add a --quiet flag to the run command (src/commands/run.ts) that suppresses all output except the final recommended agent line. Wire it through the CLI options in src/cli.ts. Make sure existing tests still pass." \
  "npm test" \
  5 sonnet

run_task "Main repo: validate attempts range" \
  "Add input validation to the run command: the --attempts value must be between 1 and 20 inclusive. If out of range, print an actionable error message and exit with code 1. Add a test for this validation." \
  "npm test" \
  3 sonnet

run_task "Main repo: improve error messages" \
  "Improve error handling in src/runners/claude-code.ts: when the claude CLI is not found (ENOENT), print a helpful message telling the user to install Claude Code CLI with a link to docs. When the agent times out, include the timeout duration in the error message." \
  "npm test" \
  5 sonnet

run_task "Main repo: add run duration to JSON output" \
  "When --output-format json is used, include a totalDuration field (in seconds) in the JSON output that measures the wall-clock time from start to finish of the entire ensemble run. Also include a startTime ISO timestamp." \
  "npm test" \
  3 sonnet

run_task "Main repo: config list subcommand" \
  "Add a 'thinktank config list' subcommand that prints all current configuration values (from .thinktank/config.json) in a readable format. If no config exists, print defaults. Register it in src/cli.ts." \
  "npm test" \
  5 sonnet

echo ""
echo "================================================================"
echo "ALL RUNS COMPLETE"
echo "================================================================"
echo ""
npx tsx src/cli.ts evaluate 2>&1
