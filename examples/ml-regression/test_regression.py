"""Tests for linear regression implementation."""

import time
import unittest

import numpy as np

from model import train_and_predict


class TestLinearRegression(unittest.TestCase):
    """Comprehensive tests for train_and_predict."""

    def test_simple_linear(self):
        """y = 2x + 1 — predictions should be within tolerance."""
        X_train = np.linspace(0, 10, 50).reshape(-1, 1)
        y_train = 2 * X_train.ravel() + 1

        X_test = np.array([[2.5], [5.0], [7.5]])
        expected = np.array([6.0, 11.0, 16.0])

        predictions = train_and_predict(X_train, y_train, X_test)

        np.testing.assert_allclose(predictions, expected, atol=0.1)

    def test_multiple_features(self):
        """Multi-feature regression should achieve R² > 0.9 on clean data."""
        rng = np.random.default_rng(42)
        n_samples = 200
        n_features = 3

        # y = 3*x0 - 2*x1 + 0.5*x2 + 4 (with small noise)
        X = rng.standard_normal((n_samples, n_features))
        weights = np.array([3.0, -2.0, 0.5])
        y = X @ weights + 4.0 + rng.normal(0, 0.1, n_samples)

        # 80/20 split
        split = int(0.8 * n_samples)
        X_train, X_test = X[:split], X[split:]
        y_train, y_test = y[:split], y[split:]

        predictions = train_and_predict(X_train, y_train, X_test)

        # Compute R²
        ss_res = np.sum((y_test - predictions) ** 2)
        ss_tot = np.sum((y_test - np.mean(y_test)) ** 2)
        r_squared = 1 - ss_res / ss_tot

        self.assertGreater(r_squared, 0.9, f"R² = {r_squared:.4f}, expected > 0.9")

    def test_single_point(self):
        """Training on minimal data (2 points) should still produce predictions."""
        X_train = np.array([[0.0], [1.0]])
        y_train = np.array([0.0, 1.0])
        X_test = np.array([[0.5]])

        predictions = train_and_predict(X_train, y_train, X_test)

        self.assertEqual(len(predictions), 1)
        self.assertAlmostEqual(predictions[0], 0.5, places=1)

    def test_returns_correct_shape(self):
        """Output shape must match the number of X_test rows."""
        rng = np.random.default_rng(7)
        X_train = rng.standard_normal((30, 4))
        y_train = rng.standard_normal(30)
        X_test = rng.standard_normal((15, 4))

        predictions = train_and_predict(X_train, y_train, X_test)

        self.assertEqual(predictions.shape, (15,))

    def test_perfect_fit(self):
        """Exact linear data should produce near-zero error."""
        X_train = np.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0], [7.0, 8.0]])
        y_train = np.array([5.0, 11.0, 17.0, 23.0])  # y = 2*x0 + 1*x1 + 1

        X_test = np.array([[2.0, 3.0], [4.0, 5.0]])
        expected = np.array([8.0, 14.0])

        predictions = train_and_predict(X_train, y_train, X_test)

        np.testing.assert_allclose(predictions, expected, atol=1e-6)

    def test_performance(self):
        """Should complete in < 2 seconds on 1000 samples."""
        rng = np.random.default_rng(99)
        X_train = rng.standard_normal((1000, 10))
        y_train = rng.standard_normal(1000)
        X_test = rng.standard_normal((200, 10))

        start = time.perf_counter()
        predictions = train_and_predict(X_train, y_train, X_test)
        elapsed = time.perf_counter() - start

        self.assertLess(elapsed, 2.0, f"Took {elapsed:.2f}s, expected < 2s")
        self.assertEqual(len(predictions), 200)


if __name__ == "__main__":
    unittest.main()
