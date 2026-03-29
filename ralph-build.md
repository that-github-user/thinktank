You are building the open-source project thinktank. Each iteration: close ONE issue via thinktank + proper PR workflow.

## Issues to close (in order)
1. #122 — Support Amazon Bedrock model IDs
2. #69 — Schema validation for result files
3. #64 — Pre-flight test run on main branch
4. #57 — Show live per-agent progress
5. #79 — Integration tests for CLI commands

Skip: #108, #105, #31 (abstract/human-judgment needed)

## Process for EACH iteration

### Step 1: git checkout main && git pull
### Step 2: git checkout -b issue-N-description
### Step 3: Write prompt to .thinktank/prompt.txt
### Step 4: Run thinktank
npx tsx src/cli.ts run --attempts 5 --model opus -t "npm test" -f .thinktank/prompt.txt
### Step 5: Review results, apply best agent
git stash && npx tsx src/cli.ts apply && git stash pop
### Step 6: Verify
npx tsc --noEmit && npm test && npx biome check --write src/ && npm run lint
### Step 7: Commit, push, create PR
### Step 8: Wait for CI: gh pr checks N --watch
### Step 9: Merge: gh pr merge N --squash --delete-branch
### Step 10: Close issue with comment: gh issue comment N --body "Fixed in #PR..."
### Step 11: Return to main: git checkout main && git pull

## Quality standards
- All tests must pass, lint must pass before PR
- Add tests for new code
- Follow existing conventions
