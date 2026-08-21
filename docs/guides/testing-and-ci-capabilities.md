---
title: Testing and CI Capabilities
status: Active
owner: engineering
last_reviewed: 2026-05-20
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

| Capability                       | Command                                | Source                                                                                                                                                                                             |
| -------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full workspace build             | `pnpm build`                           | [`package.json`](../../package.json)                                                                                                                                                               |
| Full recursive test run          | `pnpm test`                            | [`package.json`](../../package.json)                                                                                                                                                               |
| Web PR CI test partition         | `pnpm test:web:ci`                     | [`package.json`](../../package.json), [`apps/web/vitest.suites.ts`](../../apps/web/vitest.suites.ts)                                                                                               |
| Web changed-file test routing    | `pnpm test:web:changed`                | [`package.json`](../../package.json), [`apps/web/vitest.suites.ts`](../../apps/web/vitest.suites.ts)                                                                                               |
| Web E2E test run                 | `pnpm test:web:e2e`                    | [`package.json`](../../package.json)                                                                                                                                                               |
| Full type-check gate             | `pnpm type-check`                      | [`package.json`](../../package.json)                                                                                                                                                               |
| Fast pre-push changed gate       | `pnpm verify:changed`                  | [`package.json`](../../package.json)                                                                                                                                                               |
| Pre-push verification gate       | `pnpm verify:prepush`                  | [`package.json`](../../package.json)                                                                                                                                                               |
| Affected local PR preflight      | `pnpm preflight:affected`              | [`package.json`](../../package.json), [`turbo.json`](../../turbo.json)                                                                                                                             |
| Affected CI preflight            | `pnpm preflight:affected:ci`           | [`package.json`](../../package.json), [`turbo.json`](../../turbo.json), [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)                                                               |
| Full CI baseline                 | `pnpm ci:full`                         | [`package.json`](../../package.json)                                                                                                                                                               |
| Planning DB current-schema tests | `pnpm test:planning:db:current-schema` | [`package.json`](../../package.json), [`scripts/planning-db-schema.test.cjs`](../../scripts/planning-db-schema.test.cjs)                                                                           |
| Changed-files auto-fix           | `pnpm fix:changed`                     | [`package.json`](../../package.json)                                                                                                                                                               |
| Post-Git Prettier auto-format    | `pnpm postgit:format`                  | [`scripts/format-git-operation-changes.cjs`](../../scripts/format-git-operation-changes.cjs), [`.husky/post-merge`](../../.husky/post-merge), [`.husky/post-checkout`](../../.husky/post-checkout) |
| AI local preflight               | `pnpm ai:preflight`                    | [`scripts/ai-preflight.cjs`](../../scripts/ai-preflight.cjs)                                                                                                                                       |
| Changed-files lint/format gate   | `node scripts/check-changed.cjs`       | [`scripts/check-changed.cjs`](../../scripts/check-changed.cjs)                                                                                                                                     |
| PR closeout rail                 | `pnpm pr:closeout`                     | [`scripts/pr-closeout.cjs`](../../scripts/pr-closeout.cjs)                                                                                                                                         |
| Immediate PR check gate          | `pnpm pr:checks`                       | [`tools/ci/pr-check-triage.mjs`](../../tools/ci/pr-check-triage.mjs)                                                                                                                               |
| CI tool contract suite           | `pnpm test:ci-tools`                   | [`package.json`](../../package.json)                                                                                                                                                               |
| Affected workspace build         | `pnpm ci:affected:build`               | [`package.json`](../../package.json)                                                                                                                                                               |
| Affected workspace lint          | `pnpm ci:affected:lint`                | [`package.json`](../../package.json)                                                                                                                                                               |
| Affected workspace test          | `pnpm ci:affected:test`                | [`package.json`](../../package.json)                                                                                                                                                               |
| Affected workspace type-check    | `pnpm ci:affected:typecheck`           | [`package.json`](../../package.json)                                                                                                                                                               |
| ADR-0000 regression gate         | `pnpm traceability:adr0`               | [`package.json`](../../package.json), [`traceability.config.json`](../../traceability.config.json)                                                                                                 |

Warm-build note:

- On an already-built worktree, a local warm recursive rebuild can use
  a shell-scoped one-shot form such as `env DVT_CI=1 pnpm -r build`
  on POSIX or `cmd /c "set DVT_CI=1&& pnpm -r build"` from PowerShell.
  See the guardrail note in the `Notes` section below; this is not the
  fresh-worktree default path.
- Root `pnpm build` is now a Turborepo-backed build graph, and the affected
  workspace commands (`pnpm ci:affected:build`, `pnpm ci:affected:lint`,
  `pnpm ci:affected:typecheck`, `pnpm ci:affected:test`) now route through
  governed Turbo task contracts.
  Full-root `pnpm test`, root `pnpm type-check`, and docs commands still keep
  their existing repo-local orchestration. The `ci:code` baseline uses
  `turbo run test` because CI sets `DVT_CI=1`, so package lifecycle hooks skip
  redundant dependency builds and Turbo must own the upstream build graph.
- The shared GitHub Actions setup now restores `.turbo` in addition to the
  pnpm store and `node_modules`, so the existing root Turbo `build` path can
  reuse prior task outputs across CI runs.
