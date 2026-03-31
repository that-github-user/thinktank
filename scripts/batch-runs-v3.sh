#!/bin/bash
# v3: Re-run A* examples with fixed test_maze assertion
set -e
cd C:/Users/silon/Documents/repos/thinktank

run_task() {
  local desc="$1"; local prompt="$2"; local test_cmd="$3"
  local agents="${4:-5}"; local model="${5:-sonnet}"
  echo ""; echo "=== RUN: $desc ==="
  npx tsx src/cli.ts run "$prompt" -n "$agents" -t "$test_cmd" --model "$model" --timeout 300 2>&1 || echo "[WARN] Run failed"
}

# Python A*
run_task "Python A* #1" \
  "Implement A* pathfinding in examples/astar-python/grid.py. Use Manhattan distance heuristic and a min-heap priority queue." \
  "bash examples/astar-python/run-tests.sh" 5 sonnet

run_task "Python A* #2 (creative)" \
  "Implement find_path in examples/astar-python/grid.py using any optimal pathfinding algorithm. Optimize for clarity and efficiency." \
  "bash examples/astar-python/run-tests.sh" 5 sonnet

# TypeScript A*
run_task "TS A* #1" \
  "Implement findPath in examples/astar/src/grid.ts using A* with Manhattan distance heuristic. Use a priority queue." \
  "bash examples/astar/run-tests.sh" 5 sonnet

run_task "TS A* #2 (creative)" \
  "Implement findPath in examples/astar/src/grid.ts. Use any optimal pathfinding approach. Write clean, idiomatic TypeScript." \
  "bash examples/astar/run-tests.sh" 5 sonnet

echo ""; echo "=== V3 COMPLETE ==="; echo ""
ls .thinktank/run-*.json | wc -l; echo " total runs"
npx tsx src/cli.ts evaluate 2>&1 | grep -E "Usable|All three|Weighted|Copeland"
