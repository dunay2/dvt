---
title: Testing and CI Capabilities
status: Active
owner: engineering
last_reviewed: 2026-03-20
---

# Testing and CI Capabilities

This guide lists the test and CI capabilities currently implemented in the repository, with the
canonical command and source file for each one.

## Purpose

- Provide a single entry point for engineers who need to know what can be executed locally.
- Map each capability to the workflow or script that enforces it in CI.
- Reduce ambiguity when extending quality gates or adding new workspaces.

See also:

- [`test-architecture.md`](test-architecture.md) for repository rules on test taxonomy, harnesses, fixtures, and promotion to shared utilities.

## Root Commands

| Capability                     | Command                          | Source                                                         |
| ------------------------------ | -------------------------------- | -------------------------------------------------------------- |
| Full workspace build           | `pnpm build`                     | [`package.json`](../../package.json)                           |
| Full recursive test run        | `pnpm test`                      | [`package.json`](../../package.json)                           |
| Full type-check gate           | `pnpm type-check`                | [`package.json`](../../package.json)                           |
| Pre-push verification gate     | `pnpm verify:prepush`            | [`package.json`](../../package.json)                           |
| Changed-files lint/format gate | `node scripts/check-changed.cjs` | [`scripts/check-changed.cjs`](../../scripts/check-changed.cjs) |
| Affected workspace build       | `pnpm ci:affected:build`         | [`package.json`](../../package.json)                           |
| Affected workspace test        | `pnpm ci:affected:test`          | [`package.json`](../../package.json)                           |
| Affected workspace type-check  | `pnpm ci:affected:typecheck`     | [`package.json`](../../package.json)                           |

## Package Test Commands

| Capability                         | Command                                                                    | Scope                                | Source                                                                             |
| ---------------------------------- | -------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| Engine package tests               | `pnpm test:engine`                                                         | `@dvt/engine`                        | [`package.json`](../../package.json)                                               |
| Contracts package tests            | `pnpm test:contracts`                                                      | `@dvt/contracts`                     | [`package.json`](../../package.json)                                               |
| Contracts compile gate             | `pnpm test:contracts:compile`                                              | `@dvt/contracts`                     | [`package.json`](../../package.json)                                               |
| API package tests                  | `pnpm --filter dvt-api test`                                               | `apps/api`                           | [`apps/api/package.json`](../../apps/api/package.json)                             |
| API protected runtime integration  | `pnpm --filter dvt-api test:integration`                                   | `apps/api` OIDC + PostgreSQL runtime | [`apps/api/package.json`](../../apps/api/package.json)                             |
| PostgreSQL adapter tests           | `pnpm test:adapter-postgres`                                               | `@dvt/adapter-postgres`              | [`package.json`](../../package.json)                                               |
| Temporal adapter unit tests        | `pnpm test:adapter-temporal`                                               | `@dvt/adapter-temporal`              | [`package.json`](../../package.json)                                               |
| Temporal adapter runtime closure   | `pnpm test:adapter-temporal` then `pnpm test:adapter-temporal:integration` | `@dvt/adapter-temporal`              | [`package.json`](../../package.json)                                               |
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

| Capability                          | Command                      | Source                               |
| ----------------------------------- | ---------------------------- | ------------------------------------ |
| Docs sync                           | `pnpm docs:sync`             | [`package.json`](../../package.json) |
| Docs sync drift check               | `pnpm docs:sync:check`       | [`package.json`](../../package.json) |
| Docs quality policy check           | `pnpm docs:quality:check`    | [`package.json`](../../package.json) |
| Docs doctor                         | `pnpm docs:doctor`           | [`package.json`](../../package.json) |
| Markdown location policy            | `pnpm docs:gov:locations`    | [`package.json`](../../package.json) |
| Canonical path/link check           | `pnpm docs:canonical:check`  | [`package.json`](../../package.json) |
| Generated code-state check          | `pnpm docs:status:check`     | [`package.json`](../../package.json) |
| Generated capability coverage check | `pnpm docs:capability:check` | [`package.json`](../../package.json) |
| Aggregate docs CI gate              | `pnpm docs:ci`               | [`package.json`](../../package.json) |

Generated documentation sources:

- code-state report: [`docs/planning/status/generated-code-state.md`](../planning/status/generated-code-state.md)
- capability coverage report: [`docs/planning/status/generated-capability-coverage.md`](../planning/status/generated-capability-coverage.md)

## GitHub Workflow Coverage

| Workflow                | Main capability                                                                           | Source                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| CI - Code Quality       | affected workspace matrix, changed-file lint/format, markdown lint                        | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)                           |
| Test Suite              | package tests, affected test routing, coverage, determinism/replay tests                  | [`.github/workflows/test.yml`](../../.github/workflows/test.yml)                       |
| Contracts & Determinism | schema validation, determinism scan, contract compile, golden validation, hash comparison | [`.github/workflows/contracts.yml`](../../.github/workflows/contracts.yml)             |
| PR Quality Gate         | docs gates, type-check fast-fail, PR metadata checks, Temporal integration                | [`.github/workflows/pr-quality-gate.yml`](../../.github/workflows/pr-quality-gate.yml) |

## Shared CI Scope Logic

The current branch centralizes workflow scope detection in:

- [`tools/ci/scope-config.mjs`](../../tools/ci/scope-config.mjs)
- [`tools/ci/emit-workspace-matrix.mjs`](../../tools/ci/emit-workspace-matrix.mjs)
- [`tools/ci/emit-scope.mjs`](../../tools/ci/emit-scope.mjs)

These files are intended to become the canonical source of truth for:

- affected workspace detection
- package test scope detection
- contracts/determinism scope detection
- Temporal integration scope detection

## Notes

- Affected workspace commands use the `origin/main` comparison baseline.
- Temporal integration tests require compiled workflow artifacts, per
  [`ADR-0001`](../adr/ADR-0001-temporal-integration-test-policy.md).
- The GitHub workflows remain the authoritative merge gates even when the same command is runnable
  locally.
- `pnpm --filter dvt-api test:integration` skips cleanly when `DATABASE_URL` or
  `DVT_PG_URL` is absent; when configured it exercises the real API protected
  runtime with JWKS-backed OIDC verification plus PostgreSQL authorization data.
- In the agent sandbox used for this repository, `vitest`/`vite`/`esbuild`
  commands may fail with `spawn EPERM`; when that happens, re-run the same
  validation command with escalated execution before treating it as a real code
  failure.
- For slices that change code, config, tests, CI, or docs, include
  `pnpm verify:prepush` in the end-of-task validation baseline before claiming
  the work is ready.