- `CI - Code Quality` and `Test Suite` do not expose `TURBO_TOKEN` or
  `TURBO_TEAM` at workflow scope. Remote Turbo cache credentials are scoped to
  trusted non-PR invocations of the governed Turbo build paths; pull-request
  runs keep package scripts on local task execution plus the restored `.turbo`
  cache.
- The shared GitHub Actions setup defaults to
  `pnpm install --frozen-lockfile --prefer-offline`, so jobs prefer the restored
  pnpm store while keeping lockfile enforcement.
- Turbo task contracts explicitly declare `DVT_CI` for `build`, `lint`,
  `typecheck`, and `test`, so CI-only guard behavior is visible to Turborepo
  hashing and task environment handling.
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

## Package Validation Commands

The Web CI primary suites run with one isolated fork at a time. Each test file
gets a fresh fork so completed processes release module and DOM memory while
the governed suite coverage remains unchanged. Do not enable `singleFork`: it
disables this isolation and can exhaust the 4 GB worker limit.

| Capability                         | Command                                                                    | Scope                                                | Source                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Web app tests                      | `pnpm test:web` or `pnpm --filter @dvt/web test`                           | `apps/web` primary-suite composition                 | [`apps/web/package.json`](../../apps/web/package.json)                                                 |
| Web app CI partition               | `pnpm test:web:ci` or `pnpm --filter @dvt/web test:ci`                     | `apps/web` primary Vitest suites                     | [`apps/web/vitest.suites.ts`](../../apps/web/vitest.suites.ts)                                         |
| Web app changed-file test routing  | `pnpm test:web:changed` or `pnpm --filter @dvt/web test:changed`           | Routed web Vitest suite for local and ordinary PRs   | [`apps/web/vitest.suites.ts`](../../apps/web/vitest.suites.ts)                                         |
| Web app lint                       | `pnpm --filter @dvt/web lint`                                              | Web `src`, Cypress, local configs, and local scripts | [`apps/web/package.json`](../../apps/web/package.json)                                                 |
| Web app unit tests                 | `pnpm --filter @dvt/web test:unit`                                         | `*.test.ts`, excluding architecture                  | [`apps/web/vitest.unit.config.ts`](../../apps/web/vitest.unit.config.ts)                               |
| Web app presentation tests         | `pnpm --filter @dvt/web test:presentation`                                 | `*.test.tsx`, excluding architecture                 | [`apps/web/vitest.presentation.config.ts`](../../apps/web/vitest.presentation.config.ts)               |
| Web app architecture tests         | `pnpm --filter @dvt/web test:architecture`                                 | `*.architecture.test.{ts,tsx}`                       | [`apps/web/vitest.architecture.config.ts`](../../apps/web/vitest.architecture.config.ts)               |
| Web app Canvas focus tests         | `pnpm --filter @dvt/web test:canvas`                                       | Canvas route and `views/canvas/**`                   | [`apps/web/vitest.canvas.config.ts`](../../apps/web/vitest.canvas.config.ts)                           |
| Web app Canvas unit focus tests    | `pnpm --filter @dvt/web test:canvas-unit`                                  | Canvas non-architecture `.ts` tests                  | [`apps/web/vitest.canvas-unit.config.ts`](../../apps/web/vitest.canvas-unit.config.ts)                 |
| Web app Canvas UI focus tests      | `pnpm --filter @dvt/web test:canvas-presentation`                          | Canvas non-architecture `.tsx` tests                 | [`apps/web/vitest.canvas-presentation.config.ts`](../../apps/web/vitest.canvas-presentation.config.ts) |
| Web app Canvas architecture focus  | `pnpm --filter @dvt/web test:canvas-architecture`                          | Canvas architecture tests                            | [`apps/web/vitest.canvas-architecture.config.ts`](../../apps/web/vitest.canvas-architecture.config.ts) |
| Web app Monaco focus tests         | `pnpm --filter @dvt/web test:monaco`                                       | Code/Artifacts/Diff Monaco route surfaces            | [`apps/web/vitest.monaco.config.ts`](../../apps/web/vitest.monaco.config.ts)                           |
| Web app shell/session focus tests  | `pnpm --filter @dvt/web test:shell-session`                                | App shell, session, scope, and composition surfaces  | [`apps/web/vitest.shell-session.config.ts`](../../apps/web/vitest.shell-session.config.ts)             |
| Web app E2E (Cypress)              | `pnpm --filter @dvt/web test:e2e`                                          | `apps/web` browser runtime contract                  | [`apps/web/package.json`](../../apps/web/package.json)                                                 |
| Web app E2E native (Cypress)       | `pnpm --filter @dvt/web test:e2e:native -- --spec <path>`                  | `apps/web` local browser proof                       | [`tools/ci/run-web-cypress-native.mjs`](../../tools/ci/run-web-cypress-native.mjs)                     |
| Engine package tests               | `pnpm test:engine`                                                         | `@dvt/engine`                                        | [`package.json`](../../package.json)                                                                   |
| Contracts package tests            | `pnpm test:contracts`                                                      | `@dvt/contracts`                                     | [`package.json`](../../package.json)                                                                   |
| Contracts compile gate             | `pnpm test:contracts:compile`                                              | `@dvt/contracts`                                     | [`package.json`](../../package.json)                                                                   |
| API package tests                  | `pnpm --filter dvt-api test`                                               | `apps/api`                                           | [`apps/api/package.json`](../../apps/api/package.json)                                                 |
| API package CI tests               | `pnpm --filter dvt-api test:ci`                                            | `apps/api` after CI dependency graph build           | [`apps/api/package.json`](../../apps/api/package.json)                                                 |
| API package lint                   | `pnpm --filter dvt-api lint`                                               | `apps/api` TypeScript sources, tests, and configs    | [`apps/api/package.json`](../../apps/api/package.json)                                                 |
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

