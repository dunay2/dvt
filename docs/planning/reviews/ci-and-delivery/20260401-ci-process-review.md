---
title: CI Process Review — DVT (2026-04-01)
status: Draft
owner: docs
last_reviewed: 2026-04-01
planning_type: review
---

---

title: CI Process Review — DVT (2026-04-01)
status: Active
owner: CI / Delivery
last_reviewed: 2026-04-01
planning_type: review

---

# CI Process Review — DVT (2026-04-01)

**Method:** Full read of the four workflow files, the composite action, and the `package.json` scripts.  
**Prior art:** `20260330-ci-performance-review-and-action-plan.md` and `20260330-ci-prepush-pr-process-observations.md` — read in full before writing this review to avoid re-stating already-documented findings.

---

## Prior Review Implementation Status

The 2026-03-30 performance review identified 5 optimizations. Current state:

| Task     | Description                                                          | Status                                                                                                |
| -------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| CI-OPT-1 | Cache `node_modules` in `setup-node-pnpm`                            | **Implemented** — cache with `nm-$OS-$lockfile` key is live, `pnpm install` conditional on cache miss |
| CI-OPT-2 | Gate `markdown-lint` on `docs_changed`                               | **Implemented** â€” `needs: detect-affected`, `if: docs_changed == 'true'`                            |
| CI-OPT-3 | Gate 7 doc-checks on `docs_changed`                                  | **Implemented** â€” `scope.outputs.docs_changed` gates each step in `pr-checks`                       |
| CI-OPT-4 | Remove duplicate `adapter-postgres-smoke` from `pr-quality-gate.yml` | **Implemented** â€” job is gone from `pr-quality-gate.yml`                                            |
| CI-OPT-5 | `fetch-depth` conditional in non-PR runs                             | **Implemented** — `${{ github.event_name == 'pull_request' && '0' \|\| '1' }}`                        |

BUG-1 through BUG-C from the prepush observations review: **Implemented** â€” scripts fixed.

The performance phase is substantially done. The current review focuses on **correctness**, **coverage gaps**, and **structural debt** not previously addressed.

---

## Section 1 â€” Correctness Issues (Blocking Quality)

### C1 â€” `test:determinism` and `test:replay` use `|| true` (CRITICAL)

```bash
# package.json
test:determinism: pnpm --filter @dvt/engine test -- --grep determinism || true
test:replay:      pnpm --filter @dvt/engine test -- --grep replay      || true
```

`|| true` unconditionally swallows the process exit code. If determinism tests or replay tests fail, the CI step exits 0. The `test-determinism` job in `test.yml` reports success regardless of what the tests actually produced.

These are the most safety-critical tests in the repository. The execution model's correctness guarantee rests on them. A regression in determinism that breaks replay â€” the kind that would produce split-brain state in Temporal â€” will not be caught by CI.

Additionally: Vitest does not have a `--grep` flag. The correct Vitest flag is `--testNamePattern`. The `--grep` flag is either silently ignored (all engine tests run, then `|| true` masks any failure) or causes Vitest to error (which `|| true` also masks). In either case, the intended filtering does not work.

**Fix:** Remove `|| true`. Verify the correct Vitest flag (`--testNamePattern` in Vitest 3.x, or filter by test file paths). Confirm the determinism suite passes before removing the mask.

---

### C2 â€” ADR-0000 Traceability Gate Is Opt-In Only

```yaml
# ci.yml
- name: ADR-0000 traceability gate
  if: >-
    ${{
      github.event_name == 'workflow_dispatch' &&
      github.event.inputs.run_traceability_gate == 'true'
    }}
  run: pnpm traceability:adr0
```

ADR-0000 (status: Accepted) states: "CI must fail if accepted ADRs have zero implementation references." This gate only fires on manual `workflow_dispatch` with explicit opt-in. It never fires on PR or push to main.

The governance document (`governance-document-rule-inventory.md`) lists ADR-0000 as a normative source. The CI enforcement is absent.

