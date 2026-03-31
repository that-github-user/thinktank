#!/bin/bash
# ML batch runs for scoring evaluation diversity
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
  echo "Agents: $agents | Model: $model"
  echo "================================================================"

  npx tsx src/cli.ts run "$prompt" \
    -n "$agents" \
    -t "$test_cmd" \
    --model "$model" \
    --timeout 300 \
    2>&1 || echo "[WARN] Run failed — continuing"

  echo "--- Completed: $desc ---"
}

# ═══════════════════════════════════════════════════════════
# Linear Regression (Python, numpy only, no sklearn)
# ═══════════════════════════════════════════════════════════

run_task "Linear Regression #1 (standard)" \
  "Implement the train_and_predict function in examples/ml-regression/model.py. Use the normal equation (closed-form least squares) to fit a linear regression model. Use numpy only, not sklearn. Return predictions as a 1D numpy array." \
  "cd examples/ml-regression && python -m pytest test_regression.py -v" \
  5 sonnet

run_task "Linear Regression #2 (gradient descent)" \
  "Implement train_and_predict in examples/ml-regression/model.py using gradient descent optimization. Do NOT use the normal equation or sklearn. Implement batch gradient descent with a reasonable learning rate and convergence criterion. Use numpy only." \
  "cd examples/ml-regression && python -m pytest test_regression.py -v" \
  5 sonnet

run_task "Linear Regression #3 (creative freedom)" \
  "Implement the train_and_predict function in examples/ml-regression/model.py. Choose any approach to fit a linear model: normal equation, gradient descent, QR decomposition, or SVD. Optimize for numerical stability. Use numpy only, no sklearn." \
  "cd examples/ml-regression && python -m pytest test_regression.py -v" \
  3 sonnet

# ═══════════════════════════════════════════════════════════
# KNN Classification (Python, numpy only, no sklearn)
# ═══════════════════════════════════════════════════════════

run_task "KNN Classification #1 (standard)" \
  "Implement the train_and_classify function in examples/ml-classification/classifier.py. Use k-nearest neighbors with Euclidean distance and majority voting. Use numpy only, not sklearn. Return predictions as a 1D numpy array." \
  "cd examples/ml-classification && python -m pytest test_classification.py -v" \
  5 sonnet

run_task "KNN Classification #2 (optimized)" \
  "Implement train_and_classify in examples/ml-classification/classifier.py using KNN with Euclidean distance. Focus on efficiency: use numpy broadcasting to compute distances without Python loops. Handle ties by picking the smallest label. Use numpy only." \
  "cd examples/ml-classification && python -m pytest test_classification.py -v" \
  5 sonnet

run_task "KNN Classification #3 (creative freedom)" \
  "Implement the train_and_classify function in examples/ml-classification/classifier.py. Use any nearest-neighbor approach: brute force KNN, weighted KNN, or any variant. Prioritize correctness and clean code. Use numpy only, no sklearn." \
  "cd examples/ml-classification && python -m pytest test_classification.py -v" \
  3 sonnet

echo ""
echo "================================================================"
echo "ML RUNS COMPLETE"
echo "================================================================"
