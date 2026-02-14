# Workflow Isolation Testing Strategy

## Objective

Isolate and verify each GitHub Actions workflow one at a time to identify and fix failures without interference.

## Current Status (Commit: e44b078)

### Workflows active on Pull Request

- ✅ **ci.yml** - Active (`on: pull_request`)
  - Job: ESLint + Prettier + TypeScript
  - Job: Markdown documentation

### Workflows disabled (only `workflow_dispatch` + `push`)

- ⏸️ **test.yml** - `pull_request` trigger disabled
  - Job: Run tests (Node 18 & 20)
  - Job: Determinism tests

- ⏸️ **contracts.yml** - `pull_request` trigger disabled
  - Job: Validate JSON schemas
  - Job: Determinism pattern scan
  - Job: Compile TypeScript contracts
  - Job: Validate golden JSON fixtures

- ⏸️ **golden-paths.yml** - `pull_request` trigger disabled
  - Job: Validate golden path plans

## Remote verification steps

### Phase 1: Verify ci.yml

1. ✅ Push to remote → wait for GitHub Actions
2. If **PASS**: proceed to Phase 2
3. If **FAIL**: check GitHub logs and fix

### Phase 2: Enable test.yml

1. Uncomment `pull_request:` in `test.yml`
2. Commit and push
3. Wait for GitHub execution
4. If **PASS**: proceed to Phase 3
5. If **FAIL**: check logs and fix

### Phase 3: Enable contracts.yml

1. Uncomment `pull_request:` in `contracts.yml`
2. Commit and push
3. Wait for GitHub execution
4. If **PASS**: proceed to Phase 4
5. If **FAIL**: check logs and fix

### Phase 4: Enable golden-paths.yml

1. Uncomment `pull_request:` in `golden-paths.yml`
2. Commit and push
3. Wait for GitHub execution
4. If **PASS**: ✅ ALL WORKFLOWS PASS
5. If **FAIL**: check logs and fix

## How to proceed

### To enable the next workflow

```bash
# 1. Uncomment pull_request in the workflow
# Example for test.yml:
# on:
#   pull_request:
#     branches: [main]
#   push:
#     branches: [main]
#   workflow_dispatch:

# 2. Commit
git add .github/workflows/test.yml
git commit -m "test(ci): Enable test.yml for isolated verification"

# 3. Push to trigger workflows in GitHub
git push
```

### To review logs in GitHub

- URL: <https://github.com/dunay2/dvt/actions>
- Find the running workflow
- Click en el job fallido
- Review step output

## Expected Results

### ✅ ci.yml should pass

- ESLint: 0 errors
- Prettier: All files formatted
- TypeScript: No type errors
- Markdown: 0 errors

### ✅ test.yml should pass

- All tests: 20/20 passing
- Coverage: Generated successfully
- Determinism tests: Passing

### ✅ contracts.yml should pass

- JSON schemas: Valid (or skip if none)
- Determinism linting: Pass
- TypeScript compile: No errors
- No forbidden patterns (Date.now, Math.random, crypto.randomBytes)

### ✅ golden-paths.yml should pass

- 3 golden paths validated
- All JSON files valid
- All schema versions correct
- All validation statuses VALID

## Troubleshooting

If a workflow fails:

1. Note the failing job name
2. Click through to GitHub Actions logs
3. Find the failing step
4. Check what the exact error is
5. Consult WORKFLOW_FIXES.md or create new fix
6. Test locally with `pnpm` commands
7. Commit fix and re-push

## Progress Tracking

- [x] Commit e44b078: Disabled test.yml, contracts.yml, golden-paths.yml
- [ ] Verify ci.yml passes on remote
- [ ] Enable test.yml
- [ ] Verify test.yml passes on remote
- [ ] Enable contracts.yml
- [ ] Verify contracts.yml passes on remote
- [ ] Enable golden-paths.yml
- [ ] Verify golden-paths.yml passes on remote
- [ ] All workflows passing ✅
