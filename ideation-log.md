# Open-Source Project Ideation Log

## Iteration 1: Cross-Repo Dependency Impact Analyzer

**Idea:** A CLI tool that, given a set of related repositories (e.g., a microservices org), uses Claude Code to trace how a change in one repo (API contract change, shared library update, config schema change) impacts dependent repos. It produces a concrete "impact manifest" — which files in which repos need updating, with draft PRs or at minimum specific line-level annotations.

**v0.1 scope:** Given 2 repos and a diff in repo A, output a list of files in repo B that are affected and why. No automation, just the analysis.

**Testable hypothesis:** "An automated cross-repo impact analysis produces actionable results that developers would not have caught through manual review in >50% of cases involving shared interfaces."

**Steel-man critique:**
- **Who uses this?** Teams with microservices or monorepo-adjacent multi-repo setups. This is actually a lot of companies.
- **Why not just X?** Dependabot/Renovate handle version bumps but NOT semantic impact (e.g., "this API field became optional"). IDE cross-references work within a repo. Nothing currently does semantic cross-repo impact analysis.
- **What's the moat?** The analysis quality depends on prompt engineering + orchestration specific to cross-repo reasoning. Platform vendors focus on single-repo context. The multi-repo coordination layer is genuinely unsolved.
- **Will platforms absorb it?** Possibly eventually, but multi-repo is a hard coordination problem that's not in any vendor's near-term roadmap. Anthropic/Cursor/GitHub are all focused on single-repo experiences.

**Scores:**
- Usefulness: 4/5 (real pain point, but only for orgs with 3+ interdependent repos)
- Moat: 3/5 (analysis quality is replicable, but orchestration layer has value)
- Shippability: 3/5 (needs access to multiple repos, auth, cloning — not trivial for v0.1)
- Community potential: 3/5 (contributors need multi-repo setups to test)

**Verdict: PIVOT** — The "needs multiple repos to even test" problem makes v0.1 too heavy. The insight about cross-project awareness is right, but the entry point is wrong. Need something testable with a single repo.

---

## Iteration 2: Agent Task Replay & Regression Testing

**Idea:** A tool that records what an AI coding agent (Claude Code, Copilot, Cursor) actually did during a session — the sequence of tool calls, file reads, edits, shell commands — and lets you replay/diff those sessions. Think "AI agent session VCR." The killer use case: regression testing for agent behavior. Did upgrading your CLAUDE.md or switching models cause the agent to make worse decisions? Now you can compare.

**v0.1 scope:** A Claude Code hook that captures session transcripts into a structured format (JSON/YAML), plus a `diff` command that compares two session recordings side-by-side, highlighting where the agent made different decisions.

**Testable hypothesis:** "Developers who can compare agent sessions side-by-side catch behavioral regressions that they would otherwise miss, leading to measurably better CLAUDE.md / prompt configurations."

**Steel-man critique:**
- **Who uses this?** Power users tuning their AI coding workflows. Teams standardizing on AI tooling.
- **Why not just X?** Claude Code has conversation logs, but they're not structured for comparison. No tool currently treats agent sessions as first-class testable artifacts.
- **What's the moat?** The session schema becomes a standard if adopted. Replay infrastructure is genuinely missing from the ecosystem. Platform vendors want you using THEIR tools, not comparing across tools.
- **Will platforms absorb it?** They might build "session history" features, but cross-tool comparison and regression testing is unlikely to be a priority for any single vendor.

**Scores:**
- Usefulness: 4/5 (anyone tuning AI workflows wants this)
- Moat: 4/5 (session schema + cross-tool comparison is structurally hard to absorb)
- Shippability: 4/5 (hooks exist in Claude Code, structured logging is straightforward)
- Community potential: 4/5 (every Claude Code user is a potential contributor/user)

**Verdict: REFINE** — This is promising. The "agent session as testable artifact" framing is strong. Let me tighten it.

---

## Iteration 3: Agent Task Replay — Refined

**Idea (refined):** **`agentrace`** — a Claude Code hook + CLI that:
1. Records every Claude Code session as a structured trace (tool calls, file mutations, decisions, timing)
2. Lets you `agentrace compare session-a session-b` to see where two runs diverged
3. Lets you `agentrace benchmark "fix the auth bug" --runs 5` to measure consistency

The real wedge: **benchmarking your own repo's AI-readiness.** Run the same task 5 times, see how often Claude gets it right. This tells you where your codebase is confusing to AI agents — which is actionable feedback for improving your CLAUDE.md and code structure.

**v0.1 scope:** Hook that logs sessions + `compare` command. That's it.

**Testable hypothesis:** "Running the same Claude Code task multiple times and analyzing divergence points reveals specific, actionable improvements to CLAUDE.md that increase task success rate by >20%."

**Steel-man critique:**
- **Who uses this?** Teams adopting Claude Code who want to optimize their setup. DevEx teams. Individual power users.
- **Why not just X?** Nothing does this. Period. Agent sessions are treated as ephemeral.
- **What's the moat?** Trace format becomes the standard. Benchmark suite contributions from community. Cross-agent support (Cursor, Copilot) extends the moat.
- **Will platforms absorb?** Session logging, maybe. But "benchmark your repo's AI-readiness" is a framing no vendor will adopt (it implies their tool might fail).

**Weakened by:** Claude Code's session format may change frequently, making trace capture fragile. Also — do people actually run the same task multiple times? The workflow might be too unfamiliar.

**Scores:**
- Usefulness: 3.5/5 (powerful but niche workflow — "benchmark your AI readiness" is cool but not urgent)
- Moat: 4/5 (trace schema + benchmark corpus)
- Shippability: 4/5 (hook + simple CLI)
- Community potential: 3.5/5 (contributors need to care about meta-optimization)

**Verdict: PIVOT** — The trace/compare idea is good but the USE CASE isn't compelling enough for v0.1. People don't benchmark their repos. Let me find a more immediately useful wedge for the same underlying technology.

---

## Iteration 4: Agent Memory/Context Sync Across Repos

**Idea:** **`ctx`** — a tool that manages a developer's AI context across multiple projects. When you switch between repos, you lose all the context Claude built up. `ctx` maintains a portable "developer context" — what you're working on, cross-cutting concerns, org-level conventions — and injects it into any Claude Code session automatically.

**v0.1 scope:** A CLI that lets you `ctx set "migrating auth from JWT to session tokens across all services"` and automatically injects that context into Claude Code sessions via CLAUDE.md management. `ctx show` displays your current cross-project context.

**Testable hypothesis:** "Developers who carry cross-project context between Claude Code sessions complete cross-cutting tasks faster than those starting each session from scratch."

**Steel-man critique:**
- **Who uses this?** Any developer working across multiple repos with AI tools.
- **Why not just X?** CLAUDE.md is per-repo. There's a global CLAUDE.md but it's for preferences, not project state. No tool manages the "what am I working on across repos" layer.
- **What's the moat?** This is a WORKFLOW tool, not a feature. Platform vendors won't build "remember what the developer is doing across their whole org" because it's cross-tool. The context graph is the moat.
- **Will platforms absorb?** Each vendor will improve THEIR memory, but cross-repo, cross-tool context is nobody's job.

**Scores:**
- Usefulness: 4.5/5 (every multi-repo developer feels this pain daily)
- Moat: 3.5/5 (simple concept, replicable — but network effects from shared org contexts)
- Shippability: 5/5 (literally managing text files + a simple CLI)
- Community potential: 4/5 (low barrier to contribute, everyone has opinions on context management)

**Verdict: REFINE** — This is the most immediately useful idea so far. Let me sharpen it.

---

## Iteration 5: `ctx` Refined — The Cross-Project AI Context Layer

**Idea (refined):** **`ctx`** — not just "remember my task" but a structured context layer:
1. **Intent layer:** What you're working on across repos (`ctx intent "migrating to session-based auth"`)
2. **Decisions layer:** Key decisions that apply everywhere (`ctx decide "use zod for all new validation"`)
3. **Graph layer:** How your repos relate (`ctx link api-service --depends-on auth-lib`)

These get auto-injected into Claude Code (and potentially Cursor, Copilot) via managed CLAUDE.md or equivalent config files. When you `cd` into a repo, your AI assistant already knows what you're doing, what you've decided, and how this repo fits in.

**v0.1 scope:** `ctx intent` + `ctx decide` + auto-injection into CLAUDE.md. That's it. No graph yet.

**Testable hypothesis:** "Developers using `ctx` to carry intent and decisions across repos report that Claude Code gives more relevant suggestions on the first attempt in >60% of sessions."

**Steel-man critique:**
- **Who uses this?** Developers using AI coding tools across 2+ repos.
- **Why not just X?** This is genuinely novel. No tool manages cross-repo AI context.
- **Moat concern:** It's essentially "manage some text files and inject them." Very simple to clone. The moat would have to come from (a) becoming the default way people think about AI context, (b) integrations with multiple AI tools, (c) org-level features (shared team decisions).
- **Absorption risk:** Medium. If Claude Code adds "workspaces" or multi-repo memory, this gets absorbed. But the cross-TOOL aspect (works with Cursor too) provides some protection.

**Scores:**
- Usefulness: 4.5/5
- Moat: 3/5 (simple to replicate, moat comes from adoption not tech)
- Shippability: 5/5
- Community potential: 4/5

**Verdict: PIVOT** — The moat problem is real. This is a good idea but it's essentially "write text to files" with a nice CLI. Someone at Anthropic could add this as a feature in a week. Let me look for something with more technical depth.

---

## Iteration 6: Agent Orchestration Protocol / Task Router

**Idea:** **`agenthub`** — a lightweight protocol + server that lets multiple AI agents coordinate on a shared task. Example: you have Claude Code working on the backend, and you want to spin up a second agent on the frontend, and they need to agree on the API contract. `agenthub` provides a shared task board and message bus.

**v0.1 scope:** A local server that two Claude Code instances can read/write to via a simple file-based protocol. Agent A writes "I'm creating endpoint POST /users with this schema" → Agent B reads it and builds the frontend accordingly.

**Testable hypothesis:** "Two coordinated Claude Code agents complete a full-stack feature faster and with fewer integration bugs than a single agent doing both sequentially."

**Steel-man critique:**
- **Who uses this?** Power users who want to parallelize AI coding work.
- **Why not just X?** Claude Code can't talk to other Claude Code instances. There's no standard for agent-to-agent coordination in coding.
- **What's the moat?** The protocol itself. If this becomes how agents coordinate, that's a strong standard.
- **Will platforms absorb?** Multi-agent is on everyone's roadmap, but the PROTOCOL for how agents share state is up for grabs.

**Problem:** This is exciting but may be a "grand vision pitched upfront" — exactly what the dead-ends list warns against. Also, testing requires running multiple Claude Code instances concurrently, which is expensive and complex.

**Scores:**
- Usefulness: 3.5/5 (cool but the workflow doesn't exist yet — you're creating demand)
- Moat: 4.5/5 (protocol standards are strong moats)
- Shippability: 2/5 (multi-agent coordination is hard, testing is expensive)
- Community potential: 3/5 (too complex for casual contributors)

**Verdict: PIVOT** — Too ambitious for v0.1. The protocol idea is interesting but you can't pitch a protocol without usage. Filing this for later.

---

## Iteration 7: Claude Code Task Decomposition Engine

**Idea:** **`splitask`** — a tool that takes a complex coding task and decomposes it into a DAG of smaller, independent subtasks that can be run in parallel by multiple Claude Code instances (or sequentially by one). Each subtask has clear inputs, outputs, and acceptance criteria.

**v0.1 scope:** Given a task description + codebase, output a JSON DAG of subtasks with dependencies. Human reviews and approves, then runs them manually.

**Testable hypothesis:** "AI-decomposed task DAGs result in higher success rates for complex tasks (>3 files changed) compared to giving Claude Code the full task as a single prompt."

**Steel-man critique:**
- **Who uses this?** Anyone giving Claude Code complex tasks that sometimes fail.
- **Why not just X?** Claude Code does its own internal planning, but it's opaque and non-reviewable. This externalizes the plan so humans can edit it.
- **What's the moat?** Task decomposition patterns become a knowledge base. The DAG format could become standard.
- **Absorption risk:** High. This is basically "better planning" which is core to what every AI vendor is improving.

