---
title: Testing and CI Capabilities
status: Active
owner: engineering
last_reviewed: 2026-04-18
---

# Testing and CI Capabilities

This guide lists the test and CI capabilities currently implemented in the repository, with the
canonical command and source file for each one.

## Purpose

- Provide a single entry point for engineers who need to know what can be executed locally.
- Map each capability to the workflow or script that enforces it in CI.
- Reduce ambiguity when extending quality gates or adding new workspaces.

See also:

- [`test-architecture.md`](./test-architecture.md) for repository rules on test taxonomy, harnesses, fixtures, and promotion to shared utilities.

## Root Commands

| Capability                     | Command                          | Source                                                                                             |
| ------------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| Full workspace build           | `pnpm build`                     | [`package.json`](../../package.json)                                                               |
| Full recursive test run        | `pnpm test`                      | [`package.json`](../../package.json)                                                               |
| Web E2E test run               | `pnpm test:web:e2e`              | [`package.json`](../../package.json)                                                               |
| Full type-check gate           | `pnpm type-check`                | [`package.json`](../../package.json)                                                               |
| Fast pre-push changed gate     | `pnpm verify:changed`            | [`package.json`](../../package.json)                                                               |
| Pre-push verification gate     | `pnpm verify:prepush`            | [`package.json`](../../package.json)                                                               |
| Changed-files auto-fix         | `pnpm fix:changed`               | [`package.json`](../../package.json)                                                               |
| Changed-files lint/format gate | `node scripts/check-changed.cjs` | [`scripts/check-changed.cjs`](../../scripts/check-changed.cjs)                                     |
| CI tool contract suite         | `pnpm test:ci-tools`             | [`package.json`](../../package.json)                                                               |
| Affected workspace build       | `pnpm ci:affected:build`         | [`package.json`](../../package.json)                                                               |
| Affected workspace test        | `pnpm ci:affected:test`          | [`package.json`](../../package.json)                                                               |
| Affected workspace type-check  | `pnpm ci:affected:typecheck`     | [`package.json`](../../package.json)                                                               |
| ADR-0000 regression gate       | `pnpm traceability:adr0`         | [`package.json`](../../package.json), [`traceability.config.json`](../../traceability.config.json) |

Warm-build note:

- On an already-built worktree, a local warm recursive rebuild can use
  a shell-scoped one-shot form such as `env DVT_CI=1 pnpm -r build`
  on POSIX or `cmd /c "set DVT_CI=1&& pnpm -r build"` from PowerShell.
  See the guardrail note in the `Notes` section below; this is not the
  fresh-worktree default path.
- Root `pnpm build` is now a Turborepo-backed build graph, and the affected
  workspace commands (`pnpm ci:affected:build`, `pnpm ci:affected:typecheck`,
  `pnpm ci:affected:test`) now route through governed Turbo task contracts.
  Full-root `pnpm test`, root `pnpm type-check`, and docs commands still keep
  their existing repo-local orchestration.
- The shared GitHub Actions setup now restores `.turbo` in addition to the
  pnpm store and `node_modules`, so the existing root Turbo `build` path can
  reuse prior task outputs across CI runs.
- The package-level `typecheck` contract is now explicit for every current
  workspace that exposes `build`, so the Turbo-backed
  `pnpm ci:affected:typecheck` path no longer depends on silent `--if-present`
  skips for the current TypeScript package inventory.

## Operational Preflight Helpers

| Capability                  | Command                                                                                                                | Source                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Repo hygiene diagnostics    | `powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main`                                      | [`scripts/hygiene.ps1`](../../scripts/hygiene.ps1) |
| Shared PR preflight         | `powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main -Preflight`                           | [`scripts/hygiene.ps1`](../../scripts/hygiene.ps1) |
| Shared PR preflight + slice | `powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main -Preflight -SliceCommand "<command>"` | [`scripts/hygiene.ps1`](../../scripts/hygiene.ps1) |
| PR check summary            | `powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -PrCheckSummary`                                       | [`scripts/hygiene.ps1`](../../scripts/hygiene.ps1) |
| First-red CI log extraction | `powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -LogFirstTriage`                                       | [`scripts/hygiene.ps1`](../../scripts/hygiene.ps1) |

## Package Test Commands

