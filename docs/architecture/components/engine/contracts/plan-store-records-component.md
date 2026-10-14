---
title: Plan Store Records Component
status: Review
owner: Contracts / Artifacts / Adapter Postgres
last_reviewed: 2026-05-09
---

# Plan Store Records Component

## Public API

The component publishes tenant-owned plan-store records for the governed
ExecutionPlan v1 line.

- `PlanStoreScope`: `{ tenantId, projectId, environmentId }`.
- `ScopedPlanId`: `PlanStoreScope + planId`.
- `ScopedPlanRef`: `PlanStoreScope + planRef`.
- `PlanRecord`: tenant-owned persisted plan record.
- `PlanExecutabilityRecord`: adapter-specific executability state.
- `PlanAdmissionLink`: relation between scoped plan and run.
- `StoredPlanArtifactValidationRecord`: validation metadata for a tenant-neutral
  stored-plan artifact blob.
- `IPlanStoreReader`: scoped queries.
- `IPlanStoreWriter`: scoped commands.
- `IStoredPlanArtifactReader`: scoped plan-artifact materialization queries.
- `IStoredPlanArtifactWriter`: stored-plan artifact lifecycle commands.
- `IStoredPlanArtifactStore`: combined artifact lifecycle and materialization
  port for composition roots and adapters that implement both sides.
- `PostgresPlanStore`: Postgres adapter for scoped records plus stored-plan
  artifact lifecycle operations.

## Command And Query API

The component exposes three semantic port groups. They are kept in
`@dvt/artifacts` because ADR-0043 assigns behavior-port ownership to the
Artifacts bounded context, while `@dvt/contracts` owns only the serialized
record shapes.

| Rail     | Port/interface              | API                                                                        | Owner/read model                                    |
| -------- | --------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| `PS-C01` | `IStoredPlanArtifactWriter` | `storePlanArtifact(input: StorePlanArtifactInput)`                         | Stored-plan artifact lifecycle command              |
| `PS-C07` | `IStoredPlanArtifactWriter` | `markStoredPlanArtifactValid(input: ScopedPlanRef)`                        | Stored-plan artifact validation-state command       |
| `PS-C08` | `IStoredPlanArtifactWriter` | `markStoredPlanArtifactInvalid(input: MarkStoredPlanArtifactInvalidInput)` | Stored-plan artifact validation-state command       |
| `PS-Q06` | `IStoredPlanArtifactReader` | `getStoredPlanValidationRecord(input: ScopedPlanId)`                       | Stored-plan validation read model                   |
| `PS-Q07` | `IStoredPlanArtifactReader` | `fetchStoredPlanArtifactForValidation(input: ScopedPlanRef)`               | Validation materialization read model               |
| `PS-Q08` | `IStoredPlanArtifactReader` | `fetchStoredPlanArtifact(input: ScopedPlanRef)`                            | Runtime materialization read model                  |
| `PS-C02` | `IPlanStoreWriter`          | `createPlanRecord(record: PlanRecord)`                                     | `PlanRecord` aggregate command                      |
| `PS-C03` | `IPlanStoreWriter`          | `recordExecutability(record: PlanExecutabilityRecord)`                     | Plan executability domain-service command           |
| `PS-C04` | `IPlanStoreWriter`          | `markAdmitted(link: PlanAdmissionLink)`                                    | Admission relation command                          |
| `PS-C05` | `IPlanStoreWriter`          | `markSuperseded(input: MarkPlanSupersededInput)`                           | `PlanRecord` lifecycle command                      |
| `PS-C06` | `IPlanStoreWriter`          | `archivePlan(input: ArchivePlanInput)`                                     | `PlanRecord` retention command                      |
| `PS-Q01` | `IPlanStoreReader`          | `getPlanRecord(input: ScopedPlanId)`                                       | Plan record read model                              |
| `PS-Q02` | `IPlanStoreReader`          | `getPlanRecordByRef(input: ScopedPlanRef)`                                 | Plan record by stored artifact reference read model |
| `PS-Q03` | `IPlanStoreReader`          | `listExecutabilityByAdapter(input: ScopedPlanExecutabilityQuery)`          | Adapter executability read model                    |
| `PS-Q04` | `IPlanStoreReader`          | `getAdmissionLinks(input: ScopedPlanId)`                                   | Admission-link read model                           |
| `PS-Q05` | `IPlanStoreReader`          | `getSupersession(input: ScopedPlanId)`                                     | Supersession read model                             |

`IStoredPlanArtifactStore` is only a composition convenience:
`IStoredPlanArtifactWriter & IStoredPlanArtifactReader`. It is not a fourth
semantic rail and must not be used to hide command/query ownership.

## Invariants

