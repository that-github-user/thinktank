# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in thinktank, please report it responsibly.

**Do NOT open a public issue.**

Instead, email security concerns to the maintainers via [GitHub private vulnerability reporting](https://github.com/that-github-user/thinktank/security/advisories/new).

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge your report within 48 hours and provide a timeline for a fix.

## Scope

thinktank spawns Claude Code CLI processes and executes shell commands (test runners). Security-relevant areas include:
- Command injection via task prompts or test commands
- Worktree isolation (agents should not affect the main repo)
- Credential exposure in logs or result files