| Capability                         | Command                                                                    | Scope                                | Source                                                                             |
| ---------------------------------- | -------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| Web app tests                      | `pnpm test:web` or `pnpm --filter @dvt/web test`                           | `apps/web`                           | [`apps/web/package.json`](../../apps/web/package.json)                             |
| Web app E2E (Cypress)              | `pnpm --filter @dvt/web test:e2e`                                          | `apps/web` browser runtime contract  | [`apps/web/package.json`](../../apps/web/package.json)                             |
| Engine package tests               | `pnpm test:engine`                                                         | `@dvt/engine`                        | [`package.json`](../../package.json)                                               |
| Contracts package tests            | `pnpm test:contracts`                                                      | `@dvt/contracts`                     | [`package.json`](../../package.json)                                               |
| Contracts compile gate             | `pnpm test:contracts:compile`                                              | `@dvt/contracts`                     | [`package.json`](../../package.json)                                               |
| API package tests                  | `pnpm --filter dvt-api test`                                               | `apps/api`                           | [`apps/api/package.json`](../../apps/api/package.json)                             |
| API protected runtime integration  | `pnpm --filter dvt-api test:integration`                                   | `apps/api` OIDC + PostgreSQL runtime | [`apps/api/package.json`](../../apps/api/package.json)                             |
| PostgreSQL adapter tests           | `pnpm test:adapter-postgres`                                               | `@dvt/adapter-postgres`              | [`package.json`](../../package.json)                                               |
| Temporal adapter unit tests        | `pnpm test:adapter-temporal`                                               | `@dvt/adapter-temporal`              | [`package.json`](../../package.json)                                               |
| Temporal adapter runtime closure   | `pnpm test:adapter-temporal` then `pnpm test:adapter-temporal:integration` | `@dvt/adapter-temporal`              | [`package.json`](../../package.json)                                               |
| Temporal transformation tests      | `pnpm test:adapter-temporal:integration:transformation`                    | Transformation runtime path          | [`package.json`](../../package.json)                                               |
| Temporal Postgres integration      | `pnpm test:adapter-temporal:integration:postgres`                          | Capability-specific PG path          | [`package.json`](../../package.json)                                               |
| Temporal Postgres Docker proof     | `pnpm test:adapter-temporal:integration:postgres:docker`                   | Canonical local Docker PG proof      | [`package.json`](../../package.json)                                               |
| CLI package tests                  | `pnpm test:cli`                                                            | `@dvt/cli`                           | [`package.json`](../../package.json)                                               |
| Delivery package tests             | `pnpm --filter @dvt/delivery test`                                         | `@dvt/delivery`                      | [`packages/@dvt/delivery/package.json`](../../packages/@dvt/delivery/package.json) |
| Outbox worker arch test            | `pnpm --filter dvt-outbox-worker test:arch`                                | `apps/outbox-worker`                 | [`apps/outbox-worker/package.json`](../../apps/outbox-worker/package.json)         |
| Temporal time-skipping integration | `pnpm test:adapter-temporal:integration`                                   | Temporal worker/workflow integration | [`package.json`](../../package.json)                                               |
| Coverage run                       | `pnpm test:coverage`                                                       | Recursive workspace coverage         | [`package.json`](../../package.json)                                               |

## Determinism and Replay

| Capability                           | Command                 | Source                                                                                                         |
| ------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Determinism lint gate                | `pnpm lint:determinism` | [`package.json`](../../package.json)                                                                           |
| Determinism-focused tests            | `pnpm test:determinism` | [`package.json`](../../package.json)                                                                           |
| Replay-focused tests                 | `pnpm test:replay`      | [`package.json`](../../package.json)                                                                           |
| Temporal integration policy baseline | n/a                     | [`docs/adr/ADR-0001-temporal-integration-test-policy.md`](../adr/ADR-0001-temporal-integration-test-policy.md) |

Current deterministic/runtime coverage includes:

- engine determinism test suites under [`packages/@dvt/engine/test`](../../packages/@dvt/engine/test)
- replay-focused checks under [`packages/@dvt/engine/test`](../../packages/@dvt/engine/test)
- Temporal time-skipping integration tests under [`packages/@dvt/adapter-temporal/test`](../../packages/@dvt/adapter-temporal/test)

## Contracts and Golden Paths