**Scores:**
- Usefulness: 4/5 (complex tasks failing is a real pain)
- Moat: 2/5 (planning is core vendor territory)
- Shippability: 4/5 (it's just prompt engineering + JSON output)
- Community potential: 3/5 (people can contribute decomposition strategies)

**Verdict: PIVOT** — Moat is too weak. Vendors will just make their planners better.

---

## Iteration 8: Cross-Session Knowledge Extractor

**Idea:** **`harvest`** — after a Claude Code session, automatically extract the *implicit knowledge* that was generated during the session and persist it in a useful form. Not the code changes (those are in git) but the WHY: "we chose X over Y because Z", "this file is structured this way because...", "the tricky part about this module is...". These get written as structured annotations (comments, ADRs, or a knowledge base) that future AI sessions can use.

**v0.1 scope:** A post-session hook that analyzes the Claude Code conversation, extracts decision rationale and implicit knowledge, and appends it to a `DECISIONS.md` or inline code comments.

**Testable hypothesis:** "Codebases augmented with AI-extracted decision rationale lead to higher success rates on subsequent AI coding tasks in the same area."

**Steel-man critique:**
- **Who uses this?** Teams where multiple people (or AI agents) work on the same codebase over time.
- **Why not just X?** ADR tools exist but nobody writes ADRs consistently. This makes it automatic. Claude Code's memory exists but it's personal, not shared, and not structured.
- **What's the moat?** The extraction quality and the format. If `harvest` becomes how teams capture AI-session knowledge, the format is the moat.
- **Absorption risk:** Medium. Vendors will improve memory, but "extract session knowledge into the REPO for the TEAM" is different from personal memory.

**Scores:**
- Usefulness: 4/5 (institutional knowledge loss is a massive problem)
- Moat: 3.5/5 (extraction quality + format, but replicable)
- Shippability: 4.5/5 (post-session hook + prompt engineering)
- Community potential: 4/5 (everyone benefits, low barrier to use)

**Verdict: REFINE** — This is strong. Let me sharpen.

---

## Iteration 9: `harvest` Refined — Session-to-Repository Knowledge Pipeline

**Idea (refined):** **`harvest`** with a twist — it doesn't just extract decisions, it specifically extracts **things that would help the NEXT AI session succeed.** It's a feedback loop:

1. After each Claude Code session, `harvest` analyzes what happened
2. It identifies: decisions made, gotchas discovered, patterns established, mistakes made and corrected
3. It writes these as structured annotations INTO the repo (not a separate knowledge base)
4. Format: adds to CLAUDE.md, adds inline `// AI-NOTE:` comments at tricky spots, creates/updates ADRs
5. Next AI session benefits from this accumulated context

The key insight: **this turns every AI coding session into training data for the next one, but stored in the repo, not in a proprietary memory system.** It's the "strategic intent" capture that the surviving-critique noted auto-analysis misses — because it captures intent AT THE MOMENT decisions are made, not by analyzing code after the fact.

**v0.1 scope:** Post-session hook that extracts top 3 decisions/gotchas and appends them to CLAUDE.md with timestamps.

**Testable hypothesis:** "Repos running `harvest` for 2 weeks show measurably higher first-attempt success rates on Claude Code tasks compared to baseline, as measured by fewer follow-up correction prompts."

**Steel-man critique:**
- **Who uses this?** Any team using Claude Code regularly.
- **Why not just X?** Claude's built-in memory is personal and ephemeral. This is repo-level, team-shared, and version-controlled.
- **What's the moat?** (a) The extraction prompt quality improves with community feedback, (b) The annotation format could become standard, (c) Network effect: repos with `harvest` annotations attract more AI-assisted contributions.
- **Absorption risk:** Anthropic could build "shared memory" but putting knowledge IN THE REPO (version controlled, portable, tool-agnostic) is philosophically different from proprietary memory.

**Scores:**
- Usefulness: 4.5/5 (solves the "AI keeps making the same mistakes" problem)
- Moat: 4/5 (repo-level, tool-agnostic, community-improvable extraction)
- Shippability: 5/5 (it's a hook + a prompt)
- Community potential: 4.5/5 (everyone using AI coding tools benefits)

**Verdict: WINNER candidate** — But let me do one more iteration exploring a different angle.

---

## Iteration 10: Test-Driven Agent Evaluation

**Idea:** **`agenttest`** — write tests for your AI agent's behavior, not your code. Define scenarios like "given this codebase state and this task, the agent should: modify these files, not touch those files, run these commands." It's like integration tests but for AI coding workflows.

**v0.1 scope:** A test framework where you define a scenario (repo state + task), run Claude Code on it, and assert properties of the result (files changed, tests pass, specific patterns present/absent).

**Testable hypothesis:** "Teams with agent behavior tests catch AI workflow regressions before they affect production code."

**Steel-man critique:**
- **Who uses this?** Teams with standardized AI coding workflows.
- **Why not just X?** Nothing tests AI agent behavior as a first-class concern.
- **Moat:** Test scenario library from community contributions.
- **Absorption risk:** Low — vendors don't test their own tools' failure modes publicly.

**Problem:** The workflow of "write tests for your AI assistant" is unfamiliar and may feel like overhead rather than value. Also, AI behavior is inherently non-deterministic, making assertions fragile.

**Scores:**
- Usefulness: 3/5 (valuable but the "test your AI" workflow doesn't exist yet)
- Moat: 4/5 (test corpus from community)
- Shippability: 3/5 (need sandboxed execution, non-trivial)
- Community potential: 3.5/5 (contributing test scenarios is accessible)

**Verdict: PIVOT** — Non-determinism makes this frustrating in practice. Good idea for later when agent behavior is more predictable.

---

# FINAL SUMMARY — Top 3 Ideas

## Rank 1: `harvest` — Session-to-Repo Knowledge Pipeline
**Scores: Usefulness 4.5 | Moat 4 | Shippability 5 | Community 4.5 = 18/20**

The strongest idea. It solves a real, felt problem (AI sessions are stateless and keep rediscovering the same things), ships in a weekend (post-session hook + extraction prompt), and has a natural moat (repo-level, tool-agnostic knowledge that improves with community-contributed extraction strategies). The key insight — capturing strategic intent AT decision time rather than reverse-engineering it from code — directly addresses the gap identified in the surviving critique.

**v0.1:** Post-session hook that extracts top decisions/gotchas → appends to CLAUDE.md.
**Growth path:** Inline annotations → ADR generation → cross-repo knowledge patterns.

## Rank 2: `ctx` — Cross-Project AI Context Layer
**Scores: Usefulness 4.5 | Moat 3 | Shippability 5 | Community 4 = 16.5/20**

Most immediately useful, weakest moat. Everyone feels the pain of context loss when switching repos. But it's "manage text files" at its core. Best as a feature of `harvest` or a standalone tool only if you can build cross-tool support (Cursor + Claude Code + Copilot) quickly to create switching costs.

## Rank 3: `agentrace` — Agent Session Traces & Comparison
**Scores: Usefulness 3.5 | Moat 4 | Shippability 4 | Community 3.5 = 15/20**

Strong technical moat (trace schema + benchmark corpus) but the workflow is too unfamiliar for broad adoption. Best positioned as a developer/power-user tool that could become the debugging standard for AI coding sessions. Could be a great v0.2 addition to `harvest` (harvest uses traces as input).

---

## Recommended Path

**Start with `harvest`.** It's the tightest hypothesis, easiest to ship, and most immediately testable. Build it as a Claude Code hook that runs after each session. Measure whether repos with accumulated harvest annotations show better AI task success rates. If that hypothesis validates, the format/schema of harvest annotations becomes the strategic asset — and `ctx` (cross-repo context) and `agentrace` (session analysis) become natural extensions.

---
---

# RALPH LOOP — ITERATION 2: Stress-Testing & Deeper Exploration

Previous iteration produced 10 sub-iterations and crowned `harvest` as the winner. This iteration's job: **break `harvest`**, explore angles that were missed, and either confirm it or find something better.

## Iteration 11: Stress-Testing `harvest`

Let me attack `harvest` from every angle:

**Attack 1: Does the input even exist?**
`harvest` needs access to the Claude Code conversation transcript to extract knowledge. But Claude Code conversation data is stored in `~/.claude/projects/` in JSONL format. This is an *internal, undocumented format* that could change at any time. The entire tool is built on reading a private data structure.

**Counter:** Claude Code hooks have access to conversation context. A post-stop hook gets the transcript. But the hook environment is limited — you get the conversation in a specific format. Need to verify what data hooks actually receive.

**Attack 2: Signal-to-noise ratio**
Most Claude Code sessions are mundane: "add a button", "fix this test", "refactor this function." The "decisions and gotchas" worth extracting are rare. Running `harvest` on every session would produce mostly noise — low-value observations like "used React for the component" or "followed existing test patterns."

**Counter:** This is the core challenge. The extraction prompt needs to be highly selective — only extract things that are *surprising, non-obvious, or corrective*. A filter like "would a new developer or AI be surprised by this?" helps. But getting this filter right IS the product.

**Attack 3: CLAUDE.md pollution**
If `harvest` appends to CLAUDE.md after every session, it will grow unbounded. After 50 sessions, CLAUDE.md becomes a wall of text that Claude has to read every time, wasting context and potentially confusing it with outdated information.

**Counter:** Need a curation mechanism. Either: (a) `harvest` also prunes/consolidates, (b) a separate `harvest prune` command, (c) use a separate file that gets summarized periodically. This is solvable but adds complexity.

**Attack 4: The measurement problem**
The hypothesis says "measurably higher first-attempt success rates." How do you measure this? You'd need to: define "success," run comparable tasks on repos with and without harvest, control for task difficulty. This is practically a research paper, not a weekend project.

**Counter:** Simpler proxy metric: "number of user corrections per session." If harvest is working, Claude needs fewer corrections because it already knows the gotchas. But even this requires A/B comparison across sessions, which is hard to do rigorously.

**Attack 5: Anthropic's memory system**
Claude Code already has a built-in memory system (the exact one we're using right now). It persists knowledge across sessions. `harvest` is essentially an automated version of what memory already does — but writing to the repo instead of to `~/.claude/`. Is the difference (repo-level vs personal) enough to justify a separate tool?

**Counter:** The differences are real: (a) repo-level is shared with the team, (b) version-controlled, (c) tool-agnostic. But "shared CLAUDE.md" is something any team can do manually by just... editing CLAUDE.md together. The question is whether automation adds enough value over "just write good CLAUDE.md entries."

**Stress-test verdict:** `harvest` survives but is **weaker than it looked.** The core problems are:
1. Signal-to-noise (most sessions don't produce harvest-worthy knowledge)
2. CLAUDE.md growth management
3. Hard to measure actual impact
4. Competes with built-in memory

It's still buildable and useful, but it might end up as a "nice to have" rather than a "must have." Let me look for something with more structural necessity.

---

## Iteration 12: Agent-to-Agent Contract Negotiation (Narrow Version)

Revisiting iteration 6 (agenthub) but with a ruthlessly narrow scope.

**Idea:** **`handoff`** — a tool for structured handoffs between Claude Code sessions. When one session ends (or a developer finishes a task), `handoff` creates a structured "handoff document" that the next session can consume. Think of it as a relay baton — not memory, not documentation, but a SPECIFIC artifact designed for AI-to-AI or human-to-AI task continuation.

**v0.1 scope:** `handoff create` at end of session (analyzes what was done, what's left, what to watch out for) → `handoff resume` at start of next session (injects the handoff into context).

**Testable hypothesis:** "Tasks that span multiple Claude Code sessions complete faster and with fewer errors when using structured handoffs compared to starting fresh."

**Steel-man critique:**
- **Who uses this?** Anyone whose AI coding tasks span multiple sessions (which is most non-trivial tasks).
- **Why not just X?** Claude Code memory exists but it's unstructured. A handoff is intentionally structured: "what was done, what's next, what's risky." It's a protocol, not a diary.
- **What's the moat?** The handoff schema. If adopted, every tool that wants session continuation needs to read/write this format.
- **Absorption risk:** Medium. Vendors will improve session continuity, but a STRUCTURED handoff format is different from "the AI remembers more."

**Hmm...** This is essentially `harvest` with a different framing. Instead of "extract knowledge for the repo," it's "create a continuation artifact for the next session." The underlying mechanism is almost identical. Let me look for something genuinely different.

---

## Iteration 13: The Missing Layer — AI Task Marketplace / Bounty Board

**Idea:** **`aitasks`** — a GitHub-integrated tool where maintainers tag issues as "AI-ready" with structured metadata (acceptance criteria, relevant files, test commands, complexity estimate). Claude Code (or any AI tool) can then pick these up and attempt them autonomously. Think Gitcoin bounties but for AI agents.

**v0.1 scope:** A GitHub Action that validates "AI-ready" issue labels have the required metadata, plus a CLI that pulls an AI-ready issue and sets up a Claude Code session pre-loaded with the task context.

**Testable hypothesis:** "Issues tagged with structured AI-ready metadata get successfully resolved by AI agents at 2x the rate of unstructured issues."

**Steel-man critique:**
- **Who uses this?** Open-source maintainers drowning in issues. Companies wanting to automate their backlog.
- **Why not just X?** Sweep, Devin, and others try to auto-fix issues but they work on raw issue text. The insight here is that STRUCTURED issue metadata dramatically improves AI success rate.
- **What's the moat?** The "AI-ready issue" schema becomes a standard. The corpus of AI-attempted issues becomes training data for improving success rates.
- **Will platforms absorb?** GitHub might add AI-readiness labels, but the schema and the tooling around measuring/improving AI success rates per issue type is open territory.

**Problem:** This overlaps with the "community votes on what AI builds" dead end. The key difference: it's not community-voted, it's maintainer-curated. But it still has the cold-start problem — you need repos using the schema before AI tools integrate with it.

**Scores:**
- Usefulness: 3.5/5 (useful but requires ecosystem adoption)
- Moat: 3.5/5 (schema is the moat, but schemas without adoption are dead ends)
- Shippability: 3/5 (GitHub Action + CLI, but needs real repos to test on)
- Community potential: 4/5 (maintainers love anything that helps triage)

**Verdict: PIVOT** — Cold-start problem kills it for v0.1. Can't prove the hypothesis without adoption.

---

## Iteration 14: Codebase Narration Engine

**Idea:** **`narrate`** — a tool that generates a "narrative walkthrough" of a codebase or a specific subsystem. Not documentation (that's reference material) but a STORY: "Here's how a request flows from the API endpoint through the auth middleware, into the service layer, hits the database, and returns. Here's why it's structured this way. Here's where the dragons are."

**v0.1 scope:** Given a starting point (an API endpoint, a function, a file), `narrate` traces the execution path and generates a human-readable narrative with links to specific lines.

**Testable hypothesis:** "Developers onboarding to a new codebase with AI-generated narrative walkthroughs complete their first meaningful PR faster than those with only traditional documentation."

**Steel-man critique:**
- **Who uses this?** New team members, developers context-switching between codebases, AI agents that need to understand a codebase.
- **Why not just X?** IDE "find references" gives you the graph but not the narrative. Documentation gives you the reference but not the flow. This is the GUIDED TOUR that every codebase needs but nobody writes.
- **What's the moat?** Narration quality depends on sophisticated multi-step code tracing + good storytelling prompts. It's not just "summarize this file" — it's "trace this execution path across 15 files and explain it coherently."
- **Absorption risk:** Medium-high. "Explain this code" is a feature every AI tool is improving.

**BUT WAIT:** The interesting twist — what if the narratives are generated specifically to help AI AGENTS, not humans? What if `narrate` produces narratives optimized for injection into AI context? That's a different product. It's "codebase translation for AI consumption" — turning a codebase into a format that AI agents can reason about more effectively.

**Scores:**
- Usefulness: 4/5 (everyone wants better codebase understanding)
- Moat: 2.5/5 (code explanation is core vendor territory)
- Shippability: 4/5 (prompt engineering + code traversal)
- Community potential: 3.5/5 (narration templates could be community-contributed)

**Verdict: PIVOT** — Too close to "explain this code" which every AI vendor is improving. The "for AI consumption" angle is interesting but needs more thought.

---

## Iteration 15: AI-Optimized Codebase Representation (from the `narrate` twist)

**Idea:** **`codemap`** — a tool that generates an intermediate representation of a codebase specifically designed for AI agent consumption. Not code, not documentation, but a structured "map" that answers the questions AI agents most commonly need answered: "what does this module do?", "how do these modules connect?", "what patterns should I follow when adding to this area?", "what will break if I change X?"

**v0.1 scope:** Generate a `CODEMAP.md` file that contains: module dependency graph, key abstractions and their responsibilities, integration points, "change these together" clusters.

**Testable hypothesis:** "Claude Code performs measurably better on coding tasks when given a codemap vs. when left to explore the codebase on its own."

**Steel-man critique:**
- **Who uses this?** Anyone wanting AI coding tools to be more effective on their codebase.
- **Why not just X?** This IS what the user's original surviving insight pointed to: "Can automated analysis produce AI coding instructions that outperform what humans write by hand?" But the critique was that it only captures structure, not strategic intent.
- **The strategic intent problem:** codemap captures what IS, not what SHOULD BE. It can say "these modules are coupled" but not "we're planning to decouple them next quarter."
- **Moat:** The codemap format could become standard. But platform vendors are doing exactly this with their built-in indexing.

**The real insight here:** The structural analysis (dependency graph, module map) is being commoditized by vendors. The strategic layer (intent, direction, decisions) is what's valuable AND it can't be automated — it requires human input. So the tool shouldn't try to replace human knowledge, it should AMPLIFY it.

**Scores:**
- Usefulness: 3.5/5 (vendors are building this in)
- Moat: 2/5 (this is literally what Cursor/Claude are improving at)
- Shippability: 3/5 (generating good maps is hard)
- Community potential: 3/5

**Verdict: PIVOT** — Confirmed that structural analysis is vendor territory. The strategic intent layer is the gap. But how do you build a tool for that?

---

## Iteration 16: Strategic Intent Registry

**Idea:** **`intent`** — a minimalist tool specifically for capturing and distributing STRATEGIC INTENT to AI coding tools. Not code structure (vendors handle that), not documentation (too broad), but specifically: "what are we TRYING to do and why?" Examples:
- "We're migrating from REST to GraphQL — new endpoints should be GraphQL-first"
- "The auth module is being rewritten — don't build on the old one"
- "Performance matters more than readability in the hot path (src/engine/)"

**v0.1 scope:** A `INTENT.md` file with a specific schema (directive, scope, rationale, expiry) plus a CLI to manage entries. Claude Code reads it automatically via CLAUDE.md integration.

**Testable hypothesis:** "AI coding agents following explicit intent directives produce code more aligned with architectural direction than agents working from code analysis alone."

**Steel-man critique:**
- **Who uses this?** Tech leads, architects, anyone responsible for codebase direction.
- **Why not just X?** CLAUDE.md already supports this — you can write architectural intent there. But CLAUDE.md is a catch-all. `intent` is specifically structured and scoped.
- **What's the moat?** Almost none. This is a file format + convention. Anyone can replicate it.
- **Absorption risk:** CLAUDE.md already is this. The user's own analysis noted: "The format/schema of any manifest output is potentially the strategic asset, but only AFTER proving the tool is useful — not before."

**Scores:**
- Usefulness: 4/5 (real gap between code structure and architectural intent)
- Moat: 1.5/5 (it's a markdown file with a schema)
- Shippability: 5/5
- Community potential: 2/5 (nothing to contribute)

**Verdict: PIVOT** — This crystallizes the problem but isn't a product. It's a convention. You could write a blog post about it and be done.

---

## Iteration 17: The Synthesis — What Connects the Strongest Ideas?

Let me step back. The strongest threads from all 16 iterations:

1. **`harvest`** (session knowledge extraction) — Good but signal-to-noise problem
2. **`ctx`** (cross-repo context) — Good but weak moat
3. **`agentrace`** (session traces) — Good moat but niche workflow
4. **`intent`** (strategic direction) — Right problem, not a product
5. **Multi-agent coordination** — Right direction, too ambitious

**What's the common thread?** All of these are about the **CONTEXT LAYER** — the information between the code and the AI. Every one of these tools is trying to fill the gap between "what the AI can see in the files" and "what the AI needs to know to make good decisions."

**New angle: What if the product isn't any single context tool but a PROTOCOL for context enrichment?**

No — that's "open standard designed in a vacuum." Dead end.

**Better angle: What if the product solves the context problem in a way that creates COMPOUNDING value?**

`harvest` has this property: each session makes the next session better. But the signal-to-noise problem means the compounding is noisy.

**What if we combine `harvest` + `intent` + measurement?**

---

## Iteration 18: `thinktank` — The Self-Improving AI Context Layer

**Idea:** **`thinktank`** — a tool that manages and MEASURES the effectiveness of AI context for your codebase. It combines three things:

1. **Intent capture** (from `intent`): Structured directives about architectural direction
2. **Session harvesting** (from `harvest`): Post-session extraction of decisions and gotchas
3. **Effectiveness measurement** (novel): Track which context entries actually get USED by AI agents, and whether sessions with specific context entries succeed more often

The key differentiator: **it closes the feedback loop.** It doesn't just accumulate context — it measures which context is valuable and prunes what isn't. Over time, the context file converges on the MINIMUM context needed for AI agents to succeed.

**v0.1 scope:** A Claude Code hook that:
- Logs which CLAUDE.md entries were relevant to each session (by checking if Claude referenced or followed them)
- After N sessions, reports which entries are unused (candidates for removal)
- Suggests new entries based on repeated corrections

That's it. No fancy extraction, no intent management. Just: **measure what context helps and what doesn't.**

**Testable hypothesis:** "Context entries validated by thinktank's usage tracking lead to higher AI task success rates than un-measured context accumulation."

**Steel-man critique:**
- **Who uses this?** Teams maintaining CLAUDE.md or equivalent who want data-driven context management.
- **Why not just X?** Nobody measures AI context effectiveness. CLAUDE.md files grow organically with no feedback on whether entries help or hurt. This is the only tool that closes the loop.
- **What's the moat?** The measurement methodology. The dataset of "which types of context entries are most effective across codebases." The community benchmarks.
- **Absorption risk:** LOW. Platform vendors optimize their TOOLS, not the user's context. Measuring context effectiveness is a meta-layer that sits outside any single vendor's scope.
- **Why it compounds:** Each measurement cycle improves the context, which improves AI performance, which generates more measurement data. It's a genuine flywheel.

**Scores:**
- Usefulness: 4.5/5 (everyone with a CLAUDE.md wants this — is my CLAUDE.md actually helping?)
- Moat: 4.5/5 (measurement methodology + cross-codebase effectiveness data is genuinely novel and hard to replicate)
- Shippability: 4/5 (hook + tracking + simple report, more complex than a single prompt but doable in a weekend)
- Community potential: 5/5 (everyone can contribute measurements, benchmark CLAUDE.md strategies, share findings)

**Verdict: WINNER** — This is stronger than `harvest` alone. The measurement angle solves `harvest`'s signal-to-noise problem (you only keep what works) and creates a genuine community moat (the dataset of "what context actually helps AI").

---

# UPDATED FINAL SUMMARY — Top 3 Ideas (Post-Iteration 2)

## Rank 1: `thinktank` — Measured AI Context Optimization
**Scores: Usefulness 4.5 | Moat 4.5 | Shippability 4 | Community 5 = 18/20**

The evolution of `harvest` with a crucial addition: MEASUREMENT. Instead of just accumulating context, `thinktank` measures which context entries actually improve AI performance. This closes the feedback loop and creates a compounding flywheel. The community moat is strong — cross-codebase data about "what context helps AI" doesn't exist anywhere.

**v0.1:** Hook that tracks which CLAUDE.md entries get referenced in each session + effectiveness report.
**Testable hypothesis:** "Measured context outperforms unmeasured context accumulation."
**Growth path:** Usage tracking → auto-pruning → auto-generation of new entries from correction patterns → cross-repo effectiveness benchmarks.

## Rank 2: `harvest` — Session-to-Repo Knowledge Pipeline
**Scores: Usefulness 4.5 | Moat 4 | Shippability 5 | Community 4.5 = 18/20**

Still strong, and potentially the v0.1 of `thinktank`. Pure extraction without measurement. Ships fastest but has the signal-to-noise problem. Best path: start with `harvest` for shippability, add measurement to become `thinktank`.

## Rank 3: `agentrace` — Agent Session Traces & Comparison
**Scores: Usefulness 3.5 | Moat 4 | Shippability 4 | Community 3.5 = 15/20**

Unchanged from iteration 1. Could be the debugging/analysis backend that powers `thinktank`'s measurement.

## Revised Recommended Path

**Ship `harvest` as v0.1 of `thinktank`.** Start with the simple case: post-session knowledge extraction into CLAUDE.md. Then add measurement (v0.2): track which entries are referenced and effective. Then add auto-optimization (v0.3): prune ineffective entries, suggest new ones from correction patterns. The name `thinktank` works because it frames the CLAUDE.md as a "brain" that gets smarter with each session — and the tool is the mechanism for that learning.

---
---

# RALPH LOOP — ITERATION 3: Breaking `thinktank`'s Core Mechanism + New Axis

Iterations 1-2 converged on `thinktank` (measured AI context optimization). This iteration: (A) attack the measurement mechanism — can it actually work? (B) explore a completely orthogonal direction that previous iterations missed.

## Part A: Can `thinktank` Actually Measure What It Claims?

### The Measurement Problem, Deeply

`thinktank`'s core value proposition is: "measure which CLAUDE.md entries help and prune the rest." But HOW do you measure this?

**Proposed mechanism:** "Track which CLAUDE.md entries get referenced in each session."

**Problem 1: "Referenced" ≠ "Helpful"**
Claude might reference a CLAUDE.md entry and still produce bad code. Or it might NOT reference an entry but still benefit from it (e.g., a style directive that shapes output without being explicitly cited). Reference tracking is a proxy, and it might be a BAD proxy.

**Problem 2: How do you even detect references?**
Claude doesn't output "I'm now using CLAUDE.md entry #3." You'd have to:
- (a) Parse the conversation for textual references to CLAUDE.md content — fragile, NLP-hard
- (b) Instrument CLAUDE.md entries with unique IDs and search for those IDs in output — ugly, requires cooperation from Claude
- (c) Use a post-session LLM call to analyze "which CLAUDE.md entries influenced this session" — expensive, meta, and the LLM might hallucinate connections

None of these are clean. Option (c) is most feasible but adds cost and uncertainty.

**Problem 3: Attribution is impossible**
Even if you could detect references, you can't attribute OUTCOMES to specific entries. "The session succeeded AND entry #3 was referenced" doesn't mean entry #3 caused the success. You'd need statistical significance across many sessions — probably dozens per entry. For a CLAUDE.md with 20 entries, that's hundreds of sessions before you can make any claims. No individual developer generates that volume.

**Problem 4: The counterfactual problem**
To know if an entry HELPED, you need to know what would have happened WITHOUT it. You'd need to run the same task twice — once with the entry, once without. This is the A/B testing problem, and it requires controlled experiments that normal development doesn't produce.

**Verdict on measurement:** The rigorous measurement that `thinktank` promises is **much harder than it appeared.** It's not impossible, but it's a research problem, not a weekend project. The v0.1 can track surface-level signals (references, corrections), but claiming these are "effectiveness measurements" is overselling.

### What Survives After Breaking Measurement?

If rigorous measurement is too hard, what's left of `thinktank`?

1. **Usage tracking (weak signal):** Which entries seem related to sessions. Not "effective," just "relevant."
2. **Staleness detection (easier):** Which entries haven't been referenced in N sessions → candidates for review.
3. **Growth management (practical):** Prevent CLAUDE.md from growing unbounded by flagging stale/redundant entries.
4. **Correction harvesting (from `harvest`):** Extract new entries from sessions where Claude was corrected.

This is still useful but it's **context hygiene**, not "measured optimization." The pitch shrinks from "data-driven AI context" to "keep your CLAUDE.md clean and growing." That's a weaker story.

### Revised `thinktank` — Honest Version

**What it actually is:** A CLAUDE.md lifecycle management tool.
- Auto-generates entries from sessions (harvest)
- Detects stale entries (staleness tracking)
- Prevents unbounded growth (consolidation)
- Suggests entries from correction patterns

**What it's NOT (yet):** A rigorous effectiveness measurement system.

**Revised scores:**
- Usefulness: 4/5 (down from 4.5 — it's hygiene, not optimization)
- Moat: 3/5 (down from 4.5 — without measurement data, the moat is just "nice CLI for CLAUDE.md management")
- Shippability: 4.5/5 (up slightly — simpler without measurement)
- Community potential: 3.5/5 (down from 5 — without cross-codebase measurement data, the community asset is weaker)
- **Total: 15/20 (down from 18)**

This is still a reasonable project but the "killer" framing is gone. Let me explore the orthogonal direction.

---

## Part B: Completely Different Axis — What Did We Miss?

Previous iterations explored: knowledge extraction, context management, measurement, multi-agent coordination, task decomposition, codebase mapping, strategic intent.

**What axis hasn't been explored?**

All previous ideas were about making AI coding BETTER on existing tasks. What about making AI coding possible for tasks that are CURRENTLY IMPOSSIBLE?

### Iteration 19: Verified AI Code Changes

**Idea:** **`provecode`** — a tool that wraps Claude Code with automatic VERIFICATION of every change. Not just "did tests pass" but formal-ish verification: type-checking, contract validation, property-based test generation, mutation testing on the changed code. The tool doesn't trust the AI — it PROVES (or at least strongly validates) that changes are correct.

**v0.1 scope:** A Claude Code wrapper that, after every edit, automatically: (a) runs the existing test suite, (b) generates property-based tests for the changed functions, (c) runs a mutation test on the changed lines to verify test coverage is meaningful, (d) reports a "confidence score."

**Testable hypothesis:** "AI code changes validated by provecode have fewer production bugs than AI changes reviewed only by humans."

**Steel-man critique:**
- **Who uses this?** Teams deploying AI-written code to production who need confidence.
- **Why not just X?** CI/CD exists but doesn't generate NEW tests for AI changes. Code review exists but humans miss things too. This is a verification layer specifically designed for AI-authored code.
- **What's the moat?** The verification pipeline + the property-based test generation tuned for AI-authored patterns.
- **Absorption risk:** HIGH. This is "better testing" which every CI/CD vendor is pursuing.

**Scores:**
- Usefulness: 4/5 (trust in AI code is a real problem)
- Moat: 2/5 (testing/verification is saturated)
- Shippability: 3/5 (mutation testing + property test generation is non-trivial)
- Community potential: 3/5

**Verdict: PIVOT** — Saturated space + high absorption risk.

---

### Iteration 20: AI Coding Session Multiplexer

**Idea:** **`mux`** — run multiple Claude Code sessions in parallel on the SAME task, with different strategies, and pick the best result. Like running N parallel universes and choosing the timeline where Claude did the best job.

**v0.1 scope:** Given a task, spawn 3 Claude Code sessions (e.g., with different temperatures, or with/without CLAUDE.md context, or with different initial approaches). Compare the outputs (test results, code quality metrics, diff size). Present the human with the best option.

**Testable hypothesis:** "The best-of-3 AI coding result is measurably better than a single attempt, as judged by test pass rate and human review."

**Steel-man critique:**
- **Who uses this?** Developers working on tasks where quality matters more than cost.
- **Why not just X?** Nobody does this because it's 3x the API cost. But if the quality improvement is substantial, it might be worth it for critical changes.
- **What's the moat?** Strategy selection (when to mux, how to vary strategies), result comparison methodology.
- **Absorption risk:** Medium. Vendors might add "try multiple approaches" but exposing the cost trade-off is unlikely.

**Problem:** 3x API cost. Most people won't pay that. And Claude's consistency means the 3 runs might not vary enough to matter.

**Scores:**
- Usefulness: 3/5 (niche — only when quality >> cost)
- Moat: 2.5/5 (thin)
- Shippability: 3.5/5 (orchestration is straightforward but needs worktrees for isolation)
- Community potential: 2.5/5

**Verdict: PIVOT** — Cool idea but the economics don't work for most users.

---

### Iteration 21: Claude Code Plugin/Extension Ecosystem

**Idea:** **`ccx`** (Claude Code Extensions) — a package manager and runtime for Claude Code plugins. Claude Code has hooks, but there's no standardized way to discover, install, share, or compose them. `ccx` creates this ecosystem.

**v0.1 scope:** `ccx install <plugin>` downloads a hook configuration + scripts from a registry. `ccx list` shows available plugins. The registry is a GitHub repo with standardized plugin manifests.

**Testable hypothesis:** "A curated plugin ecosystem increases Claude Code hook adoption by 5x compared to manual configuration."

**Steel-man critique:**
- **Who uses this?** Every Claude Code user who wants to extend their setup.
- **Why not just X?** Nothing like this exists. Claude Code hooks are powerful but discovery and installation are manual. Ralph Loop itself is an example of a plugin that required manual setup.
- **What's the moat?** The registry. First-mover in the plugin ecosystem. Community contributions to the registry.
- **Absorption risk:** HIGH. Anthropic will almost certainly build a plugin/extension system. They'd be foolish not to. This is a temporary gap.
- **Timing advantage:** Anthropic hasn't built this yet. The window might be 6-12 months. If `ccx` becomes the de facto plugin ecosystem before Anthropic builds their own, it might get absorbed (acqui-hire or just adopted as the standard).

**Scores:**
- Usefulness: 5/5 (every Claude Code user benefits)
- Moat: 2/5 (Anthropic will build this)
- Shippability: 4/5 (registry + simple CLI)
- Community potential: 5/5 (plugins ARE community contributions)

**Verdict: PIVOT** — Highest usefulness but lowest moat. This is building on someone else's platform and they'll absorb it. Unless the strategy IS to be absorbed (i.e., build it to be adopted as the standard).

**Wait.** Let me reconsider. What if being absorbed IS the strategy? What if the goal isn't to build a sustainable independent business but to:
1. Build the definitive Claude Code plugin ecosystem
2. Get adoption
3. Have Anthropic either adopt the standard or integrate the tool
4. The open-source project becomes the reference implementation

This is the "become the standard by being useful first" play. It worked for npm, homebrew, etc. But the dead-ends list says "open standards designed in a vacuum" — this isn't that, because it's a TOOL first, standard second.

**Re-score with "be adopted as standard" strategy:**
- Usefulness: 5/5
- Moat: 3.5/5 (reframed: the moat is community adoption and plugin corpus, not tech)
- Shippability: 4/5
- Community potential: 5/5
- **Total: 17.5/20**

Hmm. This is competitive. But it's a BET on Anthropic's roadmap.

---

### Iteration 22: Back to Fundamentals — What Does "Powered by Claude Code" Actually Mean?

Let me re-read the original constraint: "I want to build an open-source project powered by Claude Code."

Previous iterations interpreted "powered by Claude Code" as "a tool for Claude Code users." But there's another interpretation: **a project where Claude Code is the primary development engine** — i.e., the project itself is built and maintained largely through Claude Code sessions, demonstrating what's possible.

This shifts the question from "what tool helps Claude Code users?" to "what project would be IMPRESSIVE if built and maintained by Claude Code?"

**The meta-play:** Build something genuinely useful (not AI-meta), but build it USING Claude Code in a highly visible, documented way. The project is the product AND the proof of concept.

### Iteration 23: `difftrace` — Git-Native Change Intelligence

**Idea:** **`difftrace`** — a git extension that provides RICH context for every change in a codebase. For any commit, file, or line, `difftrace` can answer: "why was this changed?", "what else changed with it?", "what broke when this was changed before?", "who knows about this code?"

It uses git history analysis + LLM reasoning to build a "change intelligence" layer on top of git.

**v0.1 scope:** `git difftrace blame <file>` — enhanced git blame that shows not just WHO changed each line but WHY (extracted from commit messages, PR descriptions, and surrounding changes). `git difftrace risk <file>` — highlights lines that have been involved in bug-fix commits, indicating risk areas.

**Testable hypothesis:** "Developers using difftrace make fewer unintended breaking changes in areas they're unfamiliar with."

**Steel-man critique:**
- **Who uses this?** Every developer who uses git (i.e., everyone).
- **Why not just X?** `git blame` tells you who, not why. `git log` gives you history but not risk assessment. `difftrace` synthesizes these into actionable intelligence.
- **What's the moat?** It's a git extension — deeply integrated into existing workflow. The risk scoring model improves with more history. Cross-repo installation creates network effects (shared risk patterns).
- **Absorption risk:** LOW for the full vision. GitHub might add some of this to their UI, but a git-native CLI extension is different from a web feature. Git extensions have long lifespans (git-lfs, git-flow).
- **"Powered by Claude Code" angle:** The LLM reasoning for "why" analysis runs through Claude. The project itself can be built and maintained by Claude Code, demonstrating the workflow.

**Scores:**
- Usefulness: 4.5/5 (git blame is one of the most-used dev tools; an enhanced version has massive TAM)
- Moat: 4/5 (git extension ecosystem, risk model, adoption inertia)
- Shippability: 3.5/5 (git extension + LLM integration, more complex than a hook)
- Community potential: 4.5/5 (every git user is a potential user, plugin architecture for custom analyzers)

**Verdict: REFINE** — This is the first idea that has BROAD appeal beyond just AI-tool users. Everyone uses git. "Better git blame" is immediately compelling. Let me tighten.

---

### Iteration 24: `difftrace` Refined — The Smart Git Extension

**Refined scope for v0.1:** Focus on ONE command: `difftrace why <file:line>`

Given a file and line number, it:
1. Runs git blame to find the commit
2. Reads the commit message and PR description (if available via GitHub API)
3. Analyzes surrounding commits in the same PR/branch
4. Uses Claude to synthesize a human-readable explanation of WHY this code exists and what context surrounded its creation
5. Caches the result so subsequent queries are instant

That's it. One command. "Why does this line exist?"

**Why this is powerful:** Every developer has stared at a mysterious line of code and wanted this. `git blame` gives you a commit hash and a name. `difftrace why` gives you the STORY.

**Testable hypothesis:** "Developers using `difftrace why` spend less time understanding unfamiliar code, as measured by time-to-first-edit in unfamiliar files."

**Refined steel-man critique:**
- **Who uses this?** Literally every developer. This is horizontal, not niche.
- **Why not just X?** `git blame` → commit → read PR → piece together context is a 5-minute manual workflow. `difftrace why` makes it 5 seconds.
- **What's the moat?** (a) git extension = sticky, (b) caching layer = improves with usage, (c) GitHub/GitLab/Bitbucket integrations = breadth, (d) the synthesis quality depends on prompt tuning that improves with community feedback.
- **Absorption risk:** LOW. This is a developer tool, not an AI coding assistant. GitHub might add "AI-enhanced blame" to their web UI but a CLI tool serves a different workflow.
- **Cost concern:** Each `difftrace why` call uses Claude API tokens. But caching means you only pay once per line. For a 10K-line file, if you query 100 lines, that's ~100 API calls. At Haiku pricing, that's pennies.

**The open-source project story:**
- Built by Claude Code (meta-demonstration)
- Useful to every developer, not just AI-tool users
- Natural community contributions: new analysis types (risk, coupling, churn), new git hosting integrations, caching strategies
- Revenue path: free CLI, paid team features (shared caches, org-level risk dashboards)

**Revised scores:**
- Usefulness: 5/5 (horizontal developer tool, not niche)
- Moat: 4/5 (git extension stickiness, cache as asset, integration breadth)
- Shippability: 3.5/5 (git extension + Claude API integration, doable but not trivial)
- Community potential: 5/5 (every git user benefits, natural extension points)
- **Total: 17.5/20**

**Verdict: STRONG CANDIDATE** — Competes with `thinktank` on different axes. `thinktank` is more meta/AI-native; `difftrace` is more broadly useful but less "powered by Claude Code" in its identity.

---

## Part C: Final Comparison — Three Survivors

| Dimension | `thinktank` (honest) | `difftrace` | `ccx` (be-absorbed) |
|-----------|---------------------|-------------|---------------------|
| Usefulness | 4/5 (AI tool users) | 5/5 (all devs) | 5/5 (CC users) |
| Moat | 3/5 (weak w/o measurement) | 4/5 (git extension) | 3.5/5 (adoption race) |
| Shippability | 4.5/5 | 3.5/5 | 4/5 |
| Community | 3.5/5 | 5/5 | 5/5 |
| Total | 15/20 | 17.5/20 | 17.5/20 |
| Risk | Becomes "CLAUDE.md manager" | API cost per query | Anthropic builds it |
| Identity | "AI-native" tool | "Git-native" tool | "Ecosystem" play |

## Iteration 3 Conclusions

1. **`thinktank`'s measurement promise doesn't hold up under scrutiny.** Without rigorous measurement, it's a CLAUDE.md lifecycle manager — useful but not exciting.

2. **`difftrace` is the strongest NEW idea.** Broad appeal (every git user), natural moat (git extension), clear v0.1 (`difftrace why <file:line>`), and it's genuinely "powered by Claude" (uses Claude API for synthesis).

3. **The tension is: niche-but-AI-native (`thinktank`) vs. broad-but-less-AI-meta (`difftrace`).** The user wants "powered by Claude Code" which could mean either. `difftrace` is powered by Claude API; `thinktank` is powered by Claude Code hooks.

4. **`ccx` is high-ceiling but high-risk.** If Anthropic's roadmap doesn't include a plugin system soon, it's a great play. If they announce one next month, it's dead.

## Updated Ranking

1. **`difftrace`** (17.5/20) — broadest appeal, strongest moat, clearest v0.1
2. **`ccx`** (17.5/20) — highest ceiling but dependent on Anthropic's roadmap
3. **`thinktank`** (15/20) — honest version after breaking the measurement claim

## Open Questions for Next Iteration
- Can `difftrace` and `thinktank` be COMBINED? ("difftrace for understanding code history" + "thinktank for improving AI context" as two features of one tool?)
- Is there a way to make `thinktank`'s measurement work that I haven't considered?
- What's the actual state of Anthropic's plugin/extension plans?

---
---

# RALPH LOOP — ITERATION 4: Stress-Testing `difftrace` + Seeking Convergence

Iteration 3 elevated `difftrace` to #1. This iteration: (A) break `difftrace` like we broke `thinktank`, (B) answer the open questions, (C) attempt final convergence.

## Part A: Breaking `difftrace`

### Attack 1: This Already Exists (or Nearly Does)

**GitLens** (VS Code extension, 30M+ installs) already shows enhanced blame with commit messages, PR links, and author info inline. It's the most popular VS Code extension. `difftrace why` is basically "GitLens but in the CLI with LLM synthesis."

**Counter:** GitLens shows RAW data (commit message, PR title). It doesn't SYNTHESIZE. "feat: update auth middleware (#342)" is what GitLens shows. `difftrace why` would say: "This line was added during the JWT-to-session migration (March 2025). The auth middleware was rewritten because the old approach stored tokens in a way that didn't meet compliance requirements. This specific check handles the edge case where a session expires mid-request — see PR #342 for the discussion about why a 401 vs 403 was chosen here."

**But:** How often do developers need that level of synthesis? For most lines, the commit message + PR title is enough. The LLM synthesis is overkill for 80% of cases and only valuable for 20%. That makes it a "nice to have" for most queries, not a "must have."

**Verdict:** Partially survived. The synthesis is genuinely novel but may not clear the "worth installing a new tool" bar for developers who already have GitLens.

### Attack 2: API Cost Model is Problematic

Every `difftrace why` query calls the Claude API. Even with caching:
- First query on any line = API call ($)
- Large repos with thousands of lines = substantial upfront cost to build cache
- Cache invalidation: every new commit changes blame for affected lines, requiring re-analysis
- **Who pays?** Individual developers won't pay for an API key to understand code. Teams might, but now you need billing infrastructure.

**Counter:** Use Haiku (cheapest model) for synthesis. Most queries need ~500 input tokens (blame + commit + PR context) and ~200 output tokens. At Haiku pricing that's <$0.001 per query. But you still need users to have an Anthropic API key, which is a significant friction barrier.

**Alternative:** Could bundle a local LLM (Ollama) as fallback. But then quality degrades.

**Verdict:** Real problem. The API key requirement is a major adoption friction. "Install tool → get API key → set env var → now you can use it" is too many steps for a git extension.

### Attack 3: The "Powered by Claude Code" Angle is Weak

The user wants to build a project "powered by Claude Code." `difftrace` is powered by the Claude API, not by Claude Code specifically. Any LLM could power the synthesis. There's nothing about `difftrace` that uniquely showcases Claude Code's capabilities (agentic coding, tool use, multi-step reasoning). It's just "LLM-enhanced git blame."

**Counter:** The project could be BUILT by Claude Code (meta-demonstration), and the "powered by" could refer to development workflow, not runtime dependency. But that's a stretch — any project can be built with Claude Code.

**Verdict:** Significant weakness. The user specifically wants the project to showcase/leverage Claude Code, not just use Claude API as a backend.

### Attack 4: Git History Quality Varies Wildly

`difftrace why` depends on good commit messages and PR descriptions. In repos with "fix", "wip", "stuff", "asdf" commits (which is... most repos), the synthesis has no useful input to work with. The tool degrades to "I don't know why this line exists" for most real-world codebases.

**Counter:** Could fall back to analyzing the diff itself and surrounding changes. But without human-written context (commit messages, PR descriptions), the LLM is guessing — and guessing is worse than "I don't know."

**Verdict:** Real limitation. Works well for disciplined teams, poorly for most real codebases.

### Stress-Test Summary for `difftrace`

| Attack | Severity | Survived? |
|--------|----------|-----------|
| GitLens exists | Medium | Partially — synthesis is novel but may not clear "worth installing" bar |
| API cost/friction | High | No clean solution — API key requirement kills casual adoption |
| Not really "Claude Code powered" | High | Doesn't showcase Claude Code's unique strengths |
| Git history quality varies | Medium | Degrades gracefully but limits value in most repos |

**Post-stress-test score:**
- Usefulness: 3.5/5 (down from 5 — GitLens covers 80% of the use case)
- Moat: 3/5 (down from 4 — LLM synthesis isn't hard to replicate)
- Shippability: 3/5 (down from 3.5 — API key friction)
- Community potential: 3.5/5 (down from 5 — narrower appeal than initially thought)
- **Total: 13/20 (down from 17.5)**

`difftrace` falls hard under scrutiny. The core problem: it's an LLM wrapper around git blame, not a Claude Code showcase.

---

## Part B: Answering Open Questions

### Q1: Can `difftrace` and `thinktank` combine?

Not naturally. They serve different audiences (all devs vs. AI tool users) and use different mechanisms (git history analysis vs. Claude Code hooks). Forcing them together would create a confused product with no clear pitch.

### Q2: Is there a way to make `thinktank`'s measurement work?

Re-examining the measurement problem with fresh eyes:

**What if we don't measure effectiveness directly, but measure COVERAGE instead?**

Instead of "did this CLAUDE.md entry help?" (impossible to answer), ask "does this CLAUDE.md entry cover the areas where Claude is currently struggling?" (answerable).

Mechanism:
1. Track sessions where Claude needed correction (user said "no", "wrong", "that's not right")
2. Categorize the correction (wrong pattern, wrong file, wrong approach, missing context)
3. Check if any CLAUDE.md entry SHOULD have prevented this correction
4. If not → suggest a new entry. If yes → the entry isn't working (too vague? wrong phrasing?)

This isn't "measure effectiveness" but "measure GAPS." It's a different and more tractable framing:
- **Input:** correction events (detectable from conversation patterns)
- **Output:** "Your CLAUDE.md doesn't cover X, which Claude got wrong 3 times this week"
- **Actionable:** Add entries for uncovered failure modes

This is more like a TEST COVERAGE report for your CLAUDE.md. "Your AI context has 60% coverage of common failure modes in this codebase."

**Does this save `thinktank`?** Partially. Gap analysis is tractable and useful. But it still requires parsing conversation patterns for "corrections," which has its own signal-to-noise issues.

### Q3: Anthropic's plugin/extension plans?

Can't determine this without insider knowledge. But Claude Code's marketplace/plugins directory structure already exists (we used it for Ralph Loop at `~/.claude/plugins/marketplaces/`). This suggests Anthropic is already building toward an ecosystem. The window for `ccx` may be very small.

---

## Part C: The Uncomfortable Truth

After 4 iterations and 24+ sub-iterations, here's what's actually true:

1. **Every tool-for-AI-tools idea has weak moats.** The space is moving too fast. Whatever you build, platform vendors are 6-12 months from absorbing it.

2. **Broad developer tools (difftrace) don't need Claude Code.** They need AN LLM but not Claude Code specifically. They don't showcase what makes Claude Code unique.

3. **The strongest moats come from COMMUNITY DATA**, not code. A tool that aggregates community knowledge (benchmarks, patterns, strategies) has a moat. But that requires adoption first.

4. **The "ruthlessly narrow testable hypothesis" constraint conflicts with "infrastructure other tools build on."** Infrastructure requires scope; narrow hypotheses require focus. You can't be both.

Let me try to find something that resolves this tension.

---

## Iteration 25: What is Claude Code UNIQUELY Good At?

Let me reason from Claude Code's unique capabilities:
- **Agentic multi-step reasoning:** Can plan, execute, and adapt across many tool calls
- **File system access:** Can read, write, and search codebases
- **Shell execution:** Can run commands, tests, builds
- **Hooks system:** Can trigger on events (session start/stop, tool calls)
- **Subagent spawning:** Can parallelize work
- **MCP servers:** Can connect to external services

The unique thing about Claude Code is that it's an AI agent with FULL ACCESS to a development environment. The ideas that best leverage this are ones where the agent DOES something complex, not just analyzes.

### Iteration 26: `patchwork` — AI-Powered Codemod Engine

**Idea:** **`patchwork`** — a codemod engine where you describe the transformation in ENGLISH and Claude Code executes it across your entire codebase. Not a simple find-and-replace but SEMANTIC transformations: "migrate all API calls from v2 to v3 format", "convert all class components to hooks", "add error boundaries around all async operations in the UI layer."

**v0.1 scope:** `patchwork "convert all class components to functional components with hooks"` → Claude Code reads each class component, understands its state/lifecycle logic, and rewrites it as a functional component. Shows a diff for review before committing.

**Testable hypothesis:** "AI-powered semantic codemods complete complex migrations 10x faster than manual migration or AST-based codemods."

**Steel-man critique:**
- **Who uses this?** Any team doing a migration or large-scale refactoring.
- **Why not just X?** jscodeshift/ts-morph handle AST transforms but can't do SEMANTIC transforms. A human can use Claude Code interactively for this, but `patchwork` automates the per-file orchestration.
- **What's the moat?** Transform recipes (community-contributed). Verification pipeline (run tests after each file). Rollback safety.
- **Absorption risk:** Medium. Vendors are building "apply across files" features (Cursor's multi-file edit, Claude Code's existing capability). But ORCHESTRATED migration with verification is a layer above.

**Problem:** Claude Code can already do this if you ask it to. "Convert all class components to hooks" is a prompt you can give Claude Code directly. What does `patchwork` add?

**What it adds:** (a) Batch orchestration — processes files one at a time, testing after each, (b) Resume capability — can stop and restart a migration, (c) Progress tracking — "47/120 files converted, 3 failed," (d) Recipe sharing — community-contributed migration recipes.

**Scores:**
- Usefulness: 4.5/5 (migrations are one of the most painful dev tasks)
- Moat: 3/5 (thin — it's orchestration over Claude Code's existing capabilities)
- Shippability: 4/5 (it's a script that calls Claude Code repeatedly)
- Community potential: 4.5/5 (migration recipes are highly shareable)

**Verdict: REFINE** — The migration recipe community is the moat. Let me tighten.

---

### Iteration 27: `patchwork` Refined — Community Codemod Recipes

**Refined angle:** The tool is valuable but the RECIPES are the product. `patchwork` is a runtime; the community builds and shares semantic codemod recipes.

A recipe is:
```yaml
name: react-class-to-hooks
description: Convert React class components to functional components with hooks
match: "files matching **/*.tsx containing 'extends Component'"
transform: "Convert this class component to a functional component using hooks..."
verify: "npm test"
difficulty: medium
success_rate: 87%  # from community usage data
```

**v0.1:** The runtime + 5 starter recipes (common migrations).
**Growth:** Community contributes recipes with success rate tracking.

**The community moat:** Each recipe has a tracked success rate across codebases. "This migration recipe works 87% of the time on first attempt." This data is INCREDIBLY valuable and doesn't exist anywhere.

**BUT WAIT — this is dangerously close to "AI coding cookbooks/rule repositories"** which is in the dead-ends list. The difference: recipes are EXECUTABLE, not informational. They run, they transform, they have measurable success rates. That's different from a static cookbook. But the "content decays" criticism still partially applies — recipes need updating as libraries evolve.

**Revised scores:**
- Usefulness: 4.5/5
- Moat: 3.5/5 (recipe corpus + success rate data)
- Shippability: 4/5
- Community potential: 4.5/5
- **Total: 16.5/20**

**Verdict: VIABLE but not the winner.** The dead-end adjacency is concerning. Let me try one more angle.

---

### Iteration 28: The Project That Builds Itself

Going back to iteration 22's insight: "powered by Claude Code" could mean the project itself is built and maintained by Claude Code.

**What if the open-source project IS a demonstration of Claude Code's self-iteration capability?** Not "self-improving code" (dead end) but a real product that happens to be developed entirely through Claude Code sessions, with the development process being as interesting as the product itself.

**The requirements then become:**
1. A useful product (not a demo or toy)
2. That can be incrementally improved through Claude Code sessions
3. Where each session's work is visible and reviewable (git history)
4. And the development process itself attracts contributors who want to learn Claude Code workflows

**What product fits?** Something that:
- Has clear, decomposable tasks
- Benefits from iterative improvement
- Can be tested automatically (so Claude Code can verify its own work)
- Is interesting enough that people watch the development process

### Iteration 29: `bench` — An Open Benchmark Suite for AI Coding Agents

**Idea:** **`bench`** — an open-source benchmark suite that measures how well AI coding agents (Claude Code, Cursor, Copilot, Devin) perform on real-world coding tasks. Like SWE-bench but community-maintained, broader, and continuously updated.

**v0.1 scope:** 20 hand-curated coding tasks across 5 categories (bug fix, feature add, refactor, migration, test writing) with:
- A git repo snapshot (the starting state)
- A task description
- Automated acceptance criteria (tests that must pass)
- Baseline results from Claude Code

**Testable hypothesis:** "A community-maintained benchmark suite becomes the standard way to evaluate and compare AI coding agents."

**Steel-man critique:**
- **Who uses this?** AI coding tool developers, DevEx teams evaluating tools, researchers.
- **Why not just X?** SWE-bench exists but is frozen, academic, and focused on Python bug fixes. `bench` would be living, multi-language, and community-driven.
- **What's the moat?** The task corpus. Community-contributed tasks with verified acceptance criteria. Historical results across agent versions. NOBODY can replicate a mature, community-curated benchmark overnight.
- **Absorption risk:** VERY LOW. No vendor wants to maintain a benchmark that might show their tool losing. This is inherently a neutral, community-owned artifact.
- **"Powered by Claude Code" angle:** STRONG. (a) The benchmark itself tests Claude Code, (b) new tasks can be generated by Claude Code, (c) the infrastructure is built by Claude Code, (d) results demonstrate Claude Code's capabilities (or limitations) transparently.
- **Self-iteration angle:** PERFECT. Each Ralph Loop iteration can add new benchmark tasks, improve existing ones, run evaluations, and publish results. The project naturally benefits from continuous Claude Code sessions.

**Scores:**
- Usefulness: 4.5/5 (growing market of people evaluating AI coding tools)
- Moat: 5/5 (community-curated task corpus is the strongest possible moat — it's data, not code)
- Shippability: 3.5/5 (curating good tasks is labor-intensive, but 20 tasks is a weekend with Claude Code)
- Community potential: 5/5 (contributing tasks is easy, everyone wants to see their tool benchmarked)
- **Total: 18/20**

**Verdict: STRONG WINNER CANDIDATE.** Let me stress-test this immediately.

---

### Stress-Testing `bench`

**Attack 1: SWE-bench already exists and has academic credibility.**
Counter: SWE-bench is frozen, Python-only, and academic. `bench` is living, multi-language, and practical. They serve different audiences — SWE-bench for papers, `bench` for practitioners.

**Attack 2: Benchmark gaming. Vendors will optimize for your benchmark.**
Counter: This is actually a FEATURE, not a bug. If vendors optimize for your benchmark, your benchmark IS the standard. That's the definition of success for a benchmark suite.

**Attack 3: Task quality control is hard at scale.**
Counter: Start with 20 hand-curated tasks. Add contributor tasks through a review process. Quality > quantity. SWE-bench has ~2K tasks but most aren't representative. 100 excellent tasks > 2000 mediocre ones.

**Attack 4: Running benchmarks is expensive (API costs).**
Counter: True. Each run costs money. But benchmark operators (tool vendors, researchers) have budgets for this. Individual developers don't need to run the full suite — they can run a subset.

**Attack 5: How is this "infrastructure other tools build on"?**
Counter: Benchmarks ARE infrastructure. Every AI tool team needs evaluation. If `bench` becomes the standard, tool teams build their CI/CD around it. Integration test suites reference it. It's the evaluation infrastructure for the entire AI coding ecosystem.

**Post-stress-test: `bench` survives well.** The biggest risk is execution — curating good tasks is the hard part, not the code.

---

## Part D: Final Convergence — The Real Top 3

After 4 iterations and 29 sub-iterations:

| Rank | Project | Score | Strengths | Weaknesses |
|------|---------|-------|-----------|------------|
| 1 | **`bench`** | 18/20 | Strongest moat (data), perfect self-iteration story, neutral ground no vendor absorbs | Task curation is labor-intensive, shippability is lower |
| 2 | **`patchwork`** | 16.5/20 | High practical utility, recipe community, everyone needs migrations | Adjacent to dead-end "cookbooks," orchestration layer is thin |
| 3 | **`thinktank`** | 15/20 | Direct Claude Code integration, solves real pain | Measurement doesn't work, weak moat without data |

Previously ranked ideas that fell:
- `difftrace` dropped to 13/20 after stress-testing (GitLens overlap, API friction, not Claude Code native)
- `ccx` dropped due to high absorption risk

## The Recommended Winner: `bench`

**Why `bench` wins:**

1. **Strongest moat of anything explored.** A community-curated benchmark corpus is DATA, not code. You can't replicate it by reading the source and rebuilding.

2. **Perfect "powered by Claude Code" story.** The project tests Claude Code, is built by Claude Code, and improves through Claude Code sessions. It's meta without being navel-gazing.

3. **Self-iteration natural fit.** Each loop iteration naturally adds tasks, runs evaluations, improves infrastructure. This is what the Ralph Loop was made for.

4. **Vendor-proof.** No AI coding vendor wants to maintain a benchmark that might show them losing. This is permanently neutral territory.

5. **Community flywheel.** Contributing a benchmark task is easy (describe a task + write acceptance tests). Every contributor is also a user. The community IS the moat.

**v0.1 ship plan:**
- 20 tasks across 5 categories
- Simple CLI to run a task against Claude Code
- Results stored as JSON
- GitHub repo as the registry
- README with initial Claude Code results

**Name suggestion:** Could call it `thinktank` (which is what the repo is already named) — framing it as a "think tank" that evaluates and benchmarks AI coding approaches.

## Open Question for User

The tension that remains: **`bench` is the strongest idea but it's a BENCHMARK, not a TOOL.** The user said "highest leverage = infrastructure other tools build on." A benchmark IS infrastructure, but it's not a library or a service — it's an evaluation framework. Is that what the user means by "infrastructure"?

If the user wants something more tool-like, `patchwork` (semantic codemod engine) is the strongest tool idea that survived stress-testing.

---
---

# RALPH LOOP — ITERATION 5: Challenging the Framing + The Overlooked Quadrant

Four iterations have systematically explored and stress-tested ideas across: context management, measurement, git tooling, benchmarks, codemods, plugin ecosystems. The top ideas (`bench`, `patchwork`, `thinktank`) each have real weaknesses.

This iteration: challenge the assumptions we've been operating under, and look for the quadrant we've systematically avoided.

## Challenging the Framing

### Assumption 1: "It must be a developer tool"
Every idea so far has been a tool developers install and use. But the user said "infrastructure other tools build on." What if the project isn't used by developers directly, but by OTHER AI tools and agents?

### Assumption 2: "Claude Code's unique value is agentic coding"
We've been thinking about what Claude Code can DO. But maybe the unique value is what Claude Code KNOWS — specifically, how it interacts with codebases. The patterns of how an AI agent explores, understands, and modifies code are themselves valuable data.

### Assumption 3: "The project must solve a current problem"
Every idea tried to fix something broken today. But what about building for a problem that's EMERGING — one that's about to become critical as AI coding adoption accelerates?

### What's the emerging problem?

As AI coding tools become ubiquitous, the critical emerging problem is: **How do you know if AI-written code is doing what you think it's doing?**

Not "is it correct" (tests handle that) but "does it match intent?" AI can write code that passes all tests but implements the wrong thing, takes an architectural approach you didn't want, or introduces subtle patterns that conflict with your codebase's direction.

This is the **intent verification** problem. And it gets WORSE as AI writes MORE code. When AI writes 10% of your code, you review every line. When AI writes 80%, you can't review everything. You need automated intent verification.

But wait — didn't we already explore this? Iteration 16 (Strategic Intent Registry) and iteration 19 (Verified AI Code Changes) touched adjacent ideas. The difference: those tried to verify correctness. This is about verifying INTENT ALIGNMENT — a harder, more novel problem.

---

## Iteration 30: Rethinking from "What Problem Gets WORSE?"

The problems that get worse as AI coding scales:
1. **Intent drift** — AI code slowly diverges from what you wanted
2. **Architectural erosion** — AI takes the expedient path, not the planned path
3. **Knowledge fragmentation** — context is spread across AI sessions, human memory, docs, code
4. **Evaluation blindness** — you can't measure if your AI setup is improving or degrading

Wait. #4 is `bench`/`thinktank` territory. #3 is `harvest`/`ctx`. #2 is `intent`. #1 is new.

### The Intent Drift Problem, Specifically

Here's a concrete scenario: You tell Claude Code "add a caching layer to the API." Claude does it — but uses Redis when your team decided to use Valkey. Or it puts the cache in the service layer when your architecture says caching belongs in the gateway. Or it implements cache-aside when you wanted write-through.

The code WORKS. Tests PASS. But it's not what you wanted. And you might not notice until 3 PRs later.

**This is different from bugs.** It's structural misalignment. And it compounds — each misaligned decision makes future sessions more likely to follow the wrong pattern.

---

## Iteration 31: `align` — Continuous Intent Alignment for AI Code

**Idea:** **`align`** — a tool that continuously checks whether AI-generated code aligns with your project's stated intentions and architectural decisions. Not a linter (those check syntax/patterns) but an ALIGNMENT checker that compares code against high-level intent.

**How it works:**
1. You declare intents: `align intent "caching should use Valkey, not Redis"` or `align intent "new API endpoints must be GraphQL, not REST"`
2. After each Claude Code session (or in CI), `align check` runs
3. It uses Claude to analyze the diff against your declared intents
4. Reports misalignments: "WARNING: New caching code in src/api/cache.ts uses Redis. Intent says Valkey."

**v0.1 scope:** A CLI with `align intent <statement>` to declare intents (stored in `.align/intents.yaml`) and `align check` that analyzes a git diff against intents using Claude API.

**Testable hypothesis:** "Projects using `align` catch intent misalignments that would otherwise reach production in >30% of AI coding sessions."

**Steel-man critique:**
- **Who uses this?** Teams whose codebase has AI-generated contributions (growing fast).
- **Why not just X?** Linters check syntax. Tests check correctness. Code review checks... well, everything, but humans miss architectural misalignment, especially when the code "looks right." Nothing specifically checks intent alignment.
- **What's the moat?** Intent checking is a NOVEL category. The intent schema + checking methodology + community-contributed intent patterns.
- **Absorption risk:** Medium-low. This is a new category that doesn't map to existing vendor features. "Does this code match our architectural intent?" is a question no tool currently answers.
- **"Powered by Claude Code" angle:** Strong. Uses Claude for the semantic alignment analysis. The checking itself is a multi-step reasoning task (read intent → read diff → compare semantically → report). Also, the intents themselves can inform Claude Code sessions (inject intents into CLAUDE.md).

**Problem:** This is very close to `intent` (iteration 16), which we dismissed as "just a markdown file with a schema." The difference is the CHECK mechanism. `intent` was passive (declare and hope Claude reads it). `align` is active (declare and VERIFY compliance).

**But:** The checking mechanism has the same LLM-reliability problem. Claude might hallucinate misalignments or miss real ones. How reliable is "use Claude to check if code matches an intent statement"? Let me think about this...

**Reliability analysis:** Intent statements like "use Valkey not Redis" are CONCRETE and verifiable — grep for "redis" in the diff. But intent statements like "caching belongs in the gateway layer" are ABSTRACT and require architectural understanding. The checking quality will vary enormously by intent specificity.

**Insight:** The tool should REQUIRE concrete, verifiable intents. Not "code should be clean" but "new database queries must use the repository pattern (files in src/repos/)". The more specific the intent, the more reliable the check.

**This makes `align` essentially a SEMANTIC LINTER** — a linter where the rules are written in English instead of AST patterns.

**Revised framing: `align` = English-language linting.**

That's actually a much cleaner pitch. "Write lint rules in English."

**Scores:**
- Usefulness: 4.5/5 (everyone wants custom lint rules but writing AST visitors is painful)
- Moat: 3.5/5 (the concept is simple to replicate, but community-contributed rule libraries + reliability tuning add up)
- Shippability: 4/5 (CLI + Claude API call per check, straightforward)
- Community potential: 4.5/5 (contributing English lint rules is dramatically easier than writing eslint plugins)
- **Total: 16.5/20**

**Verdict: REFINE** — "English-language linting" is a much better pitch than "intent alignment." Let me push this further.

---

## Iteration 32: `align` Refined — English-Language Linting

**Refined pitch:** **`align`** — write lint rules in plain English. No AST visitors, no regex patterns, no plugin APIs. Just describe what you want in natural language and `align` enforces it.

```yaml
# .align/rules.yaml
rules:
  - name: valkey-not-redis
    description: "All caching must use Valkey, not Redis"
    scope: "src/**"
    severity: error

  - name: repo-pattern
    description: "Database queries must go through repository classes in src/repos/, not directly in service files"
    scope: "src/services/**"
    severity: warning

  - name: no-console-log
    description: "Use the structured logger (src/lib/logger.ts), not console.log"
    scope: "src/**"
    severity: error

  - name: graphql-first
    description: "New API endpoints must be GraphQL. REST endpoints are legacy and should not be extended."
    scope: "src/api/**"
    severity: warning
```

`align check` runs on a diff (or full codebase) and reports violations.

**Why this is powerful:**

1. **Democratizes linting.** Junior devs and non-tooling engineers can write rules. No need to learn AST APIs.
2. **Captures rules that CAN'T be expressed as AST patterns.** "Database queries must go through repositories" requires semantic understanding, not pattern matching.
3. **Bridges intent → enforcement.** The gap between "we decided X" and "X is enforced" is currently filled by code review. `align` automates it.
4. **Natural CI integration.** Run `align check` in CI like any linter. Block PRs on violations.

**v0.1 scope:** CLI that reads `.align/rules.yaml`, analyzes `git diff HEAD~1` against the rules using Claude, outputs violations in standard lint format (file:line: severity: message).

**Testable hypothesis:** "English-language lint rules catch violations that existing linters miss, particularly architectural and convention violations, in >40% of PRs."

**Steel-man critique:**
- **Who uses this?** Any team with conventions that aren't captured by existing linters. That's EVERYONE.
- **Why not just X?** ESLint/Semgrep/SonarQube operate on syntax. They can't enforce "use repositories for DB access" or "new endpoints should be GraphQL." Custom rules require plugin development that most teams never do.
- **What's the moat?**
  - (a) Rule libraries: community-contributed rules for common frameworks. "Here's an `align` rule pack for Next.js projects" or "Clean Architecture rules."
  - (b) Reliability tuning: which rule phrasings produce the most accurate checks. This knowledge accumulates over time.
  - (c) CI integration: once you're in someone's CI pipeline, switching costs are high.
- **Absorption risk:** MEDIUM. This is close to what Cursor/Claude could add as a feature ("lint my code against these rules"). But CI integration + rule libraries + team workflow is a PRODUCT, not a feature.
- **"Powered by Claude Code":** Uses Claude for semantic analysis. Built by Claude Code. Rules can be auto-suggested by analyzing existing codebase patterns.

**Concern: Isn't this just a code quality scanner/linter?** The dead-ends list says "Code quality scanners/linters (SonarQube, CodeRabbit, Semgrep — saturated space)."

**Key distinction:** Existing linters operate on SYNTAX. `align` operates on SEMANTICS. "Use repositories for DB access" is not a syntax rule — it requires understanding what a function does, not just what tokens it contains. This is a genuinely different category. It's not competing with ESLint; it's competing with code review.

**It's competing with CODE REVIEW.** That's the real positioning. `align` doesn't replace linters — it replaces the architectural/convention checks that humans do in code review. "Did they use the right pattern? Did they put the code in the right place? Did they follow our conventions?"

**Revised positioning: `align` = automated architectural code review.**

**Revised scores:**
- Usefulness: 5/5 (replaces the most tedious part of code review — convention checking)
- Moat: 4/5 (rule libraries, reliability tuning, CI integration stickiness)
- Shippability: 4/5 (CLI + API, standard lint output format)
- Community potential: 5/5 (contributing rules is trivially easy, framework-specific rule packs)
- **Total: 18/20**

**Verdict: WINNER CANDIDATE** — This ties with `bench` and feels more ACTIONABLE.

---

## Iteration 33: Stress-Testing `align`

**Attack 1: LLM reliability — will it produce false positives/negatives?**

This is the critical attack. If `align` flags violations that aren't real (false positives), developers will ignore it. If it misses real violations (false negatives), it provides false confidence.

**Analysis:** Reliability depends on rule specificity:
- "Don't use Redis" → highly reliable (keyword-searchable, LLM can confirm)
- "Use repository pattern for DB access" → medium reliable (requires understanding code structure)
- "Code should be well-structured" → unreliable (too vague)

**Mitigation:**
- Require rules to be specific and testable
- Include test cases with each rule (example violation + example passing code)
- Report confidence levels ("high confidence violation" vs. "possible violation")
- Allow `align ignore` for false positives (like eslint-disable)

**Verdict:** Survived with caveats. Must enforce rule specificity and report confidence.

**Attack 2: API cost for CI**

Running `align check` on every PR means an API call per PR. For a team with 20 PRs/day, that's 20 calls. At Sonnet pricing with average 2000 tokens in + 500 out per check, that's ~$0.10/day. Very cheap. BUT: if you have 30 rules and each needs a separate check, that's 600 calls/day → $3/day → ~$90/month. Still cheap for a team but adds up.

**Mitigation:** Batch rules into a single prompt. "Check this diff against ALL these rules" rather than one call per rule. This is 20 calls/day total.

**Verdict:** Survived. Cost is manageable.

**Attack 3: How is this different from CodeRabbit?**

CodeRabbit does AI-powered code review. It CAN catch convention violations. Is `align` just CodeRabbit with a different name?

**Key difference:** CodeRabbit is a general AI reviewer that makes ad-hoc observations. `align` enforces YOUR SPECIFIC rules. CodeRabbit might or might not notice your Redis/Valkey convention. `align` will ALWAYS check it because it's an explicit rule.

**Analogy:** CodeRabbit is like having a senior dev review your PR (they might catch anything). `align` is like having a CI check that enforces specific team conventions (it checks exactly what you told it to).

**Verdict:** Survived. Different product category. CodeRabbit = general AI review. `align` = custom semantic enforcement.

**Attack 4: Won't teams just put these rules in CLAUDE.md?**

If you tell Claude "use Valkey not Redis" in CLAUDE.md, Claude will follow it. Why do you also need to CHECK compliance?

**Counter:** (a) CLAUDE.md is for Claude — doesn't help Cursor/Copilot users on the team, (b) CLAUDE.md is advisory — Claude might still get it wrong, (c) `align` runs in CI and catches violations from ALL sources (AI and human), (d) defense-in-depth: tell the AI what to do AND verify it did it.

**Verdict:** Survived. `align` is the VERIFICATION layer; CLAUDE.md is the GUIDANCE layer. They complement each other.

**Attack 5: Rule maintenance burden**

Teams need to write and maintain rules. Most teams won't bother.

**Counter:** (a) `align init` auto-generates rules by analyzing existing codebase patterns, (b) rule packs for common frameworks reduce initial effort, (c) rules are MUCH easier to write than eslint plugins — it's literally English sentences.

**Verdict:** Survived if `align init` is good.

### Stress-Test Summary for `align`

| Attack | Severity | Survived? |
|--------|----------|-----------|
| LLM reliability | High | Yes with caveats (require specificity, report confidence) |
| API cost for CI | Medium | Yes (batch rules, cost is <$100/mo for most teams) |
| CodeRabbit overlap | Medium | Yes (different category — custom rules vs. general review) |
| Just use CLAUDE.md | Medium | Yes (verification ≠ guidance, works across all tools) |
| Rule maintenance | Low | Yes (auto-init, rule packs, English is easy) |

**Post-stress-test score: Holds at 18/20.** The attacks don't meaningfully weaken it.

---

## Part C: `align` vs. `bench` — The Final Two

| Dimension | `bench` | `align` |
|-----------|---------|---------|
| Usefulness | 4.5/5 (niche: AI tool evaluators) | 5/5 (broad: any team with conventions) |
| Moat | 5/5 (data corpus) | 4/5 (rule libraries + CI stickiness) |
| Shippability | 3.5/5 (task curation is hard) | 4/5 (CLI + API call) |
| Community | 5/5 (task contributions) | 5/5 (rule contributions) |
| Total | 18/20 | 18/20 |
| "Powered by CC" | Tests CC performance | Uses Claude for semantic analysis |
| Immediate value | Only to AI tool evaluators | To any development team |
| Growth story | Becomes THE standard benchmark | Becomes THE semantic linter |
| Revenue path | Hosted benchmarking service | Hosted CI service (like CodeClimate) |

**The tiebreaker: Which has more IMMEDIATE users?**

- `bench` users: AI tool developers, researchers, DevEx teams evaluating tools. Maybe 1,000 potential users today.
- `align` users: Any team with coding conventions they want enforced. That's literally EVERY software team. Millions of potential users.

**`align` wins on TAM by orders of magnitude.**

**But**: The user's original insight was "highest leverage = infrastructure other tools build on." `bench` is more clearly infrastructure (other tools build evaluation around it). `align` is more clearly a product (teams use it directly).

**Resolution:** `align` IS infrastructure too — other tools can build on the rule format. AI coding tools can consume `.align/rules.yaml` to understand what's allowed. CI tools can integrate. It's both a product AND infrastructure.

---

## ITERATION 5 FINAL RANKING

| Rank | Project | Score | Key Insight |
|------|---------|-------|-------------|
| **1** | **`align`** | **18/20** | English-language semantic linting / automated architectural code review. Massive TAM, clear v0.1, survives stress-testing |
| 2 | `bench` | 18/20 | Strongest moat (data) but narrower immediate audience |
| 3 | `patchwork` | 16.5/20 | High utility but adjacent to dead-end "cookbooks" |
| 4 | `thinktank` (honest) | 15/20 | Measurement doesn't work; becomes CLAUDE.md hygiene tool |
| 5 | `difftrace` | 13/20 | GitLens overlap, API friction, not Claude Code native |

## The Recommended Build: `align`

**Pitch:** "Write lint rules in English. Enforce architectural conventions without writing ESLint plugins."

**v0.1 (weekend):**
- `align init` — auto-generate rules by scanning codebase
- `align add "description"` — add a rule
- `align check` — run rules against git diff using Claude
- Output in standard lint format (compatible with CI)

**v0.2:**
- Rule packs for popular frameworks (Next.js, FastAPI, Rails, etc.)
- CI integration (GitHub Action)
- Confidence scoring

**v0.3:**
- Community rule registry
- `align suggest` — analyze recent PRs and suggest new rules
- Integration with CLAUDE.md (auto-inject rules as coding guidelines)

**Why this is "powered by Claude Code":**
1. Semantic analysis uses Claude (runtime dependency)
2. Rule auto-generation uses Claude Code's codebase understanding
3. The project itself is built by Claude Code
4. `align` rules naturally feed INTO Claude Code sessions via CLAUDE.md integration

**The "infrastructure" angle:** `.align/rules.yaml` becomes a standard that other tools consume. AI coding tools read your rules to understand what's allowed. CI tools integrate for enforcement. The rules.yaml format is the strategic asset.

## Remaining Uncertainty

The main risk: "code quality scanners/linters" was explicitly in the dead-ends list. `align` is NOT a traditional linter (semantic vs. syntactic), but the user might see it that way. The distinction between "ESLint but AI" and "automated architectural code review" is real but subtle. How the user perceives this distinction will determine if `align` is in or out.

---
---

# RALPH LOOP — ITERATION 6: Final Convergence

5 iterations, 33 sub-iterations. Two finalists tied at 18/20. This iteration: (A) last "what did we miss" check, (B) attempt a synthesis that's stronger than either finalist alone, (C) if synthesis fails, produce a definitive decision framework.

## Part A: What Did We Systematically Miss?

Let me audit the TYPES of ideas explored:

**Explored:**
- Context/knowledge management (harvest, ctx, thinktank, intent, handoff)
- Developer tools (difftrace, patchwork)
- Meta/evaluation (bench, agentrace, agenttest)
- Enforcement/verification (align, provecode)
- Ecosystem/platform (ccx, agenthub, aitasks)
- Multiplexing (mux)

**Not explored:**
- **Education/learning** — tools that help people LEARN to use AI coding effectively
- **Migration/adoption** — tools that help teams ADOPT AI coding tools
- **Debugging/observability** — tools that help understand WHAT WENT WRONG in AI sessions
- **Cost optimization** — tools that help teams REDUCE AI coding costs

Let me quickly check if any of these unexplored axes produce something stronger than `align`/`bench`.

### Quick-scan: Education
"AI coding tutorial engine" — too content-heavy, decays fast. Dead-end adjacent. Skip.

### Quick-scan: Adoption
"AI readiness assessment for your team" — consulting, not a tool. Skip.

### Quick-scan: Debugging/Observability
"Why did Claude do that?" — a post-mortem tool for failed AI coding sessions. Interesting but niche and overlaps with `agentrace`. Skip.

### Quick-scan: Cost Optimization
"Reduce your AI coding bill by 40%" — useful but competes with ccusage/Agentlytics (dead end list). Skip.

**Verdict:** The unexplored axes don't produce anything stronger. We've been thorough.

## Part B: Can `align` and `bench` Synthesize?

What if they're not two projects but two faces of ONE project?

**`align`** = "enforce rules on YOUR codebase"
**`bench`** = "evaluate AI tools on STANDARD tasks"

These share a common substrate: **structured evaluation of AI code output.** `align` evaluates against custom rules. `bench` evaluates against acceptance tests.

**Synthesis attempt:** A unified framework for evaluating AI-generated code, with two modes:
1. **Custom mode** (`align`): evaluate against your project's rules
2. **Standard mode** (`bench`): evaluate against community benchmark tasks

**Does this synthesis work?** No. The audiences, workflows, and use cases are too different. A team enforcing conventions in CI doesn't care about benchmark tasks. A researcher evaluating AI tools doesn't care about custom team rules. Combining them creates a confused product.

**Verdict:** Synthesis fails. They're genuinely different products.

## Part C: Final Scoring With a New Lens

Let me re-evaluate with one final lens I haven't applied: **What would make someone STAR this repo on GitHub?**

Stars come from:
1. **"I need this right now"** — solving an active pain point
2. **"This is clever"** — novel approach that makes people think
3. **"I want to follow this"** — interesting trajectory/community
4. **"This helps my team"** — shareable utility

| Factor | `align` | `bench` |
|--------|---------|---------|
| "I need this now" | HIGH — every team has unenforced conventions | LOW — only if actively evaluating AI tools |
| "This is clever" | MEDIUM — "english lint rules" is a neat idea | HIGH — "community AI coding benchmark" is narratively compelling |
| "I want to follow" | MEDIUM — useful but not exciting to watch | HIGH — leaderboards, new results, drama |
| "Helps my team" | HIGH — direct CI integration | LOW — team doesn't need benchmarks |

**`align` wins on practical utility. `bench` wins on narrative/community energy.**

The problem: narrative/community energy is what drives open-source adoption in the EARLY days. Practical utility matters once you have users. For a NEW project trying to get traction, `bench` might actually launch better even though `align` has more long-term value.

## Part D: The Strategic Sequencing Question

What if the right answer isn't "pick one" but "sequence them"?

**Option 1: Start with `align`, add `bench` later**
- Ship a useful tool → get CI adopters → build community → later add benchmarking
- PRO: Immediate utility drives early adoption
- CON: Less narratively exciting at launch, harder to get initial stars/attention

**Option 2: Start with `bench`, add `align` later**
- Ship benchmark results → get attention → build community → later add the tool layer
- PRO: Benchmarks generate attention (leaderboards, comparisons, drama)
- CON: Narrower initial user base, may stall after initial attention

**Option 3: Start with `align`, USE `bench` tasks as the validation**
- Build `align` as the product
- Use a small benchmark suite internally to PROVE `align` works
- "We ran `align` on 50 repos and it caught X% of convention violations that existing linters missed"
- The benchmark data becomes the proof, not the product

**Option 3 is the best.** It gives you:
- A shippable product (`align`)
- A compelling proof-of-concept (benchmark data showing it works)
- A narrative ("English lint rules catch 43% more convention violations than traditional linters")
- A growth path (community rule packs, CI integration, then optionally the full benchmark suite)

## Part E: Addressing the Dead-End Risk

The elephant in the room: `align` is adjacent to "code quality scanners/linters" which is on the dead-end list.

**Why I believe `align` is NOT in the dead-end category:**

1. **Different input:** Traditional linters take code → apply AST patterns. `align` takes code + ENGLISH RULES → applies semantic analysis. The rule authoring experience is fundamentally different.

2. **Different capability:** Semgrep can enforce "no console.log" but CANNOT enforce "database queries must go through the repository pattern." `align` can enforce rules that are IMPOSSIBLE in traditional linters.

3. **Different positioning:** Not competing with SonarQube/Semgrep for the same budget. Competing with CODE REVIEW TIME. "Save 30 minutes per PR by automating convention checks."

4. **The timing argument:** Traditional linters existed pre-LLM. `align` is only possible BECAUSE of LLMs. It's a new category enabled by new technology, not an incremental improvement to an existing category.

**However**, I want to be honest: a skeptic could still say "it's just an AI linter." The user has clearly thought deeply about this space and may have already considered and rejected this direction. The positioning MUST be "automated architectural code review" not "AI linter" for it to clear the dead-end filter.

## Part F: One More Idea — Emerge From the Analysis

Reading back through everything, there's a meta-pattern I keep seeing: **the most valuable thing in AI coding is the RULES/CONTEXT, not the tools.** Tools are commoditized. Rules are proprietary. Every team's `.align/rules.yaml` or `CLAUDE.md` represents hard-won knowledge about how to work with AI in their specific codebase.

What if the project isn't about any specific tool but about making rules/context PORTABLE, MEASURABLE, and COMPOSABLE?

### Iteration 34: `rulekit` — The Universal AI Coding Rule Format

**Idea:** **`rulekit`** — a format specification + toolkit for AI coding rules that works across ALL tools (Claude Code, Cursor, Copilot, Windsurf). Write your rules once in `rulekit` format, and they get translated to `.claude/CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`, etc.

**v0.1 scope:** `rulekit sync` reads `.rulekit/rules.yaml` and writes to all configured tool-specific formats. `rulekit lint` checks code against rules (= `align`). `rulekit import` pulls rules from existing CLAUDE.md/cursorrules files.

**Testable hypothesis:** "Teams using a unified rule format maintain more consistent AI coding behavior across tools than teams managing tool-specific configs separately."

**Steel-man critique:**
- **Who uses this?** Teams using multiple AI coding tools (increasingly common).
- **Why not just X?** Each tool has its own config format. No translation layer exists. Teams manually duplicate rules across CLAUDE.md, .cursorrules, etc.
- **What's the moat?** The FORMAT becomes the standard. Rule packs in `rulekit` format work everywhere. Community contributes rules once, they work in all tools.
- **Absorption risk:** LOW-MEDIUM. No single vendor will build cross-tool compatibility. Each vendor wants you locked into their ecosystem. A neutral format benefits users, not vendors.

**BUT:** This is "open standard designed in a vacuum" — explicitly on the dead-end list. Unless it ships with a TOOL that makes it useful from day one.

**What if `rulekit` ships as `align` + cross-tool sync?**

That's the synthesis:
- `align` provides the tool (semantic linting)
- Cross-tool rule sync provides the infrastructure
- The rule format is the strategic asset

**Scores:**
- Usefulness: 4.5/5 (multi-tool teams need this)
- Moat: 4.5/5 (format + rule corpus + cross-tool support)
- Shippability: 3.5/5 (need to support multiple config formats from day one)
- Community potential: 5/5 (rules written once, work everywhere)
- **Total: 17.5/20**

Not quite as high as `align` alone (the cross-tool sync adds complexity without proven demand). Better to START with `align` and ADD cross-tool sync once you have users.

---

# DEFINITIVE FINAL RECOMMENDATION

After 6 iterations, 34 sub-iterations, and systematic stress-testing of every top candidate:

## Build: `align` — Semantic Code Enforcement

**One-line pitch:** "Write lint rules in English. Catch what ESLint can't."

**Why `align` wins:**

1. **Largest addressable audience** of any idea explored — every team with conventions
2. **Novel category** — semantic enforcement sits between linters (syntax) and code review (human judgment). No tool currently occupies this space.
3. **Survives all stress tests** — differentiated from CodeRabbit (custom rules vs. general review), cost-effective (batched API calls), complements CLAUDE.md rather than competing with it
4. **Clear v0.1** — `align init` + `align add` + `align check` ships in a weekend
5. **Natural growth path** — rule packs → CI integration → cross-tool sync → community rule registry
6. **"Powered by Claude Code"** — uses Claude for semantic analysis, auto-generates rules by analyzing codebase with Claude Code, rules feed back into Claude Code via CLAUDE.md

**Dead-end adjacency acknowledged:** This is NOT a traditional linter. The rules are English, the analysis is semantic, and the category is "automated architectural review." If the user believes the distinction is too subtle and this falls into the "linter" dead end, then `bench` is the backup.

**If `align` is vetoed, build `bench`:**
- Strongest long-term moat (data corpus)
- More narratively exciting (leaderboards, comparisons)
- But narrower audience and harder to ship (task curation)

## Implementation Plan for `align`

**Weekend v0.1:**
```
align init          → scan codebase, suggest rules
align add <rule>    → add English rule to .align/rules.yaml
align check         → check git diff against rules via Claude API
align check --full  → check entire codebase (expensive)
```

Output format: standard SARIF or eslint-compatible JSON for CI integration.

**Week 2-3 (v0.2):**
- GitHub Action for CI
- 3 starter rule packs (React/Next.js, Python/FastAPI, Generic Clean Architecture)
- Confidence scoring per violation
- `align test` — validate rules against example code

**Month 2 (v0.3):**
- Community rule registry (GitHub repo with contributed packs)
- `align suggest` — analyze recent PRs for new rule candidates
- Cross-tool rule sync (write to CLAUDE.md, .cursorrules)
- VS Code extension (inline violations)

**The strategic endgame:** `.align/rules.yaml` becomes the universal format for "how should code be written in this project." Every AI tool reads it. Every CI pipeline enforces it. The format is the moat.

---
---

# RALPH LOOP — ITERATION 7: Contrarian Check + Practical Distillation

We've converged. Rather than generate more ideas, this iteration serves two purposes: (1) a contrarian sanity check — am I in love with `align` and missing something obvious? (2) a practical "what do you ACTUALLY build on Saturday morning?" distillation.

## Contrarian Check: Why `align` Might Be Wrong

**Devil's advocate position:** "You spent 34 iterations and landed on... an AI linter. The user explicitly said linters are a dead end. You're rationalizing. The distinction between 'semantic linter' and 'linter' is something an engineer appreciates but the market doesn't. When someone googles 'AI code quality tool' they'll find `align` next to CodeRabbit, Semgrep, and SonarQube. You're in the same competitive set regardless of how you frame it internally."

**Is this right?** Partially. The market categorization risk is real. If HackerNews sees the launch and says "oh, another AI linter," the project dies in the comments before anyone tries it.

**But:** The counter-evidence is strong:
- CodeRabbit raised $150M+ and is essentially "AI code review." The market clearly distinguishes "AI-powered review" from "linter."
- `align` positions as "write rules in English" — the AUTHORING experience is the differentiator, not the checking engine.
- The comparison isn't `align` vs. ESLint. It's `align` vs. "the tech lead spending 20 minutes per PR checking if people followed conventions."

**Verdict:** The contrarian critique is valid as a MARKETING risk, not a PRODUCT risk. The product is genuinely different. The marketing needs to make that obvious.

**Marketing frame that works:** Don't say "lint rules in English." Say **"Your team's coding conventions, actually enforced."** Lead with the PROBLEM (conventions exist in someone's head, never enforced) not the MECHANISM (English → LLM → violations).

## Contrarian Check: Why `bench` Might Be Right After All

**Devil's advocate position:** "`align` is a better PRODUCT but `bench` is a better OPEN-SOURCE PROJECT. Open-source projects succeed on community energy, not product utility. Nobody stars a linter — people star things that feel like they're part of a MOVEMENT. An open benchmark that evaluates AI coding tools IS a movement. 'Let's collectively understand how good these tools really are' is a rallying cry. 'Let me check if you followed our database convention' is a feature request."

**Is this right?** There's truth here. The most successful open-source projects often have a MISSION more than a FEATURE. Linux, Python, Kubernetes — they're movements, not tools.

**But:** Plenty of successful OSS projects are just great tools: prettier, esbuild, ripgrep, jq. They succeed by being obviously useful, not by being movements.

**The real question:** Does the user want to build a MOVEMENT or a TOOL?

- If MOVEMENT → `bench` (rallying cry: "let's honestly evaluate AI coding tools")
- If TOOL → `align` (utility: "enforce your conventions without plugin development")

## The Practical Distillation

Regardless of which project, here's what Saturday morning looks like:

### If building `align`:

**Hour 1-2: Scaffold**
- `npm init` / `pip init` — pick a language (TypeScript is probably best for npm distribution)
- Set up CLI with commander/yargs
- Define the `.align/rules.yaml` schema

**Hour 3-4: Core engine**
- `align check`: read rules.yaml, read `git diff HEAD~1`, send to Claude API with prompt: "Given these rules and this diff, identify violations. For each violation, output file, line, severity, rule name, explanation."
- Parse Claude's response into structured violations
- Output in human-readable format

**Hour 5-6: Init command**
- `align init`: read the codebase structure, send to Claude with prompt: "Based on this codebase, suggest 5-10 architectural rules that would be useful to enforce."
- Write suggested rules to `.align/rules.yaml`

**Hour 7-8: Polish**
- README with examples
- npm publish / pip publish
- GitHub Action (simple: install, run `align check`, fail on errors)

**End of day 1:** Working CLI that can enforce English rules. Publishable.

### If building `bench`:

**Hour 1-3: Scaffold + First 5 Tasks**
- Create repo structure: `tasks/001-fix-auth-bug/`, etc.
- Each task: `README.md` (description), `repo/` (starting code), `tests/` (acceptance criteria)
- Curate 5 diverse tasks from real-world patterns

**Hour 4-6: Runner**
- CLI that: clones task repo → runs Claude Code on it → runs acceptance tests → reports pass/fail
- Store results as JSON

**Hour 7-8: Results + README**
- Run Claude Code on all 5 tasks, record results
- Create a results table in README
- Publish with initial leaderboard

**End of day 1:** 5-task benchmark with initial Claude Code results. Less polished but publishable.

### Shippability comparison:
- `align` ships more POLISHED (clear CLI, clear use case, immediate utility)
- `bench` ships more INTERESTING (results to discuss, leaderboard to share)

## Final Framework for the User

The decision comes down to three questions:

**Q1: Do you consider "semantic English-rule enforcement" to be in the "linters" dead end?**
- If YES → build `bench`
- If NO → continue to Q2

**Q2: Do you want to build a MOVEMENT (community-driven, narratively exciting) or a TOOL (immediately useful, utility-driven)?**
- If MOVEMENT → build `bench`
- If TOOL → build `align`

**Q3: Which excites YOU more to work on?**
- This matters more than any scoring framework. You'll iterate on this for months. Pick the one that makes you want to open your laptop on Saturday morning.

---

# COMPLETE IDEA INVENTORY (all 34 sub-iterations, final scores)

| # | Name | Score | Status | One-line |
|---|------|-------|--------|----------|
| 1 | Cross-repo impact analyzer | 13/20 | Killed | Needs multiple repos to even test |
| 2-3 | `agentrace` | 15/20 | Backup | Agent session traces — good moat, niche workflow |
| 4-5 | `ctx` | 16.5/20 | Killed | Cross-repo context — weak moat, "just text files" |
| 6 | `agenthub` | 13.5/20 | Killed | Multi-agent coordination — too ambitious |
| 7 | `splitask` | 13/20 | Killed | Task decomposition — vendors absorb this |
| 8-9 | `harvest`/`thinktank` | 15/20 | Reserve | CLAUDE.md lifecycle — measurement doesn't work |
| 10 | `agenttest` | 13.5/20 | Killed | Agent behavior tests — non-determinism problem |
| 11-18 | `thinktank` v2 | 15/20 | Reserve | Honest version after breaking measurement |
| 19 | `provecode` | 12/20 | Killed | Verified AI code — saturated testing space |
| 20 | `mux` | 11.5/20 | Killed | Session multiplexer — 3x cost, users won't pay |
| 21 | `ccx` | 17.5/20 | Killed | Plugin ecosystem — Anthropic will build this |
| 23-24 | `difftrace` | 13/20 | Killed | Git intelligence — GitLens overlap, API friction |
| 25 | (capabilities analysis) | — | Meta | Led to `patchwork` |
| 26-27 | `patchwork` | 16.5/20 | Reserve | Semantic codemods — high utility, cookbook-adjacent |
| 28 | (self-iteration analysis) | — | Meta | Led to `bench` |
| 29 | `bench` | **18/20** | **FINALIST** | AI coding benchmark — strongest moat, narrative energy |
| 30 | (emerging problems) | — | Meta | Led to `align` |
| 31-33 | `align` | **18/20** | **FINALIST** | English semantic linting — biggest TAM, survives stress tests |
| 34 | `rulekit` | 17.5/20 | Future | Universal rule format — add to `align` v0.3 |

**The analysis is complete.** 7 iterations, 34 ideas explored, 2 finalists identified, decision framework provided. The user has everything needed to decide.

---
---

# RALPH LOOP — ITERATION 8: Competitive Validation (Real-World Research)

Previous iterations were THEORETICAL — proposing, scoring, stress-testing ideas in isolation. This iteration: EMPIRICAL validation. Do the finalists already exist? What's the actual competitive landscape?

## CRITICAL FINDING: `align` Has Direct Competitors

The "English-language semantic linting" space is **NOT empty.** Multiple tools already exist:

| Tool | English Rules? | LLM Enforcement? | Maturity | Notes |
|------|---------------|-------------------|----------|-------|
| **GPTLint** | Yes (markdown) | Yes (OpenAI) | Open-source, shipped | Closest match. Two-pass: GritQL filter → LLM check |
| **Lintrule** | Yes (markdown) | Yes | Shipped, has GitHub Action | Rules as plain-text markdown files, runs on diffs |
| **Trag** | Yes (plain text) | Yes | Commercial product | Markets as "LLM superlinter," GitHub/GitLab integration |
| **CodeRabbit** | Yes (YAML/dashboard) | Yes | Well-funded ($150M+) | Custom review instructions in natural language + AST-grep |
| **Lint.ai** | Partial | Yes | Early | Rules on every commit/PR |
| **AI Lint** | Partial | Agent-directed | Early | "Doctrine for AI coding agents" |

### What This Means for `align`

**The concept is validated** — multiple teams independently arrived at the same idea. But the **"novel category" claim is DEAD.** `align` would be entering a space with at least 4 existing tools, including one well-funded competitor (CodeRabbit).

**What would differentiate `align`?**
1. Claude-native (vs. OpenAI-centric GPTLint) — weak differentiator, model-agnostic is better
2. Claude Code hook integration — niche, only helps Claude Code users
3. CLAUDE.md bidirectional sync — novel but small feature

**Honest assessment:** Building `align` now is like building a new JavaScript framework in 2020. You CAN differentiate, but you're fighting for attention in a crowded space. The "novel category" moat we scored at 4/5 is actually **1.5/5**.

### Revised `align` Score

- Usefulness: 5/5 (unchanged — the need is real, which is why competitors exist)
- Moat: 1.5/5 (down from 4 — multiple competitors, well-funded incumbent)
- Shippability: 4/5 (unchanged)
- Community potential: 3/5 (down from 5 — why contribute to new entrant vs. GPTLint or CodeRabbit?)
- **Total: 13.5/20 (down from 18)**

**`align` is killed by competition.** It's a good idea — but it's already been built, multiple times.

---

## CRITICAL FINDING: `bench` Has a Genuine Gap

The AI coding benchmark landscape is rich but fragmented:

**What exists:**
- **SWE-bench**: Effectively dead/saturated. Contaminated, Python-only, retired by OpenAI (Feb 2026)
- **SWE-bench Pro** (Scale AI): Contamination-resistant but academic, not community-maintained
- **SWE-bench Live** (Microsoft): Monthly updates, but still academic
- **Aider Polyglot**: 225 exercises, 6 languages — but tests MODELS, not agent TOOLS
- **SWE-CI**: Tests long-term maintenance — brand new (March 2026)
- **LiveCodeBench**: Continuously updated, prevents contamination
- **Terminal-Bench**: CLI/terminal tasks only
- **FeatureBench**: E2E feature development — academic

**What does NOT exist (the gaps):**

1. **Agent-level tool comparison**: No standard benchmark compares Claude Code vs Cursor vs Copilot vs Devin on identical tasks with identical prompts. All existing comparisons are ad-hoc blog posts or marketing.

2. **Cost-normalized performance**: Almost NO benchmark reports cost-per-task alongside accuracy. A tool scoring 80% at $0.50/task beats one scoring 85% at $5/task — but nobody measures this.

3. **Community-maintained + multi-language + agent-level + living**: This COMBINATION does not exist. Each existing benchmark covers 1-2 of these attributes, never all four.

4. **Real-world workflow fidelity**: Most benchmarks test "fix this issue." None test "understand codebase → plan feature → implement across files → write tests → handle review feedback" — which is actual developer workflow.

### What This Means for `bench`

**The gap is REAL and SPECIFIC.** A benchmark that:
- Tests agent TOOLS (not just models)
- Includes cost-per-task
- Is community-maintained and living
- Covers realistic multi-step workflows (not just bug fixes)

...does not exist. This is genuinely unoccupied territory.

### Revised `bench` Score

- Usefulness: 4.5/5 (unchanged — growing market needs this)
- Moat: 5/5 (unchanged — confirmed by research; data corpus + the specific gap combination)
- Shippability: 3.5/5 (unchanged)
- Community potential: 5/5 (validated — fragmented landscape means people WANT a standard)
- **Total: 18/20 (holds)**

---

## The Verdict Has Flipped

| Project | Pre-Research Score | Post-Research Score | Change |
|---------|-------------------|---------------------|--------|
| `align` | 18/20 | **13.5/20** | **-4.5** (competitors exist) |
| `bench` | 18/20 | **18/20** | Held (gap confirmed) |

**`bench` is the clear winner.** Not because `align` is a bad idea, but because `align` has already been built by others, while `bench`'s specific gap (agent-level, cost-normalized, community-maintained, multi-language) remains genuinely unoccupied.

---

## Refined `bench` Concept: What the Research Tells Us to Build

Based on the competitive landscape, here's the PRECISE gap to fill:

### Name: `thinktank` (use the existing repo name)

**Positioning:** "The community benchmark for AI coding AGENTS — not models, agents."

**Key differentiators from everything that exists:**
1. **Tests TOOLS, not models.** Same task run through Claude Code, Cursor, Copilot Agent, Devin — not "GPT-4 vs Claude" but "Claude Code vs Cursor."
2. **Cost-normalized scoring.** Every result includes total API cost. Leaderboard shows cost-efficiency, not just accuracy.
3. **Realistic workflows.** Tasks are multi-step: understand → plan → implement → test → iterate. Not just "fix this one function."
4. **Community-maintained and living.** Monthly fresh tasks to prevent contamination. Community contributes tasks via PR.
5. **Multi-language.** TypeScript, Python, Go, Rust, Java at minimum.

**What existing benchmarks DON'T do that `thinktank` does:**

| Feature | SWE-bench Pro | Aider Polyglot | SWE-bench Live | `thinktank` |
|---------|--------------|----------------|----------------|-------------|
| Tests agent tools (not just models) | No | No | No | **Yes** |
| Cost tracking | No | No | No | **Yes** |
| Multi-step workflows | No | No | No | **Yes** |
| Community-maintained | No | Partially | No | **Yes** |
| Multi-language | No (Python) | Yes (6) | No (Python) | **Yes (5+)** |
| Continuously updated | No | Yes | Yes (monthly) | **Yes** |

### v0.1 Ship Plan (Refined)

**10 tasks, not 20.** Quality over quantity. Each task:

```
tasks/
  001-rest-to-graphql-migration/
    README.md           # Task description (realistic, multi-step)
    repo/               # Starting codebase (git repo snapshot)
    tests/              # Acceptance criteria (automated tests)
    meta.yaml           # Expected complexity, language, category
```

**Categories (2 tasks each):**
1. Bug fix (realistic: multi-file, requires understanding)
2. Feature addition (new endpoint + tests + docs)
3. Refactor/migration (change pattern across codebase)
4. Test writing (add coverage for untested module)
5. Cross-cutting concern (add logging/auth/caching across system)

**Runner CLI:**
```
thinktank run --tool claude-code --task 001
thinktank run --tool cursor --task 001
thinktank results --compare claude-code cursor
thinktank leaderboard
```

**Result format:**
```json
{
  "task": "001-rest-to-graphql-migration",
  "tool": "claude-code",
  "model": "claude-opus-4-6",
  "success": true,
  "tests_passed": 12,
  "tests_total": 14,
  "cost_usd": 0.47,
  "duration_seconds": 180,
  "tokens_used": 45000,
  "attempts": 1,
  "date": "2026-03-27"
}
```

**The leaderboard becomes the draw.** A live, community-maintained, cost-normalized comparison of AI coding tools. This generates the narrative energy, the stars, and the community contributions.

### Why This Is "Powered by Claude Code"

1. The benchmark TESTS Claude Code (among others) — transparent about capabilities and limitations
2. The infrastructure is BUILT by Claude Code (meta-demonstration of what's possible)
3. New tasks are GENERATED by Claude Code (via this very Ralph Loop process)
4. The project itself demonstrates Claude Code's iterative development workflow (git history as proof)
5. Anthropic benefits from a neutral, rigorous benchmark showing Claude Code's strengths — they're incentivized to SUPPORT this, not absorb it

### Why No Vendor Will Build This

- **Anthropic** won't build a benchmark showing Cursor might beat Claude Code on some tasks
- **Cursor** won't build a benchmark showing Claude Code might beat Cursor
- **GitHub** won't build a benchmark showing Copilot losing to either
- **Only a neutral community project can do this.** That's the permanent structural moat.

---

# REVISED DEFINITIVE RECOMMENDATION (Post-Research)

## Build: `thinktank` — The Community Benchmark for AI Coding Agents

**One-line pitch:** "How good are AI coding tools, really? We test them so you don't have to."

**Why `thinktank` wins (final):**

1. **Confirmed gap in market** — no benchmark tests agent tools (not models) with cost tracking, multi-language, community-maintained. Validated by research, not theory.
2. **`align` is killed** — GPTLint, Lintrule, Trag, and CodeRabbit already occupy the "English lint rules" space. Entering now means fighting 4+ incumbents.
3. **Permanently vendor-neutral** — no vendor will build a benchmark showing competitors winning. Only community can do this.
4. **Strongest possible moat** — task corpus is DATA, not code. Community contributions are cumulative. Historical results are irreplaceable.
5. **Narrative energy** — leaderboards, comparisons, and "drama" drive GitHub stars and open-source attention.
6. **Natural self-iteration** — each Ralph Loop / Claude Code session can add tasks, run evals, improve infrastructure.

**The `align` concept is not wasted.** The competitive research shows it's a valid idea — just one that's already been built. Consider contributing to GPTLint (closest open-source match) rather than building from scratch, or adding Claude-specific features to an existing tool.

## Complete Decision: No More Questions Needed

Previous iterations posed decision framework questions. The research ANSWERS them:
- Is `align` in the "linters" dead end? → **Moot. Competitors already exist.**
- Movement vs. tool? → **Movement. The benchmark IS the movement.**
- Which excites you Saturday morning? → **The one that's not already built by 4 other teams.**

**Build `thinktank`. The gap is real, confirmed, and waiting.**

---
---

# RALPH LOOP — ITERATION 9: Implementation Blueprint

The decision is made. This iteration: convert the idea into a buildable specification. No more ideation — pure engineering design.

## Project: `thinktank` — The Community Benchmark for AI Coding Agents

### Tagline Options
- "How good are AI coding tools, really?"
- "The open benchmark for AI coding agents"
- "Test your tools. Trust your results."

### Architecture

```
thinktank/
├── README.md                    # Project overview + live leaderboard table
├── CONTRIBUTING.md              # How to add tasks + submit results
├── CLAUDE.md                    # AI coding instructions for this repo
├── package.json                 # CLI tool (TypeScript/Node)
├── src/
│   ├── cli.ts                   # Main CLI entry point
│   ├── commands/
│   │   ├── run.ts               # Run a task against a tool
│   │   ├── list.ts              # List available tasks
│   │   ├── results.ts           # View/compare results
│   │   └── leaderboard.ts       # Generate leaderboard table
│   ├── runners/
│   │   ├── base.ts              # Abstract runner interface
│   │   ├── claude-code.ts       # Claude Code runner (uses `claude` CLI)
│   │   ├── cursor.ts            # Cursor runner (uses cursor CLI/API)
│   │   ├── copilot.ts           # Copilot agent runner
│   │   └── manual.ts            # Manual runner (record human results)
│   ├── scoring/
│   │   ├── evaluator.ts         # Run acceptance tests, compute score
│   │   └── cost-tracker.ts      # Track API costs per run
│   └── utils/
│       ├── git.ts               # Git operations (clone task repo, reset)
│       ├── sandbox.ts           # Isolated execution environment
│       └── reporter.ts          # Output formatting (JSON, table, markdown)
├── tasks/
│   ├── task-schema.yaml         # Schema for task definitions
│   ├── 001-fix-auth-bypass/
│   │   ├── task.yaml            # Task metadata + prompt
│   │   ├── repo/                # Starting codebase (or git URL + commit)
│   │   ├── tests/               # Acceptance tests
│   │   └── SOLUTION_NOTES.md    # Expected approach (for task reviewers)
│   ├── 002-add-pagination/
│   │   └── ...
│   └── ... (10 tasks for v0.1)
├── results/
│   ├── schema.json              # Result format schema
│   └── submissions/             # Community-submitted results (PR'd in)
│       ├── claude-code-opus-4.6-2026-03-27.json
│       └── ...
└── leaderboard/
    └── current.md               # Auto-generated from results/
```

### Task Schema (task.yaml)

```yaml
id: "001-fix-auth-bypass"
version: 1
name: "Fix authentication bypass in Express middleware"
description: |
  The auth middleware in this Express.js API has a critical bypass.
  Requests with a malformed JWT token are incorrectly treated as
  authenticated. Find the bug and fix it. Ensure all existing tests
  pass and add a test for the bypass case.
category: bug-fix          # bug-fix | feature | refactor | test-writing | cross-cutting
language: typescript
difficulty: medium          # easy | medium | hard
estimated_time_minutes: 15
multi_file: true
requires_understanding: true  # Must read code to find the bug, not just pattern-match

# The prompt given to the AI agent (identical across all tools)
prompt: |
  This Express.js API has an authentication bypass vulnerability.
  Requests with malformed JWT tokens are being treated as authenticated.
  Find and fix the vulnerability, then add a test that would have caught it.

# How to evaluate success
acceptance:
  test_command: "npm test"
  required_tests_pass: true
  additional_checks:
    - "grep -r 'malformed' tests/"  # Must have a test for malformed tokens

# Anti-contamination
created: "2026-03-27"
source: "original"          # original | adapted-from-real | synthetic
```

### Result Schema

```json
{
  "$schema": "thinktank-result-v1",
  "task_id": "001-fix-auth-bypass",
  "task_version": 1,
  "tool": {
    "name": "claude-code",
    "version": "1.0.25",
    "model": "claude-opus-4-6",
    "settings": "default"
  },
  "environment": {
    "os": "darwin",
    "node_version": "22.0.0"
  },
  "result": {
    "success": true,
    "tests_passed": 14,
    "tests_total": 14,
    "additional_checks_passed": 1,
    "additional_checks_total": 1
  },
  "cost": {
    "total_usd": 0.47,
    "input_tokens": 32000,
    "output_tokens": 8500,
    "api_calls": 12
  },
  "timing": {
    "total_seconds": 145,
    "first_edit_seconds": 23
  },
  "attempts": 1,
  "date": "2026-03-27T14:30:00Z",
  "submitted_by": "github-username",
  "notes": "Solved on first attempt, identified the bypass immediately"
}
```

### The 10 v0.1 Tasks

Designed for DIVERSITY across categories, languages, difficulty, and the specific things that differentiate agent tools from raw models:

| # | Name | Category | Language | Difficulty | What It Tests |
|---|------|----------|----------|------------|---------------|
| 001 | Fix auth bypass | Bug fix | TypeScript | Medium | Code reading, security understanding |
| 002 | Add pagination to API | Feature | Python/FastAPI | Medium | Multi-file changes, test writing |
| 003 | Migrate callback to async/await | Refactor | JavaScript | Easy | Pattern recognition, safe transformation |
| 004 | Add test coverage for payment module | Test writing | TypeScript | Medium | Understanding untested code, edge cases |
| 005 | Add request logging middleware | Cross-cutting | Go | Medium | Understanding existing middleware chain, conventions |
| 006 | Fix race condition in cache | Bug fix | Rust | Hard | Concurrency understanding, subtle bug |
| 007 | Add search with filtering | Feature | Python/Django | Hard | Multi-layer: model, view, serializer, tests |
| 008 | Extract shared util from duplicate code | Refactor | TypeScript | Easy | Identifying duplication, safe extraction |
| 009 | Add rate limiting to API | Cross-cutting | Go | Medium | Design decision (where to add), implementation |
| 010 | Debug failing CI pipeline | Bug fix | Mixed (YAML + Python) | Hard | Multi-tool: read CI config, understand test infra, fix |

**Design principles for tasks:**
- Each task has a REALISTIC codebase (not toy examples)
- Starting repos are 500-2000 lines (small enough to fit in context, large enough to require exploration)
- Every task requires UNDERSTANDING, not just pattern matching
- Acceptance tests are deterministic (no flaky tests)
- Multiple valid solutions exist (don't penalize different approaches)
- Task prompts are identical to what a developer would type

### Leaderboard Format

```markdown
# Thinktank Leaderboard (2026-03-27)

## Overall (all tasks)

| Rank | Tool | Model | Score | Cost/Task | Time/Task | Runs |
|------|------|-------|-------|-----------|-----------|------|
| 1 | Claude Code | opus-4.6 | 8/10 | $0.52 | 2m 15s | 3 |
| 2 | Cursor | opus-4.6 | 7/10 | $0.38 | 1m 50s | 2 |
| 3 | Copilot Agent | gpt-5 | 6/10 | $0.61 | 3m 10s | 2 |

## Cost-Efficiency (score per dollar)

| Rank | Tool | Model | Score/$ | Total Cost |
|------|------|-------|---------|------------|
| 1 | Cursor | sonnet-4.5 | 16.7 | $0.42 |
| 2 | Claude Code | haiku-4.5 | 14.2 | $0.21 |
| ...  |

## By Category

### Bug Fix (tasks 001, 006, 010)
| Tool | Score | Avg Cost | Avg Time |
| ...  |
```

### CLI Usage

```bash
# Install
npm install -g thinktank-bench

# List available tasks
thinktank list

# Run a single task
thinktank run --tool claude-code --task 001

# Run all tasks
thinktank run --tool claude-code --all

# Compare two tools
thinktank compare claude-code cursor

# View leaderboard
thinktank leaderboard

# Submit results (generates PR-ready JSON)
thinktank submit --output results/my-run.json
```

### Runner Architecture (How It Actually Works)

The key technical challenge: running different AI coding tools programmatically.

**Claude Code runner:**
```typescript
// Use claude CLI in non-interactive mode
// claude -p "prompt" --output-format json
// Parse tool calls and results from output
// Track token usage from API headers
```

**Cursor runner:**
```typescript
// Cursor doesn't have a clean CLI mode
// Options:
//   a) Use Cursor's API if available
//   b) Script Cursor via its CLI (cursor --cli)
//   c) Manual mode: user runs Cursor, records results
// v0.1: manual mode with structured result recording
```

**Manual runner (fallback for any tool):**
```typescript
// 1. Set up the task repo
// 2. Display the prompt to the user
// 3. User runs their tool of choice
// 4. thinktank runs acceptance tests
// 5. User inputs cost data (or estimates)
// 6. Results saved as JSON
```

**v0.1 priority:** Claude Code automated runner + manual runner for everything else. Cursor/Copilot automated runners come in v0.2.

### Anti-Contamination Strategy

The biggest risk for any benchmark is contamination (models memorize solutions from training data).

**Mitigations:**
1. **Original tasks:** v0.1 tasks are created specifically for thinktank, not from public repos
2. **Monthly rotation:** Add 2-3 new tasks monthly, retire oldest tasks after 6 months
3. **Variant generation:** Each task can have 2-3 variants (different variable names, slightly different bugs) to test for memorization
4. **Solution diversity check:** If all tools produce nearly identical solutions, the task may be contaminated — flag for review

### Community Contribution Model

**Contributing a task:**
1. Fork repo
2. Create `tasks/NNN-descriptive-name/` with task.yaml, repo/, tests/
3. Self-test: run against at least one tool
4. PR with results

**Contributing results:**
1. Run `thinktank run` or `thinktank submit`
2. PR the JSON result file to `results/submissions/`
3. CI validates the result schema
4. Maintainers merge (no verification of results in v0.1 — trust-based, with random audits)

**Contributing runners:**
1. Implement the runner interface for a new tool
2. PR with runner + at least 3 task results as validation

### What to Build on Day 1 (Saturday Morning Priorities)

**Hour 1-2:** Scaffold repo, CLI skeleton, task schema, result schema
**Hour 3-5:** Build task 001 (auth bypass — TypeScript/Express, most familiar territory)
**Hour 5-6:** Claude Code runner (automate `claude -p` with prompt injection)
**Hour 6-7:** Manual runner + evaluator (run tests, produce result JSON)
**Hour 7-8:** Run task 001 with Claude Code, record first result, write README with result

**End of Day 1:** 1 task, 1 runner, 1 result. The world's smallest AI coding benchmark. But it works and demonstrates the concept.

**Day 2:** Add tasks 002-005. Run Claude Code on all. Generate first leaderboard. Publish.

**Week 2:** Add tasks 006-010. Add manual runner for other tools. Get someone to run Cursor on the tasks. First multi-tool comparison.

### Growth Metrics to Track

1. **GitHub stars** (awareness)
2. **Task count** (corpus growth)
3. **Unique tool submissions** (coverage)
4. **Community PRs** (engagement)
5. **External citations** (authority — blog posts, articles referencing thinktank results)

### Revenue Path (if desired, later)

- **Hosted runs:** "Click to run all benchmarks on your tool" — charge per run
- **CI integration:** "Run thinktank on every release of your AI tool" — SaaS
- **Custom tasks:** "Benchmark your AI tool on tasks specific to YOUR codebase" — consulting
- **Sponsored tasks:** Tool vendors pay to add tasks that showcase their strengths — marketplace

All of this is future. v0.1 is purely open-source, free, community-driven.

---

# END OF IDEATION. READY TO BUILD.

9 iterations. 34+ ideas explored. Competitive research validated the winner. Implementation blueprint is complete.

**Next step:** Stop the Ralph Loop and execute the Day 1 plan.