| Capability                                | Command                                        | Source                                                                                                         |
| ----------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Docs sync                                 | `pnpm docs:sync`                               | [`package.json`](../../package.json)                                                                           |
| Docs sync drift check                     | `pnpm docs:sync:check`                         | [`package.json`](../../package.json)                                                                           |
| Local docs PR fast preflight              | `pnpm docs:pr:fast`                            | [`package.json`](../../package.json)                                                                           |
| Local docs PR full preflight              | `pnpm docs:pr:full`                            | [`package.json`](../../package.json)                                                                           |
| Deterministic docs PR wrapper             | `pnpm docs:pr:create`                          | [`package.json`](../../package.json)                                                                           |
| Docs quality policy check                 | `pnpm docs:quality:check`                      | [`package.json`](../../package.json)                                                                           |
| Docs doctor                               | `pnpm docs:doctor`                             | [`package.json`](../../package.json)                                                                           |
| Changed Markdown lint                     | `pnpm lint:md:changed`                         | [`package.json`](../../package.json)                                                                           |
| Markdown location policy                  | `pnpm docs:gov:locations`                      | [`package.json`](../../package.json)                                                                           |
| Docs governance manifest generate         | `pnpm docs:gov:manifest`                       | [`package.json`](../../package.json)                                                                           |
| Docs governance manifest drift check      | `pnpm docs:gov:manifest:check`                 | [`package.json`](../../package.json)                                                                           |
| Generated-doc single-writer policy        | `pnpm docs:gov:generated-policy`               | [`package.json`](../../package.json)                                                                           |
| Governed changed-files gate               | `pnpm docs:governance:changed-files:check`     | [`scripts/check-governance-changed-files.cjs`](../../scripts/check-governance-changed-files.cjs)               |
| Governance coverage report drift check    | `pnpm docs:governance:coverage-report:check`   | [`scripts/generate-governance-coverage-report.cjs`](../../scripts/generate-governance-coverage-report.cjs)     |
| Governance remediation queue drift check  | `pnpm docs:governance:remediation-queue:check` | [`scripts/generate-governance-remediation-queue.cjs`](../../scripts/generate-governance-remediation-queue.cjs) |
| Changed docs filename policy              | `pnpm docs:gov:filenames:changed`              | [`package.json`](../../package.json)                                                                           |
| Changed docs frontmatter policy           | `pnpm docs:gov:frontmatter:changed`            | [`package.json`](../../package.json)                                                                           |
| Canonical path/link check                 | `pnpm docs:canonical:check`                    | [`package.json`](../../package.json)                                                                           |
| Generated code-state drift check          | `pnpm docs:status:check`                       | [`package.json`](../../package.json)                                                                           |
| Generated capability coverage drift check | `pnpm docs:capability:check`                   | [`package.json`](../../package.json)                                                                           |
| Local docs regenerate-and-validate flow   | `pnpm docs:ci`                                 | [`package.json`](../../package.json)                                                                           |

Published generated documentation routes:

- code-state report: [`planning/status/generated-code-state.md`](../planning/status/generated-code-state.md), assembled on demand from `.generated-docs/`
- knowledge-intake literature: [`planning/status/generated-knowledge-intake-literature.md`](../planning/status/generated-knowledge-intake-literature.md), assembled on demand from Planning DB
- DB surface inventory: [`planning/status/db-surface-inventory.md`](../planning/status/db-surface-inventory.md), assembled on demand from Planning DB
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
- `pnpm docs:status:check` proves the DB-free local code-state generator;
  `pnpm docs:capability:check` remains the tracked capability drift gate.
- `pnpm docs:publish` is the explicit DB-backed publication operation;
  `docs:serve` and `docs:build` validate and consume its untracked output.
- `pnpm docs:gov:manifest` regenerates the tracked compact docs inventory at `docs/.manifest.json`; use `pnpm exec tsx tools/docs/generate-docs-manifest.ts --full --stdout` for the exhaustive audit catalog.
- `pnpm docs:gov:manifest:check` is the strict drift gate for that tracked docs governance manifest.
- `pnpm docs:gov:generated-policy` validates the generated-doc single-writer registry, including source paths, generator commands, tracked versus untracked posture, and required generated markers.
- `pnpm docs:governance:changed-files:check` compares `GIT_BASE...GIT_HEAD`
  against the current file index and accepted fingerprint baseline, falling
  back to a direct tree diff only when shallow PR merge refs cannot provide a
  local merge base. Added and renamed files must be classified, modified files
  must carry an updated accepted fingerprint, deleted files must disappear from
  active indexes, and touched legacy/drift files fail until their governance
  state is resolved.
