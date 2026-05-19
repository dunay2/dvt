---
title: Testing and CI Capabilities
status: Active
owner: engineering
last_reviewed: 2026-05-17
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

| Capability                     | Command                          | Source                                                                                               |
| ------------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Full workspace build           | `pnpm build`                     | [`package.json`](../../package.json)                                                                 |
| Full recursive test run        | `pnpm test`                      | [`package.json`](../../package.json)                                                                 |
| Web PR CI test partition       | `pnpm test:web:ci`               | [`package.json`](../../package.json), [`apps/web/vitest.suites.ts`](../../apps/web/vitest.suites.ts) |
| Web changed-file test routing  | `pnpm test:web:changed`          | [`package.json`](../../package.json), [`apps/web/vitest.suites.ts`](../../apps/web/vitest.suites.ts) |
| Web E2E test run               | `pnpm test:web:e2e`              | [`package.json`](../../package.json)                                                                 |
| Full type-check gate           | `pnpm type-check`                | [`package.json`](../../package.json)                                                                 |
| Fast pre-push changed gate     | `pnpm verify:changed`            | [`package.json`](../../package.json)                                                                 |
| Pre-push verification gate     | `pnpm verify:prepush`            | [`package.json`](../../package.json)                                                                 |
| Changed-files auto-fix         | `pnpm fix:changed`               | [`package.json`](../../package.json)                                                                 |
| Changed-files lint/format gate | `node scripts/check-changed.cjs` | [`scripts/check-changed.cjs`](../../scripts/check-changed.cjs)                                       |
| PR closeout rail               | `pnpm pr:closeout`               | [`scripts/pr-closeout.cjs`](../../scripts/pr-closeout.cjs)                                           |
| CI tool contract suite         | `pnpm test:ci-tools`             | [`package.json`](../../package.json)                                                                 |
| Affected workspace build       | `pnpm ci:affected:build`         | [`package.json`](../../package.json)                                                                 |
| Affected workspace test        | `pnpm ci:affected:test`          | [`package.json`](../../package.json)                                                                 |
| Affected workspace type-check  | `pnpm ci:affected:typecheck`     | [`package.json`](../../package.json)                                                                 |
| ADR-0000 regression gate       | `pnpm traceability:adr0`         | [`package.json`](../../package.json), [`traceability.config.json`](../../traceability.config.json)   |

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
- Turbo task contracts explicitly declare `DVT_CI` for `build`, `typecheck`,
  and `test`, so CI-only guard behavior is visible to Turborepo hashing and
  task environment handling.
- `turbo.json` is listed in Turborepo `globalDependencies` as well as the
  shared CI `.turbo` cache key. Changes to the task graph therefore invalidate
  both restore-level and task-hash-level cache state.
- `test` and `typecheck` use `outputs: []` because they do not publish governed
  filesystem artifacts. This does not disable Turborepo task caching; it only
  declares that no output files need to be restored.
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