| Capability                           | Command                               | Source                               |
| ------------------------------------ | ------------------------------------- | ------------------------------------ |
| Contract validation                  | `pnpm validate:contracts`             | [`package.json`](../../package.json) |
| Golden-path execution and validation | `pnpm golden:validate`                | [`package.json`](../../package.json) |
| Contract index generation            | `pnpm contracts:index:generate`       | [`package.json`](../../package.json) |
| Contract index drift check           | `pnpm contracts:index:check`          | [`package.json`](../../package.json) |
| RFC 2119 validation                  | `pnpm contracts:rfc2119:validate`     | [`package.json`](../../package.json) |
| Glossary validation                  | `pnpm contracts:glossary:validate`    | [`package.json`](../../package.json) |
| References validation                | `pnpm contracts:references:validate`  | [`package.json`](../../package.json) |
| Idempotency vector validation        | `pnpm contracts:idempotency:validate` | [`package.json`](../../package.json) |
| Executable examples validation       | `pnpm contracts:examples:validate`    | [`package.json`](../../package.json) |

Relevant code and fixtures:

- contracts package: [`packages/@dvt/contracts`](../../packages/@dvt/contracts)
- engine contract tests: [`packages/@dvt/engine/test/contracts`](../../packages/@dvt/engine/test/contracts)
- golden fixtures: [`.golden`](../../.golden)

## Documentation Quality Gates

| Capability                                | Command                                         | Source                                                                                       |
| ----------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Docs sync                                 | `pnpm docs:sync`                                | [`package.json`](../../package.json)                                                         |
| Docs sync drift check                     | `pnpm docs:sync:check`                          | [`package.json`](../../package.json)                                                         |
| Planning generated artifact check         | `pnpm docs:planning:generated:check`            | [`package.json`](../../package.json)                                                         |
| Planning workboard drift check            | `pnpm docs:workboard:check`                     | [`package.json`](../../package.json)                                                         |
| Conditional workboard drift check         | `node scripts/docs-workboard-check-changed.cjs` | [`scripts/docs-workboard-check-changed.cjs`](../../scripts/docs-workboard-check-changed.cjs) |
| Local docs PR fast preflight              | `pnpm docs:pr:fast`                             | [`package.json`](../../package.json)                                                         |
| Local docs PR full preflight              | `pnpm docs:pr:full`                             | [`package.json`](../../package.json)                                                         |
| Deterministic docs PR wrapper             | `pnpm docs:pr:create`                           | [`package.json`](../../package.json)                                                         |
| Docs quality policy check                 | `pnpm docs:quality:check`                       | [`package.json`](../../package.json)                                                         |
| Docs doctor                               | `pnpm docs:doctor`                              | [`package.json`](../../package.json)                                                         |
| Changed Markdown lint                     | `pnpm lint:md:changed`                          | [`package.json`](../../package.json)                                                         |
| Markdown location policy                  | `pnpm docs:gov:locations`                       | [`package.json`](../../package.json)                                                         |
| Docs governance manifest generate         | `pnpm docs:gov:manifest`                        | [`package.json`](../../package.json)                                                         |
| Docs governance manifest drift check      | `pnpm docs:gov:manifest:check`                  | [`package.json`](../../package.json)                                                         |
| Canonical path/link check                 | `pnpm docs:canonical:check`                     | [`package.json`](../../package.json)                                                         |
| Generated code-state drift check          | `pnpm docs:status:check`                        | [`package.json`](../../package.json)                                                         |
| Generated capability coverage drift check | `pnpm docs:capability:check`                    | [`package.json`](../../package.json)                                                         |
| Local docs regenerate-and-validate flow   | `pnpm docs:ci`                                  | [`package.json`](../../package.json)                                                         |

Generated documentation sources:

- code-state report: [`docs/planning/status/generated-code-state.md`](../planning/status/generated-code-state.md)
- capability coverage report: [`docs/planning/status/generated-capability-coverage.md`](../planning/status/generated-capability-coverage.md)
- docs governance manifest: [`docs/.manifest.json`](../../docs/.manifest.json)

Local docs PR preflight usage:

- `pnpm docs:pr:fast`
- `pnpm docs:pr:full`
- `pnpm docs:pr:full -- --title "docs(docs): Your PR title"`
- `pnpm docs:pr:create -- --title "docs(docs): Subject" --body-file .github/PR_BODY.md --dry-run`

Command semantics:

- `pnpm docs:ci` is the local-friendly docs validation flow. It regenerates derived docs surfaces first and then validates the resulting worktree.
- `pnpm docs:sync:check` is the strict drift gate for tracked generated docs.
- `pnpm docs:planning:generated:check` regenerates planning-only derived pages, verifies required sections, checks determinism, and fails if those files are tracked in git again.
- `pnpm docs:workboard:check` is the planning-generated artifact gate and currently delegates to `pnpm docs:planning:generated:check`.
- `pnpm docs:status:check` and `pnpm docs:capability:check` remain strict drift gates for their tracked generated outputs.
- `pnpm docs:gov:manifest` regenerates the tracked machine-readable docs inventory at `docs/.manifest.json`.
- `pnpm docs:gov:manifest:check` is the strict drift gate for that tracked docs governance manifest.
- `pnpm docs:gov` now includes the docs manifest generation step, so the aggregate governance command keeps the tracked manifest current during local-friendly docs validation.
- `pnpm verify:changed` is the fast local pre-push path used by `.husky/pre-push` by default; it stays on changed-file docs, markdown, formatting, and QA-artifact gates without invoking root type-check.
- `pnpm verify:prepush` uses `node scripts/docs-workboard-check-changed.cjs`, so workboard drift is enforced when lane YAML changed, not for every module-only commit.
- `pnpm verify:prepush` now keeps three outcomes for code diffs:
  - skip when no TypeScript-affecting files changed
  - run `pnpm ci:affected:typecheck` when the diff is workspace-scoped
  - run full `pnpm type-check` when root or cross-workspace TypeScript graph inputs changed
- GitHub workflows keep using explicit strict checks rather than relying on `pnpm docs:ci` as a merge gate.
- `pnpm traceability:adr0` remains a blocking governance gate on push to `main`, but it now compares current ADR-0000 issues against the tracked baseline in [`traceability.issue-baseline.json`](../../traceability.issue-baseline.json) so CI fails on regressions rather than re-reporting the known historical backlog on every run.

Planning-generated pages that are intentionally untracked:

- `docs/planning/index.md`
- `docs/planning/proposals/index.md`
- `docs/planning/reviews/index.md`
- `docs/planning/status/index.md`
- `docs/planning/state/agent-lane-*.md`
- `docs/planning/state/execution-workboard.md`
- `docs/planning/state/open-task-route.md`

## GitHub Workflow Coverage

- `CI - Code Quality`: affected workspace matrix, changed-file lint/format,
  changed-only markdown lint on PRs.
  Source: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
- `Test Suite`: package tests, affected test routing, Turbo-backed root build
  coverage for full-root lanes, coverage, determinism/replay tests.
  Source: [`.github/workflows/test.yml`](../../.github/workflows/test.yml)
- `Contracts & Determinism`: schema validation, determinism scan, contract
  compile, golden validation, hash comparison.
  Source: [`.github/workflows/contracts.yml`](../../.github/workflows/contracts.yml)
- `PR Quality Gate`: docs sync/workboard drift, docs gates, type-check
  fast-fail, PR metadata checks, Temporal integration.
  Source: [`.github/workflows/pr-quality-gate.yml`](../../.github/workflows/pr-quality-gate.yml)

## Shared CI Scope Logic

The repository centralizes workflow scope detection in:

- [`tools/ci/scope-config.mjs`](../../tools/ci/scope-config.mjs)
- [`tools/ci/emit-workspace-matrix.mjs`](../../tools/ci/emit-workspace-matrix.mjs)
- [`tools/ci/emit-scope.mjs`](../../tools/ci/emit-scope.mjs)

These files are the canonical source of truth for:

- affected workspace detection
- package test scope detection in [`.github/workflows/test.yml`](../../.github/workflows/test.yml)
- contracts/determinism scope detection
- Temporal integration scope detection

Current workflow consumers:

- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) uses the shared policy plus
  workspace matrix emission for affected build/type-check routing, and now also
  runs `pnpm test:ci-tools` as a merge-gated CI-tool contract lane. Its shared
  `any_code` and `workspace_global` policy now include `turbo.json`, so Turbo
  graph changes trigger the affected-workspace lane instead of falling through
  to `No affected workspaces`.
- [`.github/workflows/test.yml`](../../.github/workflows/test.yml) uses `emit-scope --mode test`
  for PR test routing across the web app, workers, and library workspaces. Its
  push/manual full-suite lane and PR `root_config` fast-path both run
  `pnpm build`, so the merge gate exercises the same Turbo-backed root build
  path that local root builds now use. The shared `root_config` scope now also
  includes `turbo.json` and `scripts/skip-prebuild-if-orchestrated.cjs`, so PRs
  that change the Turbo graph or its orchestration helper cannot skip `Test Suite`,
  while `@dvt/adapter-postgres` remains on its dedicated PostgreSQL-backed lane.