- `pnpm docs:governance:coverage-report:check` regenerates the governance coverage report from the file/component indexes and fails if totals, drift, legacy, or subdivision reporting is stale.
- `pnpm docs:governance:remediation-queue:check` regenerates the queue that turns coverage gaps into component-scoped remediation tasks and fails when that actionable plan is stale.
- `pnpm docs:gov` now includes the docs manifest generation step, so the aggregate governance command keeps the tracked manifest current during local-friendly docs validation.
- `pnpm docs:gov` also runs the changed-doc filename and ADR/evidence frontmatter gates, so new or changed docs fail locally on canonical naming and doc-class metadata violations without turning historical warning-only docs into global blockers.
- `pnpm verify:changed` is the fast changed-slice gate. It stays on
  changed-file docs, markdown, formatting, QA-artifact, and focused
  adjacent-script gates without invoking root type-check or the full planning
  DB suite for every planning workflow script edit.
- Developer workflow verifier edits are routed to the narrow self-test for the
  touched verifier. `scripts/verify-changed.*` runs
  `scripts/verify-changed.test.cjs`, `scripts/verify-prepush.*` runs
  `scripts/verify-prepush.test.cjs`, and the shared
  `scripts/local-validation-plan.cjs` contract still runs both suites.
- CI tooling edits under `tools/ci/*.mjs` and changed `tools/ci/*.test.mjs`
  route to direct adjacent `node --test` suites when that test file exists.
  The full `pnpm test:ci-tools` contract remains a broader merge/CI-tooling
  audit, not the default local proof for a one-file AI iteration.
- Governance coverage/remediation report generator edits are routed to their
  exact `node --test scripts/generate-governance-*.test.cjs` suites. That keeps
  AI iteration on report rendering and DB-source normalization under the
  adjacent generator contract instead of escalating to the full planning DB
  suite unless the current schema, DB rails, or shared query-store surfaces changed.
- Planning DB schema edits under `tools/planning-db/schema.sql` route through
  `pnpm test:planning:db:current-schema`, which exercises the declarative schema,
  DB-authority boundary, and no-history policy without running the full
  `pnpm test:planning:db` package. When the same slice already changes an adjacent
  current-schema test, the changed-file verifier runs that direct suite once and
  does not add the wrapper command again.
- Command/query rail catalog inspection is DB-first. After governance import,
  `pnpm planning:db:query command-query-rails` reads
  `planning_query_store.command_query_rail_query`; use `--gaps true` for rails
  without implementation refs or explicit missing status, and
  `--duplicates true` for duplicate rail names by type. The import keeps
  manifest symbol refs, source-code refs, governance `cqRails` refs, and
  documentation refs separate; documentation refs help discovery but do not
  satisfy implementation gaps. Before an AI agent creates a new externally
  observable behavior, `pnpm planning:db:query creation-intent --intent "<creation intent>"`
  provides the DB-first preflight for existing rail reuse or
  register-before-creating guidance. Example AI pre-create checks:

  ```bash
  pnpm planning:db:query creation-intent --intent "create a run status query" --limit 5
  pnpm planning:db:query creation-intent --intent "create a governance component command" --type command --limit 5
  ```

  The first output column is the action: `reuse-existing-rail`,
  `complete-existing-rail-before-creating`,
  `resolve-duplicate-before-creating`, or
  `register-new-rail-before-creating`.

- Frontend screen/capability inspection is DB-first. After governance import,
  `pnpm planning:db:query frontend-surfaces` reads the governed frontend
  mechanical truth inventory and distinguishes route existence from product
  closure. Use this before creating or claiming frontend behavior:

  ```bash
  pnpm planning:db:query frontend-surfaces --path /runs --limit 10
  pnpm planning:db:query frontend-surfaces --state preview --limit 20
  pnpm planning:db:query frontend-surfaces --kind route --state operational-product --limit 20
  ```

  The output columns are kind, route path, surface id, screen state, owner,
  plugin count, endpoint count, Zustand store count, TanStack query count, gap
  count, and source document. The screen state vocabulary is
  `operational-product`, `preview`, `disabled-unsupported`, and
  `experimental`.

- Frontend component reflection is DB-first and intentionally separate from
  web runtime validation. After governance import,
  `pnpm planning:db:query frontend-components` reads the component-to-surface
  inventory, while the file and rail views answer narrower questions without
  scanning Markdown or running Vitest:

  ```bash
  pnpm planning:db:query frontend-components --surface web.canvas.graph --limit 20
  pnpm planning:db:query frontend-component-files --component web.component.canvas.CanvasToolbar
  pnpm planning:db:query frontend-component-rails --status gap-needed --limit 20
  ```

  Changes to `scripts/planning-db/frontend-component-inventory.cjs` route to
  `node --test scripts/planning-db-frontend-component-inventory.test.cjs`
  through `pnpm verify:changed`. That keeps component-inventory iterations on
  Node planning DB contracts unless the slice also changes runtime web files,
  shared planning DB infrastructure, or migrations that require the broader DB
  suite.

- Planning/governance DB test-file edits under
  `scripts/planning-db-*.test.cjs`, `scripts/governance-db-*.test.cjs`, and
  the generated planning DB report tests route to the changed `node --test`
  file directly. Shared DB implementation surfaces under `infra/planning-db/`,
  `tools/planning-db/knowledge/`, and `tools/governance-db/` keep the full
  `pnpm test:planning:db` route.