| Capability                         | Command                                                                    | Scope                                                | Source                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Web app tests                      | `pnpm test:web` or `pnpm --filter @dvt/web test`                           | `apps/web` full Vitest suite                         | [`apps/web/package.json`](../../apps/web/package.json)                                                 |
| Web app CI partition               | `pnpm test:web:ci` or `pnpm --filter @dvt/web test:ci`                     | `apps/web` primary Vitest suites                     | [`apps/web/vitest.suites.ts`](../../apps/web/vitest.suites.ts)                                         |
| Web app changed-file test routing  | `pnpm test:web:changed` or `pnpm --filter @dvt/web test:changed`           | `apps/web` routed local Vitest suite                 | [`apps/web/vitest.suites.ts`](../../apps/web/vitest.suites.ts)                                         |
| Web app lint                       | `pnpm --filter @dvt/web lint`                                              | Web `src`, Cypress, local configs, and local scripts | [`apps/web/package.json`](../../apps/web/package.json)                                                 |
| Web app unit tests                 | `pnpm --filter @dvt/web test:unit`                                         | `*.test.ts`, excluding architecture                  | [`apps/web/vitest.unit.config.ts`](../../apps/web/vitest.unit.config.ts)                               |
| Web app presentation tests         | `pnpm --filter @dvt/web test:presentation`                                 | `*.test.tsx`, excluding architecture                 | [`apps/web/vitest.presentation.config.ts`](../../apps/web/vitest.presentation.config.ts)               |
| Web app architecture tests         | `pnpm --filter @dvt/web test:architecture`                                 | `*.architecture.test.{ts,tsx}`                       | [`apps/web/vitest.architecture.config.ts`](../../apps/web/vitest.architecture.config.ts)               |
| Web app Canvas focus tests         | `pnpm --filter @dvt/web test:canvas`                                       | Canvas route and `views/canvas/**`                   | [`apps/web/vitest.canvas.config.ts`](../../apps/web/vitest.canvas.config.ts)                           |
| Web app Canvas unit focus tests    | `pnpm --filter @dvt/web test:canvas-unit`                                  | Canvas non-architecture `.ts` tests                  | [`apps/web/vitest.canvas-unit.config.ts`](../../apps/web/vitest.canvas-unit.config.ts)                 |
| Web app Canvas UI focus tests      | `pnpm --filter @dvt/web test:canvas-presentation`                          | Canvas non-architecture `.tsx` tests                 | [`apps/web/vitest.canvas-presentation.config.ts`](../../apps/web/vitest.canvas-presentation.config.ts) |
| Web app Canvas architecture focus  | `pnpm --filter @dvt/web test:canvas-architecture`                          | Canvas architecture tests                            | [`apps/web/vitest.canvas-architecture.config.ts`](../../apps/web/vitest.canvas-architecture.config.ts) |
| Web app E2E (Cypress)              | `pnpm --filter @dvt/web test:e2e`                                          | `apps/web` browser runtime contract                  | [`apps/web/package.json`](../../apps/web/package.json)                                                 |
| Web app E2E native (Cypress)       | `pnpm --filter @dvt/web test:e2e:native -- --spec <path>`                  | `apps/web` local browser proof                       | [`tools/ci/run-web-cypress-native.mjs`](../../tools/ci/run-web-cypress-native.mjs)                     |
| Engine package tests               | `pnpm test:engine`                                                         | `@dvt/engine`                                        | [`package.json`](../../package.json)                                                                   |
| Contracts package tests            | `pnpm test:contracts`                                                      | `@dvt/contracts`                                     | [`package.json`](../../package.json)                                                                   |
| Contracts compile gate             | `pnpm test:contracts:compile`                                              | `@dvt/contracts`                                     | [`package.json`](../../package.json)                                                                   |
| API package tests                  | `pnpm --filter dvt-api test`                                               | `apps/api`                                           | [`apps/api/package.json`](../../apps/api/package.json)                                                 |
| API protected runtime integration  | `pnpm --filter dvt-api test:integration`                                   | `apps/api` OIDC + PostgreSQL runtime                 | [`apps/api/package.json`](../../apps/api/package.json)                                                 |
| PostgreSQL adapter tests           | `pnpm test:adapter-postgres`                                               | `@dvt/adapter-postgres`                              | [`package.json`](../../package.json)                                                                   |
| Temporal adapter unit tests        | `pnpm test:adapter-temporal`                                               | `@dvt/adapter-temporal`                              | [`package.json`](../../package.json)                                                                   |
| Temporal adapter runtime closure   | `pnpm test:adapter-temporal` then `pnpm test:adapter-temporal:integration` | `@dvt/adapter-temporal`                              | [`package.json`](../../package.json)                                                                   |
| Temporal transformation tests      | `pnpm test:adapter-temporal:integration:transformation`                    | Transformation runtime path                          | [`package.json`](../../package.json)                                                                   |
| Temporal Postgres integration      | `pnpm test:adapter-temporal:integration:postgres`                          | Capability-specific PG path                          | [`package.json`](../../package.json)                                                                   |
| Temporal Postgres Docker proof     | `pnpm test:adapter-temporal:integration:postgres:docker`                   | Canonical local Docker PG proof                      | [`package.json`](../../package.json)                                                                   |
| CLI package tests                  | `pnpm test:cli`                                                            | `@dvt/cli`                                           | [`package.json`](../../package.json)                                                                   |
| Delivery package tests             | `pnpm --filter @dvt/delivery test`                                         | `@dvt/delivery`                                      | [`packages/@dvt/delivery/package.json`](../../packages/@dvt/delivery/package.json)                     |
| Outbox worker arch test            | `pnpm --filter dvt-outbox-worker test:arch`                                | `apps/outbox-worker`                                 | [`apps/outbox-worker/package.json`](../../apps/outbox-worker/package.json)                             |
| Temporal time-skipping integration | `pnpm test:adapter-temporal:integration`                                   | Temporal worker/workflow integration                 | [`package.json`](../../package.json)                                                                   |
| Coverage run                       | `pnpm test:coverage`                                                       | Recursive workspace coverage                         | [`package.json`](../../package.json)                                                                   |

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