**Fix:** Move the traceability gate to run on every `push` to `main` (not every PR â€” it can be slow). Remove the `workflow_dispatch`-only guard or add a separate always-on check. At minimum, it should block main merges when ADR coverage regresses.

---

### C3 â€” `any` Type Check in Contracts Is a Regex Grep

```bash
# contracts.yml â€” contract-compile job
if grep -rE ":\s*any" packages/@dvt/contracts/src 2>/dev/null | grep -q .; then
  echo "âŒ Found 'any' types in contracts (violates strict mode)"
  exit 1
fi
```

This grep:

- **False positives:** Matches the string `: any` inside comments, string literals, and JSDoc. A comment `// returns: any object` fails this check.
- **False negatives:** Misses `as any`, `Array<any>`, `Promise<any>`, `type Foo = any`, and generic constraints like `<T extends any>`. These are the real `any` leaks in TypeScript contracts.

The check gives false confidence. TypeScript's `noImplicitAny: true` (already in `tsconfig`) catches implicit any at build time. The runtime grep check is duplicating a weaker version of something the compiler already does.

**Fix:** Remove the grep. Rely on `tsc --noEmit` with `"strict": true` in `tsconfig.json`. If explicit `any` escape hatches need banning, add `@typescript-eslint/no-explicit-any` to the ESLint rules for the contracts package â€” this is semantically correct and covers all cases the grep misses.

---

### C4 â€” `contracts.yml` Golden Validation Skipped on `workflow_dispatch`

```yaml
# contracts.yml â€” contract-validate job
if: >
  (github.event_name != 'pull_request' || needs.detect-changes.outputs.contracts_relevant == 'true')
  && (github.event_name != 'workflow_dispatch' || github.event.inputs.run_golden_validation == 'true')
```

This condition means: when someone manually triggers `workflow_dispatch` without opting into `run_golden_validation`, neither `contract-validate` nor `contract-hashes` (same pattern) runs. Manual CI re-runs â€” the common tool for debugging flaky tests â€” silently skip the most important contract correctness gate.

**Fix:** Remove the `workflow_dispatch` opt-in condition from these jobs. The golden path validation should always run when contracts are relevant, regardless of trigger type. Make it opt-out (skip via label) not opt-in.

---

## Section 2 â€” Coverage Gaps

### G1 â€” `@dvt/planner`, `@dvt/delivery`, and Other Packages Not in Test Scope

`test.yml` tests these packages on affected PRs: `engine`, `contracts`, `adapter_temporal`, `cli`, `api`.

Not included: `@dvt/planner`, `@dvt/delivery`, `@dvt/state-store`, `@dvt/dsl`, `@dvt/plan-interpreter`, `@dvt/plan-verifier`, `@dvt/observability`, `apps/projector-worker`, `apps/lineage-worker`.

A PR that modifies `@dvt/planner/src/**` triggers:

