---
id: R-20260426-START-RUN-INTENT-ROLLBACK-ASYMMETRY
title: Start-run intent schema downgrade remains asymmetric
status: Open
date: 2026-04-26
owners:
  - packages/@dvt/adapter-postgres
severity: Low
probability: Medium
---

# R-20260426-START-RUN-INTENT-ROLLBACK-ASYMMETRY

## Context

The core Postgres schema manager supports rollback planning and execution.
`StartRunIntentSchemaManager` still supports only forward migration.

The current QA hardening slice mitigates the operational memory risk of dual
migrations by introducing and adopting `migratePostgresRuntimeStores(...)`, but
it does not add symmetric downgrade behavior for the intent schema.

## Risk

If an operator needs to downgrade the `start_run_intents` schema in a real
incident, the downgrade path is manual SQL rather than a governed `rollbackTo`
API. That increases procedural risk and makes rollback posture asymmetric
between the two schema managers.

## Implemented Mitigations

- migration metadata now states clearly that hardening steps are idempotent and
  do not imply historical snapshot semantics;
- API bootstraps that need both stores use one shared helper so the runtime
  startup path is explicit and repeatable;
- the residual asymmetry is documented in the canonical review and this risk
  register entry instead of being hidden behind optimistic wording.

## Remaining Actions

1. Decide whether `StartRunIntentSchemaManager` should expose `rollbackTo`.
2. If not, publish an explicit manual downgrade runbook for `start_run_intents`.
3. Keep the review and evidence artifacts aligned with the chosen operational
   posture.

## Evidence

- `packages/@dvt/adapter-postgres/src/StartRunIntentSchemaManager.ts`
- `packages/@dvt/adapter-postgres/src/migratePostgresRuntimeStores.ts`
- `apps/api/src/runtime/intentReconcilerRuntime.ts`
- `apps/api/src/modules/buildProtectedRuntimeModule.ts`
- `docs/planning/reviews/architecture-and-governance/20260426-api-tenant-review.md`
- `docs/evidence/ed-20260426-api-tenant-qa-hardening.md`
