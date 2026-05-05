---
title: API Deploy Start Posture Closeout
status: Accepted
owner: API / Delivery / Docs
last_reviewed: 2026-05-05
planning_type: closeout
---

# API Deploy Start Posture Closeout

## Think-First Analysis

### Problem summary

`dvt-api` already builds and typechecks from the monorepo, but its deploy-facing
files still imply an isolated `npm` application posture. `apps/api/Procfile`,
`apps/api/nixpacks.toml`, and `apps/api/Dockerfile` can drift away from the
repo-owned `pnpm` workspace build path.

### Root cause

The API package was hardened into a real monorepo composition root while older
deployment files kept a single-package Node application shape. That mismatch is
operational drift, not runtime behavior.

### Constraints and invariants

- `AGENTS.md` requires governance-first work, real validation, no hidden debt,
  and no skipped checks.
- `docs/guides/ai-work-protocol.md` allows a `Slim` maintenance slice when no
  new API surface or external behavior is introduced.
- `docs/architecture/components/api/api-current-to-target-architecture.md`
  states that `apps/api` is the HTTP composition root and must not take on
  engine/runtime semantics.
- `docs/architecture/components/api/protected-runtime-and-plan-compile-component.md`
  keeps protected runtime construction inside the existing composition seams.
- `docs/architecture/command-query-rail-governance.md` is explicitly out of
  scope here because this slice does not add or change externally observable
  product behavior.

### Options considered

- Keep deployment files as-is and document commands only in the README.
  Rejected because the executable config would keep advertising stale `npm`
  behavior.
- Convert deploy config to monorepo-root `pnpm --filter dvt-api ...` commands.
  Selected because it matches the existing package scripts and validation
  model.
- Change API runtime code or database pool behavior in the same slice.
  Rejected because that would expand this maintenance pass into runtime
  behavior.

### Selected option and rationale

Make the deploy entrypoints invoke the same monorepo command posture used
locally and in CI, then add a small test guard so `npm`-style deploy drift is
caught by the API test suite.

### Rejected alternatives

- Add root-level deploy files in this round.
- Change protected runtime readiness, health, auth, or database pool behavior.
- Touch contracts, adapters, or engine packages.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - align `apps/api` deploy config to `pnpm` monorepo commands
  - document root-context deployment expectations
  - add a focused API test guard for deploy config drift
- Touched files or paths:
  - `apps/api/Procfile`
  - `apps/api/nixpacks.toml`
  - `apps/api/Dockerfile`
  - `apps/api/README.md`
  - an existing `apps/api/test/**/*.test.ts` file
  - `docs/planning/proposals/mandatory/runtime-and-contracts/api-deploy-start-posture-plan-20260505.md`
  - `docs/planning/closeouts/20260505-api-deploy-start-posture-closeout.md`
- Expected outcome:
  - deployment config no longer claims isolated `npm` build/start behavior
  - Docker builds are documented as repo-root builds with
    `-f apps/api/Dockerfile`
  - API runtime behavior remains unchanged
- Risks and mitigations:
  - risk: platform config differs between Railway, Render, and Docker
    mitigation: document the repo-root command contract and avoid platform-only
    runtime assumptions
  - risk: a text guard becomes too brittle
    mitigation: assert only high-value invariants: `pnpm`, `--filter dvt-api`,
    and no `npm run` in deploy entrypoints
- Out-of-scope items:
  - API route behavior
  - protected runtime readiness semantics
  - database pool sizing or lifecycle
  - contract, adapter, engine, or worker changes