| Capability                                | Command                                         | Source                                                                                                         |
| ----------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Docs sync                                 | `pnpm docs:sync`                                | [`package.json`](../../package.json)                                                                           |
| Docs sync drift check                     | `pnpm docs:sync:check`                          | [`package.json`](../../package.json)                                                                           |
| Planning generated artifact check         | `pnpm docs:planning:generated:check`            | [`package.json`](../../package.json)                                                                           |
| Planning workboard drift check            | `pnpm docs:workboard:check`                     | [`package.json`](../../package.json)                                                                           |
| Conditional workboard drift check         | `node scripts/docs-workboard-check-changed.cjs` | [`scripts/docs-workboard-check-changed.cjs`](../../scripts/docs-workboard-check-changed.cjs)                   |
| Local docs PR fast preflight              | `pnpm docs:pr:fast`                             | [`package.json`](../../package.json)                                                                           |
| Local docs PR full preflight              | `pnpm docs:pr:full`                             | [`package.json`](../../package.json)                                                                           |
| Deterministic docs PR wrapper             | `pnpm docs:pr:create`                           | [`package.json`](../../package.json)                                                                           |
| Docs quality policy check                 | `pnpm docs:quality:check`                       | [`package.json`](../../package.json)                                                                           |
| Docs doctor                               | `pnpm docs:doctor`                              | [`package.json`](../../package.json)                                                                           |
| Changed Markdown lint                     | `pnpm lint:md:changed`                          | [`package.json`](../../package.json)                                                                           |
| Markdown location policy                  | `pnpm docs:gov:locations`                       | [`package.json`](../../package.json)                                                                           |
| Docs governance manifest generate         | `pnpm docs:gov:manifest`                        | [`package.json`](../../package.json)                                                                           |
| Docs governance manifest drift check      | `pnpm docs:gov:manifest:check`                  | [`package.json`](../../package.json)                                                                           |
| Generated-doc single-writer policy        | `pnpm docs:gov:generated-policy`                | [`package.json`](../../package.json)                                                                           |
| Governed changed-files gate               | `pnpm docs:governance:changed-files:check`      | [`scripts/check-governance-changed-files.cjs`](../../scripts/check-governance-changed-files.cjs)               |
| Governance coverage report drift check    | `pnpm docs:governance:coverage-report:check`    | [`scripts/generate-governance-coverage-report.cjs`](../../scripts/generate-governance-coverage-report.cjs)     |
| Governance remediation queue drift check  | `pnpm docs:governance:remediation-queue:check`  | [`scripts/generate-governance-remediation-queue.cjs`](../../scripts/generate-governance-remediation-queue.cjs) |
| Changed docs filename policy              | `pnpm docs:gov:filenames:changed`               | [`package.json`](../../package.json)                                                                           |
| Changed docs frontmatter policy           | `pnpm docs:gov:frontmatter:changed`             | [`package.json`](../../package.json)                                                                           |
| Canonical path/link check                 | `pnpm docs:canonical:check`                     | [`package.json`](../../package.json)                                                                           |
| Generated code-state drift check          | `pnpm docs:status:check`                        | [`package.json`](../../package.json)                                                                           |
| Generated capability coverage drift check | `pnpm docs:capability:check`                    | [`package.json`](../../package.json)                                                                           |
| Local docs regenerate-and-validate flow   | `pnpm docs:ci`                                  | [`package.json`](../../package.json)                                                                           |

