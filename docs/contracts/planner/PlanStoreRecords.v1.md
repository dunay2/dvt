---
title: Plan store records v1
status: Active
owner: docs
last_reviewed: 2026-04-02
---

# Plan store records v1

## Purpose

`S08-2` introduces the persisted planner-record family without moving
plan-storage behavior into the shared kernel.

These records are serializable planner-domain artifacts published from
`@dvt/contracts`. They define what may be stored, validated, and linked, while
runtime behavior ports remain owned by `@dvt/artifacts` under `ADR-0043`.

## Normative sources

- `packages/@dvt/contracts/src/contracts/planner/PlanRecord.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/PlanRecord.v1.schema.json`
- `packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityRecord.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityRecord.v1.schema.json`
- `packages/@dvt/contracts/src/contracts/planner/PlanAdmissionLink.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/PlanAdmissionLink.v1.schema.json`
- `packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityValidation.v1.ts`
- `packages/@dvt/contracts/src/schemas.ts`
- `packages/@dvt/contracts/src/validation.ts`

## Record family

### `PlanRecord`

`PlanRecord` is the single persisted canonical plan artifact. It stores the
planner-emitted `ExecutionPlan` JSON in `canonicalPlanJson` and repeats query
keys at the top level for storage and lookup.

Invariants:

- `canonicalPlanJson` must parse as the canonical `ExecutionPlan`.
- top-level `planId`, `planVersion`, `schemaVersion`, and `contractVersion`
  must match `canonicalPlanJson.metadata` exactly.
- `schemaVersion` and `contractVersion` inherit validity from the canonical
  `ExecutionPlan`; arbitrary planner-record-only values are not allowed.
- `state` is explicit:
  - `ACTIVE`
  - `SUPERSEDED`
  - `ARCHIVED`
- `archivedAtIso` is required only when `state = 'ARCHIVED'`.

### `PlanExecutabilityRecord`

`PlanExecutabilityRecord` captures adapter-scoped executability, not global plan
truth.

Invariants:

- executability is keyed by `planId` plus `adapterId`.
- `state` is explicit:
  - `PENDING` with no validation timestamp and no rejection report
  - `VALID` with `validatedAtIso`
  - `INVALID` with both `validatedAtIso` and `rejectionReport`
- `rejectionReport.code` must use the canonical
  `ExecutabilityRejectionCode` vocabulary from
  `PlanExecutabilityValidation.v1.ts`.

### `PlanAdmissionLink`

`PlanAdmissionLink` models admission as a relation between a persisted plan and
the run that consumed it.

Invariants:

- admission is represented as a separate link record, not as mutable plan state
- a link records `planId`, `runId`, `adapterId`, and `admittedAtIso`

## Boundary rules

- `ADR-0042` remains the identity source: the planner-emitted canonical
  `ExecutionPlan` is the system of record.
- `ADR-0041` requires explicit state variants instead of overloaded optional
  fields.
- `ADR-0043` keeps serializable plan records in planner contracts while moving
  plan-storage behavior ownership to `@dvt/artifacts`.

## Related

- [Planner Contracts Index](index.md)
- [ADR-0041](../../adr/ADR-0041-global-domain-state-model-and-boundary-contracts.md)
- [ADR-0042](../../adr/ADR-0042-execution-plan-canonical-identity-unification.md)
- [ADR-0043](../../adr/ADR-0043-plan-record-plan-store-and-artifacts-ownership.md)
- [S08 execution plan](../../planning/proposals/s08-plan-record-plan-store-execution-plan-20260402.md)
