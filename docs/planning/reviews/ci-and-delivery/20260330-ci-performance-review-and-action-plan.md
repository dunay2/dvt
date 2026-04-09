---
title: CI Performance Review And Action Plan
status: Active
owner: CI / Delivery
last_reviewed: 2026-03-30
planning_type: review
---

# CI Performance Review And Action Plan

## Scope

This review analyzes the four GitHub Actions workflows that form the CI pipeline:

- [`.github/workflows/ci.yml`](../../../../.github/workflows/ci.yml) — Code Quality
- [`.github/workflows/pr-quality-gate.yml`](../../../../.github/workflows/pr-quality-gate.yml) — PR Quality Gate
- [`.github/workflows/test.yml`](../../../../.github/workflows/test.yml) — Test Suite
- [`.github/workflows/contracts.yml`](../../../../.github/workflows/contracts.yml) — Contracts & Determinism
- [`.github/actions/setup-node-pnpm/action.yml`](../../../../.github/actions/setup-node-pnpm/action.yml) — Shared setup composite

Focus: wall-clock duration on pull requests, redundant work, and scope-filter gaps.

---

## Executive Summary

CI is slow primarily because of two compounding problems:

1. `pnpm install` runs in every job with no `node_modules` cache — only the pnpm store is cached, which still requires a full install pass.
2. Several expensive jobs (markdown lint, 7 doc-validation steps, adapter-postgres smoke) run on every PR regardless of which files changed.

For a typical PR touching `packages/@dvt/engine/**`, the expected wall-clock overhead is
**20–45 minutes** that can be eliminated without changing any test coverage or quality gate.

---

## Finding 1 — `pnpm install` Duplication (Impact: HIGH)

### Root cause

The composite action [`setup-node-pnpm`](../../../../.github/actions/setup-node-pnpm/action.yml)
caches the pnpm **store** only (`$(pnpm store path)`). The store cache avoids re-downloading
packages, but `pnpm install` still runs in every job to link `node_modules`.

### Count per PR (engine + contracts changed)

| Workflow              | Jobs running `pnpm install`                                                                                   | Count       |
| --------------------- | ------------------------------------------------------------------------------------------------------------- | ----------- |
| `ci.yml`              | `lint-and-format` + up to 7 `workspace-ci` + `markdown-lint`                                                  | up to **9** |
| `pr-quality-gate.yml` | `pr-checks` + `temporal-integration` + `adapter-postgres-smoke`                                               | **3**       |
| `test.yml`            | `test` + `adapter-postgres-integration` + `test-determinism` + `coverage` + `adapter-postgres-smoke`          | **5**       |
| `contracts.yml`       | `validate-json-schemas` + `determinism-checks` + `contract-compile` + `contract-validate` + `contract-hashes` | **5**       |

**~22 installs per PR.** Each takes 30–90 s with a warm store cache.
Overhead: **11–33 min** in pure install time.

### Fix

Add a `node_modules` cache layer to the composite action, keyed on `pnpm-lock.yaml`.
Skip `pnpm install` on a full cache hit.

```yaml
# In .github/actions/setup-node-pnpm/action.yml — after the pnpm store cache step

- name: Cache node_modules
  id: nm-cache
  uses: actions/cache@...
  with:
    path: |
      node_modules
      apps/*/node_modules
      packages/*/*/node_modules
    key: nm-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
    restore-keys: |
      nm-${{ runner.os }}-

- name: Install dependencies
  if: steps.nm-cache.outputs.cache-hit != 'true'
  shell: bash
  run: pnpm install ${{ inputs.install-args }}
```

**Estimated saving**: 15–25 min per typical PR (cache hit rate depends on lockfile churn).

---

## Finding 2 — `markdown-lint` Runs Unconditionally (Impact: HIGH)

### Root cause

In [`ci.yml`](../../../../.github/workflows/ci.yml), the `markdown-lint` job has no
`needs: detect-affected` dependency and no paths-filter. Its only guard is:

```yaml
if: ${{ github.event_name != 'workflow_dispatch' || github.event.inputs.run_markdown_lint == 'true' }}
```

This means it runs on **every PR and every push to main**, even when zero docs files changed.
It runs `checkout + pnpm install + lint:md + docs:gov:locations`.

### Fix

Add `needs: detect-affected` and gate on a `docs_changed` output.

