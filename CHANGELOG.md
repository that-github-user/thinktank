# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial CLI with `thinktank run` and `thinktank list` commands
- Parallel Claude Code agent execution in isolated git worktrees
- Convergence analysis grouping agents by file-change fingerprint
- Recommendation scoring based on test results + convergence + diff size
- CI pipeline with GitHub Actions (Node 22/24)
- CodeQL security scanning
