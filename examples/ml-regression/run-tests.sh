#!/bin/bash
cd "$(dirname "$0")" && python -m pytest test_regression.py -v