Option A — add `docs_changed` output to `detect-affected`:

```yaml
# In detect-affected / Build matrix step, after the existing outputs:
if echo "$changed_files" | grep -Eq '^docs/|^AGENTS\.md|^CLAUDE\.md'; then
echo "docs_changed=true" >> "$GITHUB_OUTPUT"
else
echo "docs_changed=false" >> "$GITHUB_OUTPUT"
fi
```

Then gate `markdown-lint`:

```yaml
markdown-lint:
  needs: detect-affected
  if: >
    github.event_name == 'push' ||
    (github.event_name == 'pull_request' && needs.detect-affected.outputs.docs_changed == 'true')
```

Option B — add a self-contained paths-filter inside `markdown-lint` itself (cheaper to implement,
slightly more fragile). Either option eliminates the job on code-only PRs.

**Estimated saving**: 2–4 min per code-only PR.

---

## Finding 3 — 7 Doc-Validation Steps Run on Every PR (Impact: HIGH)

### Root cause

In [`pr-quality-gate.yml`](../../../../.github/workflows/pr-quality-gate.yml), these 7 steps
run sequentially in `pr-checks` with only `if: github.event_name == 'pull_request'` — no
path-scope filter:

```
docs:sync:check
docs:quality:check
docs:doctor
docs:gov:locations
docs:canonical:check
docs:status:check
docs:capability:check
```

A PR that only touches `packages/@dvt/engine/src/**` triggers all seven.
Combined runtime: ~1–5 min per PR.

### Fix

Add a `docs_changed` filter to the existing `scope` step and gate the doc checks:

```yaml
- name: Detect docs-only scope
  id: scope
  if: github.event_name == 'pull_request'
  uses: dorny/paths-filter@...
  with:
    filters: |
      any_code:
        - 'apps/**'
        - 'packages/**'
        ...
      docs_changed:          # ADD THIS
        - 'docs/**'
        - 'AGENTS.md'
        - 'CLAUDE.md'
        - 'scripts/docs-*.cjs'
        - 'scripts/generate-*.cjs'
```

Then scope each check:

| Step                    | Gate condition                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `docs:sync:check`       | `docs_changed == 'true'`                                                             |
| `docs:quality:check`    | `docs_changed == 'true'`                                                             |
| `docs:doctor`           | `docs_changed == 'true'`                                                             |
| `docs:gov:locations`    | `docs_changed == 'true'`                                                             |
| `docs:canonical:check`  | `docs_changed == 'true'`                                                             |
| `docs:status:check`     | `docs_changed == 'true' \|\| any_code == 'true'` (generated state changes with code) |
| `docs:capability:check` | `docs_changed == 'true' \|\| any_code == 'true'`                                     |

**Estimated saving**: 1–5 min per code-only PR.

---

## Finding 4 — Duplicate `adapter-postgres-smoke` Across Workflows (Impact: MEDIUM)

### Root cause

For a PR touching `adapter-postgres`, two separate workflows both run the same test command:

| Workflow              | Job                            | Command                                  |
| --------------------- | ------------------------------ | ---------------------------------------- |
| `test.yml`            | `adapter-postgres-integration` | `pnpm test:adapter-postgres:integration` |
| `pr-quality-gate.yml` | `adapter-postgres-smoke`       | `pnpm test:adapter-postgres:integration` |

Both trigger on `pull_request` in parallel. Each spins up a Postgres service container, builds the
full dependency graph, and runs the same suite. This is pure duplication.

Additionally, `test.yml` also has a separate `adapter-postgres-smoke` job that runs the full suite
(`pnpm test:adapter-postgres`) when `smoke_changed` is true — which overlaps significantly with
the integration job in the same workflow.

### Fix

Remove `adapter-postgres-smoke` from `pr-quality-gate.yml` and let `test.yml` be the sole owner
of adapter-postgres test coverage. The `all-checks-passed` job in `pr-quality-gate.yml` should
be updated to not depend on the removed job.

**Estimated saving**: 8–15 min per adapter-postgres PR (one full Postgres boot + build + test run
eliminated).

---

## Finding 5 — `fetch-depth: 0` in Non-PR Runs (Impact: LOW)

### Root cause

