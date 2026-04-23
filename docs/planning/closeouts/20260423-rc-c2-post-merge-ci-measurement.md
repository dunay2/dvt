---
slice: rc-c2-post-merge-ci-measurement
date: 2026-04-23
last_reviewed: 2026-04-23
gap: maintenance
author: AI (Codex)
---

# Closeout: RC-C2 post-merge CI measurement

## Scope

This document records the first post-merge measurement after the RC-C2 Turbo,
Node, pre-commit, and CI governance slices were integrated to `main`.

The measurement intentionally separates proven outcomes from unproven speedup
claims. Recent nearby `main` runs include failing `CI - Code Quality` runs, so
they are useful for regression triage but not for a clean before/after
performance claim.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/testing-and-ci-capabilities.md`
- `docs/planning/closeouts/20260422-rc-c2-wave-1-node-precommit-turbo-cache-closeout.md`
- `package.json`
- `turbo.json`
- `.github/actions/setup-node-pnpm/action.yml`

## Integrated Work Being Measured

The prior RC-C2 slices integrated these operator-facing changes:

- Node local baseline aligned with the CI/runtime target.
- `precommit` determinism work scoped through
  `scripts/run-determinism-precommit.cjs` instead of always paying the full
  determinism gate.
- `.turbo` cache support added to the shared `setup-node-pnpm` CI action.
- Root `turbo.json` expanded beyond build orchestration to include `build`,
  `typecheck`, and `test` task definitions.
- Generated-doc and governance merge gates restored after the initial
  optimization PR exposed a missing ADR traceability prebuild dependency.

## GitHub Actions Evidence

Measurement source: GitHub Actions runs on branch `main`, collected on
2026-04-23 with `gh run view`.

| Change                                                     | Workflow                |         Run | Conclusion | Wall time | Runner seconds | Jobs | URL                                                      |
| ---------------------------------------------------------- | ----------------------- | ----------: | ---------- | --------: | -------------: | ---: | -------------------------------------------------------- |
| `fix(ci): Restore ADR traceability gate (#1009)`           | CI - Code Quality       | 24814342477 | success    |      114s |          1087s |   29 | <https://github.com/dunay2/dvt/actions/runs/24814342477> |
| `fix(ci): Restore ADR traceability gate (#1009)`           | PR Quality Gate         | 24814342490 | success    |       84s |            42s |    5 | <https://github.com/dunay2/dvt/actions/runs/24814342490> |
| `fix(ci): Restore ADR traceability gate (#1009)`           | Test Suite              | 24814342478 | success    |      205s |           389s |    5 | <https://github.com/dunay2/dvt/actions/runs/24814342478> |
| `fix(ci): Restore ADR traceability gate (#1009)`           | Contracts & Determinism | 24814342484 | success    |       64s |           158s |    5 | <https://github.com/dunay2/dvt/actions/runs/24814342484> |
| `build(ci): Optimize Turbo CI and docs governance (#1008)` | CI - Code Quality       | 24812744780 | failure    |      113s |          1014s |   29 | <https://github.com/dunay2/dvt/actions/runs/24812744780> |
| `build(ci): Optimize Turbo CI and docs governance (#1008)` | PR Quality Gate         | 24812744891 | success    |       41s |            32s |    5 | <https://github.com/dunay2/dvt/actions/runs/24812744891> |
| `build(ci): Optimize Turbo CI and docs governance (#1008)` | Test Suite              | 24812744790 | success    |      205s |           392s |    5 | <https://github.com/dunay2/dvt/actions/runs/24812744790> |
| `build(ci): Optimize Turbo CI and docs governance (#1008)` | Contracts & Determinism | 24812744793 | success    |       57s |           134s |    5 | <https://github.com/dunay2/dvt/actions/runs/24812744793> |
| `fix(web): Extend local dev auth token TTL (#1007)`        | CI - Code Quality       | 24804805459 | failure    |      103s |           949s |   28 | <https://github.com/dunay2/dvt/actions/runs/24804805459> |
| `fix(web): Extend local dev auth token TTL (#1007)`        | PR Quality Gate         | 24804805457 | success    |       51s |            29s |    5 | <https://github.com/dunay2/dvt/actions/runs/24804805457> |
| `fix(web): Extend local dev auth token TTL (#1007)`        | Test Suite              | 24804805455 | success    |      197s |           365s |    5 | <https://github.com/dunay2/dvt/actions/runs/24804805455> |
| `fix(web): Extend local dev auth token TTL (#1007)`        | Contracts & Determinism | 24804805465 | success    |       60s |           154s |    5 | <https://github.com/dunay2/dvt/actions/runs/24804805465> |

## Findings

- Current `main` is green for the measured post-merge baseline: the #1009 push
  succeeded across Code Quality, PR Quality Gate, Test Suite, and Contracts &
  Determinism.
- The best current green baseline is #1009: Code Quality 114s, PR Quality Gate
  84s, Test Suite 205s, Contracts & Determinism 64s.
- No clean CI acceleration claim should be made yet for `CI - Code Quality`.
  The nearest pre-fix runs for #1007 and #1008 failed that workflow, so their
  wall times are not equivalent successful-run samples.
- The local pre-commit gain is proven by the prior closeout measurement:
  before scoping, `pnpm lint:determinism` took `29566 ms`; after scoping,
  docs-only commits avoid that full gate while engine and Temporal workflow
  changes still run it.
- `.turbo` CI cache wiring is present, but durable cache-hit savings need more
  samples. One green post-merge `main` run is enough for a baseline, not for a
  statistical performance conclusion.

## Recommended Measurement Window

Collect at least five additional green runs on `main` or PR branches after PR
`#1009` before claiming CI performance gains. For each run, record:

- workflow wall time
- runner seconds
- job count
- conclusion
- whether the run was a push or pull request
- whether the changed files were docs-only, web-only, package code, or CI
  configuration

## Follow-Up Audit Findings

These findings are saved as the next TurboRepo and CI/CD attention set. They
were cross-checked against the current `turbo.json`, `package.json`, workflow
list, `test.yml`, and `adapter-postgres-integration-nightly.yml`.

### TurboRepo

- T1 applied: `turbo.json` is now included in Turborepo
  `globalDependencies`, complementing the existing `.turbo` cache key in the
  shared setup action.
- T2 applied: `DVT_CI` is declared in the `build`, `typecheck`, and `test` task
  env contracts.
- T3 held: repo lint currently exists only as the root changed-files/full-repo
  command. No workspace packages currently expose package-local `lint` scripts,
  so adding a Turbo `lint` task would not yet provide package-level cache value.
- T4 documented: `outputs: []` means no filesystem artifacts are restored for
  `test` and `typecheck`; it is not the same as `cache: false`.
- T5 open: remote Turbo cache needs explicit secret ownership for
  `TURBO_TOKEN` and `TURBO_TEAM`.

### CI/CD

- C1 verified open: `gh api
repos/dunay2/dvt/branches/main/protection/required_status_checks` returned
  empty `contexts` and `checks` on 2026-04-23, and repository rulesets returned
  no entries. Required checks need GitHub settings ownership before this can be
  treated as enforced.
- C2 applied: `test.yml` now delegates non-root PR affected dependency builds
  to `scripts/run-turbo-workspace-task.cjs`.
- C3 held: consolidating `emit-workspace-matrix.mjs` and `emit-scope.mjs --mode
test` is a larger scope-model refactor and should be its own slice.
- C4 held: changing Temporal `workflow_dispatch` defaults would increase manual
  workflow cost and should be an explicit operator decision.
- C5 held: `ci-tool-contracts` still runs on every PR. Scope-gating it is
  possible, but keeping CI tooling contracts always-on is currently the safer
  governance default.
- C6 open: replacing `GITHUB_TOKEN` in `release.yml` requires PAT or GitHub App
  token ownership outside tracked repo files.
- C7 applied: dependency review and CodeQL workflows were added with pinned
  action SHAs.
- C8 applied: the adapter-postgres nightly now creates or comments on a GitHub
  issue when it fails.
- C9 applied: docs deploy now has `timeout-minutes`.
- C10 applied: shared `node_modules` cache paths now include
  `tools/*/node_modules`.
- C11 documented as intentional: fetch depth remains deeper only in detection
  jobs that need diff history.
- C12 applied: the nightly adapter-postgres build now uses
  `--workspace-concurrency=4`.

## Next Optimization Slice

The next high-value slice should remain Turbo-focused but evidence-gated:

- keep the PR `#1009` green run as the baseline
- verify whether Turbo task orchestration can replace more `pnpm -r` paths
  without changing package semantics
- only then consider TypeScript project references or `eslint-plugin-import-x`
  as separate governed slices

No debt entry is required by this measurement document. No behavior, contract,
or CI rule is relaxed here.