Generated documentation sources:

- code-state report: [`docs/planning/status/generated-code-state.md`](../planning/status/generated-code-state.md)
- capability coverage report: [`docs/planning/status/generated-capability-coverage.md`](../planning/status/generated-capability-coverage.md)
- compact docs governance manifest: [`docs/.manifest.json`](../../docs/.manifest.json)
- generated-doc ownership policy: [`docs/generated-docs-policy.json`](../generated-docs-policy.json)
- governance coverage report: [`docs/planning/status/system-governance-coverage-report-20260502.md`](../planning/status/system-governance-coverage-report-20260502.md)
- governance remediation queue: [`docs/planning/status/system-governance-remediation-queue-20260502.md`](../planning/status/system-governance-remediation-queue-20260502.md)

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
- `pnpm docs:gov:manifest` regenerates the tracked compact docs inventory at `docs/.manifest.json`; use `pnpm exec tsx tools/docs/generate-docs-manifest.ts --full --stdout` for the exhaustive audit catalog.
- `pnpm docs:gov:manifest:check` is the strict drift gate for that tracked docs governance manifest.
- `pnpm docs:gov:generated-policy` validates the generated-doc single-writer registry, including source paths, generator commands, tracked versus untracked posture, and required generated markers.
- `pnpm docs:governance:changed-files:check` compares `GIT_BASE...GIT_HEAD` against the current file index and accepted fingerprint baseline. Added and renamed files must be classified, modified files must carry an updated accepted fingerprint, deleted files must disappear from active indexes, and touched legacy/drift files fail until their governance state is resolved.
- `pnpm docs:governance:coverage-report:check` regenerates the governance coverage report from the file/component indexes and fails if totals, drift, legacy, or subdivision reporting is stale.
- `pnpm docs:governance:remediation-queue:check` regenerates the queue that turns coverage gaps into component-scoped remediation tasks and fails when that actionable plan is stale.
- `pnpm docs:gov` now includes the docs manifest generation step, so the aggregate governance command keeps the tracked manifest current during local-friendly docs validation.
- `pnpm docs:gov` also runs the changed-doc filename and ADR/evidence frontmatter gates, so new or changed docs fail locally on canonical naming and doc-class metadata violations without turning historical warning-only docs into global blockers.
- `pnpm verify:changed` is the fast local pre-push path used by `.husky/pre-push` by default; it stays on changed-file docs, markdown, formatting, and QA-artifact gates without invoking root type-check.
- Changed-file gates use the local changed-file set, not only committed
  `HEAD` diff. That set is the union of the merge-base diff, staged files,
  unstaged tracked files, and untracked non-ignored files. A local pre-push
  pass must therefore not skip just because the active branch has no commit
  ahead of `origin/main`. The component-level API, invariants, transitions,
  consumers, and user stories are documented in
  [Local Changed Files Gate Component](../architecture/components/ci-governance/local-changed-files-gate-component.md).