- Changed-file gates use the local changed-file set, not only committed
  `HEAD` diff. That set is the union of the merge-base diff, staged files,
  unstaged tracked files, and untracked non-ignored files. A local pre-push
  pass must therefore not skip just because the active branch has no commit
  ahead of `origin/main`. The component-level API, invariants, transitions,
  consumers, and user stories are documented in
  [Local Changed Files Gate Component](../architecture/components/ci-governance/local-changed-files-gate-component.md).
- `pnpm verify:prepush` uses `node scripts/docs-workboard-check-changed.cjs`, so workboard drift is enforced when lane YAML changed, not for every module-only commit.
- `pnpm verify:prepush` is mechanical by default. It runs changed-file docs, markdown, formatting, ARC evidence, QA artifact, feature mechanization implementation, and forbidden-file checks without root type-check, architecture dependency checks, global governance maps, or verifier self-tests.
- `.husky/pre-push` routes through `pnpm verify:prepush -- --hook` by default
  and `pnpm verify:prepush -- --full --hook` when `DVT_PREPUSH_STRICT=1`.
  A successful manual `pnpm verify:prepush` writes a local `.git` validation
  stamp for the current `HEAD`, changed-file set, and local diff fingerprint;
  the hook skips only when that exact state already passed an equivalent or
  stronger gate. If any file content, staged state, untracked file, base ref,
  or `HEAD` changes, the hook runs normally.
- `pnpm verify:prepush` is routed through
  [`scripts/verify-prepush.cjs`](../../scripts/verify-prepush.cjs). The router
  gets repository path semantics from
  [`tools/ci/repository-change-scope.mjs`](../../tools/ci/repository-change-scope.mjs)
  instead of owning a parallel path taxonomy. That shared query consumes the
  repository command catalog for `scripts/**`, `tools/ci/**`, `tools/docs/**`,
  `tools/ops/**`, `.github/scripts/**`, and `.github/actions/**`, and it also
  names root CI policy inputs such as `.dependency-cruiser.cjs`. The default router keeps local
  pre-push focused on mechanical changed-file checks. `--full` restores the
  heavier closeout groups:
  - planning DB inventory checks only for planning/query-store surfaces;
  - global governance maps, fingerprints, coverage, and remediation checks only
    for docs/governance/planning/generated surfaces;
  - `pnpm traceability:adr0` for accepted ADRs, traceability config/baseline
    files, or source paths governed by `traceability.config.json`;
  - architecture dependency and affected type-check checks for code, CI policy,
    command tooling, or root TypeScript graph inputs.
- `PR Quality Gate` consumes the same repository validation scope outputs from
  [`tools/ci/scope-config.mjs`](../../tools/ci/scope-config.mjs). On pull
  requests, global governance maps/fingerprints, ADR-0000 traceability,
  feature-mechanization checks, QA artifact validation, and `pnpm arch:deps`
  are routed by the same semantic signals instead of running as a fixed tax on
  unrelated changes. Pushes to `main` and explicit manual full gates keep the
  historical full posture.
- `pnpm verify:prepush -- --full` forces all conditional groups and is the
  diagnostic/closeout equivalent of the historical full local pre-push posture.
- `pnpm pr:closeout` is the governed final PR rail for committed slices. It can
  run docs/status/governance preparation, caller-supplied targeted checks,
  `pnpm commit`, one final `pnpm verify:prepush -- --full`, and optional `git push` in the
  repository order. Use `--stage-all` when the full local changed set is the
  intended PR scope; without it, the rail requires files to be staged already
  and fails before commit if preparation or checks leave unstaged outputs.
- `pnpm pr:checks` is the immediate PR check gate. It queries the current
  branch PR once, prints a compact failed/pending summary, returns non-zero for
  failed or still-pending GitHub Actions checks, and does not watch or poll.
  Use `pnpm pr:checks:json` when machine-readable output is needed. Use
  `pnpm pr:checks:first-failure` for an actionable first-failure payload; when
  GitHub Actions never exposes logs for the failed job, the payload reports
  `unstarted_actions_failure` so agents can treat it as external CI
  infrastructure rather than repeating local validation.
- `pnpm ai:preflight` is the AI-facing local preflight. It runs
  `pnpm fix:changed` once, then `pnpm verify:prepush`. Use
  `pnpm ai:preflight -- --full` to preserve the same autofix-first ordering
  before full pre-push validation. This is the preferred local route for agents
  after edits because format-only drift is fixed before the validation stamp is
  written.
- Workspace VS Code settings are tracked under `.vscode/` and make Prettier the
  default formatter on save with `prettier.requireConfig` enabled. They also
  run ESLint code actions on save for TypeScript, TSX, JavaScript, and JSX so
  local editors catch and fix most format/lint drift before a validation gate
  runs. The `test:ai-preflight` contract checks those settings so save-time
  formatting and lint-fix behavior remain part of the repository automation
  posture.
- Git `post-merge` and branch-level `post-checkout` hooks run
  `pnpm postgit:format` over the explicit Git ref range, so files that enter
  through `git pull`, merge, or branch switch are Prettier-normalized even
  though VS Code save hooks did not fire. Set `DVT_SKIP_POST_GIT_FORMAT=1` to
  disable that local hook for one operation.
- `pnpm verify:prepush -- --full` keeps three outcomes for code diffs:
  - skip when no TypeScript-affecting files changed
  - run `pnpm ci:affected:typecheck` when the diff is workspace-scoped
  - run full `pnpm type-check` when root or cross-workspace TypeScript graph inputs changed
