---
title: Hard-cut auth and provider-mock cleanup closeout
status: Accepted
owner: apps/api
last_reviewed: 2026-04-24
planning_type: closeout
---

# Hard-cut auth and provider-mock cleanup closeout

## Think-First Analysis

- Problem summary: PR #1020 hardened start-run admission and removed `mock`
  from the start-run boundary, but Fowler QA found two active drifts: the
  protected API execution composition still instantiated `AllowAllAuthorizer`,
  and the shared provider vocabulary still exposed `mock` as a runtime provider.
- Root cause: the previous slice correctly cut the public start-run target
  adapter first, but left older engine/runtime seams in place because they were
  broader than AR-C3. `AllowAllAuthorizer` also survived as an engine policy
  adapter because the API boundary performs authorization before engine calls,
  while the engine still expects an `IAuthorizer` port.
- Constraints and invariants: ADR-0003 keeps execution semantics DVT-owned and
  provider-independent; ADR-0005 and ADR-0006 require executable contract
  validation and repository-authoritative governance; ADR-0014 keeps adapters
  run-driven and behind provider boundaries; AGENTS.md requires no legacy
  compatibility shims, no hidden debt, and validation through `verify:prepush`.
- Options considered: keep `mock` as test-only provider; rename it as a local
  dev provider; remove it from public contracts while leaving implementation
  internals; fully remove the runtime provider value and replace tests with
  concrete `temporal` or `conductor` provider fakes.
- Selected option and rationale: remove `mock` from active runtime provider
  vocabulary and API runtime composition, and replace the protected runtime
  `AllowAllAuthorizer` with an API-owned tenant-scope authorizer that can only
  approve engine access inside an already authorized request scope. This keeps
  API authorization at the boundary while removing the production no-op
  authorizer.
- Rejected alternatives: a compatibility alias from `mock` to `temporal` was
  rejected because the user asked for a hard cut; leaving `AllowAllAuthorizer`
  with production flags was rejected because it preserves the anti-pattern; a
  broad web mock-mode removal was rejected as out of scope because it is a
  separate Lane E frontend runtime-mode concern.

## Pre-Implementation Brief

- Mode: Full.
- Scope: contracts provider vocabulary, API protected runtime composition,
  intent reconciler provider binding, engine testing adapter exposure, local
  component docs, ARC evidence/risk, and closeout validation.
- Expected outcome: no active provider contract or API runtime path accepts
  provider `mock`; no non-test composition root imports or instantiates
  `AllowAllAuthorizer`; tests use provider fakes with canonical provider IDs.
- Risks and mitigations: contract changes can cascade through engine tests and
  fixtures, so the slice starts with semantic architecture tests and then fixes
  compile/test fallout; generated docs are regenerated after source/doc
  structure changes.
- Out of scope: frontend `mock` data-source mode, historical archived evidence,
  and test-framework `vi.mock` usage.
- Validation plan: targeted red/green tests first, then `pnpm --filter
@dvt/contracts test`, `pnpm --filter @dvt/engine test`, `pnpm --filter
dvt-api test`, docs sync/status checks, ARC check, and `pnpm
verify:prepush`.
- Test coverage plan: architecture tests for active provider vocabulary,
  protected-runtime authorizer composition, and API runtime rejection of
  unsupported provider-mock config; contract tests for schema rejection of
  `mock`.
- Libraries evaluated: none. This is cleanup of existing in-repo contracts and
  ports, not new external authorization functionality.

## Traceability

- Baseline ADRs: ADR-0003, ADR-0005, ADR-0006, ADR-0014.
- Canonical contracts: `packages/@dvt/contracts/src/types/contracts.ts`,
  `packages/@dvt/contracts/src/schema-packs/common.ts`,
  `packages/@dvt/contracts/src/contracts/engine/RunExecutionContext.v1.ts`,
  `packages/@dvt/contracts/src/contracts/engine/StartRunBoundary.v1.ts`.
- Runtime artifacts: `apps/api/src/modules/protectedRuntime/*`,
  `apps/api/src/runtime/intentReconcilerRuntime.ts`, `@dvt/engine/testing`.

## Unit And Integration Test Boundary