- `pnpm verify:prepush` uses `node scripts/docs-workboard-check-changed.cjs`, so workboard drift is enforced when lane YAML changed, not for every module-only commit.
- `pnpm verify:prepush` includes `pnpm docs:gov:filenames:changed`, `pnpm docs:gov:frontmatter:changed`, and `pnpm docs:gov:generated-policy` after the changed-only Markdown location gate, keeping changed docs fail-closed for placement, naming, ADR/evidence metadata, and generated-doc ownership before the heavier code checks run.
- `pnpm verify:prepush` is routed through
  [`scripts/verify-prepush.cjs`](../../scripts/verify-prepush.cjs). The router
  gets repository path semantics from
  [`tools/ci/repository-change-scope.mjs`](../../tools/ci/repository-change-scope.mjs)
  instead of owning a parallel path taxonomy. That shared query consumes the
  repository command catalog for `scripts/**`, `tools/ci/**`, `tools/docs/**`,
  `tools/ops/**`, and `.github/scripts/**`, and it also names root CI policy
  inputs such as `.dependency-cruiser.cjs`. The router now runs the changed-file
  lint/format gate before self-tests, governance evidence, traceability, and
  architecture checks so formatting failures fail before expensive validation.
  It then conditionally runs the heavier groups:
  - planning DB inventory checks only for planning/query-store surfaces;
  - global governance maps, fingerprints, coverage, and remediation checks only
    for docs/governance/planning/generated surfaces;
  - `pnpm traceability:adr0` for accepted ADRs, traceability config/baseline
    files, or source paths governed by `traceability.config.json`;
  - architecture dependency and affected type-check checks for code, CI policy,
    command tooling, or root TypeScript graph inputs.
- `pnpm verify:prepush -- --full` forces all conditional groups and is the
  diagnostic equivalent of the historical full local pre-push posture.
- `pnpm pr:closeout` is the governed final PR rail for committed slices. It can
  run docs/status/governance preparation, caller-supplied targeted checks,
  `pnpm commit`, one final `pnpm verify:prepush`, and optional `git push` in the
  repository order. Use `--stage-all` when the full local changed set is the
  intended PR scope; without it, the rail requires files to be staged already
  and fails before commit if preparation or checks leave unstaged outputs.
- `pnpm verify:prepush` now keeps three outcomes for code diffs:
  - skip when no TypeScript-affecting files changed
  - run `pnpm ci:affected:typecheck` when the diff is workspace-scoped
  - run full `pnpm type-check` when root or cross-workspace TypeScript graph inputs changed
- `pnpm verify:prepush` also runs `pnpm arch:deps`, the root
  dependency-cruiser gate for repository architecture dependency boundaries.
- `pnpm --filter @dvt/web test:e2e:native` uses the repository-owned native
  Cypress runner in `tools/ci/run-web-cypress-native.mjs`. The runner builds
  the web app in E2E mode, starts and cleans up the Vite preview process tree,
  forwards Cypress arguments after `--`, and removes `ELECTRON_RUN_AS_NODE`
  from the Cypress child process so Electron does not run as Node.
- GitHub workflows keep using explicit strict checks rather than relying on `pnpm docs:ci` as a merge gate.
- `pnpm traceability:adr0` remains a blocking governance gate, with
  [`.github/workflows/pr-quality-gate.yml`](../../.github/workflows/pr-quality-gate.yml)
  as the single remote workflow owner for PR, push, and explicit manual
  governance runs. The command compares current ADR-0000 issues against the
  tracked baseline in
  [`traceability.issue-baseline.json`](../../traceability.issue-baseline.json)
  so CI fails on regressions rather than re-reporting the known historical
  backlog on every run.

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
  changed-only markdown lint on PRs, and CI tool contract tests. It does not own
  ADR-0000 traceability.
  Source: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
- `Test Suite`: package tests, affected test routing, Turbo-backed root build
  coverage for full-root lanes, coverage, determinism/replay tests.
  Source: [`.github/workflows/test.yml`](../../.github/workflows/test.yml)
- `Contracts & Determinism`: schema validation, determinism scan, contract
  compile, golden validation, hash comparison.
  Source: [`.github/workflows/contracts.yml`](../../.github/workflows/contracts.yml)
- `PR Quality Gate`: docs sync/workboard drift, docs governance parity gates
  from `verify:prepush`, PR metadata checks, and Temporal integration.
  Source: [`.github/workflows/pr-quality-gate.yml`](../../.github/workflows/pr-quality-gate.yml)
- `Dependency Review`: pull-request dependency review with pinned action usage
  and high-severity failure policy.
  Source: [`.github/workflows/dependency-review.yml`](../../.github/workflows/dependency-review.yml)
