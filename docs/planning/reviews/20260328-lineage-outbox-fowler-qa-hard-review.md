---
title: 20260328 Lineage Outbox Fowler QA Hard Review
status: Review
owner: adapters
last_reviewed: 2026-03-28
planning_type: review
---

# 20260328 Lineage Outbox Fowler QA Hard Review

## Scope and baseline

This review tracks the adapter-postgres and lineage runtime hardening slices related to:

- lineage outbox retry scheduling and tenant hardening
- state-store runtime decomposition and adapter boundary cleanup
- Sonar remediation for adapter and delivery runtime warnings

Code baseline used for this state snapshot:

- `0ac73b7` — `fix(adapters): Harden lineage outbox tenant scope and claim fencing`
- `faa6850` — `refactor(adapters): Harden runtime boundaries and transaction safety`
- `6b98f90` — `fix(adapters): Close Sonar blockers in adapter and lineage runtime`

## Current state (as of commit 6b98f90)

### Closed in code

1. Tenant scope hardening for lineage outbox and dead-letter persistence.
1. Claim fencing and retry scheduling with `next_attempt_at`.
1. Dead-letter read-limit validation and pending-limit validation symmetry.
1. `lagCount` now uses `countPending()` when available, not batch-capped by default.
1. Runtime/session hardening:
   - maintenance mode gate encapsulated in `withMaintenanceMode`
   - in-flight acquisition tracking included in active-client detection
   - rollback error object keeps operation compatibility fields
1. Sonar blockers from the adapter/delivery set:
   - TS:S5869 regex warning in lineage error sanitizer removed
   - TS:S6551 object-stringification fallback removed from adapter session
   - redundant type-alias usage in adapter constructor signature removed

### Still open

1. **[Medium] Integration depth gap on lineage outbox concurrency semantics**
   - Current tests are strong at unit level but still centered on mocks/recording clients for some race-sensitive SQL paths.
   - Remaining closure target is real Postgres integration coverage for claim-timeout boundary and stale-claimer interactions.
   - References:
     - `packages/@dvt/adapter-postgres/test/PostgresLineageOutboxStore.test.ts`
     - `docs/planning/state/agent-lane-b.yaml` (`RC-B5` follow-up scope)

1. **[Low] Tooling debt on `eslint-plugin-import` auto-fix behavior**
   - Local pattern uses inline type aliases in selected files to avoid known `import/order` fixer crashes in this environment.
   - This is intentionally deferred and tracked as a follow-up tooling slice, not solved inside runtime/domain refactors.
   - References:
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`
     - `packages/@dvt/adapter-postgres/src/PostgresStateStoreRuntime.ts`

1. **[Low] `lagCount` is eventual, not atomic**
   - `runOnce()` reads `listPending()` and `countPending()` in separate calls.
   - Under concurrent claims/deliveries, the reported lag can differ from the exact same-snapshot backlog.
   - This is acceptable for observability but should be treated as eventual-consistency behavior, not exact accounting.
   - References:
     - `packages/@dvt/delivery/src/application/LineageWorkerRuntime.ts` (`runOnce`)

1. **[Low] Redaction strategy remains pattern-based**
   - Runtime now redacts token/password/bearer patterns, including common JSON key forms.
   - Coverage is still regex-driven; uncommon/encoded secret formats can evade redaction.
   - Keep this as residual privacy risk until a structured allowlist/blocklist sanitizer is introduced.
   - References:
     - `packages/@dvt/delivery/src/application/LineageWorkerRuntime.ts` (`sanitizeErrorForPersistence`, `toErrorLike`)

## Evidence links

- [ED-20260328-lineage-outbox-retry-scheduling](../../evidence/ED-20260328-lineage-outbox-retry-scheduling.md)
- [ED-20260328-adapter-runtime-sonar-closeout](../../evidence/ED-20260328-adapter-runtime-sonar-closeout.md)

## Next steps

1. Close the real-DB lineage concurrency coverage gap (lane B follow-up task).
1. Execute tooling follow-up for `eslint-plugin-import` upgrade and remove workaround-only alias patterns.
1. Re-run full prepush baseline and archive closeout evidence for the follow-up slice.