- `pnpm verify:prepush -- --full` also runs `pnpm arch:deps`, the root
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

## GitHub Workflow Coverage

- `CI - Code Quality`: ordinary pull requests run changed-slice verification
  through `pnpm verify:changed` and affected build/lint/type-check preflight
  through `pnpm preflight:affected:ci`; pushes to `main` and manual runs use
  `pnpm ci:full`. CI tool contract tests remain separate. It does not own
  ADR-0000 traceability or package test execution.
  Source: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
- `Test Suite`: package tests, affected test routing, Turbo-backed root build
  coverage for full-root lanes, coverage, determinism/replay tests. On pull
  requests, the heavy dedicated lanes consume one detector job and are skipped
  at job level when their semantic scope is false.
  Source: [`.github/workflows/test.yml`](../../.github/workflows/test.yml)
- `Contracts & Determinism`: schema validation, determinism scan, contract
  compile, golden validation, hash comparison. Draft PRs keep the detector
  closed; `ready_for_review` reopens the detector before merge, and
  `converted_to_draft` re-evaluates the draft guard so in-flight ready-PR runs
  are cancelled and replaced by a skipped draft posture.
  Source: [`.github/workflows/contracts.yml`](../../.github/workflows/contracts.yml)
- `PR Quality Gate`: PR metadata checks, ARC evidence checks, changed-only
  docs governance checks for ordinary pull requests, and Temporal integration.
  Global docs quality, doctor, location, and canonical checks are reserved for
  push/manual full posture. Draft PRs keep the gate closed;
  `ready_for_review` reopens it for merge-gate validation, and
  `converted_to_draft` re-evaluates the draft guard. ARC and ARC-doc
  changed-file checks prefer merge-base diff semantics and fall back to direct
  tree diff only when a shallow PR merge checkout cannot provide a local merge
  base.
  Source: [`.github/workflows/pr-quality-gate.yml`](../../.github/workflows/pr-quality-gate.yml)
- `Dependency Review`: pull-request dependency review with pinned action usage
  and high-severity failure policy. It runs for public repositories and for
  private repositories that set the repository variable
  `GH_ADVANCED_SECURITY_ENABLED=true`; GitHub dependency review otherwise fails
  before evaluating the dependency diff when Dependency graph/GitHub Advanced
  Security is unavailable. Draft PRs stay closed; `ready_for_review` reopens
  the security gate, and `converted_to_draft` closes it again for draft PRs.
  Source: [`.github/workflows/dependency-review.yml`](../../.github/workflows/dependency-review.yml)
- `CodeQL`: JavaScript/TypeScript SAST on pushes to `main`, weekly schedule,
  manual dispatch, and pull requests with security-analysis-relevant changes.
  The PR detector opens the heavy analysis lane for code, dependency manifests,
  workflows, actions, scripts, tools, and root configuration; it keeps docs-only
  and `buzon/**` analysis-only pull requests on the local/docs gates without
  running the full CodeQL job. It runs for public repositories and for private
  repositories that set the repository variable
  `GH_ADVANCED_SECURITY_ENABLED=true`; CodeQL otherwise fails during SARIF
  upload when code scanning/GitHub Advanced Security is unavailable. Draft PRs
  stay closed; `ready_for_review` reopens the SAST gate, and
  `converted_to_draft` closes it again for draft PRs.
  Source: [`.github/workflows/codeql.yml`](../../.github/workflows/codeql.yml)
- `Adapter Postgres Integration Nightly`: scheduled adapter-postgres smoke
  coverage with GitHub issue notification on failure. Its dependency graph
  build uses the same governed Turbo wrapper as PR test lanes.
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

- `pnpm test:web:changed` is the web changed-file router. It reads changed
  files or explicit `--files` arguments, runs `@dvt/web` dependency
  preparation once, and delegates to the routed Vitest suite command from the
  web suite catalog. Local users and ordinary web pull requests use this route.
  Pushes to `main`, manual workflow runs, and root-build-sensitive pull
  requests keep using `pnpm test:web:ci`.
- Canvas has narrower local focus lanes for changed-file routing:
  `test:canvas-unit`, `test:canvas-presentation`, and
  `test:canvas-architecture`. The broad `test:canvas` command remains available
  for full Canvas focus validation.
- Shell/session/context changes route to `test:shell-session` before the broad
  unit or presentation lanes.

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

Pull-request scope-diff consumers use shallow checkout (`fetch-depth: 1`) and
then the shared [`fetch-scope-base`](../../.github/actions/fetch-scope-base/action.yml)
action to fetch only the base branch ref needed for `origin/<base>...HEAD` or
`origin/<base>` comparisons. This keeps GitHub as the authoritative merge gate
while avoiding full-history checkout before scope detectors and changed-file
gates decide whether heavier lanes apply.

The engine coverage scope is documented as the
[Engine Coverage Scope Gate Component](../architecture/components/ci-governance/engine-coverage-scope-gate-component.md).
For pull requests, `coverage_relevant` is true for the governed engine
workspace scope, including package-level configuration such as
`packages/@dvt/engine/vitest.config.ts`. It also remains true for contracts,
root test configuration, and lockfiles. Workflow YAML changes stay on the CI
contract and changed-file validation rail instead of opening coverage by
themselves. Unrelated docs-only changes can keep the coverage job closed.