- Unit tests may use mocks and fakes, including `vi.fn(...)`, fake clients, and
  in-memory provider doubles.
- Unit provider doubles must model real provider ids such as `temporal` or
  `conductor`; they must not introduce a synthetic runtime provider named
  `mock`.
- Integration tests must use real provider infrastructure. The protected
  runtime integration suite therefore requires `DATABASE_URL` and
  `TEMPORAL_ADDRESS`; without those variables it skips explicitly rather than
  falling back to an in-memory provider.
- When OIDC-protected runtime routes are enabled, `apps/api` startup requires
  `TEMPORAL_ADDRESS` and fails fast with an explicit configuration error before
  workflow-engine construction.
- For coordinated local startup, `pnpm dev:app` injects the canonical local
  Temporal posture, starts `dvt-temporal-worker`, waits for the worker
  `/readyz` probe, and fails bootstrap explicitly if Temporal is unavailable.
- Web `mock` mode remains UI-local demo/test data-source behavior and is not a
  runtime provider. Web run refs and start-run fixtures now use real provider
  ids even when the service implementation is a local test adapter.

## Implementation Summary

- Removed `mock` from active contract/provider vocabulary and added a contract
  architecture guard for provider vocabulary drift.
- Renamed the engine test provider from `MockAdapter` to
  `InMemoryProviderAdapter` and updated engine tests to pass real provider ids.
- Updated API, web, planner, state-store, adapter-postgres, and CLI fixtures so
  run refs and target adapters use `temporal` or `conductor`.
- Kept tests that send `'mock'` as an invalid input because they validate the
  hard cut.
- Updated active docs and diagrams to describe provider test doubles without
  advertising `mock` as a runtime provider.
- Added protected-runtime startup coverage for missing Temporal configuration
  and aligned `/readyz` adapter readiness with the canonical Temporal adapter
  instead of any non-empty adapter map.
- Updated the local dev-stack to bootstrap the worker-backed Temporal readiness
  posture before API startup when local protected runtime is active.
- Aligned the executable-subgraph resolver unit fixture with the current
  `WorkspaceGraphAuthoringDraft` contract so semantic validation does not mask
  planner-selection behavior.

## Validation Evidence

- `pnpm --filter dvt-api test -- test/infrastructure/startRun/ArtifactBackedRunExecutionContextResolver.test.ts` passed.
- `pnpm --filter @dvt/contracts test -- test/provider-vocabulary.architecture.test.ts test/start-run-boundary.architecture.test.ts` passed.
- `pnpm --filter @dvt/web typecheck` passed.
- `pnpm --filter @dvt/contracts test` passed: 18 files, 219 tests.
- `pnpm --filter @dvt/engine test` passed: 42 files, 369 tests.
- `pnpm --filter @dvt/planner test` passed: 17 files, 80 tests.
- `pnpm --filter @dvt/state-store test` passed: 12 files, 107 tests.
- `pnpm --filter @dvt/adapter-postgres test` passed: 21 files and 131 tests;
  integration files requiring Postgres skipped without real environment.
- `pnpm --filter dvt-api test` passed: 109 files and 555 tests; protected
  runtime integration skipped without real database and Temporal environment.
- `pnpm --filter @dvt/web test` passed: 182 files, 641 tests.
- `pnpm --filter dvt-api test -- app/protectedRuntimeComposition.test.ts`
  passed: protected runtime startup rejects missing `TEMPORAL_ADDRESS`.
- `pnpm --filter dvt-api test --
application/services/resolveAuthorizedExecutableSubgraph.test.ts` passed.
- `pnpm --filter dvt-api test` passed: 109 files and 556 tests; protected
  runtime integration skipped without real database and Temporal environment.
- `node --test scripts/run-dev-stack.test.cjs` passed: dev-stack injects
  canonical Temporal posture and builds the local worker environment.

## Residual Posture

- No compatibility alias from `mock` to a real provider was introduced.
- No production composition root falls back to a provider mock.
- No hidden provider stub was added. `InMemoryProviderAdapter` is a unit-test
  double and is named as such.
- Historical evidence and atlas snapshots that mention prior mock-era posture
  remain historical surfaces, not active runtime guidance.