- `stored_plans.plan_id` remains a tenant-neutral content artifact identity.
- `plan_records` is tenant-owned and keyed by
  `(tenant_id, project_id, environment_id, plan_id)`.
- `PlanRecord.canonicalPlanJson.metadata.ownership` is required and must match
  the top-level `PlanStoreScope`.
- Executability and admission rows must reference the same scoped plan record.
- Stored-plan artifact materialization is canonical in `@dvt/artifacts`; API,
  planner, and engine must not redeclare duplicate artifact lifecycle ports.
- Artifact fetches for runtime or validation accept `ScopedPlanRef`, not a
  naked `PlanRef`.
- A `PlanRecord` can be `ACTIVE`, `SUPERSEDED`, or `ARCHIVED`.
- `ARCHIVED` records require `archivedAtIso`.
- `PlanAdmissionLink` does not mutate `PlanRecord.state`.
- No compatibility shim exists for an unscoped plan-record command or query.
  Missed consumers must fail fast in tests or type-checks.
- No active `PlanValidationLifecycle.v1` contract exists. Artifact validation
  vocabulary is published as `StoredPlanArtifactValidationRecord`.
- Existing unscoped plan-record tables are not silently upgraded; schema
  migration must fail fast and require explicit remediation.

## Component Map

```mermaid
flowchart TB
  subgraph Contracts
    Scope[PlanStoreScope]
    Record[PlanRecord]
    Exec[PlanExecutabilityRecord]
    Link[PlanAdmissionLink]
    ArtifactValidation[StoredPlanArtifactValidationRecord]
  end

  subgraph Artifacts
    Reader[IPlanStoreReader]
    Writer[IPlanStoreWriter]
    ArtifactReader[IStoredPlanArtifactReader]
    ArtifactWriter[IStoredPlanArtifactWriter]
    ScopedRef[ScopedPlanRef]
  end

  subgraph Postgres
    Store[PostgresPlanStore]
    Repo[PostgresPlanRecordRepository]
    Blob[(stored_plans)]
    RecordTable[(plan_records)]
    ExecTable[(plan_executability_records)]
    LinkTable[(plan_admission_links)]
  end

  Scope --> Record
  Scope --> Exec
  Scope --> Link
  ArtifactValidation --> ArtifactReader
  Reader --> ScopedRef
  ArtifactReader --> ScopedRef
  Reader --> Store
  Writer --> Store
  ArtifactReader --> Store
  ArtifactWriter --> Store
  Store --> Repo
  Store --> Blob
  Repo --> RecordTable
  RecordTable --> ExecTable
  RecordTable --> LinkTable
```

## Transitions

```mermaid
stateDiagram-v2
  [*] --> ACTIVE: createPlanRecord/storePlanArtifact
  ACTIVE --> SUPERSEDED: markSuperseded(scoped old, new planId)
  ACTIVE --> ARCHIVED: archivePlan(scoped planId, archivedAtIso)
  SUPERSEDED --> [*]
  ARCHIVED --> [*]
```

Executability is independent from plan-record state:

```mermaid
stateDiagram-v2
  [*] --> PENDING
  PENDING --> VALID
  PENDING --> INVALID
  VALID --> INVALID: revalidation failure
  INVALID --> VALID: adapter capability restored
```

## Consumers

- API run-status evidence reads use scoped run metadata to resolve a plan
  record.
- API preview and planner-backed start-run write stored-plan artifacts through
  `IStoredPlanArtifactWriter`.
- Runtime dispatch and validation flows materialize executable bytes through
  `IStoredPlanArtifactReader` with `ScopedPlanRef`.
- Postgres read models use scoped keys for records, executability, and
  admission.
- Governance status uses this component to classify `SYS-PLANSTORE-POSTGRES`
  drift.

## User Stories

