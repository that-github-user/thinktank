You are building the open-source project `thinktank` — an ensemble AI coding tool. Each iteration of this loop should make meaningful progress on the project.

## Process for EACH iteration

### Step 1: Assess current state
- Run `gh issue list --state open` to see outstanding issues
- Run `git log --oneline -10` to see recent work
- Run `gh pr list --state all` to see PR history
- Read any new comments on issues/PRs
- Decide which issue to tackle this iteration (prefer: lower issue numbers first, unless a dependency requires different ordering)

### Step 2: Create a branch and do the work
- Create a branch: `git checkout -b issue-N-short-description`
- Do the implementation work for the chosen issue
- Write clean, well-structured code
- Add or update tests where appropriate
- Run `npx tsc` to verify the build passes
- Run any existing tests

### Step 3: Dogfooding checkpoint
- If thinktank's `run` command is functional and relevant to the current task, USE IT to validate your work. For example: `npx tsx src/cli.ts run "review this diff for bugs" -n 2`
- If thinktank isn't applicable to the current task, skip this step

### Step 4: Create a PR
- Commit with a clear message referencing the issue: "Fix #N: description"
- Push the branch
- Create a PR using `gh pr create` with:
  - Title referencing the issue
  - Body with: ## Summary, ## Changes, ## Testing, ## Issue
  - Link to the issue with "Closes #N"

### Step 5: QA & Self-Review
- Read your own PR diff: `gh pr diff <number>`
- Review it critically. Check for:
  - Type safety issues
  - Missing error handling at system boundaries
  - Broken imports or missing exports
  - Any files that should have been updated but weren't (README, types, etc.)
- If you find issues, fix them and push to the same branch
- Add a review comment on the PR noting what you checked: `gh pr review <number> --approve --body "Self-review: checked types, error handling, imports, build passes"`

### Step 6: Merge
- Merge the PR: `gh pr merge <number> --squash --delete-branch`
- Pull main: `git checkout main && git pull`

### Step 7: File new issues
- If during your work you noticed something that needs fixing but is out of scope for the current issue, file a new issue with `gh issue create`
- Be specific: include what you noticed, why it matters, and a proposed fix

### Step 8: Update project state
- Close the issue if the PR didn't auto-close it
- Leave a comment on the issue summarizing what was done

## Issue priority guidance
- #5 (CI) should be done early — it enables the CI badge and catches regressions
- #8 (linting/DX) pairs well with #5
- #7 (templates/community files) is independent and can be done anytime
- #6 (README polish/badges) depends on #5 being done (for the CI badge)
- #1 (apply command) is core functionality
- #3 (test verification) builds on existing code
- #4 (convergence improvement) builds on #2's learnings
- #2 (divergence testing) requires a real test scenario

## Code quality standards
- TypeScript strict mode (already configured)
- No `any` types unless absolutely necessary
- Error messages should be actionable ("Failed to create worktree at /path — is this a git repository?" not just "Error")
- Keep functions small and focused
- Prefer composition over inheritance

## Important rules
- NEVER push directly to main — always use branches + PRs
- EVERY PR must reference an issue
- If you discover a bug or needed improvement, file an issue FIRST, then fix it
- Keep PRs focused — one issue per PR (small exceptions for tightly coupled changes)
- The build must pass before creating a PR
- Do NOT skip the self-review step — it's what makes the repo look well-maintained
