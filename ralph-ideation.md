Iterate through ideas for an open-source project powered by Claude Code. Each iteration should propose a concrete, narrow idea, then critique it ruthlessly, then refine or pivot. The goal is to find something that: (1) leverages Claude Code's unique capabilities (agentic coding, tool use, multi-step reasoning), (2) is genuinely useful infrastructure other tools build on, (3) has a testable hypothesis that can be validated quickly, (4) won't be trivially absorbed by platform vendors, (5) starts narrow enough to ship fast.

IMPORTANT CONTEXT - Dead ends (do NOT suggest these):
- Self-improving repos (competes with AlphaEvolve/Godel Machine)
- AI coding cookbooks/rule repositories (content decays, bad contributor incentives)
- Code quality scanners/linters (saturated: SonarQube, CodeRabbit, Semgrep)
- Token usage trackers/dashboards (ccusage, Agentlytics exist)
- "Community votes on what AI builds" (cold-start, security issues)
- Open standards designed in a vacuum
- Grand multi-tier visions pitched upfront

What survived critique:
- AI coding tools are stateless, single-repo, lack cross-project awareness -- real structural limitation
- Highest leverage = infrastructure other tools/agents build on, not consumer product
- Must start with ruthlessly narrow, testable hypothesis
- Key question: "Can automated analysis produce AI coding instructions that outperform hand-written ones?" -- but auto-analysis captures structure, not strategic intent (migrations, architectural direction) which is where valuable rules live
- Format/schema of manifest output is potentially strategic, but only AFTER proving usefulness
- Platform vendors are improving built-in project understanding, so standalone tools risk absorption

Each iteration should:
1. Propose ONE specific idea with a clear "v0.1 ships in a weekend" scope
2. Identify the testable hypothesis
3. Steel-man critique it (especially: who uses this? why not just X? what's the moat?)
4. Score it on: usefulness, moat, shippability, community potential
5. Either refine it or pivot to the next idea

Run AT LEAST 8 iterations. After all iterations, write a FINAL SUMMARY ranking the top 3 ideas with rationale.

Keep iterating until you find something that scores well on all dimensions or exhaust promising directions.