Current workflow consumers:

- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) uses the shared policy plus
  workspace matrix emission for affected-workspace detection, and now also
  runs `pnpm test:ci-tools` as a merge-gated CI-tool contract lane. Ordinary
  pull requests use `pnpm verify:changed` for changed-file/docs governance
  checks and `pnpm preflight:affected:ci` for affected build, lint, and
  type-check. Package and dedicated tests stay owned by
  [`.github/workflows/test.yml`](../../.github/workflows/test.yml), avoiding a
  second affected Turbo test pass inside Code Quality. Pushes to `main` and
  manual runs use `pnpm ci:full` instead of the affected PR route. Its shared `any_code` and
  `workspace_global` policy now include `turbo.json`, so Turbo graph changes
  trigger affected-workspace preflight instead of falling through to
  `No affected workspaces`. Workflow YAML changes remain `any_code` and
  changed-file-validation relevant, but do not open affected workspace preflight
  unless they also touch a real root-build input such as the setup action,
  lockfile, Turbo graph, TypeScript config, or runtime orchestration helper.
  `detect-affected`, changed-slice verification, and affected preflight use
  shallow checkout plus `fetch-scope-base` instead of fetching full PR history
  before routing.
- [`.github/workflows/test.yml`](../../.github/workflows/test.yml) uses
  `emit-scope --mode test` once in `detect_test_matrix` for PR test routing
  across the web app, workers, and library workspaces. Dedicated web,
  adapter-temporal, adapter-postgres, determinism/replay, and engine coverage
  jobs consume that detector's outputs at job level, so irrelevant PRs do not
  spend a runner on checkout, dependency setup, or repeated scope detection.
  Draft PRs keep those heavy lanes closed, and the workflow listens for
  `ready_for_review` so moving a draft PR to ready re-runs the detector and
  restores affected package test coverage. It also listens for
  `converted_to_draft` so ready-to-draft transitions cancel in-flight test
  runs and return the workflow to the skipped draft posture.
  Its push/manual full-suite lane and PR `root_build_sensitive` fast-path both
  run `pnpm build`, so the merge gate exercises the same Turbo-backed root
  build path that local root builds now use. Non-root PR affected dependency
  builds use `node scripts/run-turbo-workspace-task.cjs build` with the PR base
  filter, avoiding a manually maintained package-to-build map. Cacheable
  dependency graph preparation for the dedicated web, adapter-temporal,
  adapter-postgres, determinism/replay, and engine coverage lanes also uses the
  same wrapper with the existing package filters; the test, coverage, and
  integration commands remain explicit package commands. The API package matrix command uses
  `pnpm --filter dvt-api test:ci` after this Turbo build step, so CI avoids
  re-entering the local `pretest` dependency build while direct
  `pnpm --filter dvt-api test` keeps its cold-worktree safety net. The shared
  `root_build_sensitive` scope includes root build graph inputs and runtime
  orchestration helpers, so PRs that change the Turbo graph or its
  orchestration helper cannot skip `Test Suite`. Test workflow YAML changes are
  treated as CI policy changes: they stay covered by static/executable CI tool
  contracts and changed-file checks without forcing package tests, web frontend
  tests, determinism/replay, coverage, or adapter-postgres integration by
  filename alone. Adapter-postgres integration,
  determinism/replay, and engine coverage also consume the shared
  `emit-scope --mode test` read model instead of local `dorny/paths-filter`
  package-root rules. Engine
  coverage uses the same governed `packages/@dvt/engine/**` package boundary as
  engine package test routing, so engine Vitest config changes cannot bypass
  threshold enforcement. For ordinary web PRs, the web lane runs
  `pnpm test:web:changed` with `GIT_BASE` pointing at the pull-request base ref.
  The same lane runs `pnpm test:web:ci` for pushes to `main`, manual workflow
  runs, and root-build-sensitive pull requests. `test:web:ci` expands to
  `@dvt/web` `test:deps` followed by the unit, presentation, and architecture
  Vitest delegates. `pnpm test:web` and `pnpm --filter @dvt/web test` use the
  same primary-suite delegate sequence through the package `pretest` lifecycle,
  so root `turbo run test` and the dedicated web lane mirror the same coverage.
  CI uses the suite catalog's one-worker isolated-fork topology to keep
  hosted-runner memory and process-exit behavior deterministic. The hosted `Web
Frontend Tests` lane and the main/manual `Full CI` baseline both set the same web
  Vitest old-space value through `NODE_OPTIONS`, so the Vitest parent process
  and forked workers inherit the limit in GitHub Actions. Public web suite
  commands also run `test:deps` before their raw `*:run` delegates so split-suite
  execution preserves the package dependency-build contract. The web
  architecture suite checks that these package scripts, Vitest config delegates,
  and workflow commands stay aligned with `apps/web/vitest.suites.ts`.
- [`.github/workflows/contracts.yml`](../../.github/workflows/contracts.yml) uses
  `emit-scope --mode contracts` for contract, determinism, and golden routing.
  The workflow no longer owns parallel inline `package.json` filters for those
  lanes. Its detector uses shallow checkout plus `fetch-scope-base`; contract
  hash execution no longer requests full PR history.
