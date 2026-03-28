# thinktank — AI Coding Instructions

## What this project is
thinktank is an ensemble AI coding tool. It runs N parallel Claude Code agents on the same task in isolated git worktrees, then selects the best result via test execution and convergence analysis.

## Architecture
- `src/cli.ts` — CLI entry point (commander)
- `src/commands/` — CLI commands (run, apply, list)
- `src/runners/` — Agent runners (claude-code, future: cursor, copilot)
- `src/scoring/` — Convergence analysis and recommendation
- `src/utils/` — Git operations, terminal display

## Code conventions
- TypeScript strict mode, no `any` types
- Use node:test for testing (not jest/vitest)
- Error messages must be actionable: tell the user what to do
- Keep functions small and focused
- Prefer composition over inheritance

## Commands
- `npm run build` — compile TypeScript
- `npm test` — run all tests
- `npm run lint` — check with Biome
- `npm run lint:fix` — auto-fix lint issues
- `npx tsx src/cli.ts` — run CLI in dev mode

## PR process
- One issue per PR, always reference the issue
- Branch naming: `issue-N-short-description`
- Build + lint + tests must pass before merging