- `CodeQL`: JavaScript/TypeScript SAST on PRs, pushes to `main`, weekly
  schedule, and manual dispatch.
  Source: [`.github/workflows/codeql.yml`](../../.github/workflows/codeql.yml)
- `Adapter Postgres Integration Nightly`: scheduled adapter-postgres smoke
  coverage with GitHub issue notification on failure.
  Source: [`.github/workflows/adapter-postgres-integration-nightly.yml`](../../.github/workflows/adapter-postgres-integration-nightly.yml)

## Repository Command Catalog

`package.json` is the contributor-facing command registry. CI scope code must
not infer command intent from raw names or broad script paths alone. The
canonical command classifier is
[`tools/ci/repository-command-catalog.mjs`](../../tools/ci/repository-command-catalog.mjs).

The catalog classifies package scripts and script file paths into command
domains such as `runtime-root`, `runtime-package`, `runtime-capability`,
`contracts`, `docs-governance`, `planning-db`, `ci-tooling`, `test-tooling`,
`developer-workflow`, `dev-local`, and `release-ops`.

New package scripts that invoke `scripts/**`, `tools/ci/**`, `tools/docs/**`,
`.github/scripts/**`, or `tools/ops/**` must have a non-`unknown` catalog
classification before they are merged. Unknown classifications fail closed in
tests and are treated as runtime-fanout sensitive by CI scope code.

For root `package.json` changes, CI reads the base and head package blobs on
pull requests. Scripts-only governance and planning DB aliases can keep the
workspace matrix, runtime package tests, adapter-postgres integration,
contracts, determinism, golden, and coverage lanes closed, while
`changed_file_validation_relevant` still keeps changed-file lint/format checks
active. Dependency, lifecycle, unknown, and runtime-capability script changes
remain fail-closed and root-build sensitive.

- `pnpm test:web:changed` is the local web changed-file router. It reads
  changed files or explicit `--files` arguments, runs `@dvt/web` dependency
  preparation once, and delegates to the routed Vitest suite command from the
  web suite catalog. It is not the GitHub merge gate; CI keeps using
  `pnpm test:web:ci`.
- Canvas has narrower local focus lanes for changed-file routing:
  `test:canvas-unit`, `test:canvas-presentation`, and
  `test:canvas-architecture`. The broad `test:canvas` command remains available
  for full Canvas focus validation.

## Shared CI Scope Logic

The repository centralizes workflow scope detection in:

- [`tools/ci/scope-config.mjs`](../../tools/ci/scope-config.mjs)
- [`tools/ci/emit-workspace-matrix.mjs`](../../tools/ci/emit-workspace-matrix.mjs)
- [`tools/ci/emit-scope.mjs`](../../tools/ci/emit-scope.mjs)

These files are the canonical source of truth for:

- affected workspace detection
- package test scope detection in [`.github/workflows/test.yml`](../../.github/workflows/test.yml)
- adapter-postgres, contracts, determinism, and coverage scope detection
- Temporal integration scope detection

The engine coverage scope is documented as the
[Engine Coverage Scope Gate Component](../architecture/components/ci-governance/engine-coverage-scope-gate-component.md).
For pull requests, `coverage_relevant` is true for the governed engine
workspace scope, including package-level configuration such as
`packages/@dvt/engine/vitest.config.ts`. It also remains true for contracts,
root test configuration, lockfiles, and Test Suite workflow changes that can
affect threshold enforcement. Unrelated docs-only changes can keep the coverage
job closed.

Current workflow consumers:

- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) uses the shared policy plus
  workspace matrix emission for affected build/type-check routing, and now also
  runs `pnpm test:ci-tools` as a merge-gated CI-tool contract lane. Its shared
  `any_code` and `workspace_global` policy now include `turbo.json`, so Turbo
  graph changes trigger the affected-workspace lane instead of falling through
  to `No affected workspaces`.
