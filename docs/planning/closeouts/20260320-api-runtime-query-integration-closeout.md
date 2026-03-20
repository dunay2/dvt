---
slice: api-runtime-query-integration
date: 2026-03-20
author: AI (GPT-5)
last_reviewed: 2026-03-20
---

# Closeout: API Runtime Query Integration

## Think-First Analysis

### Problem summary

`apps/api` already ships protected runtime routes for `POST /runs/start`,
`GET /runs`, `GET /runs/:runId`, `GET /runs/:runId/events`, and
`POST /runs/:runId/signal`, but the repository still has governance drift in
two places:

- active planning/status documents still claim the query side is absent
- the open auth/runtime risk still correctly notes that there is no full
  OIDC + PostgreSQL integration lane for the protected HTTP surface

That leaves the implementation ahead of the canonical status and evidence
surfaces.

### Root cause

The protected runtime and query slice were implemented incrementally across
multiple API changes, but the delivery record was not closed as one coherent
slice. Unit and route tests exist, yet the status/evidence/risk documents were
not updated in step with the implementation, and no live PostgreSQL plus real
JWT verification lane was added for the protected routes.

### Constraints and invariants

- `AGENTS.md`: inventory first, no hidden debt, no stubs, required end-of-task
  validation including `pnpm verify:prepush`.
- `docs/guides/ai-work-protocol.md`: `Slim` mode fits because this is
  hardening/validation/documentation of an existing API surface, not a new
  external contract family.
- `ADR-0003`: API handlers stay thin and defer execution semantics to the
  engine and application services.
- `ADR-0004`: event log and snapshot reads remain tenant-scoped and
  event-sourced; tests must not bypass state-store invariants.
- `ADR-0015`: `getRunStatus` remains read-model oriented; query routes do not
  invent direct adapter semantics.
- `ADR-0031`: adapter and API paths must enforce tenant scope explicitly for
  reads and writes.
- `docs/architecture/system-delivery-status.md` and
  `docs/planning/status/canonical-doc-code-matrix.md` are the active status
  surfaces that must reflect the shipped code.

### Options considered

- Add only documentation updates.
  - Rejected because the open risk would remain true: there would still be no
    real OIDC + PostgreSQL integration lane.
- Add only an integration test.
  - Rejected because the repo would still misstate current API capabilities in
    active planning/status documents.
- Add a thin integration lane for the protected runtime and update the active
  status/risk/evidence surfaces in the same slice.
  - Selected because it closes the implementation-to-governance drift without
    broadening scope into frontend work or new contracts.
- Add full frontend wiring to consume the query routes.
  - Rejected because that is a larger product slice and should follow stable
    API evidence, not replace it.

### Selected option and rationale

Ship one bounded hardening slice:

1. add a real integration test for the protected API runtime using PostgreSQL
   plus JWKS-backed JWT verification
2. update active status/risk/evidence surfaces to reflect that the query slice
   already exists and is now integration-covered

This keeps code, tests, risk, and status aligned without inventing a new gap or
expanding into UI integration.

### Rejected alternatives

- Closing the risk without executable integration proof.
- Leaving the stale planning proposal uncorrected while claiming the slice is
  complete.
- Introducing test-only shortcuts that bypass the real authenticator or the
  Postgres-backed access repository.

## Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - add one protected-runtime integration lane in `apps/api`
  - update active status/risk/evidence documents for the existing query slice
  - record this slice in a mandatory closeout
- Touched files or paths:
  - `apps/api/test/integration/**`
  - `apps/api/package.json` if a dedicated integration command is needed
  - `docs/risk-register/quality/R-20260308-api-auth-runtime-integration-coverage.md`
  - `docs/architecture/system-delivery-status.md`
  - `docs/planning/status/canonical-doc-code-matrix.md`
  - `docs/evidence/**`
  - `docs/planning/closeouts/20260320-api-runtime-query-integration-closeout.md`
- Expected outcome:
  - protected API runtime has executable OIDC + PostgreSQL integration proof
  - active docs no longer claim the query side is absent
  - risk posture is updated based on real validation, not assumption
