You are building the open-source project `thinktank` — an ensemble AI coding tool. Each iteration of this loop should close ONE issue via a proper PR workflow.

## Process for EACH iteration

### Step 1: Assess current state
- Run `gh issue list --state open --limit 20` to see outstanding issues
- Run `git log --oneline -5` to see recent work
- Run `git checkout main && git pull` to ensure you're on latest main
- Pick the highest-priority open issue using this order:
  1. Security/critical bugs (#20)
  2. High-priority bugs and validation (#21, #24)
  3. Code quality and dead code (#22, #25, #26)
  4. Test coverage (#23)
  5. Infrastructure (#27, #28, #30)
  6. Documentation fixes (#34, #36)
  7. Features (#29, #31, #32, #33, #35)

### Step 2: Create a branch and implement
- `git checkout -b issue-N-short-description`
- Implement the fix/feature for the chosen issue
- Keep changes focused — one issue per PR
- Run `npx tsc --noEmit` to verify types
- Run `npm test` to verify all tests pass
- Run `npm run lint` to verify lint passes
- If you add new functionality, add tests for it

### Step 3: Commit and push
- Stage only relevant files (not .claude/ or .thinktank/)
- Commit with message referencing the issue
- Push with `-u origin branch-name`

### Step 4: Create PR with proper template
Use `gh pr create` with this format:
```
## Summary
- bullet points

## Change type
- [x] applicable type

## Related issue
Closes #N

## How to test
1. steps

## Breaking changes
- [ ] yes/no
```

### Step 5: Self-review
- Run `gh pr diff <number> --name-only` to verify only expected files changed
- Add a review comment with checklist of what you verified
- Check: types, error handling, imports, test coverage, lint, docs updated if needed

### Step 6: Merge and clean up
- `gh pr merge <number> --squash --delete-branch`
- `git checkout main && git pull`

### Step 7: Comment on the closed issue
- ALWAYS add a closing comment on the issue summarizing what was done:
  `gh issue comment N --body "Fixed in #PR. Brief summary of what changed."`
- This is important — the issue history should be self-contained. Don't let auto-close be the only signal.

### Step 8: File new issues if needed
- If you discover something out of scope, file it with `gh issue create`
- Be specific and actionable

## Quality standards
- TypeScript strict mode, no `any`
- All tests must pass before PR
- Lint must pass before PR
- Error messages must be actionable
- Keep functions small and focused
- Add tests for new code paths
