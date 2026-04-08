---
title: AR-C1-T3 Protected Runtime Admin Route Composition Closeout
status: Review
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-04-07
planning_type: closeout
---

# AR-C1-T3 Protected Runtime Admin Route Composition Closeout

## Think-First Analysis

- Problem summary:
  `AR-C1-T3` requires executable proof that admin routes remain disabled unless
  the protected runtime is fully composed with OIDC prerequisites, even when
  `DVT_ADMIN_ROUTES_ENABLED=true`.
- Root cause:
  The runtime bootstrap in `apps/api/src/app.ts` already gates protected and
  admin route registration on the presence of `OIDC_JWKS_URI`, `OIDC_ISSUER`,
  and `OIDC_AUDIENCE`, but the current test evidence is split between
  PostgreSQL-backed integration coverage and unit/contract tests. That leaves a
  composition gap for the exact `flag on + OIDC missing` activation matrix.
- Constraints and invariants:
  `AGENTS.md`;
  `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`;
  `docs/adr/ADR-0003-Execution-model-sovereignty.md`;
  `docs/adr/ADR-0031-storage-adapter-tenant-isolation-strategy.md`;
  `docs/planning/state/planning-control-tower.md`;
  `docs/planning/state/how-to-add-tasks.md`;
  `docs/planning/state/agent-lane-c.yaml`;
  `docs/guides/admin-rebuild-snapshot-technical-manual-20260405.md`.
- Options considered:
  1. Add the missing matrix cases into
     `apps/api/test/integration/protectedRuntime.integration.test.ts`.
  2. Add composition-focused tests to `apps/api/test/app.test.ts`, where
     runtime bootstrap guards are already exercised without requiring a live
     PostgreSQL schema or JWKS server.
  3. Change `apps/api/src/app.ts` proactively, even though the existing guard
     already reads correct by inspection.
- Selected option and rationale:
  Option 2. `AR-C1-T3` is about route activation semantics at composition time,
  not storage-backed protected runtime behavior. `app.test.ts` is the canonical
  place for bootstrap and route registration assertions, so the new evidence can
  stay fast, deterministic, and focused on whether the admin route is absent
  from the composed app when any OIDC prerequisite is missing.
- Rejected alternatives:
  Option 1 would entangle a composition guardrail with PG-backed integration
  setup and make failures harder to localize. Option 3 risks changing working
  production logic without first proving a defect exists.

## Pre-Implementation Brief

- Mode:
  Slim
- Scope:
  Add composition-level tests for the admin rebuild snapshot route under missing
  OIDC prerequisites, update the technical manual if needed, and close the lane
  task state.
- Touched files or paths:
  `apps/api/test/app.test.ts`,
  `docs/guides/admin-rebuild-snapshot-technical-manual-20260405.md`,
  `docs/planning/closeouts/20260407-ar-c1-t3-protected-runtime-admin-route-composition-closeout.md`,
  `docs/planning/state/agent-lane-c.yaml`.
- Expected outcome:
  The API test suite proves `POST /admin/runs/:runId/rebuild-snapshot` is not
  reachable when `DVT_ADMIN_ROUTES_ENABLED=true` but OIDC configuration is
  incomplete, and the planning/manual surfaces state that admin route activation
  depends on protected-runtime composition.
- Risks and mitigations:
  Risk: a test may accidentally pass because a request is rejected for the wrong
  reason instead of proving the route is absent. Mitigation: assert `404` and
  exercise both all-missing and partially-missing OIDC prerequisite cases.
  Risk: environment leakage between tests could produce false positives.
  Mitigation: keep env setup local to each test and explicitly clean all OIDC
  and admin-route variables in `finally` blocks.
- Out-of-scope:
  Admin RBAC behavior itself, PG-backed protected-runtime execution, and shared
  snapshot fixture extraction (`AR-C1-T4`).
- Validation plan:
  `pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/app.test.ts`
  `pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/entrypoints/http/adminRoutes.test.ts test/contracts/adminRebuildSnapshotAccessContract.test.ts test/integration/protectedRuntime.integration.test.ts`
  `pnpm docs:sync`
  `pnpm docs:workboard:generate`
  `pnpm verify:prepush`
- Test coverage plan:
  Add at least one negative-path test for all OIDC prerequisites absent with
  the admin flag enabled and one edge case for a partial OIDC configuration, in
  both cases asserting the admin route is unregistered (`404`) rather than
  merely unauthorized.
- Libraries evaluated:
  None evaluated â€” no custom implementation.

## Implementation Summary

- Added two composition tests in `apps/api/test/app.test.ts` covering
  `DVT_ADMIN_ROUTES_ENABLED=true` with:
  1. all OIDC prerequisites missing; and
  2. partial OIDC configuration present.
- Both tests assert `404` for:
  - `POST /admin/runs/:runId/rebuild-snapshot`
  - `POST /runs/start`
- Updated the admin technical manual to make route activation semantics
  explicit: the admin route is mounted only when protected-runtime OIDC
  composition is complete and the admin feature flag is enabled.
- Updated lane planning state to close `AR-C1-T3`.

## QA Notes

- First execution attempt of `vitest` failed before test collection because the
  local workspace lacked the `@dvt/plan-verifier` link in
  `apps/api/node_modules`. This was an environment/setup issue, not a product
  defect.
- `pnpm install` repaired the local workspace links without introducing source
  changes, after which the targeted and slice-level test runs passed.
- The final assertions verify route absence (`404`) rather than auth failures,
  which avoids a false-positive case where a mounted route could still reject
  for unrelated reasons.

## Validation Evidence

- Passed:
  `pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/app.test.ts`
- Passed:
  `pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/entrypoints/http/adminRoutes.test.ts test/contracts/adminRebuildSnapshotAccessContract.test.ts test/integration/protectedRuntime.integration.test.ts`
- Passed:
  `pnpm docs:sync`
- Passed:
  `pnpm docs:workboard:generate`
- Passed:
  `pnpm verify:prepush`
- Note:
  `test/integration/protectedRuntime.integration.test.ts` remained intentionally
  skipped in the slice-level run because `DATABASE_URL`/`DVT_PG_URL` was not
  configured in this environment; the suite's skip gate behaved as designed.