- [`.github/workflows/pr-quality-gate.yml`](../../.github/workflows/pr-quality-gate.yml) uses the
  same shared scope surfaces for workflow/global change routing and Temporal capability lanes.

## Notes

- Affected workspace commands use the `origin/main` comparison baseline.
- Temporal integration tests require compiled workflow artifacts, per
  [`ADR-0001`](../adr/ADR-0001-temporal-integration-test-policy.md).
- The GitHub workflows remain the authoritative merge gates even when the same command is runnable
  locally.
- For local PR-green work, the canonical operator recipe is
  [PR Preflight And CI Triage](./pr-preflight-and-ci-triage.md).
- `pnpm test:adapter-temporal:integration` is the canonical local wrapper and
  performs the required runtime preparation before invoking the Temporal
  integration suite. CI mirrors that contract through explicit
  `prepare:integration` and `test:integration` steps.
- `pnpm test:adapter-temporal:integration:transformation` is capability-specific
  verification for transformation-flow semantics above the Temporal baseline.
- `pnpm test:adapter-temporal:integration:postgres` is capability-specific
  verification for the relational Postgres path. It is not the baseline
  closeout command for every Temporal slice.
- Local Node selection is pinned through `.node-version` and `.nvmrc` with the
  same Node 22 baseline that the shared CI setup already uses.
- `pnpm precommit` still runs `lint-staged` for every commit, but the
  determinism gate now runs only when staged files touch
  `packages/@dvt/engine/src/**`, `packages/@dvt/adapter-temporal/src/workflows/**`,
  or the config inputs that govern that gate.
- Several package-level `typecheck` scripts intentionally retain
  `pretypecheck` hooks where their source TypeScript config resolves dependency
  declarations from built workspace outputs. That keeps direct local
  `pnpm --filter <pkg> typecheck` behavior aligned with the package’s existing
  cold-build assumptions instead of creating a fake no-emit contract.
- `pnpm test:adapter-temporal:integration:postgres:docker` is the canonical
  local proof wrapper for the relational Postgres capability path; it resets
  the Docker PostgreSQL environment, waits for readiness, and then runs the
  capability-specific lane with the canonical local DSN.
- `pnpm --filter dvt-api test:integration` skips cleanly when `DATABASE_URL` or
  `DVT_PG_URL` is absent; when configured it exercises the real API protected
  runtime with JWKS-backed OIDC verification plus PostgreSQL authorization data.
- The protected-runtime lane keeps one executable entrypoint
  (`apps/api/test/integration/protectedRuntime.integration.test.ts`) while its
  support seams are split under `protectedRuntime.integration.*.ts` for
  bootstrap, auth, persistence, runtime scenarios, workspace-draft scenarios,
  and assertions.
- In the agent sandbox used for this repository, `vitest`/`vite`/`esbuild`
  commands may fail with `spawn EPERM`; when that happens, re-run the same
  validation command with escalated execution before treating it as a real code
  failure.
- A shell-scoped one-shot `DVT_CI` build shortcut is available for
  already-built local worktrees or flows that already ran an explicit
  workspace-graph build: use `env DVT_CI=1 pnpm -r build` on POSIX or
  `cmd /c "set DVT_CI=1&& pnpm -r build"` from PowerShell. It is not the
  canonical fresh-worktree build path, because lifecycle hooks skip their
  dependency-build fallback when `DVT_CI` is set.
- `pnpm build` routes through `turbo run build` in the current repo state.
  Direct package `build` commands still keep their package-local dependency
  fallback when they are not running under `turbo`.
- `pnpm ci:affected:build`, `pnpm ci:affected:typecheck`, and
  `pnpm ci:affected:test` route through `node scripts/run-turbo-workspace-task.cjs`
  so affected local preflight and lightweight CI lanes can reuse the same
  governed Turbo graph without changing the full-root `test` or `type-check`
  contract yet.
- `CI - Code Quality` now uses the same Turbo workspace wrapper for its
  affected build/typecheck matrix, keeping the local command and the lightweight
  CI lane on one orchestration path.
- For slices that change code, config, tests, CI, or docs, include
  `pnpm verify:prepush` in the end-of-task validation baseline before claiming
  the work is ready.
