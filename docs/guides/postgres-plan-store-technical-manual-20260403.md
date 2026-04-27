---
title: PostgresPlanStore Technical Manual
status: Active
owner: Adapters / Artifacts / Architecture
last_reviewed: 2026-04-03
---

# PostgresPlanStore Technical Manual

## Purpose

This manual describes the current technical behavior of
`packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts`, the active
invariants, and the current architectural-gap status.

## Governing sources

- `AGENTS.md`
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`
- `docs/adr/ADR-0039-hexagonal-port-hardening-and-solid-remediation.md`
- `docs/adr/ADR-0043-plan-record-plan-store-and-artifacts-ownership.md`
- `docs/planning/reviews/architecture-and-governance/20260403-postgres-plan-store-srp-remediation-target.md`
- `docs/planning/reviews/architecture-and-governance/20260403-s08-postgres-plan-store-hard-qa-review.md`

## Runtime role

`PostgresPlanStore` currently implements four ports:

- `IPlanValidationLifecycleStore`
- `IPlanFetcher`
- `IPlanStoreWriter`
- `IPlanStoreReader`

Ownership note: `IPlanValidationLifecycleStore` is now imported from
`@dvt/planner` as a planner-owned behavior port. Shared serializable plan
records, refs, validation records, and executability DTOs remain in
`@dvt/contracts`.

```mermaid
flowchart LR
  subgraph Callers
    C1[Planner pipeline]
    C2[Validation lifecycle callers]
    C3[Runtime fetch callers]
    C4[Artifacts readers]
  end

  subgraph AdapterPostgres
    S[PostgresPlanStore]
  end

  subgraph Storage
    T1[(stored_plans)]
    T2[(plan_records)]
    T3[(plan_executability_records)]
    T4[(plan_admission_links)]
  end

  C1 --> S
  C2 --> S
  C3 --> S
  C4 --> S
  S --> T1
  S --> T2
  S --> T3
  S --> T4
```

Composition now delegates infrastructure responsibilities:

- `composePostgresPlanStore` owns runtime assembly wiring for the plan-store
  facade.
- `PostgresPlanStoreTxRunner` owns connection/transaction execution policy.
- `PostgresPlanStoreSchemaManager` owns schema creation and backfill/reconcile.
- `PostgresPlanRecordRepository` owns `plan_records` reads/writes/lineage checks.
- `PostgresPlanExecutabilityRepository` owns `plan_executability_records`.
- `PostgresPlanAdmissionRepository` owns `plan_admission_links`.
- `PostgresExecutableBlobRepository` owns `stored_plans` persistence/fetch and
  validation-state transitions.
- `PostgresPlanStore` remains the application-facing lifecycle/fetch facade.

## Current data model

```mermaid
erDiagram
  PLAN_RECORDS ||--o{ PLAN_EXECUTABILITY_RECORDS : "plan_id"
  PLAN_RECORDS ||--o{ PLAN_ADMISSION_LINKS : "plan_id"

  PLAN_RECORDS {
    text plan_id PK
    text canonical_hash
    text plan_version
    text schema_version
    text contract_version
    text source_ref
    text state
    timestamptz created_at
    timestamptz updated_at
    text derived_from_plan_id
    text supersedes_plan_id
    timestamptz archived_at
  }

  PLAN_EXECUTABILITY_RECORDS {
    text plan_id FK
    text adapter_id PK
    text state
    timestamptz validated_at
    jsonb rejection_report_json
  }

  PLAN_ADMISSION_LINKS {
    text plan_id FK
    text run_id PK
    text adapter_id PK
    timestamptz admitted_at
  }
```

## Write and transition behavior

### `storePlan(buildResult)`

1. Persists canonical and executable content in `stored_plans` with
   `PENDING_VALIDATION`.
2. Validates idempotent replay via `assertStoredPlanMatchesRequest`.
3. Upserts `plan_records` with guarded immutable equality checks.
4. Upsert guard is intentionally strict and non-legacy:
   - row must match immutable identity, including `created_at`
   - row must still be `ACTIVE`
   - duplicate writes against `ARCHIVED` / `SUPERSEDED` records fail with
     `PLAN_RECORD_CONFLICT`
   - backfilled legacy rows whose `created_at` does not match the incoming
     canonical metadata timestamp fail with `PLAN_RECORD_CONFLICT` by design.

### `markValid(planRef)` and `markInvalid(planRef, report)`

1. Enforce transition from `PENDING_VALIDATION` only.
2. Update `stored_plans`.
3. Do not write implicit adapter executability side effects.
   Adapter-scoped executability is recorded explicitly via
   `recordExecutability`.

### `markSuperseded(planId, supersededByPlanId)`

1. Rejects self-supersession.
2. Moves superseded row to `SUPERSEDED` only when currently `ACTIVE`.
3. Requires the superseder row to exist and be `ACTIVE`.
4. Writes lineage on superseder (`supersedes_plan_id = superseded plan`).

### `archivePlan(planId, archivedAtIso)`

- Sets `state=ARCHIVED`, `archived_at`, and updates timestamp.
- Rejects unknown plan id with `PLAN_RECORD_NOT_FOUND`.

## Read integrity behavior

- `getPlanRecordByRef(planRef)` enforces metadata match (`uri`, `planVersion`,
  `schemaVersion`) and throws `PLAN_REF_MISMATCH` on drift.
- `toPlanExecutabilityRecord` is strict:
  - `VALID` without `validated_at` throws.
  - `INVALID` without `validated_at` or `rejection_report_json` throws.
  - No fabricated fallback records are emitted.

## Architectural gap status

No open architectural gaps remain for the S08 scope.

## Compatibility posture

This slice does not preserve legacy timestamp compatibility for backfilled
`plan_records.created_at` values. Upgrade paths that rely on idempotent replay
for old pending rows with backfilled timestamps can now fail with
`PLAN_RECORD_CONFLICT`. This is intentional: no legacy fallback path is
applied in `upsert`.

## Closed in this slice

1. `derived_from_plan_id` and `supersedes_plan_id` are now FK-constrained to
   `plan_records(plan_id)`.
2. Repository split for `plan-record` / `executability` / `admission` is
   complete and delegated to dedicated repository classes.
3. Composer-level extraction is complete through `composePostgresPlanStore`.
4. Critical invariants are now covered by always-on unit tests without
   PostgreSQL.

## Validation and diagnostics

Recommended local validation for this slice:

```bash
pnpm --filter @dvt/adapter-postgres test -- PostgresPlanStore.invariants.unit.test.ts
pnpm --filter @dvt/adapter-postgres test
pnpm --filter @dvt/adapter-postgres build
pnpm verify:prepush
```

For optional real-DB conformance scenarios, set:

```bash
$env:DVT_PG_INTEGRATION='1'
pnpm --filter @dvt/adapter-postgres test
```

## Implementation status

Decomposition milestones already completed are documented in this manual's
"Composition now delegates infrastructure responsibilities" section.
This manual intentionally tracks only current state and open gaps.
