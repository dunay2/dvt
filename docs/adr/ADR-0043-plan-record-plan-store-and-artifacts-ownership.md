---
title: ADR-0043 - Plan record, plan store, and artifacts ownership
status: Accepted
owner: Architecture / Planner / Artifacts / API / Contracts
last_reviewed: 2026-04-02
---

# ADR-0043 - Plan record, plan store, and artifacts ownership

## Status

Accepted.

Narrowed by
[ADR-0054 - Plan Store Scoped Record Identity](./ADR-0054-plan-store-scoped-record-identity.md)
for tenant-owned record identity. ADR-0043 remains the ownership decision for
serializable records and artifacts-owned behavior ports.

## Context

The repository already has a partial persisted-plan runtime path:

- `apps/api` uses `PlannerBackedStartRunUseCase` to build, persist, validate,
  and start planner-backed runs.
- `PostgresPlanStore` already persists plan rows and exposes the current
  lifecycle facade.
- `StoredPlanExecutabilityValidator` already performs adapter-specific plan
  validation before admission.

That means S08 is not "introduce storage from scratch". The real gap is that
the current model still mixes multiple concerns:

- artifact identity and artifact persistence
- executability validation
- admission semantics
- supersession and archival
- behavior-port ownership

The repository also has an ownership contradiction:

- `packages/@dvt/contracts/src/ports/artifact-store.ts` still says artifact
  ports live in `@dvt/contracts`
- `packages/@dvt/artifacts/src/ports/ICompiledCodeStorage.ts` says the
  canonical owner is `@dvt/artifacts`
- `ADR-0034` assigns artifact behavior and application logic to the Artifacts
  bounded context

Without an ADR here, S08 could accidentally harden the wrong rule by placing a
new `IPlanStore` behavior port into the shared kernel.

There is also a model risk. Recent S08 sketches proposed a single "mega
PlanRecord" with:

- `canonicalPlanJson`
- `executablePlanJson`
- global validation state
- binding state
- admission state
- supersession state
- archival state

That would reopen two governance problems:

1. `ADR-0042` already closed the dual-plan-identity drift by making the
   planner-emitted canonical `ExecutionPlan` the public system of record.
2. `ADR-0041` and `ADR-0039` require explicit state models and
   single-responsibility boundaries rather than overloaded records with mixed
   lifecycle axes.

S08 therefore needs a narrower, cleaner model that is aligned with Fowler-style
operational artifact truth, Hexagonal DDD ownership, SRP, and CQRS.

## Decision

### 1. Serializable plan-domain records stay in planner contracts

Serializable planner-domain records remain physically published from
`packages/@dvt/contracts/src/contracts/planner/`.

This includes the S08 record family:

- `PlanRecord`
- `PlanExecutabilityRecord`
- `PlanAdmissionLink`

These records are cross-package serializable contracts. They belong in the
shared publication surface, while planner remains the semantic author per
`ADR-0035`.

### 2. Plan-storage behavior ports belong to the Artifacts context

Behavior ports for persisted plan storage do not belong in `@dvt/contracts`.

S08 behavior ports are owned by `@dvt/artifacts`, for example:

- `IPlanStoreWriter`
- `IPlanStoreReader`

An implementation may compose them behind an internal `IPlanStore` alias, but
that alias is not the governance entry point and does not change ownership.

### 3. S08-v1 uses a three-part operational model

S08-v1 defines three distinct record types.

#### `PlanRecord`

The canonical persisted plan artifact plus lineage and archival posture.

Required fields:

- `tenantId`
- `projectId`
- `environmentId`
- `planId`
- `canonicalPlanJson`
- `canonicalHash`
- `planVersion`
- `schemaVersion`
- `contractVersion`
- `sourceRef`
- `createdAtIso`
- `updatedAtIso`
- `state`

Optional lineage and archival fields:

- `derivedFromPlanId`
- `supersedesPlanId`
- `archivedAtIso`

`PlanRecord.state` is limited to:

- `ACTIVE`
- `SUPERSEDED`
- `ARCHIVED`

#### `PlanExecutabilityRecord`

The adapter-specific executability result for one
`tenantId + projectId + environmentId + planId + adapterId`.

Required fields:

- `tenantId`
- `projectId`
- `environmentId`
- `planId`
- `adapterId`
- `state`

Optional validation metadata:

- `validatedAtIso`
- `rejectionReport`

`PlanExecutabilityRecord.state` is limited to:

- `PENDING`
- `VALID`
- `INVALID`

#### `PlanAdmissionLink`

The admission relation between a persisted plan and a run.

Required fields:

- `tenantId`
- `projectId`
- `environmentId`
- `planId`
- `runId`
- `adapterId`
- `admittedAtIso`

Admission is therefore modeled as a relation, not as a `PlanRecord` state.

### 4. S08-v1 persists one canonical plan artifact

S08-v1 persists one canonical plan artifact as the system of record.

- `canonicalPlanJson` is `JCS(canonical ExecutionPlan)` governed by `ADR-0042`.
- `canonicalHash` is `sha256(canonicalPlanJson)`.
- planner-side hash evidence is published separately as
  `canonicalPlanCoreJson = JCS(planCore)`.
- S08-v1 does not introduce a second sibling field such as
  `executablePlanJson`.