- `workspace-ci` build + typecheck in `ci.yml` (if planner is in the matrix â€” but it's NOT, planner is not listed in the detect-affected matrix)
- No test job in `test.yml`
- No contract check in `contracts.yml` (unless `contracts` package changed)

The planner is one of the two P0-risk packages identified in the architecture review (the `manifestRef` dead-path bug lives there). Changes to it are not tested in CI on PRs.

**Fix:** Add `@dvt/planner` to the `detect-affected` matrix in `ci.yml` and to the `changes` filter in `test.yml`. Add a `test:planner` package script and wire it.

---

### G2 â€” Coverage Gate Is Engine-Only, No Threshold Visible

```yaml
# test.yml â€” coverage job
- name: Run engine coverage (with threshold enforcement)
  run: pnpm test:coverage:engine
```

The step name says "with threshold enforcement" but the command is `pnpm --filter @dvt/engine test -- --coverage`. Whether threshold enforcement actually happens depends on `vitest.config.ts` having `coverage.thresholds` configured. This is not visible in CI â€” if the thresholds are not set or are set to 0, the "enforcement" is a no-op.

Coverage only covers `@dvt/engine`. Zero coverage gate exists for `@dvt/planner`, `@dvt/contracts`, `@dvt/adapter-postgres`, or `@dvt/adapter-temporal`.

**Fix:** Verify `vitest.config.ts` or the engine's `vitest.config.ts` has explicit thresholds (`lines`, `branches`, `functions`, `statements`). Add them if absent. Make the threshold an explicit CI output (`--reporter=verbose --coverage.reporter=text`) so the coverage number appears in the job log without downloading the artifact.

---

### G3 â€” `workspace-ci` Matrix Does Not Include All Source Packages

The `detect-affected` matrix in `ci.yml` explicitly lists:
`api`, `web`, `contracts`, `engine`, `adapter-postgres`, `adapter-temporal`, `cli`.

Missing: `@dvt/planner`, `@dvt/delivery`, `@dvt/state-store`, `@dvt/dsl`, `@dvt/plan-interpreter`, `@dvt/plan-verifier`, `@dvt/observability`, `@dvt/artifacts`, `@dvt/crypto`, `apps/projector-worker`, `apps/lineage-worker`, `apps/outbox-worker`.

The generated code state shows 23 active workspaces. The matrix covers 7. Changes to 16 workspaces get no build or typecheck in CI.

For non-PR runs (push to main), the matrix still only runs these 7 hardcoded packages. A broken build in `@dvt/planner` on main goes undetected until someone runs `pnpm build` locally.

**Fix:** Either use `pnpm -r --filter "...[origin/main]" run build` (the existing `ci:affected:build` script) for PR-scoped runs, or enumerate the missing packages. The `ci:affected:build` approach is self-maintaining as new workspaces are added.

---

### G4 â€” API Integration Tests Not Wired to the Test Matrix

`test.yml` has:

```yaml
- name: Run api tests (affected package)
  if: steps.changes.outputs.api == 'true' || steps.changes.outputs.root_config == 'true'
  run: pnpm test:api
```

This runs `pnpm --filter dvt-api test` â€” unit tests only. The integration test (`pnpm --filter dvt-api test:integration`) requires a running Postgres. There is no job in `test.yml` or `contracts.yml` that runs API integration tests with a Postgres service.

The API integration test (`test:integration`) is mentioned in `testing-and-ci-capabilities.md` as a real gate. It runs in PR #628-era context (OIDC + Postgres) but is not in any workflow file visible here.

**Fix:** Add an `api-integration` job to `test.yml` alongside `adapter-postgres-integration`, gated on `api` or `adapter_postgres` changes, with a Postgres service container.

---

## Section 3 â€” Structural Debt

### S1 â€” `pr-checks` Is a Monolithic 30-Minute Sequential Job

The `pr-checks` job contains 20+ sequential steps:
ARC policy â†’ ARC docs check â†’ docs sync check â†’ docs workboard check â†’ docs quality â†’ docs doctor â†’ Markdown location â†’ canonical docs â†’ Markdown lint â†’ code-state check â†’ capability check â†’ `pnpm type-check` (6 builds + tsc) â†’ PR title â†’ PR size â†’ PR description â†’ labeler â†’ scope detection.

Problems:

1. **No early exit on failure.** If `ARC docs / evidence validate` fails (line 93), `pnpm type-check` still runs. The developer sees one failure at a time, not all failures at once.
2. **`pnpm type-check` is in a monolith.** It rebuilds 6 packages sequentially inside a 30-minute job that already does 15 other things. A hung TypeScript language server blocks the entire gate.
3. **Labeling has side effects.** `actions/labeler` writes to the PR. It runs inside a job that also does type-check. If type-check fails, the PR may still be labeled (steps before type-check succeed).

**Fix:** Split `pr-checks` into at least two jobs:

- `pr-metadata` â€” PR title, size, description, labeler. Fast, no install needed.
- `pr-quality` â€” ARC check, docs gates, type-check.

This gives immediate feedback on PR metadata without waiting for type-check to complete, and makes the job timeout more precise.

---

### S2 â€” Concurrency Group for Push-to-Main in `pr-quality-gate.yml` Uses `run_id`

```yaml
concurrency:
  group: pr-quality-gate-${{ github.event.number || github.run_id }}
  cancel-in-progress: true
```

For PR events: `github.event.number` is the PR number â†’ correct cancellation.
For push to main: `github.event.number` is empty â†’ falls back to `github.run_id` â†’ each push spawns a unique group â†’ **no cancellation between concurrent main pushes**.

If 3 PRs merge to main within 30 seconds (e.g., from a merge queue), all 3 `pr-quality-gate` runs execute concurrently without cancelling the older ones. With a 30-minute timeout, this accumulates runner cost and can create queue congestion.

**Fix:**

```yaml
concurrency:
  group: pr-quality-gate-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

`github.ref` (e.g., `refs/heads/main`) provides a stable group key for push events, enabling cancellation of older runs on the same branch.

---

### S3 â€” Scope Detection Is Duplicated Across Four Workflows

Each workflow independently calls `dorny/paths-filter` with its own filter definitions. The filter patterns for `packages/@dvt/engine/**` appear in `ci.yml`, `test.yml`, `contracts.yml`, and `pr-quality-gate.yml` independently. When a new workspace is added:

- `ci.yml` detect-affected matrix must be updated.
- `test.yml` `changes` filters must be updated.
- `contracts.yml` `detect-changes` filter may need updating.
- `pr-quality-gate.yml` scope step must be updated.

Missing any one of them creates a silent coverage gap (as seen in G1 and G3 above â€” `@dvt/planner` is missing from `ci.yml` but would need to be added to `test.yml` independently).

**Fix (medium-term):** Centralize scope detection in `tools/ci/scope-config.mjs` (this file already exists per `testing-and-ci-capabilities.md`) and have all workflows consume it via a reusable `detect-scope` workflow called as the first job. This eliminates the 4-way duplication.

**Fix (short-term):** Document which file owns scope definitions for each package. Add a CI tool test (`test:ci-tools`) that asserts all 4 workflows define the same scopes for the same packages.

---

### S4 â€” No `dependabot.yml` for GitHub Actions

Identified in the prepush observations review (4.5) and still not addressed. Six action versions are SHA-pinned:

- `actions/checkout` â€” v6
- `dorny/paths-filter` â€” v4
- `amannn/action-semantic-pull-request` â€” v6
- `actions/upload-artifact` â€” v7.0.0
- `actions/download-artifact` â€” v8.0.1
- `actions/labeler` â€” v6
- `actions/github-script` â€” v8

Without Dependabot, these receive no automatic patch updates. Security patches in actions are silently missed.

**Fix:** Add `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
    groups:
      actions:
        patterns: ['*']
```

---

### S5 â€” `lint-staged` Does Not Cover `scripts/*.cjs`

Identified in the prepush observations review (3.3) and still not addressed. Files under `scripts/` are edited regularly (6 bug fixes in the 2026-03-30 session alone) and are committed without pre-commit ESLint or Prettier enforcement.

Current `lint-staged` coverage: TypeScript source in `packages/` and `apps/`, root-level `*.{js,json,md,yml,yaml}`, and `specs/contracts/`.

Not covered: `scripts/*.cjs`, `scripts/*.mjs`, `tools/ci/*.mjs`, `tools/ci/*.js`.

**Fix:** Add to `lint-staged` in `package.json`:

```json
"scripts/**/*.{js,cjs,mjs}": ["eslint --fix", "prettier --write"],
"tools/ci/**/*.{js,cjs,mjs}": ["eslint --fix", "prettier --write"]
```

---

### S6 â€” `pnpm type-check` Rebuilds 6 Packages Sequentially on Every Run

```bash
# package.json type-check script
pnpm --filter @dvt/contracts build &&
pnpm --filter @dvt/artifacts build &&
pnpm --filter @dvt/planner build &&
pnpm --filter @dvt/observability build &&
pnpm --filter @dvt/crypto build &&
pnpm --filter @dvt/plan-interpreter build &&
tsc --noEmit
```

This is 6 sequential build commands before a single type-check. Identified in prepush observations (3.6) and still not addressed.

In `pr-quality-gate.yml`, this runs inside `pr-checks` which already has the `node_modules` cache warm. But the build outputs (`dist/`) are not cached â€” every run rebuilds from TypeScript source. For packages that didn't change, this is wasted compute.

**Fix (low-effort):** Use `pnpm --filter @dvt/contracts... build` (recursive with dependencies) instead of 6 sequential `--filter` calls. This allows pnpm to parallelize where possible.

**Fix (medium-effort):** Cache `dist/` directories alongside `node_modules` in the composite action, keyed on the source hash of each package. Skip rebuild if source unchanged.

---

## Section 4 â€” Process Observations

### P1 â€” No Merge Queue Configuration

The repository has no merge queue configured (no `.github/merge_queue.yml`, no `queue_merge` label convention). PRs merge directly to main via the "Merge" button. At team scale, this creates the classic merge-order problem: a PR that passed CI against `main@t0` may fail against `main@t1` when another PR merged between CI start and merge button click.

If this repository is at single-contributor scale currently, this is a non-issue. At 3+ contributors it becomes relevant.

**Suggestion:** Enable GitHub's native merge queue when contributor count warrants it. The `all-checks-passed` aggregator job already provides the correct required-check surface for merge queue integration.

---

### P2 â€” `verify:prepush` Does Not Run Tests

```bash
# package.json
verify:prepush: pnpm type-check && pnpm docs:workboard:check && pnpm docs:gov:locations -- --changed-only && pnpm docs:arc:evidence:check -- --changed-only && pnpm lint:md:changed && node scripts/check-changed.cjs
```

The pre-push gate runs: type-check, docs checks, arc evidence check, markdown lint, changed-file ESLint/Prettier. It does **not** run any test suite.

A developer who pushes code that compiles and lints correctly but breaks 50% of the test suite will see green locally and only find out tests are broken after CI runs (15â€“20 minutes later).

**Suggestion:** Add `pnpm test:engine` (or the affected workspace test) to `verify:prepush` for code changes. Gate it behind the same changed-file logic: if `packages/@dvt/engine/**` changed, run engine tests. This is ~30 seconds for the engine suite and catches the most common regression class before push.

---

### P3 â€” QUALITY-1 (2-dot vs 3-dot diff) Still Deferred

From the prepush observations review: hook and `check-changed.cjs` use `..` (two-dot); `validate-arc-evidence-frontmatter.cjs` uses `...` (three-dot / merge-base). On linear history these are equivalent. On rebase-heavy workflows or merge commits they can diverge, causing ARC evidence validation to silently miss changed files.

This remains unaddressed. The risk is low on linear history but the fix is a one-line change.

**Fix:** Standardize to `...` (three-dot) across all scripts that compute changed files relative to `origin/main`.

---

## Section 5 â€” Improvement Priority Table

| ID     | Finding                                          | Category    | Severity     | Effort | Currently Blocking CI Correctness? |
| ------ | ------------------------------------------------ | ----------- | ------------ | ------ | ---------------------------------- |
| **C1** | `test:determinism \|\| true` swallows failures   | Correctness | **Critical** | Low    | **Yes**                            |
| **C2** | ADR-0000 traceability gate opt-in only           | Correctness | High         | Low    | No (governance gap)                |
| **C3** | `any` type grep is wrong tool                    | Correctness | Medium       | Low    | No (false signal)                  |
| **C4** | Golden validation skipped on `workflow_dispatch` | Correctness | Medium       | Low    | No (manual runs only)              |
| **G1** | `@dvt/planner` not in test scope                 | Coverage    | High         | Low    | No (silent gap)                    |
| **G2** | Coverage threshold not verified                  | Coverage    | Medium       | Low    | No                                 |
| **G3** | 16 workspaces not in `workspace-ci` matrix       | Coverage    | High         | Medium | No (silent gap)                    |
| **G4** | API integration tests not in any workflow        | Coverage    | Medium       | Medium | No                                 |
| **S1** | `pr-checks` monolithic 30-min job                | Structural  | Medium       | Medium | No (DX friction)                   |
| **S2** | Concurrency group on push-to-main broken         | Structural  | Low          | Low    | No (cost/queue)                    |
| **S3** | Scope detection duplicated across 4 workflows    | Structural  | Medium       | High   | No (maintenance)                   |
| **S4** | No Dependabot for GitHub Actions                 | Structural  | Medium       | Low    | No (security drift)                |
| **S5** | `lint-staged` misses `scripts/*.cjs`             | Structural  | Low          | Low    | No (code quality)                  |
| **S6** | `type-check` rebuilds 6 packages sequentially    | Structural  | Low          | Low    | No (performance)                   |
| **P1** | No merge queue                                   | Process     | Low          | Medium | No                                 |
| **P2** | `verify:prepush` does not run tests              | Process     | Medium       | Low    | No (DX)                            |
| **P3** | 2-dot vs 3-dot diff inconsistency                | Process     | Low          | Low    | No                                 |

---

## How to Advance Critical Items

### C1 â€” Fix `test:determinism || true` (implement immediately, 30 minutes)

1. Open `package.json`.
2. Change:
   ```
   test:determinism: pnpm --filter @dvt/engine test -- --grep determinism || true
   test:replay:      pnpm --filter @dvt/engine test -- --grep replay      || true
   ```
   to:
   ```
   test:determinism: pnpm --filter @dvt/engine test -- --testNamePattern determinism
   test:replay:      pnpm --filter @dvt/engine test -- --testNamePattern replay
   ```
3. Run `pnpm test:determinism` locally. Verify it finds and runs the suite.
4. Run `pnpm test:replay` locally. Verify it finds and runs the suite.
5. If the suite was silently not running (because `--grep` was ignored), the test count may differ from before. Fix any actual failures before removing `|| true`.
6. Commit with `pnpm commit fix ci "Remove || true from determinism and replay test gates"`.
7. ARC-2 not required (no contracts or adapters changed).

### G1 + G3 â€” Add `@dvt/planner` to CI scope (implement in one PR)

1. Add to `detect-affected` matrix in `ci.yml`:
   ```yaml
   add_item "planner" "@dvt/planner"
   ```
   And add filter:
   ```yaml
   planner:
     - 'packages/@dvt/planner/**'
   ```
2. Add to `test.yml` `changes` filter:
   ```yaml
   planner:
     - 'packages/@dvt/planner/**'
   ```
   And add:
   ```yaml
   - name: Run planner tests (affected package)
     if: steps.changes.outputs.planner == 'true' || steps.changes.outputs.root_config == 'true'
     run: pnpm --filter @dvt/planner test
   ```
3. For remaining 15 missing workspaces, consider switching `workspace-ci` to use `ci:affected:build` (already scripted in `package.json`) instead of the hardcoded matrix. This is self-maintaining.

### S4 â€” Dependabot for GitHub Actions (implement immediately, 10 minutes)

Create `.github/dependabot.yml` with the configuration shown in S4 above. This has zero risk and prevents security drift.

### C2 â€” ADR-0000 Traceability Gate (implement in a dedicated CI PR)

Move the traceability gate to a separate job in `ci.yml` triggered on `push` to `main`:

```yaml
traceability-gate:
  name: ADR-0000 Traceability
  runs-on: ubuntu-latest
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  steps:
    - uses: actions/checkout@...
    - uses: ./.github/actions/setup-node-pnpm
    - run: pnpm traceability:adr0
```

This does not block PRs (traceability is expensive to compute) but blocks main if ADR coverage regresses.