See
[plan-store-records-component.md](plan-store-records-component.md#section-plan-store-records-user-stories).

## Diagrams

```mermaid
sequenceDiagram
  participant API as API evidence reader
  participant Port as IPlanStoreReader
  participant Pg as PostgresPlanStore
  participant DB as Postgres

  API->>Port: getPlanRecord(tenantId, projectId, environmentId, planId)
  Port->>Pg: ScopedPlanId
  Pg->>DB: SELECT by composite key
  DB-->>Pg: tenant-owned record
  Pg-->>API: PlanRecord
```

```mermaid
sequenceDiagram
  participant API as API validation/start-run
  participant ArtifactPort as IStoredPlanArtifactReader
  participant Pg as PostgresPlanStore
  participant DB as Postgres

  API->>ArtifactPort: fetchStoredPlanArtifact(ScopedPlanRef)
  ArtifactPort->>Pg: scoped planRef
  Pg->>DB: assert plan_records scope + read stored_plans bytes
  DB-->>Pg: executable plan artifact
  Pg-->>API: StoredPlanArtifact
```

## Drift Guards

- Architecture test:
  `packages/@dvt/contracts/test/plan-store-records.architecture.test.ts`.
- Contract validation:
  `packages/@dvt/contracts/test/validation/plan-records.ts`.
- Shape sync:
  `packages/@dvt/contracts/test/plan-store-records-shape-sync.test.ts`.
- Postgres SQL invariant tests:
  `packages/@dvt/adapter-postgres/test/PostgresPlanStore.sql.test.ts`.
- Engine boundary architecture test:
  `packages/@dvt/engine/test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts`.

<a id="section-plan-store-records-user-stories"></a>

## Plan Store Records User Stories

### Command/Query Coverage

| Story        | Rail(s)                                          | Covered scenario                                                    |
| ------------ | ------------------------------------------------ | ------------------------------------------------------------------- |
| `US-PSR-001` | `PS-C01`, `PS-C02`                               | Store an artifact and create the scoped plan record.                |
| `US-PSR-002` | `PS-C01`, `PS-Q01`                               | Reject records whose canonical ownership does not match the scope.  |
| `US-PSR-003` | `PS-Q02`, `PS-Q08`                               | Resolve and materialize by `ScopedPlanRef`.                         |
| `US-PSR-004` | `PS-C02`, `PS-Q01`                               | Keep same content-derived plan id isolated across tenants.          |
| `US-PSR-005` | `PS-C03`, `PS-Q03`                               | Record and query scoped adapter executability.                      |
| `US-PSR-006` | `PS-C04`, `PS-Q04`                               | Record and query admission links under the scoped plan record.      |
| `US-PSR-007` | `PS-C05`, `PS-Q05`                               | Supersede a plan without crossing tenant/project/environment scope. |
| `US-PSR-008` | `PS-C06`, `PS-Q01`                               | Archive a scoped plan record with auditable timestamp evidence.     |
| `US-PSR-009` | `PS-C02`                                         | Fail fast when legacy backfill lacks canonical ownership.           |
| `US-PSR-010` | `PS-C07`, `PS-C08`, `PS-Q06`, `PS-Q07`, `PS-Q08` | Guard scoped validation and runtime materialization semantics.      |

### US-PSR-001 Create Scoped Plan Record

As a runtime operator, I want a plan record created with
`tenantId`, `projectId`, `environmentId`, and `planId` so that tenant-owned
evidence cannot be resolved by content hash alone.

Given a missing scope tuple, validation rejects the record.

### US-PSR-002 Validate Canonical Ownership

As an auditor, I want top-level scope fields to match
`canonicalPlanJson.metadata.ownership` so that the persisted record cannot claim
another tenant's plan.

Given a mismatched canonical ownership tuple, validation rejects the record.

### US-PSR-003 Resolve By Scoped Plan Ref

As an API evidence reader, I want `ScopedPlanRef` to combine scope and plan ref
metadata so that a URI/hash match is not enough to cross tenant boundaries.

### US-PSR-004 Support Shared Content Hash Across Tenants

As a platform operator, I want two tenants to reuse the same content-derived
plan id while keeping separate record state.

Given two tenants share the same content-derived plan id, each tenant resolves
only its own `PlanRecord`.

### US-PSR-005 Record Adapter Executability

As a runtime adapter owner, I want executability state stored under the same
scope tuple as the plan record so that adapter readiness cannot leak across
tenants.

### US-PSR-006 Record Admission Link

As a run auditor, I want a run admission link to reference the scoped plan
record so that admitted runs are traceable to tenant-owned evidence.

Given an admission link references another tenant, the database foreign key
rejects it.

### US-PSR-007 Supersede Plan Record

As a planner maintainer, I want supersession to be scoped so that replacing a
plan in one tenant does not mutate another tenant's record with the same plan
id.

### US-PSR-008 Archive Plan Record

As an operations maintainer, I want archiving to require scope and
`archivedAtIso` so that retention transitions remain tenant-local and
auditable.

### US-PSR-009 Backfill Legacy Stored Plans

As a migration operator, I want backfill to fail fast when stored canonical
plans lack ownership so that unscoped historical rows do not become ambiguous
tenant records.

### US-PSR-010 Guard Architecture Drift

As an architecture reviewer, I want a semantic architecture test to reject
naked `planId` record APIs, missing docs, missing owned-concern docblocks, and
unscoped SQL keys.

Given the retired lifecycle contract source reappears, the architecture test
fails because S08 publishes artifact validation vocabulary through
`StoredPlanArtifactValidationRecord`, not `PlanValidationLifecycle.v1`.

> Acceptance scope status: Review. Owner: Contracts / Artifacts / Adapter Postgres.
