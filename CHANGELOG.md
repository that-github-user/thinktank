# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `thinktank run` command — spawn N parallel Claude Code agents in isolated worktrees
- `thinktank apply` command — apply recommended or selected agent's changes
- `thinktank list` command — view last run's results
- Convergence analysis with diff-content comparison (Jaccard similarity + union-find clustering)
- Unified diff parser for structured change extraction
- Recommendation scoring: test results > convergence > diff size
- Test runner with command parsing, error detection (ENOENT, timeout), and pre-flight checks
- CI pipeline with GitHub Actions (Node 22/24, build, lint, typecheck, test)
- CodeQL security scanning
- Biome for TypeScript linting and formatting
- 31 unit tests across convergence, diff parsing, test runner, and apply command
- YAML-based issue templates (bug report, feature request)
- PR template, CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md
- CLAUDE.md with project architecture and conventions
- VS Code configuration with Biome formatter
