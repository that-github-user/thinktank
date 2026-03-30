"""
K-nearest neighbors classification challenge for thinktank ensemble testing.

Implement train_and_classify() to classify test samples using the
k-nearest neighbors algorithm.

Constraints:
  - You may use numpy for distance calculations and array operations.
  - Do NOT use sklearn or any other ML library.
  - Use k=3 as the default number of neighbors.
  - Use Euclidean distance as the distance metric.
  - Break ties by choosing the label with the smallest distance sum.
"""

import numpy as np
from numpy.typing import NDArray


def train_and_classify(
    X_train: NDArray[np.float64],
    y_train: NDArray[np.int64],
    X_test: NDArray[np.float64],
    k: int = 3,
) -> NDArray[np.int64]:
    """
    Classify test samples using k-nearest neighbors.

    YOUR TASK: Implement KNN classification from scratch using numpy.

    Args:
        X_train: Training features, shape (n_train, n_features)
        y_train: Training labels, shape (n_train,) with integer class labels
        X_test: Test features, shape (n_test, n_features)
        k: Number of neighbors to consider (default 3)

    Returns:
        Predicted labels for X_test, shape (n_test,)
    """
    # TODO: Implement k-nearest neighbors classification
    raise NotImplementedError("This is your task!")
