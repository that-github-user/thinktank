#!/bin/bash
# Rerun all failed runs with wrapper scripts + add ML runs
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
  echo "================================================================"

  npx tsx src/cli.ts run "$prompt" \
    -n "$agents" \
    -t "$test_cmd" \
    --model "$model" \
    --timeout 300 \
    2>&1 || echo "[WARN] Run failed — continuing"
}

# ═══════ A* Python (re-runs with wrapper) ═══════

run_task "Python A* #1" \
  "Implement A* pathfinding in examples/astar-python/grid.py. Use Manhattan distance heuristic and a min-heap priority queue." \
  "bash examples/astar-python/run-tests.sh" \
  5 sonnet

run_task "Python A* #2 (creative)" \
  "Implement find_path in examples/astar-python/grid.py using any optimal pathfinding algorithm. Optimize for clarity and efficiency." \
  "bash examples/astar-python/run-tests.sh" \
  5 sonnet

run_task "Python A* #3 (performance)" \
  "Implement A* in examples/astar-python/grid.py. Focus on performance: efficient data structures, minimize allocations, add heap tiebreaking." \
  "bash examples/astar-python/run-tests.sh" \
  3 sonnet

# ═══════ A* TypeScript (re-runs with wrapper) ═══════

run_task "TypeScript A* #1" \
  "Implement findPath in examples/astar/src/grid.ts using A* with Manhattan distance heuristic. Use a priority queue." \
  "bash examples/astar/run-tests.sh" \
  5 sonnet

run_task "TypeScript A* #2 (creative)" \
  "Implement findPath in examples/astar/src/grid.ts. Use any optimal pathfinding approach. Write clean, idiomatic TypeScript." \
  "bash examples/astar/run-tests.sh" \
  5 sonnet

# ═══════ Linear Regression ═══════

run_task "Regression #1 (normal equation)" \
  "Implement train_and_predict in examples/ml-regression/model.py using the normal equation (closed-form least squares). Use numpy only, not sklearn." \
  "bash examples/ml-regression/run-tests.sh" \
  5 sonnet

run_task "Regression #2 (gradient descent)" \
  "Implement train_and_predict in examples/ml-regression/model.py using batch gradient descent. Do NOT use the normal equation or sklearn. Use numpy only." \
  "bash examples/ml-regression/run-tests.sh" \
  5 sonnet

run_task "Regression #3 (creative)" \
  "Implement train_and_predict in examples/ml-regression/model.py. Choose any approach: normal equation, gradient descent, QR decomposition, or SVD. Optimize for numerical stability. Numpy only." \
  "bash examples/ml-regression/run-tests.sh" \
  3 sonnet

# ═══════ KNN Classification ═══════

run_task "KNN #1 (standard)" \
  "Implement train_and_classify in examples/ml-classification/classifier.py using k-nearest neighbors with Euclidean distance and majority voting. Numpy only, not sklearn." \
  "bash examples/ml-classification/run-tests.sh" \
  5 sonnet

run_task "KNN #2 (optimized)" \
  "Implement train_and_classify in examples/ml-classification/classifier.py using KNN with numpy broadcasting for distance computation. Handle ties by smallest label. Numpy only." \
  "bash examples/ml-classification/run-tests.sh" \
  5 sonnet

run_task "KNN #3 (creative)" \
  "Implement train_and_classify in examples/ml-classification/classifier.py using any nearest-neighbor variant. Prioritize correctness and clean code. Numpy only, no sklearn." \
  "bash examples/ml-classification/run-tests.sh" \
  3 sonnet

# ═══════ Main repo (re-run the ones that needed cd) ═══════

run_task "Main repo: improve error messages" \
  "Improve error handling in src/runners/claude-code.ts: when claude CLI is not found (ENOENT), print a helpful message with install link. When agent times out, include timeout duration in error." \
  "npm test" \
  5 sonnet

run_task "Main repo: config list" \
  "Add a thinktank config list subcommand that prints all current configuration values from .thinktank/config.json in a readable format. If no config exists, print defaults. Register in src/cli.ts." \
  "npm test" \
  5 sonnet

echo ""
echo "================================================================"
echo "ALL V2 RUNS COMPLETE — running evaluate"
echo "================================================================"
npx tsx src/cli.ts evaluate 2>&1
echo ""
ls .thinktank/run-*.json | wc -l
echo " total run files"
