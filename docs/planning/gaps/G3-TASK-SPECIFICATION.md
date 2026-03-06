---
title: G3 TASK SPECIFICATION
status: Review
owner: docs
last_reviewed: 2026-03-06
planning_type: proposal
---

# G3 TASK SPECIFICATION

Gap: G3 - IStartRunIntentStore Postgres + scheduler

- Original date: 2026-03-04
- Current review date: 2026-03-06
- Primary source: [`GAP_EXECUTION_PLANS.md`](GAP_EXECUTION_PLANS.md)
- Process guide: [`../dvt-traceability-pack-v2-lite-R6/README.md`](../dvt-traceability-pack-v2-lite-R6/README.md)

## Objective

Close G3 with production-ready behavior:

1. Durable Postgres persistence for startRun intents.
2. Periodic reconciler worker with safe lifecycle and fault tolerance.
3. Runtime wiring (no orphan worker implementation).
4. Minimal observability and test coverage.

## Current Implementation Status (2026-03-06)

### Delivered

1. Postgres store implemented.
   - [`packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts`](../../../packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts)
2. Store schema concerns split into schema manager.
   - [`packages/@dvt/adapter-postgres/src/StartRunIntentSchemaManager.ts`](../../../packages/@dvt/adapter-postgres/src/StartRunIntentSchemaManager.ts)
3. Engine worker implemented with:
   - single-flight loop
   - infra-only backoff + jitter
   - per-tick timeout guard
   - metrics/log hooks
   - [`packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts`](../../../packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts)
4. Runtime wiring implemented in API startup/shutdown lifecycle.
   - [`apps/api/src/runtime/intentReconcilerRuntime.ts`](../../../apps/api/src/runtime/intentReconcilerRuntime.ts)
   - [`apps/api/src/server.ts`](../../../apps/api/src/server.ts)
5. Tests exist for store and worker paths.
   - [`packages/@dvt/adapter-postgres/test/PostgresStartRunIntentStore.test.ts`](../../../packages/@dvt/adapter-postgres/test/PostgresStartRunIntentStore.test.ts)
   - [`packages/@dvt/engine/test/workers/IntentReconcilerWorker.test.ts`](../../../packages/@dvt/engine/test/workers/IntentReconcilerWorker.test.ts)

### Decisions Applied

1. Active uniqueness for `(tenant_id, run_id)` in active states.
2. Typed transition errors (not found / invalid transition).
3. Worker backoff only for infrastructure errors.
4. Query and tick timeout guards enabled.

## Remaining Work To Mark G3 Fully Closed

1. Update evidence doc status from Draft to Final with real PR links.
2. Ensure load/resilience acceptance notes are recorded in evidence doc.
3. Sync architecture/system status document with actual implementation state.

## Closure Checklist

- [x] Postgres store covers required transitions.
- [x] Active unique index implemented.
- [x] Worker lifecycle behavior implemented.
- [x] Runtime wiring completed.
- [x] Unit/integration test files added.
- [ ] Evidence docs finalized and linked to merged PRs.
- [ ] System status docs updated to match implemented state.

## References

- Master gap plan: [`GAP_EXECUTION_PLANS.md`](GAP_EXECUTION_PLANS.md)
- Evidence: [`docs/evidence/ED-20260304-g3-intentstore-postgres-reconciler.md`](../../evidence/ED-20260304-g3-intentstore-postgres-reconciler.md)