`detect-affected` in [`ci.yml`](../../../../.github/workflows/ci.yml) and `detect-changes` in
[`contracts.yml`](../../../../.github/workflows/contracts.yml) use `fetch-depth: 0`
unconditionally. On `push` to `main`, the `paths-filter` step is skipped
(`if: github.event_name == 'pull_request'`), so fetching full history is unnecessary.

The pattern already used correctly in `pr-quality-gate.yml` (line 44):

```yaml
fetch-depth: ${{ github.event_name == 'pull_request' && '0' || '1' }}
```

### Fix

Apply the same conditional to `detect-affected` and `detect-changes` checkouts.

**Estimated saving**: Negligible on small repos. Relevant if repo grows.

---

## Impact Summary

| #   | Finding                                   | Effort | Estimated saving per PR |
| --- | ----------------------------------------- | ------ | ----------------------- |
| 1   | Cache `node_modules` in composite action  | Low    | **15–25 min**           |
| 2   | Gate `markdown-lint` on docs changes      | Low    | 2–4 min                 |
| 3   | Gate 7 doc-checks on docs changes         | Medium | 1–5 min                 |
| 4   | Remove duplicate `adapter-postgres-smoke` | Low    | 8–15 min (adapter PRs)  |
| 5   | `fetch-depth` conditional in non-PR runs  | Low    | <1 min                  |

**Combined expected saving**: 20–45 min on a typical code PR; 30–50 min on adapter-postgres PRs.

---

## Action Plan

### Phase 1 — Zero-risk wins (implement immediately)

**Task CI-OPT-1**: Cache `node_modules` in `setup-node-pnpm`

- File: [`.github/actions/setup-node-pnpm/action.yml`](../../../../.github/actions/setup-node-pnpm/action.yml)
- Change: add `node_modules` cache step with `pnpm-lock.yaml` key; make `pnpm install` conditional on cache miss.
- Risk: low — worst case is stale cache which `pnpm install` self-heals.
- Validation: confirm install step is skipped on second identical run in CI logs.

**Task CI-OPT-5**: Fix `fetch-depth` in non-PR runs

- Files: [`ci.yml`](../../../../.github/workflows/ci.yml), [`contracts.yml`](../../../../.github/workflows/contracts.yml)
- Change: `fetch-depth: ${{ github.event_name == 'pull_request' && '0' || '1' }}`
- Risk: none.

### Phase 2 — Scope filters (implement after Phase 1 validates)

**Task CI-OPT-2**: Gate `markdown-lint` on docs changes

- File: [`ci.yml`](../../../../.github/workflows/ci.yml)
- Change: add `needs: detect-affected`, add `docs_changed` output to `detect-affected` matrix
  step, add `if` guard on `markdown-lint` job.
- Risk: low — verify that docs-only PRs still trigger the job correctly.
- Validation: open a docs-only PR and a code-only PR, confirm job behavior matches intent.

**Task CI-OPT-3**: Gate 7 doc-checks in `pr-quality-gate.yml` on docs changes

- File: [`pr-quality-gate.yml`](../../../../.github/workflows/pr-quality-gate.yml)
- Change: add `docs_changed` to the `scope` paths-filter; add `if` conditions to each doc step
  per the table in Finding 3.
- Risk: medium — `docs:status:check` and `docs:capability:check` must still run on code changes.
  Test both gates.
- Validation: code-only PR skips the 5 pure-docs checks; docs PR runs all 7.

### Phase 3 — Deduplication (implement after Phase 2 is stable)

**Task CI-OPT-4**: Remove duplicate `adapter-postgres-smoke` from `pr-quality-gate.yml`

- File: [`pr-quality-gate.yml`](../../../../.github/workflows/pr-quality-gate.yml)
- Change: remove `adapter-postgres-smoke` job; update `all-checks-passed` `needs` array.
- Risk: low if `test.yml` already provides full coverage — confirm parity first.
- Validation: adapter-postgres PR triggers only one Postgres service + one test run.

---

## Acceptance Criteria

1. A code-only PR (engine or contracts change, no docs) completes CI in under half the current
   wall-clock time.
2. A docs-only PR still triggers `markdown-lint` and all 7 doc checks.
3. An adapter-postgres PR runs the integration suite exactly once.
4. No quality gate is removed or relaxed — all current checks still execute on their correct
   scope.
5. `setup-node-pnpm` logs show `Cache hit for node_modules` on second run with unchanged lockfile.
