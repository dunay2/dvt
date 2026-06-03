---
slice: 20260426-api-tenant-qa-hardening
date: 2026-04-26
author: AI (GPT-5)
last_reviewed: 2026-04-26
status: Completed
---

# Closeout: API Tenant QA Hardening

## Think-First Analysis

- Problem summary:
  The adapter-postgres tenant QA slice had already fixed the core runtime bugs,
  but the branch still had three governance and operability gaps: the active
  review lived outside the canonical planning review tree, the branch lacked
  ARC-2 evidence/risk artifacts for adapter changes, and the new dual-store
  migration helper was exported but not adopted by any real API bootstrap.
- Root cause:
  The first pass closed the storage-layer issues faster than the planning and
  PR-governance surfaces were updated, so code and review posture drifted.
- Constraints and invariants:
  `AGENTS.md`;
  `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`;
  `docs/planning/state/planning-control-tower.md`;
  `docs/planning/reviews/review-naming-policy.md`;
  `docs/adr/ADR-0004-event-sourcing-strategy.md`;
  `.arc-policy.yaml`.
- Options considered:
  1. Leave the helper as a library-only primitive and merely soften the review wording.
  2. Adopt the helper in real API bootstraps, move the review to the canonical planning tree, and add the missing ARC-2 package.
- Selected option and rationale:
  Option 2. It closes the operational gap in the shipped startup paths and
  leaves the PR with repository-native evidence instead of chat-only rationale.
- Rejected alternatives:
  Option 1 would still leave the real bootstraps dependent on manual migration
  sequencing and would not satisfy the governance gap before PR creation.

## Pre-Implementation Brief

- Mode:
  Slim
- Scope:
  Adopt `migratePostgresRuntimeStores(...)` in `apps/api`; move and normalize
  the active review into `docs/planning/reviews/**`; add ARC-2 evidence and
  residual risk artifacts; regenerate governed docs.
- Touched files or paths:
  `apps/api/src/runtime/intentReconcilerRuntime.ts`,
  `apps/api/src/modules/buildProtectedRuntimeModule.ts`,
  `apps/api/test/modules/buildProtectedRuntimeModule.cases.ts`,
  `packages/@dvt/adapter-postgres/**`,
  `docs/adr/ADR-0004-event-sourcing-strategy.md`,
  `docs/planning/reviews/**`,
  `docs/evidence/**`,
  `docs/risk-register/quality/**`,
  `docs/planning/closeouts/**`,
  `docs/planning/status/generated-code-state.md`.
- Expected outcome:
  The branch is materially ready for PR: real API bootstraps use the shared
  migration helper, the active review is discoverable in the canonical planning
  review tree, and ARC-2 evidence/risk artifacts exist for the adapter changes.
- Risks and mitigations:
  Runtime composition edits in `apps/api` can drift from architecture tests.
  Mitigation: update source-level tests and run `dvt-api` test/typecheck plus
  adapter validation and `pnpm verify:prepush`.
- Out-of-scope:
  Adding `rollbackTo` to `StartRunIntentSchemaManager`, lane-YAML backlog
  decomposition, or any broader planner/engine refactor.
- Validation plan:
  `pnpm --filter @dvt/adapter-postgres test`;
  `pnpm --filter @dvt/adapter-postgres typecheck`;
  `pnpm --filter dvt-api test`;
  `pnpm --filter dvt-api typecheck`;
  `pnpm docs:status:generate`;
  `pnpm docs:sync`;
  `pnpm verify:prepush`.
- Test coverage plan:
  Preserve adapter negative-path coverage already added; add source-level proof
  that protected runtime composition uses the shared dual-store migration helper.
- Libraries evaluated:
  None evaluated - no custom implementation.

## Implementation Outcome

- `migratePostgresRuntimeStores(...)` is now used by both real API bootstraps
  that create the state store and the start-run intent store:
  `intentReconcilerRuntime.ts` and `buildProtectedRuntimeModule.ts`.
- The active QA review moved from the ad hoc `docs/reviews/` path to the
  canonical planning review tree as
  `docs/planning/reviews/architecture-and-governance/20260426-api-tenant-review.md`,
  and the review status board now lists it.
- ARC-2 artifacts for the adapter change are now present:
  `docs/evidence/ed-20260426-api-tenant-qa-hardening.md` and
  `docs/risk-register/quality/r-20260426-start-run-intent-rollback-asymmetry.md`.
- The residual risk is explicit: startup sequencing is now governed in API
  bootstraps, but schema downgrade symmetry for `start_run_intents` remains
  open by design.

## Actual Files Changed In This Slice

- `apps/api/src/runtime/intentReconcilerRuntime.ts`
- `apps/api/src/modules/buildProtectedRuntimeModule.ts`
- `apps/api/test/modules/buildProtectedRuntimeModule.cases.ts`
- `packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts`
- `packages/@dvt/adapter-postgres/src/PostgresTenantIsolationPolicy.ts`
- `packages/@dvt/adapter-postgres/src/StartRunIntentSchemaManager.ts`
- `packages/@dvt/adapter-postgres/src/index.ts`
- `packages/@dvt/adapter-postgres/src/sqlUtils.ts`
- `packages/@dvt/adapter-postgres/src/migratePostgresRuntimeStores.ts`
- `packages/@dvt/adapter-postgres/test/PostgresSchemaManager.rollback.test.ts`
- `packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts`
- `packages/@dvt/adapter-postgres/test/PostgresTenantIsolationPolicy.test.ts`
- `packages/@dvt/adapter-postgres/test/StartRunIntentSchemaManager.test.ts`
- `packages/@dvt/adapter-postgres/test/migratePostgresRuntimeStores.test.ts`
- `docs/adr/ADR-0004-event-sourcing-strategy.md`
- `docs/planning/reviews/architecture-and-governance/20260426-api-tenant-review.md`
- `docs/planning/reviews/review-status-board.md`
- `docs/evidence/ed-20260426-api-tenant-qa-hardening.md`
- `docs/risk-register/quality/r-20260426-start-run-intent-rollback-asymmetry.md`
- `docs/planning/closeouts/20260426-api-tenant-qa-hardening-closeout.md`
- `docs/planning/status/generated-code-state.md`

## Validation Results

- Passed: `pnpm --filter @dvt/adapter-postgres test`
- Passed: `pnpm --filter @dvt/adapter-postgres typecheck`
- Passed: `pnpm --filter dvt-api test`
- Passed: `pnpm --filter dvt-api typecheck`
- Passed: `pnpm docs:status:generate`
- Passed: `pnpm docs:sync`
- Passed: `pnpm verify:prepush`

## No-Debt / No-Stub Evidence

- No rule, hook, or check was bypassed.
- No placeholder implementation or fake success path was introduced.
- The active review now matches canonical placement rules instead of remaining
  as an untracked side note.
- The remaining downgrade asymmetry is recorded as explicit open risk rather
  than presented as if it were already solved.
