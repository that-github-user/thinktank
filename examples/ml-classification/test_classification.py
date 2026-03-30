"""Tests for k-nearest neighbors classification implementation."""

import time
import unittest

import numpy as np

from classifier import train_and_classify


class TestKNNClassification(unittest.TestCase):
    """Comprehensive tests for train_and_classify."""

    def test_simple_binary(self):
        """Two well-separated clusters should achieve > 90% accuracy."""
        rng = np.random.default_rng(42)

        # Cluster 0 centered at (0, 0), cluster 1 centered at (10, 10)
        X_class0 = rng.normal(loc=0.0, scale=1.0, size=(50, 2))
        X_class1 = rng.normal(loc=10.0, scale=1.0, size=(50, 2))

        X_train = np.vstack([X_class0[:40], X_class1[:40]])
        y_train = np.array([0] * 40 + [1] * 40, dtype=np.int64)

        X_test = np.vstack([X_class0[40:], X_class1[40:]])
        y_test = np.array([0] * 10 + [1] * 10, dtype=np.int64)

        predictions = train_and_classify(X_train, y_train, X_test)

        accuracy = np.mean(predictions == y_test)
        self.assertGreater(accuracy, 0.9, f"Accuracy = {accuracy:.2%}, expected > 90%")

    def test_multiclass(self):
        """Three or more classes should achieve > 80% accuracy on separable data."""
        rng = np.random.default_rng(123)

        centers = [(0, 0), (10, 0), (5, 10)]
        X_parts = []
        y_parts = []
        for label, (cx, cy) in enumerate(centers):
            X_parts.append(rng.normal(loc=[cx, cy], scale=1.0, size=(40, 2)))
            y_parts.append(np.full(40, label, dtype=np.int64))

        X_all = np.vstack(X_parts)
        y_all = np.concatenate(y_parts)

        # 75/25 split per class
        train_idx = []
        test_idx = []
        for label in range(3):
            idx = np.where(y_all == label)[0]
            train_idx.extend(idx[:30])
            test_idx.extend(idx[30:])

        X_train, y_train = X_all[train_idx], y_all[train_idx]
        X_test, y_test = X_all[test_idx], y_all[test_idx]

        predictions = train_and_classify(X_train, y_train, X_test)

        accuracy = np.mean(predictions == y_test)
        self.assertGreater(accuracy, 0.8, f"Accuracy = {accuracy:.2%}, expected > 80%")

    def test_single_neighbor(self):
        """k=1 should memorize training data — predicting training points exactly."""
        rng = np.random.default_rng(7)
        X_train = rng.standard_normal((20, 3))
        y_train = np.array([0, 1, 2, 0, 1, 2, 0, 1, 2, 0,
                            1, 2, 0, 1, 2, 0, 1, 2, 0, 1], dtype=np.int64)

        # Predict on the training data itself
        predictions = train_and_classify(X_train, y_train, X_train, k=1)

        np.testing.assert_array_equal(
            predictions, y_train,
            "k=1 should perfectly memorize training data"
        )

    def test_returns_correct_shape(self):
        """Output length must match the number of X_test rows."""
        rng = np.random.default_rng(55)
        X_train = rng.standard_normal((30, 4))
        y_train = rng.choice([0, 1, 2], size=30).astype(np.int64)
        X_test = rng.standard_normal((12, 4))

        predictions = train_and_classify(X_train, y_train, X_test)

        self.assertEqual(len(predictions), 12)

    def test_returns_valid_labels(self):
        """Predictions should only contain labels present in the training set."""
        rng = np.random.default_rng(88)
        X_train = rng.standard_normal((40, 2))
        labels = np.array([5, 10, 15], dtype=np.int64)  # unusual label values
        y_train = rng.choice(labels, size=40)
        X_test = rng.standard_normal((20, 2))

        predictions = train_and_classify(X_train, y_train, X_test)

        valid_labels = set(labels)
        for pred in predictions:
            self.assertIn(
                pred, valid_labels,
                f"Predicted label {pred} not in training labels {valid_labels}"
            )

    def test_performance(self):
        """Should complete in < 2 seconds on 500 samples."""
        rng = np.random.default_rng(99)
        X_train = rng.standard_normal((500, 5))
        y_train = rng.choice([0, 1, 2, 3], size=500).astype(np.int64)
        X_test = rng.standard_normal((100, 5))

        start = time.perf_counter()
        predictions = train_and_classify(X_train, y_train, X_test)
        elapsed = time.perf_counter() - start

        self.assertLess(elapsed, 2.0, f"Took {elapsed:.2f}s, expected < 2s")
        self.assertEqual(len(predictions), 100)


if __name__ == "__main__":
    unittest.main()
