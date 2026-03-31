# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] — 2026-03-30

### Added
- Example projects: A* pathfinding (Python + TypeScript), ML regression, ML classification
- Ensemble-generated test suite demonstrating two-phase workflow
- Scoring evaluation: n=73 usable runs with Cochran's Q, Wilcoxon, Cliff's delta
- README: documented two-phase ensemble test generation workflow
- GitHub Packages publishing alongside npmjs.org

### Fixed
- Exit-127 (command not found) in test runner now marked as `skipped` instead of `failed` — prevents false penalties in Copeland scoring
- Preflight check hard-errors on exit 127 instead of just warning — saves API tokens
- Copeland scoring skips tests criterion when test command couldn't execute
- `test_maze` assertion in A* examples (correct path length is 9, not 13)
- CLI version read from package.json at runtime (no more stale hardcoded version)
- Log messages: "Setting up agent environments" (was "Creating worktrees")

## [0.1.1] — 2026-03-29

### Fixed
- Version bump for npm publish (0.1.0 was already claimed)
- NPM trusted publishing requires NPM_TOKEN alongside OIDC

## [0.1.0] — 2026-03-29

### Added
- `thinktank run` command — spawn N parallel Claude Code agents in isolated git clones
- `thinktank apply` command — apply recommended or selected agent's changes
- `thinktank apply --preview` — review diff with syntax highlighting before applying
- `thinktank compare <A> <B>` — compare two agents' diffs side by side
- `thinktank list` command — view last run's results
- Convergence analysis with diff-content comparison (Jaccard similarity + union-find clustering)
- Unified diff parser for structured change extraction
- Recommendation scoring: test results (100pts) > convergence (50pts) > diff size (10pts)
- Test runner with command parsing, shell injection prevention, and ENOENT detection
- CLI input validation: attempts (1-20), timeout (10-600s), model warnings
- Architecture documentation (`docs/architecture.md`)
- CI pipeline with GitHub Actions (Node 22/24, build, lint, typecheck, test)
- CI hardening: npm audit, build output verification
- CodeQL security scanning
- npm publish workflow with provenance on version tags
- Biome for TypeScript linting and formatting
- Cross-platform color support via picocolors (NO_COLOR, Windows cmd.exe)
- 56 unit tests across convergence, diff parsing, test runner, apply, git utils, display
- YAML-based issue templates (bug report, feature request)
- PR template, CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md
- CLAUDE.md with project architecture and conventions
- VS Code configuration with Biome formatter

### Security
- Test command validation rejects shell operators (`;|&\`><`) to prevent injection
- Result files written with mode 0o600 and agent stdout/stderr redacted
- Branch names use crypto.randomUUID() to prevent collision
- Diff parser handles quoted paths (filenames with spaces)

### Removed
- Unused `getCurrentBranch()` and `applyDiff()` exports