- [`.github/workflows/pr-quality-gate.yml`](../../.github/workflows/pr-quality-gate.yml) uses the
  same shared scope surfaces for workflow/global change routing, repository
  validation scope, and Temporal capability lanes. It also runs the
  merge-blocking governance subset from `pnpm verify:prepush` on PRs and
  pushes: changed-doc filename/frontmatter checks when docs changed, governance
  unit coverage, document-unit map, file fingerprints, ADR-0000 traceability,
  feature-mechanization manifests, implementation mechanization, and QA
  artifact validation. On PRs those expensive groups are conditional:
  governance maps require `governance_global_relevant`,
  `governance_tooling_changed`, or `root_build_sensitive`; ADR-0000 requires
  `traceability_adr0_relevant`; feature mechanization requires
  `feature_mechanization_relevant`; `pnpm arch:deps` requires
  `code_validation_relevant`; QA artifact validation requires changed docs.
  Workflow YAML edits are CI-policy changes for this scope as well: they keep
  PR metadata, changed-file validation, and CI contract coverage, but no longer
  imply Temporal or adapter-postgres runtime integration by themselves. Pushes
  and manual full gates keep the full remote posture. The scope detector uses
  shallow checkout plus `fetch-scope-base`; Temporal integration jobs keep
  shallow checkout because they do not compute changed-file diffs.

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
- `pnpm ci:code` routes workspace tests through `turbo run test`. This is the
  canonical fresh CI baseline for package tests because `DVT_CI=1` disables
  package-local pretest build fallbacks and Turbo's `test -> ^build` contract
  must create upstream `dist/**` surfaces before tests import workspace exports.
- `pnpm ci:affected:build`, `pnpm ci:affected:lint`,
  `pnpm ci:affected:typecheck`, and `pnpm ci:affected:test` route through
  `node scripts/run-turbo-workspace-task.cjs` so affected local preflight and
  lightweight CI lanes can reuse the same governed Turbo graph without changing
  the full-root `test` or `type-check` contract.
- `pnpm preflight:affected` is the ordinary PR workspace route. It runs
  affected build, lint, type-check, and test in that order so local and
  explicit operator preflight keeps package test coverage in one command.
- `pnpm preflight:affected:ci` is the Code Quality PR route. It runs affected
  build, lint, and type-check only; `Test Suite` owns package and dedicated
  remote tests for the same pull request. The GitHub job sets `DVT_CI=1` so
  package lifecycle fallbacks do not rebuild dependency graphs after the
  affected Turbo build has already run.
- `CI - Code Quality` uses the root affected preflight commands instead of a
  per-package build/lint/typecheck matrix on pull requests. The CI variant
  avoids duplicating `ci:affected:test` because `Test Suite` already gates
  affected package tests.
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
  affected dependency builds and dedicated-lane build graph preparation.
  Root-config PRs still use `pnpm build` to exercise the full root graph.
- `Adapter Postgres Integration Nightly` also uses the Turbo workspace wrapper
  for its dependency graph build, so scheduled smoke coverage can reuse the
  same local or remote task-cache path as pull-request test lanes.
- `pnpm governance:refresh` keeps generated governance file surfaces stable
  before DB validation, but no longer runs `governance:db:import` inside
  generation passes and no longer pre-generates local coverage/remediation
  reports before the DB import. It builds those report projections in-memory
  for the import, performs the heavy governance DB import once in the final
  database-validation phase, then runs `governance:db:check` and DB-sourced
  final coverage/remediation report checks. Export checks remain explicit,
  operator-requested publication operations.
- Default `pnpm verify:prepush` delegates changed-slice planning DB inventory
  validation to `pnpm verify:changed` instead of running
  `planning:db:inventory:check` a second time. Full pre-push mode still keeps
  the explicit planning DB inventory step as part of its full closeout
  baseline.
- Dependency review and CodeQL workflows provide the current dependency/SAST
  baseline when the repository has the required GitHub Advanced Security
  capabilities. Private repositories must set
  `GH_ADVANCED_SECURITY_ENABLED=true` after enabling the required GitHub
  security features; without that capability, those workflows are intentionally
  skipped instead of failing before diff analysis. CodeQL uses the repository
  workflow-scope detector on pull requests so a one-file `buzon/**` or
  docs-only PR does not wait for a full SAST run with no analyzable changed
  surface; code, dependency, workflow/action, script/tool, and root-config
  changes remain fail-closed into CodeQL. The manual docs deploy workflow pins
  the Zensical package version used to build the site, and the label-bootstrap
  workflow uses a SHA-pinned `actions/github-script` reference like the other
  active workflows. Remote Turbo cache is configured for trusted non-PR
  workflow steps but requires repository owners to populate `TURBO_TOKEN` and
  `TURBO_TEAM` before it can produce remote cache hits.
- Current branch-protection status checks are repository settings, not tracked
  YAML. Verify in GitHub settings that `CI - Code Quality`, `Test Suite`,
  `PR Quality Gate`, `Contracts & Determinism`, `Dependency Review`, and
  `CodeQL` are required before treating these workflows as a merge guarantee
  for repositories where those GHAS-backed workflows are enabled.
- For slices that change code, config, tests, CI, or docs, include
  `pnpm verify:prepush` in the end-of-task validation baseline before claiming
  the work is ready.