- Risks and mitigations:
  - live PostgreSQL may be unavailable locally: integration test must skip
    cleanly when env is missing, and validation must report that explicitly
  - JWKS test server complexity can create brittle cleanup: keep it local to the
    test file and close all resources deterministically
  - status docs can drift again if evidence is not updated: sync status, risk,
    and evidence in the same slice
- Out-of-scope items:
  - frontend wiring to consume the API
  - new public DTO versions
  - broader CQRS/read API expansion beyond the already implemented routes
  - OIDC provider deployment or CI secrets provisioning
- Validation plan:
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter dvt-api test`
  - targeted integration execution if a dedicated command/script is added
  - docs checks for touched docs
  - `pnpm verify:prepush`
- Test coverage plan:
  - positive path: authenticated protected route succeeds against real Postgres
    schema and JWKS-backed token verification
  - negative path: unauthorized tenant/scope mismatch is rejected with the real
    auth/runtime wiring
  - route proof should cover both query and command surfaces if feasible without
    widening scope
- Libraries evaluated:
  - None added; use existing `jose`, `fastify.inject`, and repo PostgreSQL test
    conventions

## Changes made

| File or path                                                                                                                                                      | Change                                                                                    | Why                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [apps/api/test/integration/protectedRuntime.integration.test.ts](../../../apps/api/test/integration/protectedRuntime.integration.test.ts)                         | Added a real protected-runtime integration lane with JWKS-backed OIDC and live PostgreSQL | Close the OIDC plus Postgres validation gap for the shipped API surface     |
| [apps/api/package.json](../../../apps/api/package.json)                                                                                                           | Added `pretest:integration` and a dedicated `test:integration` command                    | Make the integration lane explicit and repeatable                           |
| [apps/api/vitest.integration.config.ts](../../../apps/api/vitest.integration.config.ts)                                                                           | Scoped Vitest to `test/integration/**/*.test.ts`                                          | Replace the fragile CLI filter approach with a stable integration config    |
| [docs/evidence/ED-20260320-api-runtime-query-integration.md](../../evidence/ED-20260320-api-runtime-query-integration.md)                                         | Added evidence for the runtime-query integration slice                                    | Record the executable proof and doc alignment in one canonical evidence doc |
| [docs/risk-register/quality/R-20260308-api-auth-runtime-integration-coverage.md](../../risk-register/quality/R-20260308-api-auth-runtime-integration-coverage.md) | Updated the risk from `Open` to `Mitigated`                                               | The specific absence-of-lane risk is no longer true                         |
| [docs/architecture/system-delivery-status.md](../../architecture/system-delivery-status.md)                                                                       | Updated entry-layer status and snapshot counts                                            | Keep the status document aligned with shipped code and generated code state |
| [docs/planning/status/canonical-doc-code-matrix.md](../status/canonical-doc-code-matrix.md)                                                                       | Added API query-route, auth, integration-test, and verification mappings                  | Keep canonical topic traceability accurate                                  |
| [docs/guides/testing-and-ci-capabilities.md](../../guides/testing-and-ci-capabilities.md)                                                                         | Added the API package and integration commands                                            | Publish the local validation entry points for this slice                    |
| [docs/planning/dvt-top-5-gaps-corrected-20260319.md](../dvt-top-5-gaps-corrected-20260319.md)                                                                     | Corrected the active proposal so it no longer points engineers at already-shipped routes  | Remove active planning drift                                                |
| [docs/planning/closeouts/20260320-api-runtime-query-integration-closeout.md](20260320-api-runtime-query-integration-closeout.md)                                  | Recorded think-first analysis plus final execution evidence                               | Required by repo governance                                                 |

## Libraries evaluated

None evaluated. This slice uses existing repo dependencies and runtime wiring.

## Docs synced

- [x] [docs/evidence/ED-20260320-api-runtime-query-integration.md](../../evidence/ED-20260320-api-runtime-query-integration.md)
- [x] [docs/risk-register/quality/R-20260308-api-auth-runtime-integration-coverage.md](../../risk-register/quality/R-20260308-api-auth-runtime-integration-coverage.md)
- [x] [docs/architecture/system-delivery-status.md](../../architecture/system-delivery-status.md)
- [x] [docs/planning/status/canonical-doc-code-matrix.md](../status/canonical-doc-code-matrix.md)
- [x] [docs/guides/testing-and-ci-capabilities.md](../../guides/testing-and-ci-capabilities.md)
- [x] [docs/planning/dvt-top-5-gaps-corrected-20260319.md](../dvt-top-5-gaps-corrected-20260319.md)
- [x] [docs/evidence/index.md](../../evidence/index.md) via `pnpm docs:sync`
- [x] [docs/planning/index.md](../index.md) via `pnpm docs:sync`
- [x] [docs/planning/proposals/index.md](../proposals/index.md) via `pnpm docs:sync`
- [x] [docs/planning/status/generated-code-state.md](../status/generated-code-state.md) via `pnpm docs:status:generate`

## Test evidence

| Command                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Result                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm --filter dvt-api typecheck`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Passed                                                                                                                                                                                                 |
| `pnpm --filter dvt-api test`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Passed                                                                                                                                                                                                 |
| `pnpm exec eslint apps/api/test/integration/protectedRuntime.integration.test.ts apps/api/vitest.integration.config.ts --max-warnings 0`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Passed                                                                                                                                                                                                 |
| `docker compose -f infra/docker/postgres/docker-compose.yml up -d`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Passed                                                                                                                                                                                                 |
| `docker inspect --format='{{.State.Health.Status}}' dvt-postgres`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Failed in sandbox because Docker daemon access was permission-blocked; passed with escalated execution and returned `healthy`                                                                          |
| `$env:DATABASE_URL='postgresql://dvt:dvt@localhost:5432/dvt'; pnpm --filter dvt-api test:integration`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | First sandboxed run failed with `spawn EPERM` from `vitest`/`esbuild`; per repo rule the escalated rerun is the real outcome                                                                           |
| `$env:DATABASE_URL='postgresql://dvt:dvt@localhost:5432/dvt'; pnpm --filter dvt-api test:integration`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Initial version of the command failed because the CLI filter found no test files; fixed by adding `vitest.integration.config.ts`                                                                       |
| `$env:DATABASE_URL='postgresql://dvt:dvt@localhost:5432/dvt'; pnpm --filter dvt-api test:integration`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Passed outside sandbox after the config fix (`2` files, `7` tests)                                                                                                                                     |
| `pnpm docs:sync`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Passed                                                                                                                                                                                                 |
| `pnpm docs:status:generate`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Passed                                                                                                                                                                                                 |
| `pnpm docs:capability:generate`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Passed                                                                                                                                                                                                 |
| `pnpm exec markdownlint-cli2 "docs/architecture/system-delivery-status.md" "docs/evidence/ED-20260320-api-runtime-query-integration.md" "docs/evidence/index.md" "docs/guides/testing-and-ci-capabilities.md" "docs/planning/closeouts/20260320-api-runtime-query-integration-closeout.md" "docs/planning/dvt-top-5-gaps-corrected-20260319.md" "docs/planning/index.md" "docs/planning/proposals/index.md" "docs/planning/status/canonical-doc-code-matrix.md" "docs/planning/status/generated-code-state.md" "docs/risk-register/quality/R-20260308-api-auth-runtime-integration-coverage.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` | Passed after normalizing the touched tables to a consistent style                                                                                                                                      |
| `pnpm docs:quality:check`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Passed with non-blocking heuristic warnings about likely non-English content in several pre-existing planning/archive documents and one warning on `docs/planning/status/canonical-doc-code-matrix.md` |
| `pnpm docs:canonical:check`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Passed                                                                                                                                                                                                 |
| `pnpm verify:prepush`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Passed                                                                                                                                                                                                 |
| `$env:DATABASE_URL='postgresql://dvt:dvt@localhost:5432/dvt'; pnpm --filter dvt-api test:integration`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Passed again outside sandbox after the final documentation updates (`2` files, `7` tests)                                                                                                              |

## Debt introduced

None. No debt record was added, no rules were relaxed, and no hooks were
bypassed.

## No-stub evidence

No stubs, placeholders, fake adapters, or TODO/FIXME markers were added. The
integration test uses the real Fastify app, the shipped OIDC authenticator, and
live PostgreSQL authorization data.
