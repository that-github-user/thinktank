#!/bin/bash
cd "$(dirname "$0")" && python -m pytest test_classification.py -v
