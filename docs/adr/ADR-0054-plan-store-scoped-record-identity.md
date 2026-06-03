---
title: Plan Store Scoped Record Identity
status: Accepted
date: 2026-05-09
owners:
  - Contracts
  - Artifacts
  - Adapter Postgres
arc_level: ARC-2
---

# ADR-0054: Plan Store Scoped Record Identity

## Status

Accepted.

## Context

ADR-0043 introduced the three-part plan-store model:

- immutable stored plan blob
- plan record
- admission relation

The S08 command/query matrix later selected a stronger model: content-addressed
plan blobs are tenant-neutral artifacts, while `PlanRecord`,
`PlanExecutabilityRecord`, and `PlanAdmissionLink` are tenant-owned records.
The implementation still accepted naked `planId` values in ports and SQL keys,
which made the tenant-owned record model ambiguous.

## Decision

Plan-store record identity is scoped.

- `PlanStoreScope = { tenantId, projectId, environmentId }`.
- `ScopedPlanId = PlanStoreScope + planId`.
- `ScopedPlanRef = PlanStoreScope + planRef`.
- `PlanRecord`, `PlanExecutabilityRecord`, and `PlanAdmissionLink` must carry
  `PlanStoreScope`.
- Artifacts plan-store ports must accept scoped input objects, not positional
  naked `planId` parameters.
- Postgres tenant-owned record tables must use composite keys and composite
  foreign keys over `(tenant_id, project_id, environment_id, plan_id)`.
- `stored_plans.plan_id` may remain a global content-addressed artifact key.

## Consequences

This narrows ADR-0043 for tenant-owned records.

No compatibility shim is provided for an unscoped plan-record API. Existing
callers must move to `PlanStoreScope`, `ScopedPlanId`, or `ScopedPlanRef`; any
missed caller should fail fast in type-checks or tests.

Existing unscoped local schemas require explicit remediation rather than silent
upgrade. Migration must fail fast when a legacy `plan_records` table lacks the
scope columns or when `stored_plans.canonical_plan_json` lacks ownership.

The existing blob lifecycle/fetch facade may remain only as the blob artifact
path. It does not define the tenant-owned record API and must not reintroduce
naked `planId` record commands or queries.

## Validation

- `packages/@dvt/contracts/test/validation/plan-records.ts`
- `packages/@dvt/contracts/test/plan-store-records-shape-sync.test.ts`
- `packages/@dvt/contracts/test/plan-store-records.architecture.test.ts`
- `packages/@dvt/adapter-postgres/test/PostgresPlanStore.sql.test.ts`
- `packages/@dvt/adapter-postgres/test/PostgresPlanStore.invariants.unit.test.ts`
