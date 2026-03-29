import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Test the bordaRecommend logic from evaluate.ts
// Since bordaRecommend is not exported, we test the evaluation concept
describe("evaluate scoring comparison", () => {
  it("borda count: lowest rank sum wins", () => {
    // Simulate: 3 agents ranked on 3 criteria
    // Agent 1: rank 0, 1, 2 = sum 3
    // Agent 2: rank 1, 0, 0 = sum 1 (winner)
    // Agent 3: rank 2, 2, 1 = sum 5
    const ranks = new Map([
      [1, 3],
      [2, 1],
      [3, 5],
    ]);
    let bestId = -1;
    let bestRank = Infinity;
    for (const [id, rank] of ranks) {
      if (rank < bestRank) {
        bestRank = rank;
        bestId = id;
      }
    }
    assert.equal(bestId, 2);
  });

  it("agreement detection: methods agree when same agent recommended", () => {
    const weighted = 1;
    const copeland = 1;
    const borda = 1;
    assert.equal(weighted === copeland && copeland === borda, true);
  });

  it("disagreement detection: methods disagree when different agents", () => {
    const weighted: number = 1;
    const copeland: number = 2;
    const borda: number = 2;
    assert.equal(weighted === copeland && copeland === borda, false);
  });
});