If a future slice truly needs a derived executable artifact, that artifact must
be modeled as a distinct optional artifact with its own reference and lifecycle,
not as a second first-class payload on `PlanRecord`.

### 5. CQRS is explicit

S08-v1 uses explicit write-side and read-side ports.

Write-side responsibilities:

- `createPlanRecord`
- `recordExecutability`
- `markAdmitted`
- `markSuperseded`
- `archivePlan`

Read-side responsibilities:

- `getPlanRecord`
- `listExecutabilityByAdapter`
- `getAdmissionLinks`
- `getSupersession`

This keeps write truth and operator/query truth separate instead of collapsing
everything into one repository-shaped abstraction.

ADR-0054 further requires these read-side and write-side operations to accept
scoped input objects instead of naked `planId` parameters for tenant-owned
records.

### 6. PostgreSQL is the initial system of record

S08-v1 remains PostgreSQL-backed.

The repository already has:

- a Postgres adapter
- plan persistence tests
- planner-backed admission flow

PostgreSQL is therefore the lowest-risk first operational system of record for
this slice. Object storage for plans is not required in S08-v1.

### 7. Stored-plan artifact ports are canonical in `@dvt/artifacts`

`IStoredPlanArtifactStore` is the single lifecycle and materialization port for
stored executable plan artifacts.

The active ownership rule is:

1. `@dvt/contracts` owns serializable record and reference shapes.
2. `@dvt/artifacts` owns stored-plan artifact reader/writer ports.
3. `@dvt/adapter-postgres` implements those ports against PostgreSQL.
4. `@dvt/engine` owns only the integrity validator that consumes the
   artifact reader before dispatch.
5. API and planner services consume the artifacts-owned port and must not
   redeclare equivalent stored-plan lifecycle or validation ports.

There is no compatibility facade for `IPlanValidationLifecycleStore`,
`IPlanFetcher`, or API-local stored-plan validation ports in the active model.
Consumers that still depend on those names must fail in tests or type-checks.

### 8. `bindingState` is out of scope for S08-v1

S08-v1 does not introduce `bindingState`.

The current codebase does not yet have a first-class persisted binding aggregate
that justifies a separate binding lifecycle authority. Adding it now would be
speculative architecture rather than code-grounded modeling.

## Target ownership model

```mermaid
flowchart TD
  A[Serializable planner-domain records] --> B[@dvt/contracts/src/contracts/planner]
  C[Plan storage behavior ports] --> D[@dvt/artifacts/src/ports]
  E[Postgres implementation] --> F[@dvt/adapter-postgres]
  G[Admission orchestration] --> H[apps/api application services]
```

## Consequences

### Positive

- S08 stops competing with `ADR-0042`; there is one canonical persisted plan
  artifact in v1.
- Behavior-port ownership aligns with `ADR-0034` and the existing Artifacts
  bounded context.
- The model respects SRP by separating artifact truth, executability, and
  admission.
- CQRS becomes explicit instead of implicit.
- The migration path can reuse the current Postgres-backed implementation.

### Trade-offs

- S08 becomes more disciplined and less "all-in-one" than earlier sketches.
- Consumers must update to the artifacts-owned port instead of relying on old
  lifecycle/fetch names.
- Admission queries may need a small dedicated read surface instead of relying
  on one broad store abstraction.

## Alignment with prior ADRs

### ADR-0018

This ADR keeps serializable cross-package shapes in `@dvt/contracts`, but does
not extend that rule to behavior ports.

### ADR-0034

This ADR operationalizes the Artifacts bounded context by moving plan-storage
behavior to `@dvt/artifacts`.

### ADR-0035

Planner remains the semantic author of planner-domain contracts even when those
contracts are physically published from `@dvt/contracts`.

### ADR-0039

The three-part model and CQRS split are the concrete S08 application of the
repo's Hexagonal and SOLID hardening rules.

### ADR-0040

S08 is not blocked by retry ownership anymore. Retry authority is already
defined and is now a baseline input to the plan/admission model.

### ADR-0041

The explicit `PlanRecord.state` and `PlanExecutabilityRecord.state` vocabularies
follow the repository rule that state models must be explicit and not encoded as
ad hoc optional-field combinations.

### ADR-0042

The single canonical plan-artifact rule in this ADR is intentionally aligned
with `ADR-0042` and rejects the reintroduction of parallel canonical and
executable plan payloads as default peers.

## References

- [ADR-0018_Shared_Kernel_Ownership_Governance.md](./ADR-0018_Shared_Kernel_Ownership_Governance.md)
- [ADR-0034-bounded-context-boundaries-and-communication-rules.md](./ADR-0034-bounded-context-boundaries-and-communication-rules.md)
- [ADR-0035-planner-public-contract-evolution-protocol.md](./ADR-0035-planner-public-contract-evolution-protocol.md)
- [ADR-0039-hexagonal-port-hardening-and-solid-remediation.md](./ADR-0039-hexagonal-port-hardening-and-solid-remediation.md)
- [ADR-0040-retry-ownership-and-attempt-authority.md](./ADR-0040-retry-ownership-and-attempt-authority.md)
- [ADR-0041-global-domain-state-model-and-boundary-contracts.md](./ADR-0041-global-domain-state-model-and-boundary-contracts.md)
- [ADR-0042-execution-plan-canonical-identity-unification.md](./ADR-0042-execution-plan-canonical-identity-unification.md)
