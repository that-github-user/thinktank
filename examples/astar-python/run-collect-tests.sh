#!/bin/bash
cd "$(dirname "$0")" && python -m pytest test_pathfinding_generated.py --collect-only
