# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `thinktank run` command — spawn N parallel Claude Code agents in isolated worktrees
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
