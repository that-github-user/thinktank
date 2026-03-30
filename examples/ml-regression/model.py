"""
Linear regression challenge for thinktank ensemble testing.

Implement train_and_predict() to fit a linear regression model
using ordinary least squares (or any equivalent method).

Constraints:
  - You may use numpy for linear algebra operations.
  - Do NOT use sklearn or any other ML library.
  - Handle both single-feature and multi-feature inputs.

The model should learn weights w and bias b such that:
  y ≈ X @ w + b
"""

import numpy as np
from numpy.typing import NDArray


def train_and_predict(
    X_train: NDArray[np.float64],
    y_train: NDArray[np.float64],
    X_test: NDArray[np.float64],
) -> NDArray[np.float64]:
    """
    Train a linear regression model and return predictions on the test set.

    YOUR TASK: Implement linear regression from scratch using numpy.
    You may use the normal equation, gradient descent, or any other approach.

    Args:
        X_train: Training features, shape (n_train, n_features)
        y_train: Training targets, shape (n_train,)
        X_test: Test features, shape (n_test, n_features)

    Returns:
        Predictions for X_test, shape (n_test,)
    """
    # TODO: Implement linear regression
    raise NotImplementedError("This is your task!")