- Validation plan:
  - `pnpm --filter dvt-api test -- app.test.ts`
  - `pnpm --filter dvt-api build`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter dvt-api test:arch`
  - `docker build -f apps/api/Dockerfile -t dvt-api-deploy-posture .`
  - `pnpm docs:sync`
  - `pnpm verify:prepush`
- Test coverage plan:
  - red/green guard for deploy config command drift
  - existing API build/typecheck/architecture validation for package health
- Libraries evaluated:
  - None evaluated - no custom implementation.
- Command/query rail impact:
  - None. This slice changes operational entrypoint config only.
- Fowler planning impact:
  - Addresses documentation/configuration drift and duplicate operational
    command semantics. No new DDD object or application rail is introduced.

## Changes Made

| File                                                                                                | Change                                                                                                                                                         | Why                                                                                                        |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `apps/api/Procfile`                                                                                 | Replaced `npm run start` with `pnpm --filter dvt-api start`.                                                                                                   | Keep platform start command aligned with the monorepo package manager.                                     |
| `apps/api/nixpacks.toml`                                                                            | Replaced `npm ci`, `npm run build`, and `npm run start` with repo-root `pnpm` commands.                                                                        | Railway/Nixpacks must build the workspace package through the same command posture used locally and in CI. |
| `apps/api/Dockerfile`                                                                               | Reworked the image build to use repo-root context, `corepack`, filtered `pnpm install`, copied root `tsconfig*.json`, and `pnpm --filter dvt-api build/start`. | The API depends on `workspace:*` packages and cannot be built as an isolated `npm` package.                |
| `apps/api/README.md`                                                                                | Documented repo-root deployment commands for Railway, Render, and Docker.                                                                                      | Make the operator path match the executable config.                                                        |
| `apps/api/test/app.test.ts`                                                                         | Added a deploy command posture guard.                                                                                                                          | Prevent regressions back to stale isolated `npm` deployment commands.                                      |
| `docs/planning/proposals/mandatory/runtime-and-contracts/api-deploy-start-posture-plan-20260505.md` | Added the feature mechanization manifest for this maintenance slice.                                                                                           | Declare allowed implementation surfaces, symbols, rails, and gates for the repo mechanization guard.       |
| `docs/planning/closeouts/20260505-api-deploy-start-posture-closeout.md`                             | Recorded think-first, scope, changes, and validation evidence.                                                                                                 | Satisfy repo closeout evidence requirements.                                                               |

## Validation Evidence

| Command                                                                  | Result                                                                                                                    |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter dvt-api test -- app.test.ts` before deploy config changes | FAIL as expected: new guard detected `web: npm run start` in `apps/api/Procfile`.                                         |
| `pnpm --filter dvt-api test -- app.test.ts` after deploy config changes  | PASS: 1 file, 3 tests.                                                                                                    |
| `pnpm --filter dvt-api build`                                            | PASS.                                                                                                                     |
| `pnpm --filter dvt-api typecheck`                                        | PASS.                                                                                                                     |
| `pnpm --filter dvt-api test:arch`                                        | PASS: 598 modules and 1346 dependencies cruised with no dependency violations.                                            |
| `pnpm --filter dvt-api test`                                             | PASS: 117 files passed, 1 skipped; 587 tests passed, 19 skipped.                                                          |
| `docker build -f apps/api/Dockerfile -t dvt-api-deploy-posture .`        | PASS: image exported as `dvt-api-deploy-posture:latest`.                                                                  |
| `pnpm docs:sync`                                                         | PASS: generated docs surfaces already up to date.                                                                         |
| `pnpm docs:feature-mechanization:implementation`                         | PASS: 23 manifests validated, including `API-DEPLOY-START-POSTURE`.                                                       |
| `pnpm docs:governance:document-unit-map`                                 | PASS: indexed 1486 documents.                                                                                             |
| `pnpm docs:governance:file-component-index`                              | PASS: indexed 4245 files and 32 component/source units.                                                                   |
| `pnpm docs:governance:file-fingerprint-baseline`                         | PASS: updated the accepted file fingerprint baseline.                                                                     |
| `pnpm docs:governance:file-fingerprint-impact`                           | PASS: accepted 4245 file fingerprints.                                                                                    |
| `pnpm docs:governance:coverage-report`                                   | PASS: files=4245, governed=4245, ungoverned=0, drift=41, legacy=0.                                                        |
| `pnpm docs:governance:remediation-queue`                                 | PASS: tasks=43, p0=3, p1=15, p2=3, p3=22.                                                                                 |
| `pnpm verify:prepush`                                                    | PASS: changed-file, docs governance, feature mechanization, architecture dependency, and affected typecheck gates passed. |

## Debt And Stub Evidence

- No API route, command/query rail, protected runtime behavior, contract,
  adapter, engine, or database pool behavior changed.
- No new debt entry was introduced.
- No rules, hooks, lint, typecheck, or tests were disabled or relaxed.
- No stubs, placeholders, fake adapters, or fake success paths were added.
