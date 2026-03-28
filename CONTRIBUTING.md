# Contributing to thinktank

Thanks for your interest in contributing! This guide will help you get started.

## Development setup

```bash
# Clone the repo
git clone https://github.com/that-github-user/thinktank.git
cd thinktank

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run the CLI in dev mode
npx tsx src/cli.ts run "your task" -n 3
```

### Requirements
- Node.js 22+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- Git

## Making changes

1. **Find an issue** — check [open issues](https://github.com/that-github-user/thinktank/issues) or file a new one
2. **Create a branch** — `git checkout -b issue-N-short-description`
3. **Make your changes** — keep PRs focused on one issue
4. **Test** — run `npm test` and `npx tsc --noEmit`
5. **Commit** — reference the issue in your commit message
6. **Open a PR** — fill out the PR template

## PR guidelines

- One issue per PR
- Include tests for new functionality
- Build must pass (`npm run build && npm test`)
- Fill out the PR template completely
- Keep diffs small and reviewable

## Code style

- TypeScript strict mode
- No `any` types unless absolutely necessary
- Actionable error messages (tell the user what to do, not just what failed)
- Small, focused functions

## Areas where help is needed

- **New runners** — add support for Cursor, Copilot, or other AI coding tools
- **Convergence algorithms** — better ways to compare and cluster agent outputs
- **Test scenarios** — real-world tasks that demonstrate ensemble value
- **Documentation** — guides, examples, tutorials
