#!/bin/bash
cd "$(dirname "$0")" && npx tsx --test tests/pathfinding.test.ts