- [`.github/workflows/test.yml`](../../.github/workflows/test.yml) uses `emit-scope --mode test`
  for PR test routing across the web app, workers, and library workspaces. Its
  push/manual full-suite lane and PR `root_build_sensitive` fast-path both run
  `pnpm build`, so the merge gate exercises the same Turbo-backed root build
  path that local root builds now use. Non-root PR affected dependency builds
  use `node scripts/run-turbo-workspace-task.cjs build` with the PR base filter,
  avoiding a manually maintained package-to-build map. The shared
  `root_build_sensitive` scope includes root build graph inputs and runtime
  orchestration helpers, so PRs that change the Turbo graph or its
  orchestration helper cannot skip `Test Suite`. Adapter-postgres integration,
  determinism/replay, and engine coverage also consume `emit-scope --mode test`
  outputs instead of local `dorny/paths-filter` package-root rules. Engine
  coverage uses the same governed `packages/@dvt/engine/**` package boundary as
  engine package test routing, so engine Vitest config changes cannot bypass
  threshold enforcement. For web PRs, the affected-package step runs
  `pnpm test:web:ci`, which expands to `@dvt/web` `test:deps` followed by the
  unit, presentation, and architecture Vitest delegates while `pnpm test:web`
  remains the full web suite. Public web suite commands also run `test:deps`
  before their raw `*:run` delegates so local split-suite execution preserves
  the package dependency-build contract. The web architecture suite checks that
  these package scripts, Vitest config delegates, and workflow command stay aligned with
  `apps/web/vitest.suites.ts`.
- [`.github/workflows/contracts.yml`](../../.github/workflows/contracts.yml) uses
  `emit-scope --mode contracts` for contract, determinism, and golden routing.
  The workflow no longer owns parallel inline `package.json` filters for those
  lanes.
- [`.github/workflows/pr-quality-gate.yml`](../../.github/workflows/pr-quality-gate.yml) uses the
  same shared scope surfaces for workflow/global change routing and Temporal capability lanes.
  It also runs the merge-blocking governance subset from `pnpm verify:prepush`
  on PRs and pushes: changed-doc filename/frontmatter checks when docs changed,
  governance unit coverage, document-unit map, file fingerprints,
  ADR-0000 traceability, feature-mechanization manifests, implementation
  mechanization, and QA artifact validation. It also runs `pnpm arch:deps` so
  package/app dependency-boundary drift fails remotely, not only on local
  prepush.

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
- `pnpm run hooks:precommit` still runs `lint-staged` for every commit, but the
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
- `pnpm arch:deps` is the root architecture dependency guard for package and
  app boundaries. It runs dependency-cruiser plus repository semantic ownership
  checks. It forbids contract-to-runtime imports, planner-to-engine/adapter
  imports, engine-to-adapter imports, adapter-owned canonical/versioned
  contract definitions, adapter contract internals, web-to-backend-adapter
  imports, presentation-to-infrastructure imports, domain-to-framework/runtime
  imports, DVT package cycles, app/runtime-source cross-package deep imports
  outside public API surfaces, and runtime package imports from repository
  scripts/tools.
- `Test Suite` now uses the same Turbo workspace wrapper for non-root PR
  affected dependency builds. Root-config PRs still use `pnpm build` to exercise
  the full root graph.
- Dependency review and CodeQL workflows provide the current dependency/SAST
  baseline. The manual docs deploy workflow pins the Zensical package version
  used to build the site, and the label-bootstrap workflow uses a SHA-pinned
  `actions/github-script` reference like the other active workflows. Remote
  Turbo cache is still not configured because it requires repository secret
  ownership for `TURBO_TOKEN` and `TURBO_TEAM`.
- Current branch-protection status checks are repository settings, not tracked
  YAML. Verify in GitHub settings that `CI - Code Quality`, `Test Suite`,
  `PR Quality Gate`, `Contracts & Determinism`, `Dependency Review`, and
  `CodeQL` are required before treating these workflows as a merge guarantee.
- For slices that change code, config, tests, CI, or docs, include
  `pnpm verify:prepush` in the end-of-task validation baseline before claiming
  the work is ready.
