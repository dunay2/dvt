---
title: S08 plan-store command and query matrix
status: Active
owner: Architecture / Planner / Artifacts / API / Storage
last_reviewed: 2026-05-15
planning_type: proposal
---

# S08 plan-store command and query matrix

## Purpose

This document is the scope gate for the S08 plan-store tenancy closure.

No implementation in the S08 plan-store tenancy slice may add, remove, or
change plan-store behavior unless it is listed in this matrix. Any discovered
method, caller, SQL path, contract field, or documentation claim outside this
matrix is drift until this document is updated and reviewed.

## Review Gate

Architecture review and implementation execution are complete for the S08
scoped-port closure recorded in this matrix and its linked mechanization
manifests.

Future changes to S08 plan-store behavior remain blocked unless they are
expressed as explicit matrix amendments and reviewed before implementation.

Minimum review decisions:

- accept or amend Model B as the S08 storage identity model;
- accept or amend the closed `PS-Cxx` / `PS-Qxx` catalog;
- confirm that no legacy lifecycle facade is allowed as retained runtime
  behavior;
- confirm the first implementation slice below.

## Governing Sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/adr/ADR-0031-adapter-tenant-isolation.md`
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`
- `docs/adr/ADR-0041-global-domain-state-model-and-boundary-contracts.md`
- `docs/adr/ADR-0042-execution-plan-canonical-identity-unification.md`
- `docs/adr/ADR-0043-plan-record-plan-store-and-artifacts-ownership.md`
- `docs/contracts/planner/plan-store-records-v1.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-record-plan-store-execution-plan-20260402.md`
- `docs/planning/closeouts/20260425-production-tenant-isolation-baseline-closeout.md`
- `docs/architecture/components/engine/security/SECURITY_INVARIANTS.v1.md`
- `docs/architecture/components/engine/security/TENANT_ISOLATION_TESTS.v1.md`

## Think-First Analysis

### Problem Summary

S08 cannot start from code changes because the current runtime graph exposes
multiple plan-store meanings under unscoped method names. `storePlan`,
`markValid`, `markInvalid`, `fetch(planRef)`, `fetchForValidation(planRef)`,
`getPlanRecord(planId)`, and related repository helpers still make global
`plan_id` or `plan_uri` look like product authority.

The system-operations inventory confirms the same active drift cluster across
contracts, artifacts ports, adapter-postgres, API composition, engine fetch,
Temporal worker resources, and route/use-case handoff. That inventory was read
as a current-state input for this matrix. The tracked repository governance
remains the authority for implementation.

### Root Cause

The root cause is not a missing column alone. The storage model collapsed two
different identities:

- a tenant-neutral immutable artifact identity derived from content hash;
- a tenant-owned plan-record identity that authorizes product behavior inside a
  `(tenantId, projectId, environmentId)` scope.

That collapse let lifecycle facade methods and unscoped fetch/query ports
survive as if `PlanRef` or `plan_id` proved ownership. They do not. They prove
only artifact identity and integrity.

### Constraints And Invariants

- ADR-0031 requires explicit tenant isolation at adapter boundaries.
- ADR-0034 requires bounded-context ownership and forbids convenience boundary
  shortcuts.
- ADR-0041 requires explicit state models instead of implicit lifecycle state.
- ADR-0042 keeps executable plan identity content-derived.
- ADR-0043 places plan-store behavior ports in `@dvt/artifacts`, while engine
  fetch remains engine-owned.
- Command/query rail governance requires every externally observable behavior
  to map to one DDD-owned command or query before implementation.
- Fowler planning governance requires implementation surfaces, negative tests,
  and out-of-scope items to be declared before code changes.

### Options Considered

| Option                                                | Result   | Reason                                                                                                                                                 |
| ----------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Scope-leading artifact table only                     | Rejected | It would make artifact bytes tenant-owned and lose the intentional Model B dedupe boundary.                                                            |
| Keep global `plan_id` and add policy checks around it | Rejected | It leaves authorization dependent on wrappers and lets legacy ports keep expressing global product reads.                                              |
| Model B: tenant-neutral artifact plus scoped records  | Selected | It preserves content-addressed artifact reuse while making plan records, executability, admission, lineage, and dispatch materialization tenant-owned. |

### Selected Option

Use Model B and implement only the command/query catalog below. Any code path
that cannot be expressed as one of these commands or queries is drift and must
be removed or reclassified before implementation.

### Out Of Scope For The First Implementation Slice

- No frontend behavior.
- No provider adapter semantics change.
- No unrelated canonical hashing cleanup.
- No retention or archive policy redesign beyond scoped plan-record archival.
- No compatibility facade retained as runtime behavior.

## First Implementation Slice Candidate

`S08-IMPL-01` is the smallest closed implementation slice that can start after
review acceptance.

| Field                   | Decision                                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Slice                   | `S08-IMPL-01` scoped plan-record contracts and ports                                                                                                                                       |
| C&Q rows                | `PS-C02`, `PS-C03`, `PS-C04`, `PS-Q01`, `PS-Q02`, `PS-Q03`, `PS-Q04`, `PS-Q05`                                                                                                             |
| DDD owners              | `PlanRecord` aggregate, plan executability domain service, runtime admission application service, plan record/executability/admission/lineage read models                                  |
| Allowed surfaces        | `docs/contracts/planner/plan-store-records-v1.md`, `packages/@dvt/contracts/**`, `packages/@dvt/artifacts/src/ports/**`, focused contract/architecture tests                               |
| Explicitly out of scope | API composition, Temporal worker composition, engine dispatch materialization, SQL migration, lifecycle facade deletion                                                                    |
| Red tests first         | Contract shape rejects unscoped plan records; artifacts ports cannot express unscoped plan-record commands/queries; architecture guard rejects lifecycle facade as canonical S08 authority |
| ARC posture             | ARC-2 is required once code under contracts/artifacts changes; evidence and risk entries must be created before PR creation                                                                |

This slice does not claim S08 closure. It only creates the typed command/query
boundary needed before storage, API, Temporal, and engine runtime rewiring can
remove legacy behavior without reintroducing drift.

## Scope Rule

The allowed command/query set below is closed for the S08 tenancy slice.

- Canonical plan-store behavior ports are owned by `@dvt/artifacts`.
- Serializable plan-store records are planner-domain contracts published from
  `@dvt/contracts`.
- Every command and query must belong to an explicit DDD owner: an aggregate
  root, domain service, application service, or owned port. Free-floating
  repository methods, helper functions, and SQL operations are drift even when
  they use a listed command/query name.
- PostgreSQL is the first system of record.
- `IPlanValidationLifecycleStore` is not an allowed retained runtime surface for
  S08 closure.
- `IPlanFetcher` is engine-owned artifact fetch behavior, not a plan-store
  ownership API.
- Legacy and unscoped methods are blocking drift. They must disappear from
  runtime command/query surfaces before S08 can be accepted.

## DDD Ownership Rule

The matrix is not a list of loose functions. Each command and query is a
behavior owned by a DDD boundary and implemented through a named application or
domain-facing port.

Allowed ownership categories:

- aggregate behavior for the persisted plan artifact record family
- domain service behavior for executability, admission, supersession, or
  archival policy
- application service orchestration for preview, start-run, validation, or
  runtime dispatch
- owned port behavior where the port name and package owner are explicit

Disallowed shapes:

- direct SQL operations treated as product commands
- repository methods exposed as the governing API
- helper functions that mutate or read plan-store state without a matrix row
- cross-boundary convenience methods that combine unrelated aggregate behavior
- legacy lifecycle calls used as new product authority

If a command or query cannot name its DDD owner, it is not approved for the S08
tenancy slice.

## Concrete Command And Query Catalog

This catalog is the implementation authority. The shorter command/query matrix
below is a summary view; implementation work must use the concrete names,
inputs, outputs, allowed surfaces, and tests in this catalog.

### Shared Value Objects

| Value object           | Shape                                                            | Rule                                                                                          |
| ---------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `PlanStoreScope`       | `{ tenantId: string; projectId: string; environmentId: string }` | Required for every tenant-owned command and query. Empty fields are invalid.                  |
| `ScopedPlanId`         | `PlanStoreScope + { planId: string }`                            | Identifies a tenant-owned plan record, not a tenant-neutral artifact.                         |
| `ScopedPlanRef`        | `PlanStoreScope + { planRef: PlanRef }`                          | Authorizes materialization only after scoped record lookup succeeds.                          |
| `PlanArtifactIdentity` | `{ artifactHash: string; planId: string }`                       | Tenant-neutral immutable artifact identity. It is never sufficient for product authorization. |

### Commands

| ID       | Concrete command             | Input                                                        | Output                                    | DDD owner                                                                           | Allowed implementation surfaces                                                                            | Required negative tests                                                                                                                            |
| -------- | ---------------------------- | ------------------------------------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PS-C01` | `CreateStoredPlan`           | `PlanStoreScope + PlannerBuildResultV1`                      | `PlanRef` plus scoped plan-record receipt | Preview/start-run application service orchestrating `PlanRecord` aggregate creation | `@dvt/artifacts` write port, `@dvt/adapter-postgres` scoped write adapter, API preview/start-run use cases | Reject missing scope, missing plan ownership, ownership mismatch, artifact conflict, and legacy lifecycle call path.                               |
| `PS-C02` | `CreatePlanRecord`           | `PlanRecord` with top-level scope tuple and artifact pointer | created receipt or duplicate rejection    | `PlanRecord` aggregate                                                              | `@dvt/contracts` record shape, `@dvt/artifacts` write port, adapter scoped repository                      | Reject unscoped payload, duplicate same scoped key, cross-scope lineage reference, and global `plan_id` collision assumptions.                     |
| `PS-C03` | `RecordPlanExecutability`    | `PlanExecutabilityRecord` with scope tuple                   | upsert receipt                            | Plan executability domain service                                                   | Planner/API validation service, `@dvt/artifacts` write port, adapter scoped repository                     | Reject unscoped record, missing scoped plan record, lifecycle `markValid/markInvalid` fallback, and adapter state mismatch.                        |
| `PS-C04` | `MarkPlanAdmitted`           | `PlanAdmissionLink` with scope tuple and run id              | admitted receipt                          | Runtime admission application service                                               | API start-run admission path, `@dvt/artifacts` write port, adapter scoped repository                       | Reject unscoped link, missing scoped plan record, missing executability, cross-tenant run/plan pair, and direct engine dispatch without admission. |
| `PS-C05` | `MarkPlanSuperseded`         | `PlanStoreScope + { planId; supersededByPlanId }`            | supersession receipt                      | Plan lineage aggregate behavior                                                     | `@dvt/artifacts` write port and adapter scoped repository                                                  | Reject self-supersession, missing same-scope superseder, cross-scope supersession, archived superseder, and global lookup by `planId`.             |
| `PS-C06` | `ArchivePlan`                | `PlanStoreScope + { planId; archivedAtIso }`                 | archive receipt                           | Plan archival aggregate behavior                                                    | `@dvt/artifacts` write port and adapter scoped repository                                                  | Reject missing same-scope record, cross-scope archive, invalid timestamp, and archive through unscoped port.                                       |
| `PS-C07` | `RemoveLifecycleMarkValid`   | none                                                         | none                                      | Removal path owned by plan executability domain service                             | Contract exports, planner facade, API preview/start-run wiring, adapter facade                             | Architecture tests prove no runtime import/call of `markValid` remains.                                                                            |
| `PS-C08` | `RemoveLifecycleMarkInvalid` | none                                                         | none                                      | Removal path owned by plan executability domain service                             | Contract exports, planner facade, API preview/start-run wiring, adapter facade                             | Architecture tests prove no runtime import/call of `markInvalid` remains.                                                                          |

### Queries

| ID       | Concrete query                   | Input                                                                      | Output                                          | DDD owner                                               | Allowed implementation surfaces                                                  | Required negative tests                                                                                                                |
| -------- | -------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `PS-Q01` | `GetPlanRecord`                  | `ScopedPlanId`                                                             | `PlanRecord` or scoped miss                     | Plan record read model                                  | `@dvt/artifacts` read port, adapter scoped repository, API run-status enrichment | Cross-tenant miss is generic; unscoped `planId` query is impossible at port boundary.                                                  |
| `PS-Q02` | `GetPlanRecordByRef`             | `ScopedPlanRef`                                                            | `PlanRecord` or scoped miss                     | Plan record read model                                  | `@dvt/artifacts` read port, adapter scoped repository                            | Reject mismatched `sourceRef`, version, schema, hash, or scope; do not reveal cross-tenant existence.                                  |
| `PS-Q03` | `ListPlanExecutabilityByAdapter` | `PlanStoreScope + { planId; adapterId? }`                                  | scoped executability records                    | Executability read model                                | `@dvt/artifacts` read port and adapter scoped repository                         | Reject/miss cross-scope reads and global adapter history reads.                                                                        |
| `PS-Q04` | `GetPlanAdmissionLinks`          | `ScopedPlanId`                                                             | scoped admission links                          | Admission read model                                    | `@dvt/artifacts` read port and adapter scoped repository                         | Reject/miss cross-scope reads and global admission history reads.                                                                      |
| `PS-Q05` | `GetPlanSupersession`            | `ScopedPlanId`                                                             | scoped supersession relation or miss            | Plan lineage read model                                 | `@dvt/artifacts` read port and adapter scoped repository                         | Cross-scope supersession must be impossible by query shape and by storage constraint.                                                  |
| `PS-Q06` | `RemoveValidationRecordQuery`    | none                                                                       | none                                            | Removal path owned by validation read-model replacement | Contract exports, adapter facade, tests/docs                                     | Architecture tests prove `getValidationRecord(planId)` is not a runtime query.                                                         |
| `PS-Q07` | `FetchPlanForValidation`         | `ScopedPlanRef`                                                            | executable artifact bytes plus execution policy | Plan validation application service                     | API scoped validation reader, adapter scoped materializer                        | Reject unscoped fetch, missing scoped plan record, non-admitted ownership mismatch, and direct artifact lookup.                        |
| `PS-Q08` | `FetchPlanForEngineDispatch`     | `ScopedPlanRef` or tenant-scoped fetcher constructed from `PlanStoreScope` | engine `StoredPlanArtifact`                     | Engine start/recovery application service               | Engine-owned fetch port, API/worker scoped wrapper, adapter scoped materializer  | Reject unscoped engine fetch, cross-tenant plan ref, URI-policy-only authorization, and dispatch before scoped record materialization. |

## No-Legacy Rule

Legacy is an inventory label only, not an accepted end state. S08 closure does
not allow retained legacy runtime behavior, compatibility facades, unscoped
product methods, or alternate versions of the same command/query.

The only acceptable disposition for a legacy runtime surface is removal from the
runtime graph after replacement by the scoped matrix command/query. Historical
data migration artifacts may exist only as explicit one-way migration assets;
they must not remain callable as product behavior or as adapter/service ports.

## Scope Tuple

Every tenant-owned plan-store command and query in the target matrix carries the
same explicit ownership tuple:

| Field           | Source of truth                                                           | Requirement                         |
| --------------- | ------------------------------------------------------------------------- | ----------------------------------- |
| `tenantId`      | Authorized API scope and `ExecutionPlan.metadata.ownership.tenantId`      | Required for every tenant-owned row |
| `projectId`     | Authorized API scope and `ExecutionPlan.metadata.ownership.projectId`     | Required for every tenant-owned row |
| `environmentId` | Authorized API scope and `ExecutionPlan.metadata.ownership.environmentId` | Required for every tenant-owned row |

Rows whose canonical `ExecutionPlan` lacks this tuple are not silently
backfilled with synthetic ownership. Migration must fail fast and require
operator repair or an explicit, reviewed historical migration rule.

## Selected Storage Model

S08 selects **Model B: tenant-neutral immutable artifact plus tenant-owned
records**.

The content-derived artifact identity may remain global because it identifies
immutable executable bytes and canonical plan JSON only. It is not a product
authorization boundary, not a lifecycle boundary, and not the owner of
tenant-specific lineage, executability, admission, or archival state.

Tenant-owned records are always scoped by the ownership tuple before they can
refer to an artifact. Any command or query that mutates or authorizes product
behavior must operate on the scoped record first and may follow the artifact
pointer only after scope has been proven.

This selected model resolves the post-hash `planId` bug by separating two
identities:

- artifact identity: tenant-neutral, content-addressed, immutable, reusable
  across scopes, and safe to deduplicate by hash;
- plan-record identity: tenant-owned, scope-bound, lifecycle/lineage/admission
  authority, and never globally addressable by `planId` or `plan_uri` alone.

## Target DDD C&Q Model

S08 uses a single DDD command/query model. The model below is the design
authority for the command and query matrices; implementation details may vary,
but behavior may not be moved outside these owners.

### Domain Model

| DDD concept                        | Owner                                     | Canonical records                                                         | Rule                                                                                                                                                             |
| ---------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Immutable plan artifact            | Planning/artifacts boundary               | tenant-neutral artifact row; currently `stored_plans` until split/renamed | Owns immutable executable bytes and canonical plan JSON by content identity only; owns no tenant lifecycle, lineage, admission, or authorization state.          |
| Tenant-owned plan record aggregate | Planning/artifacts boundary               | `plan_records`                                                            | Owns scope tuple, product `PlanRef` association, artifact pointer, lineage, archival state, and the authorization boundary for tenant-owned plan-store behavior. |
| Plan executability                 | Planner validation domain service         | `plan_executability_records`                                              | Owns adapter-scoped validation result for a scoped plan record; no lifecycle state transition is retained on the artifact.                                       |
| Plan admission                     | API/runtime admission application service | `plan_admission_links`                                                    | Owns run admission relation after scoped plan-record ownership and executability pass and before engine dispatch.                                                |
| Plan lineage                       | Plan record aggregate behavior            | `plan_records`                                                            | Owns supersession and archival inside one scope; lineage never targets tenant-neutral artifacts directly.                                                        |
| Engine executable fetch            | Engine start/recovery application service | scoped plan-record lookup plus artifact row                               | Owns dispatch-time materialization, but only by resolving a scoped plan record to its artifact pointer before bytes are read.                                    |

### Command Side

All command handlers receive the scope tuple before they can touch storage.
Repositories are persistence collaborators only; they are not DDD owners.

| Command group                  | Application/domain owner              | Allowed port                      | Legacy replacement rule                                                            |
| ------------------------------ | ------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------- |
| Persist preview/start-run plan | Preview/start-run application service | `IPlanStoreWriter` scoped command | Replaces `storePlan`; no compatibility facade remains.                             |
| Record executability           | Plan executability domain service     | `IPlanStoreWriter` scoped command | Replaces `markValid` and `markInvalid`.                                            |
| Admit plan to run              | Runtime admission application service | `IPlanStoreWriter` scoped command | Admission link is written only after scoped plan ownership and executability pass. |
| Supersede/archive plan         | Plan lineage domain service           | `IPlanStoreWriter` scoped command | Cross-scope lineage is impossible, not merely discouraged.                         |

### Query Side

All query handlers receive the scope tuple unless the caller has already been
wrapped in a tenant-scoped adapter. A `PlanRef` is an identity pointer, not
authorization proof.

| Query group                          | Application/domain owner                  | Allowed port                                   | Legacy replacement rule                                             |
| ------------------------------------ | ----------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| Read plan records                    | Plan record read model                    | `IPlanStoreReader` scoped query                | Replaces `getPlanRecord(planId)` and `getPlanRecordByRef(planRef)`. |
| Read executability/admission/lineage | Specialized read models                   | `IPlanStoreReader` scoped query                | Replaces global history reads by `planId`.                          |
| Validation materialization           | Plan validation application service       | Scoped validation reader                       | Replaces `fetchForValidation(planRef)`.                             |
| Engine dispatch materialization      | Engine start/recovery application service | Scoped `IPlanFetcher` or tenant-scoped wrapper | Replaces direct global `fetch(planRef)` for tenant-owned plans.     |

### Orchestration Rules

- API preview, import, start-run, and recover-run are application services that
  bind authorized scope to the command/query before storage or engine dispatch.
- The engine may retain `IPlanFetcher` ownership, but the supplied implementation
  must already be scoped or must require scope in its method signature.
- Tenant-neutral artifact rows may be reused across scopes, but artifact lookup
  alone is never authorization and must not be exposed as product behavior.
- Scoped plan records, executability records, admission links, and lineage are
  the only tenant-owned authority; all artifact materialization follows from a
  scoped record lookup.
- `PlanRefPolicy` URI allowlisting is not a scope check and cannot satisfy S08
  tenancy requirements.
- `PlanRef` parsing, hash checks, and schema admission are integrity gates only;
  they do not authorize access to a plan-store row.
- No orchestration path may call a lifecycle command after the corresponding
  scoped command/query exists.

## Command Matrix

| ID       | Command                        | DDD owner                                                                                                                                  | Owner port         | Current surface                                                                                                    | Target signature shape                                                                                                                                                             | Storage rows touched                                                                                                  | Current status                                                                                                    | Drift disposition                                                                                                  |
| -------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `PS-C01` | Create persisted plan artifact | Tenant-owned plan-record creation orchestrated by preview/start-run application service, with artifact dedupe as persistence collaboration | `IPlanStoreWriter` | `IPlanValidationLifecycleStore.storePlan(buildResult)` and `PostgresPlanStore.storePlan(buildResult)`              | `createStoredPlan(scope, buildResult)` or equivalent scoped command that idempotently creates/reuses the tenant-neutral artifact row and atomically creates the scoped plan record | tenant-neutral artifact row; scoped `plan_records`                                                                    | Legacy facade owns product path and current storage collapses artifact identity with tenant-owned record identity | Replace with scoped command, keep artifact dedupe tenant-neutral only, and remove legacy facade from runtime graph |
| `PS-C02` | Create plan record             | `PlanRecord` aggregate creation                                                                                                            | `IPlanStoreWriter` | `createPlanRecord(record)`                                                                                         | `createPlanRecord(record)` where `record` includes top-level scope tuple                                                                                                           | `plan_records`                                                                                                        | Canonical port exists but record is unscoped                                                                      | Add scope to contract and repository invariants                                                                    |
| `PS-C03` | Record executability           | Plan executability domain service                                                                                                          | `IPlanStoreWriter` | `recordExecutability(record)` and lifecycle `markValid/markInvalid`                                                | `recordExecutability(record)` where `record` includes top-level scope tuple and adapter-scoped state                                                                               | `plan_executability_records`; historical `stored_plans.validation_state` may be read only by one-way migration assets | Canonical port exists; lifecycle facade is active blocking drift                                                  | Keep explicit record command and remove lifecycle transition commands from runtime behavior                        |
| `PS-C04` | Mark plan admitted to run      | Plan admission application service                                                                                                         | `IPlanStoreWriter` | `markAdmitted(link)` exists; planner-backed preview/start-run currently does not use it as the admission authority | `markAdmitted(link)` where `link` includes top-level scope tuple                                                                                                                   | `plan_admission_links`                                                                                                | Underused canonical command                                                                                       | Wire only through scoped admission path; forbid unscoped link writes                                               |
| `PS-C05` | Mark plan superseded           | Plan lineage domain service                                                                                                                | `IPlanStoreWriter` | `markSuperseded(planId, supersededByPlanId)`                                                                       | `markSuperseded(scope, planId, supersededByPlanId)` with both records in same scope                                                                                                | `plan_records`                                                                                                        | Unscoped IDs                                                                                                      | Add scoped guard and scoped FK/index posture                                                                       |
| `PS-C06` | Archive plan                   | Plan archival domain service                                                                                                               | `IPlanStoreWriter` | `archivePlan(planId, archivedAtIso)`                                                                               | `archivePlan(scope, planId, archivedAtIso)`                                                                                                                                        | `plan_records`                                                                                                        | Unscoped ID                                                                                                       | Add scoped guard; RLS must deny cross-tenant archive                                                               |
| `PS-C07` | Remove lifecycle mark valid    | Plan executability domain service replacement path                                                                                         | No retained port   | `markValid(planRef)`                                                                                               | No target runtime command; all callers must move to `PS-C03` and this command must be deleted or made unreachable as product behavior                                              | `stored_plans`, maybe `plan_executability_records` during cutover                                                     | Legacy active and blocking                                                                                        | Remove from runtime graph                                                                                          |
| `PS-C08` | Remove lifecycle mark invalid  | Plan executability domain service replacement path                                                                                         | No retained port   | `markInvalid(planRef, report)`                                                                                     | No target runtime command; all callers must move to `PS-C03` and this command must be deleted or made unreachable as product behavior                                              | `stored_plans`, maybe `plan_executability_records` during cutover                                                     | Legacy active and blocking                                                                                        | Remove from runtime graph                                                                                          |

## Query Matrix

| ID       | Query                                     | DDD owner                              | Owner port                   | Current surface                                                     | Target signature shape                                                                                                                                                                                                        | Storage rows read                                  | Current status                            | Drift disposition                                                                                                                      |
| -------- | ----------------------------------------- | -------------------------------------- | ---------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `PS-Q01` | Get plan record                           | Plan record read model                 | `IPlanStoreReader`           | `getPlanRecord(planId)`                                             | `getPlanRecord(scope, planId)`                                                                                                                                                                                                | `plan_records`                                     | Unscoped ID                               | Replace caller-visible query with scoped query                                                                                         |
| `PS-Q02` | Get plan record by `PlanRef`              | Plan record read model                 | `IPlanStoreReader`           | `getPlanRecordByRef(planRef)`                                       | `getPlanRecordByRef(scope, planRef)` and verify `sourceRef`, version, schema, and scope                                                                                                                                       | `plan_records`                                     | Unscoped `PlanRef` lookup                 | Add scope validation and generic cross-tenant miss behavior                                                                            |
| `PS-Q03` | List executability by adapter             | Executability read model               | `IPlanStoreReader`           | `listExecutabilityByAdapter(planId)`                                | `listExecutabilityByAdapter(scope, planId)`                                                                                                                                                                                   | `plan_executability_records`                       | Unscoped ID                               | Add scoped query and scoped index                                                                                                      |
| `PS-Q04` | Get admission links                       | Admission read model                   | `IPlanStoreReader`           | `getAdmissionLinks(planId)`                                         | `getAdmissionLinks(scope, planId)`                                                                                                                                                                                            | `plan_admission_links`                             | Unscoped ID                               | Add scoped query and forbid global admission history reads                                                                             |
| `PS-Q05` | Get supersession                          | Plan lineage read model                | `IPlanStoreReader`           | `getSupersession(planId)`                                           | `getSupersession(scope, planId)`                                                                                                                                                                                              | `plan_records`                                     | Unscoped ID                               | Add scoped join so cross-scope supersession cannot be inferred                                                                         |
| `PS-Q06` | Remove validation record query            | Validation read model replacement path | No retained port             | `getValidationRecord(planId)`                                       | No target runtime query; validation callers must move to scoped validation/executability queries                                                                                                                              | `stored_plans`                                     | Legacy active and blocking                | Remove from runtime graph                                                                                                              |
| `PS-Q07` | Fetch executable plan for validation      | Plan validation application service    | Scoped API validation reader | `fetchForValidation(planRef)` through `IStoredPlanValidationReader` | `fetchForValidation(scope, planRef)` and resolve scoped `plan_records` before following the artifact pointer                                                                                                                  | scoped `plan_records`; tenant-neutral artifact row | Unscoped `PlanRef` fetch                  | Add scope and remove unscoped validation reader behavior                                                                               |
| `PS-Q08` | Fetch executable plan for engine dispatch | Engine start-run application service   | Engine-owned `IPlanFetcher`  | `fetch(planRef)`                                                    | `fetch(scope, planRef)` or a tenant-scoped wrapper whose construction requires the scope tuple before `fetch(planRef)` can be called; implementation must resolve scoped `plan_records` before following the artifact pointer | scoped `plan_records`; tenant-neutral artifact row | Engine-owned query unscoped at port shape | Keep engine ownership, but remove global artifact fetch as product behavior and add scoped materialization guard before bytes are read |

## Current-State Inventory

| Surface                                                                                                                                                                                                                                         | Role today                                                              | Command/query IDs touched                                  | Current state                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/@dvt/contracts/src/contracts/planner/PlanRecord.v1.ts`                                                                                                                                                                                | Serializable planner-domain record                                      | `PS-C02`, `PS-Q01`, `PS-Q02`, `PS-C05`, `PS-C06`, `PS-Q05` | Lacks top-level `tenantId`, `projectId`, `environmentId`                                                                                                                                                                                                                                                           |
| `packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts`, `packages/@dvt/contracts/src/schema-packs/execution-plan.ts`, `packages/@dvt/contracts/src/schema-packs/planner-build.ts`, and `packages/@dvt/planner/src/domain/types.ts` | Canonical executable plan ownership metadata and planner input surface  | `PS-C01`, `PS-Q07`, `PS-Q08`                               | Define `metadata.ownership` and planner-input ownership as optional and post-hash, so tenant-owned plan-store persistence can receive a plan without the required scope tuple and `planId` remains shared across scopes                                                                                            |
| `packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityRecord.v1.ts`                                                                                                                                                                   | Serializable executability record                                       | `PS-C03`, `PS-Q03`                                         | Lacks top-level scope tuple                                                                                                                                                                                                                                                                                        |
| `packages/@dvt/contracts/src/contracts/planner/PlanAdmissionLink.v1.ts`                                                                                                                                                                         | Serializable admission relation                                         | `PS-C04`, `PS-Q04`                                         | Lacks top-level scope tuple                                                                                                                                                                                                                                                                                        |
| `packages/@dvt/contracts/src/contracts/planner/PlanRecord.v1.schema.json`, `PlanExecutabilityRecord.v1.schema.json`, and `PlanAdmissionLink.v1.schema.json`                                                                                     | Generated or maintained schema artifacts for plan-store records         | `PS-C02` through `PS-C06`, `PS-Q01` through `PS-Q05`       | Mirror unscoped contract shape; must change with the TypeScript contracts                                                                                                                                                                                                                                          |
| `packages/@dvt/contracts/src/schema-packs/plan-records.ts` and `packages/@dvt/contracts/src/validation/planner.ts`                                                                                                                              | Runtime validation and parser surface for plan-store records            | `PS-C02` through `PS-C06`, `PS-Q01` through `PS-Q05`       | Parse and validate unscoped plan-store records, so legacy payloads remain executable through validation helpers                                                                                                                                                                                                    |
| `packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityValidation.v1.ts`                                                                                                                                                               | Executability validation contract                                       | `PS-C03`, `PS-C07`, `PS-C08`                               | Still describes persistence in a non-runnable lifecycle state as the validation precondition                                                                                                                                                                                                                       |
| `packages/@dvt/contracts/src/contracts/planner/PlanValidationLifecycle.v1.ts`                                                                                                                                                                   | Contract-level legacy lifecycle record                                  | `PS-C07`, `PS-C08`, `PS-Q06`                               | Describes `storePlan`, `markValid`, `markInvalid`, and lifecycle states as canonical; must be removed or superseded by the scoped matrix contract                                                                                                                                                                  |
| `packages/@dvt/contracts/src/index.ts`                                                                                                                                                                                                          | Public contract barrel                                                  | `PS-C02` through `PS-C08`, `PS-Q01` through `PS-Q06`       | Re-exports unscoped plan-store records and lifecycle types, keeping both legacy shapes and lifecycle concepts public                                                                                                                                                                                               |
| `docs/contracts/planner/index.md`                                                                                                                                                                                                               | Contract docs navigation                                                | `PS-C07`, `PS-C08`, `PS-Q06`                               | Lists `PlanValidationLifecycle.v1.ts` as an active planner contract                                                                                                                                                                                                                                                |
| `packages/@dvt/planner/src/contracts/PlanExecutabilityValidation.ts`                                                                                                                                                                            | Planner executability validation port                                   | `PS-C03`, `PS-Q07`                                         | Exposes `validatePlan(planRef, adapterId)` without tenant/project/environment scope                                                                                                                                                                                                                                |
| `packages/@dvt/artifacts/src/ports/IPlanStoreWriter.ts`                                                                                                                                                                                         | Canonical write-side behavior port                                      | `PS-C02` through `PS-C06`                                  | Exists, but write signatures are unscoped where IDs are accepted                                                                                                                                                                                                                                                   |
| `packages/@dvt/artifacts/src/ports/IPlanStoreReader.ts`                                                                                                                                                                                         | Canonical read-side behavior port                                       | `PS-Q01` through `PS-Q05`                                  | Exists, but read signatures are unscoped                                                                                                                                                                                                                                                                           |
| `packages/@dvt/planner/src/contracts/PlanValidationLifecycle.ts`                                                                                                                                                                                | Legacy planner validation lifecycle surface                             | `PS-C01`, `PS-C07`, `PS-C08`, `PS-Q06`                     | Still used by API preview/start-run product paths; must be removed from the S08 runtime graph                                                                                                                                                                                                                      |
| `packages/@dvt/planner/src/index.ts`                                                                                                                                                                                                            | Public planner barrel                                                   | `PS-C01`, `PS-C03`, `PS-C07`, `PS-C08`, `PS-Q06`, `PS-Q07` | Re-exports `IPlanValidationLifecycleStore` and unscoped `IPlanExecutabilityValidator`, keeping legacy validation surfaces reachable                                                                                                                                                                                |
| `packages/@dvt/engine/src/ports/IPlanArtifactReader.ts`                                                                                                                                                                                         | Engine-owned executable plan fetch port                                 | `PS-Q08`                                                   | Correct owner, but port shape does not carry tenant scope                                                                                                                                                                                                                                                          |
| `packages/@dvt/contracts/src/contracts/engine/RunStateVocabulary.v1.ts`                                                                                                                                                                         | Shared run-state DTO vocabulary only                                    | `PS-Q08`                                                   | `RC-G1` parent closure removed engine behavior-port exports from this shared-kernel area; plan fetching must stay owner-local.                                                                                                                                                                                     |
| `packages/@dvt/engine/src/application/StartRunApplicationService.ts`                                                                                                                                                                            | Engine start-run application service                                    | `PS-Q08`                                                   | Receives engine-owned `IPlanFetcher` without scope in the port contract                                                                                                                                                                                                                                            |
| `packages/@dvt/engine/src/application/RecoverRunApplicationService.ts`                                                                                                                                                                          | Engine recovery application service                                     | `PS-Q08`                                                   | Reuses engine-owned `IPlanFetcher` without scope in the recovery path                                                                                                                                                                                                                                              |
| `packages/@dvt/engine/src/security/planIntegrity.ts`                                                                                                                                                                                            | Engine integrity validator                                              | `PS-Q08`                                                   | Calls `fetcher.fetch(planRef)` and validates integrity, but not tenant scope                                                                                                                                                                                                                                       |
| `packages/@dvt/engine/src/security/planRefPolicy.ts` and `RunAccessPolicy.ts`                                                                                                                                                                   | Engine URI and tenant-access policy surface                             | `PS-Q08`                                                   | Validates tenant access and URI allowlist separately, but does not assert plan-store row ownership or scope                                                                                                                                                                                                        |
| `packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts` and `packages/@dvt/engine/src/services/startRun/StartRunValidationPolicy.ts`                                                                                                   | Engine start-run admission and validation gate                          | `PS-Q08`                                                   | Coordinates tenant access, `PlanRef` policy, schema/version, duplicate-run, adapter, and capability checks, but does not assert scoped plan-store row ownership before dispatch materialization                                                                                                                    |
| `packages/@dvt/engine/src/services/startRun/RunExecutionContextAdmissionPolicy.ts`                                                                                                                                                              | Engine run-execution-context admission policy                           | `PS-Q08`                                                   | Validates `runExecutionContextRef`, plugin context, and plugin artifact scope alignment when a context exists, but does not prove plan-store row ownership for the fetched executable plan                                                                                                                         |
| `apps/api/src/application/services/WorkflowEngineFactory.ts`                                                                                                                                                                                    | API engine factory                                                      | `PS-Q08`                                                   | Accepts engine `IPlanFetcher` without scoped plan-store context                                                                                                                                                                                                                                                    |
| `packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts`                                                                                                                                                                                       | Concrete facade implementing all current roles                          | All IDs                                                    | Monolithic composition point; acceptable implementation class, but role boundaries must be explicit                                                                                                                                                                                                                |
| `packages/@dvt/adapter-postgres/src/PostgresPlanStore.sql.ts`                                                                                                                                                                                   | Schema and backfill SQL                                                 | All storage-backed IDs                                     | Current schema collapses tenant-neutral artifact identity and tenant-owned record identity: `plan_records`, `plan_executability_records`, and `plan_admission_links` lack top-level scope columns/RLS posture, while `stored_plans`, `plan_id`, `plan_uri`, and downstream FKs/PKs act as global product authority |
| `packages/@dvt/adapter-postgres/src/PostgresPlanStore.schema-manager.ts`                                                                                                                                                                        | Plan-store schema bootstrap/backfill manager                            | `PS-C01`, `PS-C02`                                         | Backfills `plan_records` from `stored_plans` without tenant/project/environment ownership                                                                                                                                                                                                                          |
| `packages/@dvt/adapter-postgres/src/PostgresPlanStore.mappers.ts`                                                                                                                                                                               | Plan-store row mapper                                                   | `PS-Q06`, `PS-Q07`, `PS-Q08`                               | Encodes `validation_state` as typed runtime row state                                                                                                                                                                                                                                                              |
| `packages/@dvt/adapter-postgres/src/PostgresPlanStore.executable-blob-repository.ts`                                                                                                                                                            | Executable blob and validation-state repository with legacy query shape | `PS-C01`, `PS-C07`, `PS-C08`, `PS-Q06`, `PS-Q07`, `PS-Q08` | Queries artifact bytes only by `plan_id`; this is acceptable only as an internal artifact lookup after scoped record resolution, while validation-state query paths must be removed                                                                                                                                |
| `packages/@dvt/adapter-postgres/src/PostgresPlanStore.plan-record-repository.ts`                                                                                                                                                                | Plan record repository                                                  | `PS-C02`, `PS-C05`, `PS-C06`, `PS-Q01`, `PS-Q05`           | Queries only by `plan_id`; no tenant predicates                                                                                                                                                                                                                                                                    |
| `packages/@dvt/adapter-postgres/src/PostgresPlanStore.executability-repository.ts`                                                                                                                                                              | Executability repository                                                | `PS-C03`, `PS-Q03`                                         | Keyed by `(plan_id, adapter_id)` only                                                                                                                                                                                                                                                                              |
| `packages/@dvt/adapter-postgres/src/PostgresPlanStore.admission-repository.ts`                                                                                                                                                                  | Admission repository                                                    | `PS-C04`, `PS-Q04`                                         | Keyed by `(plan_id, run_id, adapter_id)` only                                                                                                                                                                                                                                                                      |
| `apps/api/src/application/services/PreviewPlanUseCase.ts`                                                                                                                                                                                       | Planner-backed preview product path                                     | `PS-C01`, `PS-C07`, `PS-C08`, `PS-Q07`                     | Uses lifecycle facade and validator; does not write admission link                                                                                                                                                                                                                                                 |
| `apps/api/src/application/services/PlannerBackedStartRunUseCase.ts`                                                                                                                                                                             | Planner-backed start-run product path                                   | `PS-C01`, `PS-C07`, `PS-C08`, `PS-Q07`                     | Uses lifecycle facade; delegates run start after validation; does not call `markAdmitted`                                                                                                                                                                                                                          |
| `apps/api/src/modules/types.ts`                                                                                                                                                                                                                 | API dependency graph type surface                                       | `PS-C01`, `PS-C07`, `PS-C08`, `PS-Q08`                     | Types module exposes lifecycle plan store and unscoped executable plan resolver                                                                                                                                                                                                                                    |
| `apps/api/src/modules/startRun/buildProtectedStartRunRuntime.ts`                                                                                                                                                                                | Protected start-run runtime wiring                                      | `PS-C01`, `PS-C07`, `PS-C08`, `PS-Q07`                     | Requires `IPlanValidationLifecycleStore & IStoredPlanValidationReader` as the runtime store                                                                                                                                                                                                                        |
| `apps/api/src/modules/protectedRuntime/buildProtectedRuntimeStorage.ts`                                                                                                                                                                         | Protected runtime storage composition                                   | `PS-Q08`                                                   | Constructs `StoredExecutablePlanResolver` from an unscoped `PostgresPlanStore` fetcher                                                                                                                                                                                                                             |
| `apps/api/src/modules/buildProtectedRuntimeModule.ts` and `apps/api/src/app.ts`                                                                                                                                                                 | API module/root wiring                                                  | `PS-Q08`                                                   | Propagates unscoped executable plan resolver into import/start-run routes                                                                                                                                                                                                                                          |
| `apps/api/src/application/services/StoredExecutablePlanResolver.ts`                                                                                                                                                                             | API executable plan resolver                                            | `PS-Q08`                                                   | Calls engine fetcher by `PlanRef` only and validates identity/hash, but not tenant scope                                                                                                                                                                                                                           |
| `apps/api/src/application/services/ImportPlanUseCase.ts`                                                                                                                                                                                        | API import path resolving stored plans                                  | `PS-Q08`                                                   | Resolves stored plans through unscoped `fetch(planRef)` before checking `ExecutionPlan.metadata.ownership` against command ownership                                                                                                                                                                               |
| `apps/api/src/application/services/getRunStatusUseCase.ts`                                                                                                                                                                                      | API run status read model enrichment                                    | `PS-Q01`                                                   | Reads plan records by `planId` without explicit plan-store scope                                                                                                                                                                                                                                                   |
| `apps/api/src/application/services/resolveAuthorizedPlannerInputEnvelope.ts` and `planRoutePolicyCatalog.ts`                                                                                                                                    | API planner-input ownership policy                                      | `PS-C01`, `PS-Q07`                                         | `authorized-scope` may resolve ownership to `undefined` when project/environment scope is absent, instead of failing before tenant-owned persistence                                                                                                                                                               |
| `apps/api/test/application/services/getRunStatusUseCase.test.ts`                                                                                                                                                                                | API run status read model tests                                         | `PS-Q01`                                                   | Test double exposes `getPlanRecord(planId)` without scope and does not assert cross-tenant denial                                                                                                                                                                                                                  |
| `apps/api/src/entrypoints/http/startRunRouteCommandBuilder.ts`, `recoverRunRouteParser.ts`, `startRunEngineBridge.ts`, `engineStartRunUseCase.ts`, `recoverRunUseCase.ts`, and `protectedRuntimeTenantAuthorizer.ts`                            | API direct `PlanRef` start/recovery handoff                             | `PS-Q08`                                                   | Parse and pass caller-provided `PlanRef` to the engine with authorized run context, but no scoped plan-store lookup or ownership assertion occurs before dispatch                                                                                                                                                  |
| `apps/api/src/application/services/StoredPlanExecutabilityValidator.ts`                                                                                                                                                                         | Validation path                                                         | `PS-Q07`                                                   | Fetches by `PlanRef`; validates adapter, plan alignment, kind support, and capabilities                                                                                                                                                                                                                            |
| `apps/api/src/application/ports/storedPlan.ts`                                                                                                                                                                                                  | API validation reader port                                              | `PS-Q07`                                                   | Exposes unscoped `fetchForValidation(planRef)`                                                                                                                                                                                                                                                                     |
| `apps/temporal-worker/src/runtime/temporalWorkerStores.ts`                                                                                                                                                                                      | Worker plan fetch wiring                                                | `PS-Q08`                                                   | Wires `PostgresPlanStore` as engine fetcher                                                                                                                                                                                                                                                                        |
| `apps/temporal-worker/src/runtime/runtimeTypes.ts`, `temporalWorkerRuntimeResources.ts`, and `temporalWorkerRuntimeHandle.ts`                                                                                                                   | Temporal worker runtime plan-store lifecycle wiring                     | `PS-Q08`                                                   | Carries `PlanFetcherLike`/plan store resources without tenant-owned scoped fetch semantics                                                                                                                                                                                                                         |
| `packages/@dvt/adapter-temporal/src/activities/activityTypes.ts` and `packages/@dvt/adapter-temporal/src/engine-types.ts`                                                                                                                       | Temporal adapter plan-fetch dependency surface                          | `PS-Q08`                                                   | Imports and propagates unscoped engine `IPlanFetcher` into activity dependencies                                                                                                                                                                                                                                   |
| `packages/@dvt/adapter-postgres/test/PostgresPlanStore.lifecycle.integration.test.ts`                                                                                                                                                           | Adapter lifecycle integration tests                                     | `PS-C01`, `PS-C07`, `PS-C08`, `PS-Q06`, `PS-Q08`           | Tests assert the legacy lifecycle as expected behavior                                                                                                                                                                                                                                                             |
| `packages/@dvt/adapter-postgres/test/PostgresPlanStore.invariants.unit.test.ts`                                                                                                                                                                 | Adapter invariant tests                                                 | `PS-C07`, `PS-C08`, `PS-Q06`                               | Fixtures still encode `validation_state` as a product invariant                                                                                                                                                                                                                                                    |
| `packages/@dvt/adapter-postgres/test/PostgresPlanStore.sql.test.ts`                                                                                                                                                                             | Adapter schema unit tests                                               | All storage-backed IDs                                     | Checks lineage FKs only; does not assert scope columns, scoped indexes, or RLS posture                                                                                                                                                                                                                             |
| `packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-core.integration.test.ts` and `records-guards.integration.test.ts`                                                                                                               | Adapter plan-record integration tests                                   | `PS-C01` through `PS-C06`, `PS-Q01` through `PS-Q05`       | Use `storePlan` and unscoped plan IDs as setup/authority for plan-record behavior                                                                                                                                                                                                                                  |
| `packages/@dvt/contracts/test/plan-store-records-shape-sync.test.ts`                                                                                                                                                                            | Contract/schema sync tests                                              | `PS-C02` through `PS-C06`, `PS-Q01` through `PS-Q05`       | Must be updated so schemas fail when scope tuple is absent                                                                                                                                                                                                                                                         |
| `apps/api/test/integration/protectedRuntime.integration*.ts`                                                                                                                                                                                    | API protected runtime integration tests                                 | `PS-C01`, `PS-C07`, `PS-C08`, `PS-Q08`                     | Directly assert or seed `stored_plans.validation_state`                                                                                                                                                                                                                                                            |
| `apps/api/test/**/previewPlanRoute*.test.ts` and `apps/api/test/**/PlannerBackedStartRunUseCase.test.ts`                                                                                                                                        | API product-path tests                                                  | `PS-C01`, `PS-C07`, `PS-C08`, `PS-Q07`                     | Test doubles and expectations encode lifecycle facade calls                                                                                                                                                                                                                                                        |
| `apps/api/test/modules/*.cases.ts` and `apps/api/test/application/services/StoredExecutablePlanResolver.test.ts`                                                                                                                                | API module/resolver tests                                               | `PS-Q08`                                                   | Assert unscoped resolver construction and `fetch(planRef)` behavior                                                                                                                                                                                                                                                |
| `apps/api/test/application/services/storedPlanExecutabilityValidator/*.cases.ts`                                                                                                                                                                | API validation reader tests                                             | `PS-Q07`                                                   | Test doubles expose unscoped `fetchForValidation(planRef)`                                                                                                                                                                                                                                                         |
| `apps/api/test/modules/startRunRuntimeComposition.cases.ts` and `protectedRuntimeAndPlanCompileArchitecture.cases.ts`                                                                                                                           | API validation composition tests                                        | `PS-Q07`                                                   | Assert construction of `StoredPlanExecutabilityValidator` without scoped validation context                                                                                                                                                                                                                        |
| `apps/api/test/entrypoints/http/importPlanRoute.test.ts`                                                                                                                                                                                        | API import route tests                                                  | `PS-Q08`                                                   | Route test dependencies use `planResolver.fetch(planRef)` without scope                                                                                                                                                                                                                                            |
| `apps/api/test/application/services/engineStartRunUseCase.commandPath.test.ts`, `recoverRunUseCase.test.ts`, and `startRunApplicationComponent.architecture.test.ts`                                                                            | API direct `PlanRef` start/recovery tests                               | `PS-Q08`                                                   | Assert direct translation from API `PlanRef` command to engine `startRun`/`recoverRun` without a scoped plan-store ownership guard                                                                                                                                                                                 |
| `packages/@dvt/engine/test/services/StartRunApplicationService.test.ts`, `packages/@dvt/engine/test/security/planRefPolicy.test.ts`, and `packages/@dvt/engine/test/helpers/workflowEngine.fixture.ts`                                          | Engine admission and policy tests                                       | `PS-Q08`                                                   | Assert tenant-access and URI-policy ordering, but not scoped plan-store row ownership                                                                                                                                                                                                                              |
| `packages/@dvt/engine/test/services/RunExecutionContextAdmissionPolicy.*.test.ts` and `packages/@dvt/engine/test/services/runExecutionContextAdmissionPolicy.fixtures.ts`                                                                       | Engine run-execution-context admission tests                            | `PS-Q08`                                                   | Assert run-execution-context and plugin artifact scope checks, but not plan-store row ownership materialization                                                                                                                                                                                                    |
| `apps/api/test/application/services/planRoutePolicyCatalog.test.ts`                                                                                                                                                                             | API planner route ownership policy tests                                | `PS-C01`, `PS-Q07`                                         | Assert ownership-source policy selection, but not fail-fast behavior when authorized scope lacks project/environment for tenant-owned persistence                                                                                                                                                                  |
| `packages/@dvt/planner/test/unit/planner-private-ownership.architecture.test.ts` and `packages/@dvt/contracts/test/planner-private-ownership.architecture.test.ts`                                                                              | Architecture ownership tests                                            | `PS-C07`, `PS-C08`, `PS-Q06`                               | Tests currently require lifecycle symbols/barrels to exist                                                                                                                                                                                                                                                         |
| `packages/@dvt/engine/test/**`, `packages/@dvt/engine/test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts`, and `packages/@dvt/adapter-temporal/test/**` plan-fetch fixtures                                                 | Engine and Temporal fetch tests                                         | `PS-Q08`                                                   | Test fixtures and architecture tests encode unscoped `fetch(planRef)` as the expected contract                                                                                                                                                                                                                     |
| `docs/guides/postgres-plan-store-user-manual-20260403.md`                                                                                                                                                                                       | Active user guide                                                       | `PS-C01`, `PS-C07`, `PS-C08`, `PS-Q06`                     | Documents `storePlan`, `markValid`, `markInvalid`, and validation states as user-facing behavior                                                                                                                                                                                                                   |
| `docs/guides/postgres-plan-store-technical-manual-20260403.md`                                                                                                                                                                                  | Active technical guide                                                  | `PS-C01`, `PS-C07`, `PS-C08`, `PS-Q06`, `PS-Q08`           | Documents lifecycle store, engine fetcher, and validation-state transitions without scope                                                                                                                                                                                                                          |
| `docs/architecture/components/planner/planner-private-behavior-ports-component.md` and `planner-constraints.md`                                                                                                                                 | Active architecture component docs                                      | `PS-C01`, `PS-C07`, `PS-C08`, `PS-Q06`                     | Name `IPlanValidationLifecycleStore` and `PlanValidationLifecycle.ts` as planner behavior/constraint surfaces                                                                                                                                                                                                      |
| `docs/architecture/components/planner/workspace-authoring-draft-aggregate.md`                                                                                                                                                                   | Active planner architecture doc                                         | `PS-C01`, `PS-C07`, `PS-C08`, `PS-Q07`                     | Diagrams preview flow as `storePlan + validatePlan`                                                                                                                                                                                                                                                                |
| `docs/architecture/components/api/protected-runtime-and-plan-compile-component.md`, `apps/api/docs/executable-subgraph-resolution-component.md`, and `apps/api/docs/protected-runtime-dependency-builders-component.md`                         | Active API architecture docs                                            | `PS-C01`, `PS-C07`, `PS-C08`, `PS-Q07`, `PS-Q08`           | Describe plan store/resolver composition without scoped command/query ownership                                                                                                                                                                                                                                    |
| `docs/architecture/components/engine/**`, `docs/architecture/diagrams/engine-internal-components.md`, and `docs/architecture/diagrams/start-run-sequences.md`                                                                                   | Active engine architecture docs                                         | `PS-Q08`                                                   | Describe `IPlanFetcher` and `startRun(planRef, context)` as runtime-wired plan/artifact dispatch without tenant-scoped plan-store assertion                                                                                                                                                                        |
| `docs/architecture/components/engine/adapters/temporal/temporal-planref-workflow-boundary.md`                                                                                                                                                   | Active Temporal engine boundary doc                                     | `PS-Q08`                                                   | Describes activity plan-material fetch and hash validation without scoped plan-store fetch                                                                                                                                                                                                                         |
| `docs/architecture/system-delivery-status.md` and `docs/architecture/component-map.md`                                                                                                                                                          | Active architecture status/map docs                                     | All IDs                                                    | Mention plan-store persistence/status without the no-legacy S08 command/query authority                                                                                                                                                                                                                            |
| `docs/planning/status/planner-current-state-assessment.md`                                                                                                                                                                                      | Active status doc                                                       | `PS-C01`, `PS-C07`, `PS-C08`                               | Diagrams current planner lifecycle through `storePlan`, `markValid`, and `markInvalid`                                                                                                                                                                                                                             |
| `docs/planning/state/agent-lane-a.yaml`                                                                                                                                                                                                         | Canonical planning lane state                                           | All IDs                                                    | S08 status still references sequencing the Postgres migration from the current lifecycle facade                                                                                                                                                                                                                    |
| `docs/adr/ADR-0043-plan-record-plan-store-and-artifacts-ownership.md`                                                                                                                                                                           | Accepted plan-store ownership ADR                                       | `PS-C01`, `PS-C07`, `PS-C08`, `PS-Q06`                     | Still allows `IPlanValidationLifecycleStore` as a compatibility facade during cutover, which conflicts with this no-legacy closure posture                                                                                                                                                                         |
| `docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-record-plan-store-execution-plan-20260402.md`                                                                                                                                 | Prior S08 execution plan                                                | All IDs                                                    | Still permits `IPlanValidationLifecycleStore` as a migration facade and lists unscoped command/query shapes                                                                                                                                                                                                        |
| `docs/planning/proposals/mandatory/runtime-and-contracts/contracts-domain-ownership-migration-plan-20260327.md`                                                                                                                                 | Prior contract ownership migration plan                                 | `PS-C01`, `PS-C07`, `PS-C08`, `PS-Q06`                     | Still references lifecycle ownership migration and adapter imports without this no-legacy S08 closure                                                                                                                                                                                                              |
| `docs/planning/proposals/mandatory/runtime-and-contracts/mw-d1-external-plan-definition-sdk-api-plan-20260417.md`                                                                                                                               | External compile boundary plan                                          | `PS-C01`, `PS-Q07`                                         | Current-state sequence still shows preview persistence through `storePlan(...)` and `validatePlan(planRef, targetAdapter)` without S08 scoped authority                                                                                                                                                            |
| `docs/planning/proposals/mandatory/runtime-and-contracts/postgres-rls-qa-remediation-plan-20260425.md` and `postgres-rls-fowler-qa-remediation-plan-20260426.md`                                                                                | RLS remediation planning                                                | All storage-backed IDs                                     | Treat plan-store tenancy as residual or out-of-scope without routing closure to this scoped command/query matrix                                                                                                                                                                                                   |
| `docs/planning/proposals/mandatory/runtime-and-contracts/tenant-run-identity-platform-owned-run-id-plan-20260423.md`                                                                                                                            | Platform-owned run identity plan                                        | `PS-C02`, `PS-Q01`, `PS-Q02`                               | Leaves plan-record tenant indexing as a separate concern without pointing to this S08 matrix as the closure authority                                                                                                                                                                                              |
| `docs/planning/reviews/20260402-s08-plan-record-plan-store-gap-review.md`                                                                                                                                                                       | S08 gap review                                                          | `PS-C01`, `PS-C07`, `PS-C08`, `PS-Q08`                     | Review context still frames the gap around lifecycle facade and unscoped fetcher dependencies                                                                                                                                                                                                                      |
| `docs/contracts/planner/plan-store-records-v1.md`                                                                                                                                                                                               | Plan-store records contract doc                                         | All record-backed IDs                                      | Still links the prior S08 execution plan as the command/query authority and does not point to this no-legacy matrix                                                                                                                                                                                                |
| `docs/risk-register/quality/R-20260321-planner-validation-lifecycle-semantics.md`                                                                                                                                                               | Open risk register entry                                                | `PS-C07`, `PS-C08`, `PS-Q06`                               | Tracks lifecycle transition semantics as active risk rather than removal/supersession                                                                                                                                                                                                                              |
| `docs/risk-register/quality/R-20260403-S08-4-POSTGRES-THREE-PART-MODEL.yaml` and `R-20260429-WE-HX-1-BOUNDARY-OWNERSHIP.yaml`                                                                                                                   | Open risk register entries                                              | `PS-C01`, `PS-C07`, `PS-C08`, `PS-Q08`                     | Still describe legacy lifecycle callers or unscoped `IPlanFetcher` ownership without S08 tenancy removal posture                                                                                                                                                                                                   |
| `docs/risk-register/quality/R-20260425-PRODUCTION-TENANT-ISOLATION-BASELINE.yaml`, `R-20260405-PLAN-STORE-CANONICAL-SHAPE-DRIFT.yaml`, and `R-20260408-PR807-ADAPTER-POSTGRES-TEST-CONTRACT-DRIFT.yaml`                                         | Open risk register entries                                              | All IDs                                                    | Track deferred plan-store tenancy, canonical-shape drift, or plan-store test drift without closure against this matrix                                                                                                                                                                                             |
| `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`                                                                                                                                                                     | Historical planner package doc still in workspace                       | `PS-C01`, `PS-C07`, `PS-C08`                               | Describes `storePlan`, `markValid`, and `markInvalid` as the lifecycle path                                                                                                                                                                                                                                        |

## Drift Ledger

| Drift ID       | Finding                                                                                                                                                  | Impact                                                                                                                                                                             | Required disposition                                                                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `S08-DRIFT-01` | Plan-store records lack top-level tenant/project/environment ownership.                                                                                  | RLS cannot protect plan rows without parsing JSON; JSON ownership is not an accepted isolation primitive.                                                                          | Add scope tuple to contracts and SQL rows.                                                                                                                                      |
| `S08-DRIFT-02` | `stored_plans` remains both the executable artifact table and the product authority table.                                                               | `fetch`, `fetchForValidation`, lifecycle transitions, and validation record reads are global by `plan_id`, so artifact identity and tenant-owned record identity remain collapsed. | Convert `stored_plans` into a tenant-neutral immutable artifact table or split it into one, then force product reads/writes through scoped plan records before artifact lookup. |
| `S08-DRIFT-03` | Artifacts reader/writer ports accept unscoped IDs for mutable and read operations.                                                                       | Callers can accidentally express cross-tenant operations.                                                                                                                          | Change target command/query signatures or require scoped record payloads.                                                                                                       |
| `S08-DRIFT-04` | API preview and planner-backed start-run still use `IPlanValidationLifecycleStore` as product path.                                                      | Legacy lifecycle facade remains the authority instead of the three-part model.                                                                                                     | Move product path to scoped command/query matrix and remove the lifecycle facade from runtime wiring.                                                                           |
| `S08-DRIFT-05` | `markAdmitted` exists but is not the start-run admission authority.                                                                                      | Admission relation is not guaranteed for planner-backed runs.                                                                                                                      | Wire `PS-C04` into the accepted start-run handoff after scoped validation.                                                                                                      |
| `S08-DRIFT-06` | Engine `IPlanFetcher.fetch(planRef)` has no tenant scope in the port shape.                                                                              | Runtime dispatch can fetch by global `plan_id` if implementation is unguarded.                                                                                                     | Keep engine ownership but require scoped wrapper or implementation-level tenant guard in this slice.                                                                            |
| `S08-DRIFT-07` | Plan-store docs still describe lifecycle and reader methods without scope.                                                                               | Documentation would permit reintroducing unscoped call paths.                                                                                                                      | Update docs only after matrix-approved commands/queries are implemented.                                                                                                        |
| `S08-DRIFT-08` | Existing integration tests prove lifecycle behavior but not plan-store cross-tenant denial.                                                              | Regression suite can pass while tenant isolation remains incomplete.                                                                                                               | Add contract, repository, and Docker-backed RLS tests mapped to this matrix.                                                                                                    |
| `S08-DRIFT-09` | Contract source still publishes `PlanValidationLifecycle.v1` as canonical lifecycle language.                                                            | Consumers can treat the removed lifecycle as a valid contract even after runtime code is changed.                                                                                  | Remove, supersede, or deprecate the contract in the same slice that removes runtime usage; no active export may describe it as canonical.                                       |
| `S08-DRIFT-10` | API and engine plan-fetch ports are unscoped across multiple packages.                                                                                   | A scoped adapter implementation alone would leave public TypeScript boundaries able to express global plan fetch.                                                                  | Change all public fetch/validation reader signatures that cross package or application boundaries to carry scope.                                                               |
| `S08-DRIFT-11` | Tests currently assert lifecycle facade calls and unscoped fetch behavior.                                                                               | Legacy can be accidentally preserved to keep old tests green.                                                                                                                      | Replace lifecycle expectations with scoped matrix command/query expectations and cross-tenant denial cases.                                                                     |
| `S08-DRIFT-12` | Public package barrels still export lifecycle types and interfaces.                                                                                      | Legacy can survive even if direct source callers are removed because downstream imports remain valid.                                                                              | Remove lifecycle exports or replace them with scoped plan-store exports during the same slice.                                                                                  |
| `S08-DRIFT-13` | Active docs and manuals still present lifecycle commands as valid user/operator behavior.                                                                | Operators and future contributors can reintroduce removed lifecycle APIs from documented examples.                                                                                 | Update or retire active docs in the same slice as code removal; historical/evidence docs must be clearly non-authoritative.                                                     |
| `S08-DRIFT-14` | Architecture tests currently protect the legacy lifecycle ownership shape.                                                                               | Correct removal would fail tests that encode the old boundary.                                                                                                                     | Change architecture tests so they forbid lifecycle exports and require scoped DDD command/query ports.                                                                          |
| `S08-DRIFT-15` | Engine, Temporal, and API fixtures normalize unscoped `fetch(planRef)`.                                                                                  | Test infrastructure can mask production drift and make scoped fetch look optional.                                                                                                 | Update fixtures/helpers to require scope wherever runtime fetch crosses a tenant-owned boundary.                                                                                |
| `S08-DRIFT-16` | `validation_state` appears in adapter invariants and protected runtime integration fixtures.                                                             | Lifecycle state can remain an implicit authority even after lifecycle methods are deleted.                                                                                         | Replace assertions with scoped executability/admission records or one-way migration checks only.                                                                                |
| `S08-DRIFT-17` | Plan-store JSON schemas and shape-sync tests mirror the unscoped TypeScript contracts.                                                                   | Contract code can be updated while generated/schema artifacts still permit legacy payloads.                                                                                        | Update schemas and shape-sync tests with the scoped contract fields in the same contracts slice.                                                                                |
| `S08-DRIFT-18` | Prior active S08 planning docs still authorize migration-facade and unscoped command/query shapes.                                                       | The new matrix can be contradicted by older active planning material.                                                                                                              | Mark the prior plan/review as superseded for command/query authority or update them to point to this matrix.                                                                    |
| `S08-DRIFT-19` | Plan-store schema tests do not assert tenant scope, indexes, or RLS for plan-store tables.                                                               | SQL drift can pass while storage remains globally keyed by `plan_id`.                                                                                                              | Add schema tests for scope tuple, scoped constraints/indexes, and RLS/policy posture.                                                                                           |
| `S08-DRIFT-20` | Plan-store row mappers and schema manager encode validation-state/backfill behavior as runtime structure.                                                | Legacy state can remain embedded below the facade even after public methods are removed.                                                                                           | Move validation-state handling to explicit one-way migration code or remove it from runtime mappers/backfill.                                                                   |
| `S08-DRIFT-21` | Open risk register still tracks lifecycle transition semantics as active mitigation scope.                                                               | Risk posture can imply lifecycle is retained instead of removed.                                                                                                                   | Close, supersede, or replace the risk entry with S08 no-legacy removal risk once implementation starts.                                                                         |
| `S08-DRIFT-22` | API composition surfaces wire plan fetchers/resolvers without tenant-owned scope.                                                                        | Scoped ports can be added while application composition still hands global fetchers to routes and factories.                                                                       | Change API module composition, factory dependencies, and route deps to carry scope through resolver/fetcher construction.                                                       |
| `S08-DRIFT-23` | Plan-record integration tests depend on `storePlan` as setup authority.                                                                                  | Tests can force retention of lifecycle storage even when record commands are scoped.                                                                                               | Replace setup with scoped matrix commands or explicit migration fixtures that are not runtime behavior.                                                                         |
| `S08-DRIFT-24` | Engine architecture docs and tests protect unscoped `IPlanFetcher` shape.                                                                                | Correct scoped fetch changes could be blocked by ownership tests that only guard file placement.                                                                                   | Update architecture tests/docs to preserve engine ownership while requiring scoped fetch semantics.                                                                             |
| `S08-DRIFT-25` | Active planner architecture docs still model preview persistence through lifecycle calls.                                                                | Planner/application design material contradicts the no-legacy S08 command matrix.                                                                                                  | Update preview diagrams and component docs to show scoped plan-store commands and admission/executability records.                                                              |
| `S08-DRIFT-26` | Temporal worker runtime resources carry the plan store as an unscoped fetcher resource.                                                                  | Worker composition can continue fetching by global `PlanRef` even if adapter activities are updated.                                                                               | Scope the worker plan-store resource contract or require a tenant-scoped fetch wrapper at worker composition.                                                                   |
| `S08-DRIFT-27` | API and Temporal architecture docs describe plan-store/resolver composition without scoped C&Q ownership.                                                | Documentation can reintroduce global fetch or lifecycle dependencies after implementation.                                                                                         | Update active API/Temporal docs with scoped matrix command/query flow.                                                                                                          |
| `S08-DRIFT-28` | Canonical lane state still frames S08 as migration from the current lifecycle facade.                                                                    | Generated workboard/open-task views will continue advertising a legacy-compatible plan.                                                                                            | Update `agent-lane-a.yaml` and regenerate planning views when this matrix is accepted.                                                                                          |
| `S08-DRIFT-29` | PlanStoreRecords contract doc does not reference this no-legacy matrix as command/query authority.                                                       | Contract readers can follow the older S08 plan and miss the closed no-legacy command/query set.                                                                                    | Update contract doc references to point to this matrix after review.                                                                                                            |
| `S08-DRIFT-30` | Multiple open risk entries describe plan-store tenancy/test/canonical-shape drift without this matrix as closure target.                                 | Risk closeout can become fragmented and leave stale mitigation language.                                                                                                           | Update or supersede related risk entries during implementation closeout.                                                                                                        |
| `S08-DRIFT-31` | Planner executability validation port validates by `PlanRef + adapterId` without scope.                                                                  | API callers can keep validating globally even if storage readers become scoped.                                                                                                    | Change `IPlanExecutabilityValidator` and all composition/tests to require scoped validation context.                                                                            |
| `S08-DRIFT-32` | Contract schema packs, parser helpers, and the public contract barrel still expose unscoped plan-store records as valid runtime payloads.                | Updating TypeScript record interfaces alone could leave parser/schema-pack imports accepting or exporting legacy payloads.                                                         | Update schema packs, parser helpers, validation exports, and shape-sync tests as one contracts slice.                                                                           |
| `S08-DRIFT-33` | API run-status enrichment and its tests read plan records by `planId` without plan-store scope.                                                          | A scoped store can be introduced while read-model enrichment still expresses global plan-record lookup.                                                                            | Change run-status enrichment dependencies and tests to use `PS-Q01` scoped lookup semantics.                                                                                    |
| `S08-DRIFT-34` | Active mandatory ownership-migration planning material still describes lifecycle ownership/import migration without this no-legacy matrix as authority.  | Future work can follow an older migration-compatible posture and keep lifecycle surfaces alive.                                                                                    | Update or supersede that plan's S08 lifecycle language when this matrix is accepted.                                                                                            |
| `S08-DRIFT-35` | External compile boundary planning still documents the current preview path as `storePlan(...)` plus unscoped `validatePlan(planRef, targetAdapter)`.    | Compile/preview boundary work can preserve lifecycle persistence as the assumed handoff path.                                                                                      | Update the mandatory plan to point preview persistence and validation to the scoped S08 matrix, while keeping compile-only flow non-persistent.                                 |
| `S08-DRIFT-36` | RLS remediation plans still treat plan-store tenancy as residual/out-of-scope instead of routing it to this matrix.                                      | Storage security closure can pass with run-state RLS while plan-store RLS remains detached from S08 acceptance.                                                                    | Update RLS planning references so plan-store tenancy closure is governed by the scoped S08 command/query matrix.                                                                |
| `S08-DRIFT-37` | Platform-owned run identity planning leaves plan-record tenant indexing as a separate concern without this matrix as closure authority.                  | Start-run identity work can stay aligned while plan-record lookup remains globally keyed.                                                                                          | Update the run identity plan reference so plan-record tenant indexing is governed by this S08 scoped matrix.                                                                    |
| `S08-DRIFT-38` | Direct start/recovery by caller-provided `PlanRef` reaches the engine without a scoped plan-store ownership assertion at the API handoff.                | Engine fetch can remain the first plan-materialization point, preserving a global `PlanRef` dispatch path even after preview persistence is scoped.                                | Add a scoped `PS-Q08` ownership/materialization guard or tenant-scoped fetch wrapper before engine dispatch for direct `PlanRef` start-run and recovery.                        |
| `S08-DRIFT-39` | Engine `PlanRefPolicy` and `RunAccessPolicy` can be mistaken for plan-store tenancy enforcement, but they only cover tenant access and URI allowlisting. | A path can pass URI policy and tenant access while still fetching a plan row by global `PlanRef`.                                                                                  | Keep URI policy as an integrity/security gate, but add scoped plan-store ownership assertion before materialization or dispatch.                                                |
| `S08-DRIFT-40` | Engine `StartRunAdmissionGuard` and `StartRunValidationPolicy` perform admission checks without scoped plan-store ownership materialization.             | Admission can be green while the executable plan fetch remains globally keyed by `PlanRef`.                                                                                        | Treat admission as necessary but insufficient; require `PS-Q08` scoped ownership assertion or scoped wrapper before any plan bytes are materialized.                            |
| `S08-DRIFT-41` | Accepted ADR-0043 still permits the lifecycle compatibility facade during cutover.                                                                       | The no-legacy S08 matrix can be contradicted by active accepted governance, not only by older planning docs.                                                                       | Amend, supersede, or explicitly narrow ADR-0043 so compatibility facade language cannot authorize retained runtime legacy after this matrix is accepted.                        |
| `S08-DRIFT-42` | `ExecutionPlan.metadata.ownership` and planner-input ownership are optional in the current contract/schema.                                              | Tenant-owned plan-store commands could persist or validate rows whose canonical plan does not prove the same scope tuple as the authorized caller.                                 | For S08 storage commands and materialization queries, require ownership before persistence/dispatch or fail fast with an explicit repair/migration path.                        |
| `S08-DRIFT-43` | `RunExecutionContextAdmissionPolicy` can reject plugin context scope mismatches but does not prove plan-store row ownership.                             | Plugin-bearing plans may look tenant-checked while non-plugin plans, or plugin plans after context validation, still depend on global `PlanRef` materialization.                   | Keep context admission as a separate engine invariant; require scoped `PS-Q08` ownership materialization independently.                                                         |
| `S08-DRIFT-44` | API planner-input ownership resolution can silently omit ownership when authorized project/environment scope is incomplete.                              | Preview/start-run persistence can receive a canonical plan with no ownership even though S08 requires the full scope tuple for tenant-owned rows.                                  | Make tenant-owned plan persistence fail fast when the authorized scope cannot produce `tenantId`, `projectId`, and `environmentId`.                                             |

## Model Bug Ledger

| Bug ID       | Finding                                                                                         | Impact                                                                                                                                                                                                                      | Required disposition                                                                                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `S08-BUG-01` | `PlanOwnership` is post-hash while Postgres keys and FKs are global by `plan_id` or `plan_uri`. | Two tenants can legitimately produce the same content-derived `planId`, but current storage cannot represent tenant-owned rows without either collision, shared mutable state, or cross-tenant lineage/admission ambiguity. | Implement Model B: tenant-neutral immutable artifact identity plus scoped plan-record, admission, executability, and lineage records. Global `plan_id` or `plan_uri` must not remain the key for tenant-owned rows. |

## Legacy Removal Classification

| Surface                                                                             | Classification                                       | Rule                                                                                                              |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `PlanRecord`, `PlanExecutabilityRecord`, `PlanAdmissionLink` v1 without scope tuple | Blocking legacy v1 shape for S08 tenancy             | Must be replaced by scoped contract shape before tenant-owned plan-store closure can be claimed                   |
| `IPlanStoreWriter` / `IPlanStoreReader` unscoped ID methods                         | Blocking legacy port shape for S08 tenancy           | Must be replaced by scoped command/query signatures                                                               |
| `IPlanValidationLifecycleStore`                                                     | Blocking legacy lifecycle facade                     | Must be removed from runtime wiring after scoped commands/queries are adopted                                     |
| `PlanValidationLifecycle.v1` contract source                                        | Blocking legacy contract narrative                   | Must stop describing lifecycle facade behavior as canonical before S08 closure                                    |
| Public barrel exports of lifecycle types                                            | Blocking legacy import path                          | Must be removed or replaced so no package can import lifecycle as a supported API                                 |
| `IPlanExecutabilityValidator.validatePlan(planRef, adapterId)`                      | Blocking unscoped validation port shape              | Must carry scoped validation context before S08 closure                                                           |
| `IPlanFetcher`                                                                      | Engine-owned artifact fetch query                    | Not legacy by ownership; unscoped implementation is blocking drift for tenancy                                    |
| `PlanRefPolicy` as a substitute for scoped fetch                                    | Blocking false closure path                          | URI allowlisting must not be counted as plan-store ownership enforcement                                          |
| `StartRunAdmissionGuard` as a substitute for scoped fetch                           | Blocking false closure path                          | Admission checks must not be counted as plan-store row ownership enforcement                                      |
| `RunExecutionContextAdmissionPolicy` as a substitute for scoped fetch               | Blocking false closure path                          | Context/plugin artifact checks must not be counted as plan-store row ownership enforcement                        |
| `IStoredPlanValidationReader.fetchForValidation(planRef)`                           | Blocking unscoped API validation port shape          | Must be replaced by scoped validation query signature                                                             |
| `stored_plans.validation_state`                                                     | Blocking legacy lifecycle state if used as authority | Must not remain as a runtime authority after executability records are authoritative                              |
| Plan-store JSON schemas without scope tuple                                         | Blocking legacy schema shape                         | Must be updated with scoped contract fields and sync tests                                                        |
| Contract schema-pack and parser helpers without scope tuple                         | Blocking legacy validation surface                   | Must reject unscoped record payloads once scoped contracts are introduced                                         |
| Optional `ExecutionPlan.metadata.ownership` on tenant-owned persisted plans         | Blocking scope ambiguity                             | Must be rejected for S08 plan-store persistence and dispatch unless an explicit historical migration rule applies |
| Missing project/environment in `authorized-scope` planner ownership resolution      | Blocking silent downgrade                            | Tenant-owned plan persistence must fail before storage instead of producing no ownership                          |
| Global `plan_id`/`plan_uri` storage keys for tenant-owned rows                      | Blocking storage model bug                           | Must be replaced by Model B: tenant-neutral artifact identity plus scoped tenant-owned record keys                |
| ADR-0043 compatibility-facade allowance                                             | Blocking governance drift                            | Must be amended, superseded, or narrowed before no-legacy S08 closure can be claimed                              |
| Prior S08 execution-plan command/query lists                                        | Superseded planning surface                          | Must point to this matrix as the closed command/query authority                                                   |

## Acceptance Criteria For The Matrix Phase

- Every S08 plan-store tenancy change maps to one or more `PS-Cxx` or `PS-Qxx`
  rows.
- Every current method in `PostgresPlanStore` is classified as canonical,
  engine-owned query, or drift; no migration facade remains accepted.
- Every current SQL table involved in plan storage is assigned a command/query
  responsibility.
- The storage key model resolves the post-hash `planId` versus tenant-owned row
  tension through Model B: tenant-neutral immutable artifact identity plus
  scoped plan-record, admission, executability, and lineage records.
- Every command and query names its DDD owner; orphan helper/repository/SQL
  operations are treated as drift.
- Every legacy or unscoped surface has a removal disposition, except
  engine-owned fetch behavior whose owner is retained but whose unscoped
  implementation drift must be removed.
- Contract exports, application ports, and tests that currently encode legacy
  lifecycle behavior are changed in the same slice as runtime removal.
- Active docs that currently advertise lifecycle commands are updated or
  explicitly retired as historical before S08 closure is claimed.
- Prior S08 planning materials and open risk entries that still authorize or
  mitigate lifecycle-facade behavior are superseded, closed, or redirected to
  this matrix before implementation is claimed complete.
- Accepted governance that still permits lifecycle compatibility facades is
  amended, superseded, or narrowed before no-legacy S08 closure is claimed.
- API, Temporal worker, and active architecture documentation all describe the
  same scoped command/query flow before runtime changes are claimed complete.
- No implementation starts until this matrix is reviewed and accepted.

## Validation Baseline For This Planning Artifact

- `pnpm docs:sync`
- `pnpm exec markdownlint-cli2 "docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md"`
- `pnpm verify:prepush`

## Feature Mechanization Manifest: S08 Temporal Legacy Removal

This manifest binds the Temporal local S08 removal slice to its exact files,
command/query rail, DDD owner, and declared symbols. It exists so implementation
mode cannot accidentally treat the slice as part of unrelated feature manifests.

```feature-mechanization
version: 1
featureId: S08-TEMPORAL-LEGACY-REMOVAL
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md
componentGuides:
  - docs/architecture/components/engine/adapters/temporal/temporal-planref-workflow-boundary.md
  - docs/planning/status/system-operations-inventory-20260501.md
userStories:
  - docs/planning/closeouts/20260502-s08-temporal-legacy-removal-closeout.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/adr/ADR-0031-tenant-isolation.md
  - docs/adr/ADR-0034-bounded-context-ports.md
  - docs/adr/ADR-0039-hexagonal-solid-remediation.md
  - docs/adr/ADR-0043-plan-record-plan-store-and-artifacts-ownership.md
  - docs/adr/adr-0052-planref-continuation-safety.md
allowedImplementationSurfaces:
  - apps/temporal-worker/src/runtime/runtimeTypes.ts
  - apps/temporal-worker/src/runtime/temporalWorkerLifecycle.ts
  - apps/temporal-worker/src/runtime/temporalWorkerRuntimeHandle.ts
  - apps/temporal-worker/src/runtime/temporalWorkerRuntimeResources.ts
  - apps/temporal-worker/src/runtime/temporalWorkerStores.ts
  - apps/temporal-worker/test/runtime/createTemporalWorkerRuntime.srp.architecture.test.ts
  - docs/evidence/ed-20260502-s08-temporal-legacy-removal.md
  - docs/evidence/index.md
  - docs/planning/closeouts/20260502-s08-temporal-legacy-removal-closeout.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md
  - docs/planning/status/**
  - docs/risk-register/quality/index.md
  - docs/risk-register/quality/R-20260402-S08-PLAN-STORE-CONTRACT-DRIFT.yaml
  - docs/risk-register/quality/r-20260502-s08-temporal-dispatch-scope.yaml
  - packages/@dvt/adapter-temporal/src/activities/activityFactory.ts
  - packages/@dvt/adapter-temporal/src/activities/activityTypes.ts
  - packages/@dvt/adapter-temporal/src/activities/stepActivities.ts
  - packages/@dvt/adapter-temporal/src/activities/temporalPlanArtifactReader.ts
  - packages/@dvt/adapter-temporal/src/index.ts
  - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layers.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.types.ts
  - packages/@dvt/adapter-temporal/test/TemporalWorkerHost.lifecycle.test.ts
  - packages/@dvt/adapter-temporal/test/activities.test.ts
  - packages/@dvt/adapter-temporal/test/activityDeps.typecheck.ts
  - packages/@dvt/adapter-temporal/test/helpers/contractFixtures.ts
  - packages/@dvt/adapter-temporal/test/helpers/integration/testActivities.ts
  - packages/@dvt/adapter-temporal/test/helpers/integration/testPlans.ts
  - packages/@dvt/adapter-temporal/test/integration.postgres.time-skipping.test.ts
  - packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts
  - packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
  - packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
  - packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
forbiddenImplementationSurfaces:
  - apps/api/**
  - apps/web/**
  - packages/@dvt/adapter-postgres/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/planner/**
commandQueryRails:
  - name: FetchPlanForEngineDispatch
    type: query
    dddOwner: Temporal plan-store composition activity boundary
domainObjects:
  - name: TemporalPlanArtifactReader
    type: application query gateway
    owner: SYS-PLANSTORE-TEMPORAL-COMPOSITION
  - name: FetchPlanForEngineDispatch
    type: scoped dispatch materialization query
    owner: SYS-PLANSTORE-TEMPORAL-COMPOSITION
fowlerSignals:
  - Hidden authority
  - Boundary drift
  - Responsibility overload
architectureGuards:
  - pnpm --filter @dvt/adapter-temporal test -- test/temporalPlanArtifactReader.test.ts test/workflow-component-semantics.architecture.test.ts test/activities.test.ts
  - pnpm --filter dvt-temporal-worker test -- test/runtime/createTemporalWorkerRuntime.srp.architecture.test.ts
cypressFlows:
  - N/A - Temporal worker and adapter boundary slice
completionGate:
  - pnpm --filter @dvt/adapter-temporal test -- test/temporalPlanArtifactReader.test.ts test/workflow-component-semantics.architecture.test.ts test/activities.test.ts
  - pnpm --filter dvt-temporal-worker test
  - pnpm --filter @dvt/adapter-temporal typecheck
  - pnpm --filter dvt-temporal-worker typecheck
  - pnpm lint:determinism
  - pnpm verify:prepush
redGreenCycles:
  - id: temporal-dispatch-scope-query
    redTest: pnpm --filter @dvt/adapter-temporal test -- test/temporalPlanArtifactReader.test.ts test/workflow-component-semantics.architecture.test.ts
    expectedFailure: Temporal dispatch materialization lacks a scoped reader and workflow segment resolution does not pass ctx.
    patchSurfaces:
      - packages/@dvt/adapter-temporal/src/activities/temporalPlanArtifactReader.ts
      - packages/@dvt/adapter-temporal/src/activities/activityFactory.ts
      - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
    greenTest: pnpm --filter @dvt/adapter-temporal test -- test/temporalPlanArtifactReader.test.ts test/workflow-component-semantics.architecture.test.ts test/activities.test.ts
  - id: temporal-worker-runtime-legacy-removal
    redTest: pnpm --filter dvt-temporal-worker test -- test/runtime/createTemporalWorkerRuntime.srp.architecture.test.ts
    expectedFailure: Temporal worker runtime still exposes PlanFetcherLike, planFetcherFactory, or planStore.
    patchSurfaces:
      - apps/temporal-worker/src/runtime/runtimeTypes.ts
      - apps/temporal-worker/src/runtime/temporalWorkerStores.ts
      - apps/temporal-worker/src/runtime/temporalWorkerRuntimeResources.ts
    greenTest: pnpm --filter dvt-temporal-worker test -- test/runtime/createTemporalWorkerRuntime.srp.architecture.test.ts
symbols:
  - name: createScopedTemporalPlanArtifactReader
    path: packages/@dvt/adapter-temporal/src/activities/stepActivities.ts
    dddOwner: Temporal adapter public activity exports
    cqRails:
      - FetchPlanForEngineDispatch
    fowlerSignals:
      - Boundary drift
    architectureGuard: packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
    cypressCoverage: N/A - Temporal activity boundary
    unitTests:
      - packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
  - name: CreateScopedTemporalPlanArtifactReaderArgs
    path: packages/@dvt/adapter-temporal/src/activities/temporalPlanArtifactReader.ts
    dddOwner: Temporal plan-store composition activity boundary
    cqRails:
      - FetchPlanForEngineDispatch
    fowlerSignals:
      - Boundary drift
    architectureGuard: packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
    cypressCoverage: N/A - Temporal activity boundary
    unitTests:
      - packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
  - name: FetchPlanForEngineDispatchInput
    path: packages/@dvt/adapter-temporal/src/activities/temporalPlanArtifactReader.ts
    dddOwner: Temporal plan-store composition activity boundary
    cqRails:
      - FetchPlanForEngineDispatch
    fowlerSignals:
      - Hidden authority
    architectureGuard: packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
    cypressCoverage: N/A - Temporal activity boundary
    unitTests:
      - packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
  - name: FetchPlanForEngineDispatchResult
    path: packages/@dvt/adapter-temporal/src/activities/temporalPlanArtifactReader.ts
    dddOwner: Temporal plan-store composition activity boundary
    cqRails:
      - FetchPlanForEngineDispatch
    fowlerSignals:
      - Hidden authority
    architectureGuard: packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
    cypressCoverage: N/A - Temporal activity boundary
    unitTests:
      - packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
  - name: TemporalPlanArtifactReader
    path: packages/@dvt/adapter-temporal/src/activities/temporalPlanArtifactReader.ts
    dddOwner: Temporal plan-store composition activity boundary
    cqRails:
      - FetchPlanForEngineDispatch
    fowlerSignals:
      - Boundary drift
    architectureGuard: packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
    cypressCoverage: N/A - Temporal activity boundary
    unitTests:
      - packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
  - name: assertPlanOwnershipMatchesContext
    path: packages/@dvt/adapter-temporal/src/activities/temporalPlanArtifactReader.ts
    dddOwner: Temporal plan-store composition activity boundary
    cqRails:
      - FetchPlanForEngineDispatch
    fowlerSignals:
      - Hidden authority
    architectureGuard: packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
    cypressCoverage: N/A - Temporal activity boundary
    unitTests:
      - packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
  - name: createScopedTemporalPlanArtifactReader
    path: packages/@dvt/adapter-temporal/src/activities/temporalPlanArtifactReader.ts
    dddOwner: Temporal plan-store composition activity boundary
    cqRails:
      - FetchPlanForEngineDispatch
    fowlerSignals:
      - Boundary drift
    architectureGuard: packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
    cypressCoverage: N/A - Temporal activity boundary
    unitTests:
      - packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
  - name: ActivityDepOverrides
    path: packages/@dvt/adapter-temporal/test/activities.test.ts
    dddOwner: Temporal adapter test fixture
    cqRails:
      - FetchPlanForEngineDispatch
    fowlerSignals:
      - Coverage refinement
    architectureGuard: packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
    cypressCoverage: N/A - unit test fixture
    unitTests:
      - packages/@dvt/adapter-temporal/test/activities.test.ts
  - name: INTEGRATION_PLAN_OWNERSHIP
    path: packages/@dvt/adapter-temporal/test/helpers/integration/testPlans.ts
    dddOwner: Temporal adapter integration fixture
    cqRails:
      - FetchPlanForEngineDispatch
    fowlerSignals:
      - Coverage refinement
    architectureGuard: packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
    cypressCoverage: N/A - integration fixture
    unitTests:
      - packages/@dvt/adapter-temporal/test/activities.test.ts
      - packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
      - packages/@dvt/adapter-temporal/test/integration.postgres.time-skipping.test.ts
  - name: createPlanOwnershipFromContext
    path: packages/@dvt/adapter-temporal/test/helpers/integration/testPlans.ts
    dddOwner: Temporal adapter integration fixture
    cqRails:
      - FetchPlanForEngineDispatch
    fowlerSignals:
      - Coverage refinement
    architectureGuard: packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
    cypressCoverage: N/A - integration fixture
    unitTests:
      - packages/@dvt/adapter-temporal/test/integration.postgres.time-skipping.test.ts
  - name: mkPostgresTransformationPlan
    path: packages/@dvt/adapter-temporal/test/helpers/integration/testPlans.ts
    dddOwner: Temporal adapter Postgres integration fixture
    cqRails:
      - FetchPlanForEngineDispatch
    fowlerSignals:
      - Coverage refinement
    architectureGuard: packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
    cypressCoverage: N/A - integration fixture
    unitTests:
      - packages/@dvt/adapter-temporal/test/integration.postgres.time-skipping.test.ts
  - name: BASE_PLAN
    path: packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
    dddOwner: Temporal plan artifact reader test fixture
    cqRails:
      - FetchPlanForEngineDispatch
    fowlerSignals:
      - Coverage refinement
    architectureGuard: packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
    cypressCoverage: N/A - unit test fixture
    unitTests:
      - packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
  - name: EXECUTION_POLICY
    path: packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
    dddOwner: Temporal plan artifact reader test fixture
    cqRails:
      - FetchPlanForEngineDispatch
    fowlerSignals:
      - Coverage refinement
    architectureGuard: packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
    cypressCoverage: N/A - unit test fixture
    unitTests:
      - packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
  - name: PLAN
    path: packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
    dddOwner: Temporal plan artifact reader test fixture
    cqRails:
      - FetchPlanForEngineDispatch
    fowlerSignals:
      - Coverage refinement
    architectureGuard: packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
    cypressCoverage: N/A - unit test fixture
    unitTests:
      - packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
  - name: PLAN_REF
    path: packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
    dddOwner: Temporal plan artifact reader test fixture
    cqRails:
      - FetchPlanForEngineDispatch
    fowlerSignals:
      - Coverage refinement
    architectureGuard: packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
    cypressCoverage: N/A - unit test fixture
    unitTests:
      - packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
  - name: createIntegrityValidator
    path: packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
    dddOwner: Temporal plan artifact reader test fixture
    cqRails:
      - FetchPlanForEngineDispatch
    fowlerSignals:
      - Coverage refinement
    architectureGuard: packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
    cypressCoverage: N/A - unit test fixture
    unitTests:
      - packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
  - name: createUnusedFetcher
    path: packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
    dddOwner: Temporal plan artifact reader test fixture
    cqRails:
      - FetchPlanForEngineDispatch
    fowlerSignals:
      - Coverage refinement
    architectureGuard: packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
    cypressCoverage: N/A - unit test fixture
    unitTests:
      - packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
```

## Feature Mechanization Manifest: S08 Scoped Artifact Port Closure

This manifest binds the broader S08 scoped plan-store remediation slice to the
single canonical artifact port owner. It exists because the closure touches
contracts, artifacts, planner, engine, API, Temporal, PostgreSQL, and governance
documentation in one bounded migration.

```feature-mechanization
version: 1
featureId: S08-SCOPED-ARTIFACT-PORT-CLOSURE-20260509
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md
componentGuides:
  - docs/architecture/components/engine/contracts/plan-store-records-component.md
  - docs/architecture/components/engine/architecture/workflow-engine-boundary-ownership-component.md
  - docs/architecture/components/planner/planner-private-behavior-ports-component.md
  - docs/architecture/components/api/protected-runtime-and-plan-compile-component.md
userStories:
  - docs/architecture/components/engine/contracts/plan-store-records-user-stories.md
  - docs/architecture/components/engine/architecture/workflow-engine-boundary-ownership-user-stories.md
  - buzon/20260509-codex-fowler-plan-store-scoped-records-analysis-and-remediation.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/adr/ADR-0031-adapter-tenant-isolation.md
  - docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md
  - docs/adr/ADR-0041-global-domain-state-model-and-boundary-contracts.md
  - docs/adr/ADR-0042-execution-plan-canonical-identity-unification.md
  - docs/adr/ADR-0043-plan-record-plan-store-and-artifacts-ownership.md
  - docs/adr/ADR-0054-plan-store-scoped-record-identity.md
  - docs/contracts/planner/plan-store-records-v1.md
allowedImplementationSurfaces:
  - apps/api/**
  - buzon/20260509-codex-fowler-plan-store-scoped-records-analysis-and-remediation.md
  - buzon/20260515-codex-fowler-s08-lifecycle-contract-retirement-analysis.md
  - docs/.manifest.json
  - docs/adr/**
  - docs/architecture/components/api/protected-runtime-and-plan-compile-component.md
  - docs/architecture/components/engine/**
  - docs/architecture/components/planner/**
  - docs/architecture/diagrams/**
  - docs/contracts/**
  - docs/evidence/**
  - docs/guides/postgres-plan-store-*.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md
  - docs/planning/status/**
  - docs/risk-register/quality/**
  - packages/@dvt/adapter-postgres/**
  - packages/@dvt/adapter-temporal/**
  - packages/@dvt/artifacts/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/planner/**
  - pnpm-lock.yaml
forbiddenImplementationSurfaces:
  - apps/web/**
  - packages/@dvt/state-store/**
  - packages/@dvt/run-domain/**
  - packages/@dvt/delivery/**
  - scripts/**
commandQueryRails:
  - name: CreateStoredPlan
    type: command
    dddOwner: Preview/start-run application service with PlanRecord aggregate
  - name: CreatePlanRecord
    type: command
    dddOwner: PlanRecord aggregate
  - name: RecordPlanExecutability
    type: command
    dddOwner: Plan executability domain service
  - name: MarkPlanAdmitted
    type: command
    dddOwner: Runtime admission application service
  - name: GetPlanRecord
    type: query
    dddOwner: Plan record read model
  - name: GetPlanRecordByRef
    type: query
    dddOwner: Plan record read model
  - name: FetchPlanForValidation
    type: query
    dddOwner: Plan validation application service
  - name: FetchPlanForEngineDispatch
    type: query
    dddOwner: Engine runtime materialization boundary
domainObjects:
  - name: PlanStoreScope
    type: value object
    owner: Plan-store scoped record contracts
  - name: ScopedPlanRef
    type: value object
    owner: Plan-store scoped record contracts
  - name: IStoredPlanArtifactStore
    type: application port
    owner: Artifacts bounded context
  - name: IPlanIntegrityValidator
    type: engine port
    owner: Engine runtime boundary
  - name: PostgresPlanStore
    type: storage adapter
    owner: PostgreSQL plan-store adapter
fowlerSignals:
  - Boundary drift
  - Hidden authority
  - Responsibility overload
  - Semantic duplication
  - Repeated unscoped materialization
architectureGuards:
  - pnpm docs:feature-mechanization:implementation
  - packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
  - packages/@dvt/engine/test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts
cypressFlows:
  - N/A - backend contract, adapter, API, and engine boundary slice
completionGate:
  - pnpm docs:feature-mechanization -- --feature S08-SCOPED-ARTIFACT-PORT-CLOSURE-20260509
  - pnpm docs:feature-mechanization:implementation
  - pnpm governance:refresh
  - pnpm ci:docs
  - pnpm verify:prepush
redGreenCycles:
  - id: scoped-plan-record-contracts
    redTest: pnpm --filter @dvt/contracts test -- test/plan-store-records.architecture.test.ts
    expectedFailure: Plan-store records and lifecycle vocabulary still allowed unscoped plan identity.
    patchSurfaces:
      - packages/@dvt/contracts/src/contracts/planner/**
      - packages/@dvt/contracts/src/schema-packs/plan-records.ts
      - packages/@dvt/contracts/test/**
    greenTest: pnpm --filter @dvt/contracts test -- test/plan-store-records.architecture.test.ts
  - id: canonical-artifact-port-owner
    redTest: pnpm --filter @dvt/artifacts build
    expectedFailure: Stored-plan artifact lifecycle behavior had ports in several bounded contexts.
    patchSurfaces:
      - packages/@dvt/artifacts/src/**
      - packages/@dvt/planner/src/contracts/PlanExecutabilityValidation.ts
      - packages/@dvt/engine/src/ports/IPlanIntegrityValidator.ts
    greenTest: pnpm --filter @dvt/artifacts --filter @dvt/planner --filter @dvt/engine build
  - id: scoped-runtime-composition
    redTest: pnpm --filter dvt-api --filter @dvt/adapter-postgres test
    expectedFailure: API and PostgreSQL composition could still materialize by unscoped plan reference.
    patchSurfaces:
      - apps/api/**
      - packages/@dvt/adapter-postgres/**
      - packages/@dvt/adapter-temporal/**
    greenTest: pnpm --filter dvt-api --filter @dvt/adapter-postgres --filter @dvt/adapter-temporal test
  - id: governance-drift-closeout
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: The broad S08 diff was not declared by a feature mechanization manifest.
    patchSurfaces:
      - docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md
      - docs/planning/status/**
      - docs/evidence/**
      - docs/risk-register/quality/**
    greenTest: pnpm docs:feature-mechanization:implementation
symbols:
  - name: toScopedPlanRef
    path: apps/api/src/application/services/PlannerBackedStartRunUseCase.ts
    dddOwner: API start-run application service
    cqRails: [FetchPlanForValidation]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend use-case helper
    unitTests: [dvt-api application service tests]
  - name: PlanCompileResult
    path: apps/api/src/application/services/PlannerBackedStartRunUseCase.ts
    dddOwner: API start-run application service
    cqRails: [FetchPlanForValidation]
    fowlerSignals: [Long method]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend use-case helper type
    unitTests: [dvt-api application service tests]
  - name: StoredPlannerArtifact
    path: apps/api/src/application/services/PlannerBackedStartRunUseCase.ts
    dddOwner: API start-run application service
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Long method]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend use-case helper type
    unitTests: [dvt-api application service tests]
  - name: StoredPlannerArtifactResult
    path: apps/api/src/application/services/PlannerBackedStartRunUseCase.ts
    dddOwner: API start-run application service
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Long method]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend use-case helper type
    unitTests: [dvt-api application service tests]
  - name: toDelegateCommand
    path: apps/api/src/application/services/PlannerBackedStartRunUseCase.ts
    dddOwner: API start-run application service
    cqRails: [FetchPlanForValidation]
    fowlerSignals: [Long method]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend use-case helper
    unitTests: [dvt-api application service tests]
  - name: toExecutableSubgraphRequest
    path: apps/api/src/application/services/PlannerBackedStartRunUseCase.ts
    dddOwner: API start-run application service
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Long method]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend use-case helper
    unitTests: [dvt-api application service tests]
  - name: toPlanRejectedResult
    path: apps/api/src/application/services/PlannerBackedStartRunUseCase.ts
    dddOwner: API start-run application service
    cqRails: [FetchPlanForValidation]
    fowlerSignals: [Long method]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend use-case helper
    unitTests: [dvt-api application service tests]
  - name: CanonicalRunSnapshot
    path: apps/api/src/application/services/getRunStatusUseCase.ts
    dddOwner: API run-status query application service
    cqRails: [GetRunRecord]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend query helper type
    unitTests: [dvt-api run-status tests]
  - name: PlanRecordMetadata
    path: apps/api/src/application/services/getRunStatusUseCase.ts
    dddOwner: API run-status query application service
    cqRails: [GetPlanRecord]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend query helper type
    unitTests: [dvt-api run-status tests]
  - name: ProviderView
    path: apps/api/src/application/services/getRunStatusUseCase.ts
    dddOwner: API run-status query application service
    cqRails: [GetRunRecord]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend query helper type
    unitTests: [dvt-api run-status tests]
  - name: RunReadRef
    path: apps/api/src/application/services/getRunStatusUseCase.ts
    dddOwner: API run-status query application service
    cqRails: [GetRunRecord]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend query value object
    unitTests: [dvt-api run-status tests]
  - name: RunStatusResponseInput
    path: apps/api/src/application/services/getRunStatusUseCase.ts
    dddOwner: API run-status query application service
    cqRails: [GetRunRecord]
    fowlerSignals: [Long method]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend query helper type
    unitTests: [dvt-api run-status tests]
  - name: toRunReadRef
    path: apps/api/src/application/services/getRunStatusUseCase.ts
    dddOwner: API run-status query application service
    cqRails: [GetRunRecord]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend query helper
    unitTests: [dvt-api run-status tests]
  - name: toScopedPlanRef
    path: apps/api/src/application/services/PreviewPlanUseCase.ts
    dddOwner: API preview application service
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend use-case helper
    unitTests: [dvt-api route and preview tests]
  - name: SCOPED_STORED_PLAN_REF
    path: apps/api/test/application/services/PlannerBackedStartRunUseCase.test.ts
    dddOwner: API start-run test fixture
    cqRails: [FetchPlanForValidation]
    fowlerSignals: [Coverage refinement]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - unit test fixture
    unitTests: [dvt-api application service tests]
  - name: SCOPED_PLAN_REF
    path: apps/api/test/application/services/StoredExecutablePlanResolver.test.ts
    dddOwner: API stored executable resolver test fixture
    cqRails: [FetchPlanForValidation]
    fowlerSignals: [Coverage refinement]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - unit test fixture
    unitTests: [dvt-api resolver tests]
  - name: SCOPED_PLAN_REF
    path: apps/api/test/application/services/storedPlanExecutabilityValidator/harness.ts
    dddOwner: API executability validator test harness
    cqRails: [FetchPlanForValidation]
    fowlerSignals: [Coverage refinement]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - unit test fixture
    unitTests: [dvt-api executability validator tests]
  - name: makeValidationReader
    path: apps/api/test/application/services/storedPlanExecutabilityValidator/harness.ts
    dddOwner: API executability validator test harness
    cqRails: [FetchPlanForValidation]
    fowlerSignals: [Coverage refinement]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - unit test fixture
    unitTests: [dvt-api executability validator tests]
  - name: validationInput
    path: apps/api/test/application/services/storedPlanExecutabilityValidator/harness.ts
    dddOwner: API executability validator test harness
    cqRails: [FetchPlanForValidation]
    fowlerSignals: [Coverage refinement]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - unit test fixture
    unitTests: [dvt-api executability validator tests]
  - name: SCOPED_VALID_PLAN_REF
    path: apps/api/test/entrypoints/http/importPlanRoute.test.ts
    dddOwner: API import-plan route test fixture
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Coverage refinement]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - HTTP route test fixture
    unitTests: [dvt-api import route tests]
  - name: SCOPED_VALID_PLAN_REF
    path: apps/api/test/entrypoints/http/previewPlanRoute.outcomes.test.ts
    dddOwner: API preview route test fixture
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Coverage refinement]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - HTTP route test fixture
    unitTests: [dvt-api preview route tests]
  - name: ExecutabilityValidationError
    path: apps/api/src/application/services/StoredPlanExecutabilityValidator.ts
    dddOwner: API stored-plan executability validator
    cqRails: [FetchPlanForValidation]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend validator type
    unitTests: [dvt-api executability validator tests]
  - name: createPreviewDeps
    path: apps/api/test/entrypoints/http/previewPlanRouteTestSupport.ts
    dddOwner: API preview route test support
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Coverage refinement]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - HTTP route test support
    unitTests: [dvt-api preview route tests]
  - name: getRequiredPlanStoreScope
    path: packages/@dvt/adapter-postgres/src/PostgresPlanStore.mappers.ts
    dddOwner: PostgreSQL plan-store mapper boundary
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Hidden authority]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend adapter mapper
    unitTests: [adapter-postgres plan-store tests]
  - name: PlanRecordScope
    path: packages/@dvt/adapter-postgres/src/PostgresPlanStore.plan-record-repository.ts
    dddOwner: PostgreSQL plan-record repository
    cqRails: [GetPlanRecord]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend adapter type
    unitTests: [adapter-postgres plan-store tests]
  - name: MarkSupersededInput
    path: packages/@dvt/adapter-postgres/src/PostgresPlanStore.plan-record-repository.ts
    dddOwner: PostgreSQL plan-record repository
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Long method]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend adapter type
    unitTests: [adapter-postgres plan-store tests]
  - name: sqlAssertPlanRecordsScopedShape
    path: packages/@dvt/adapter-postgres/src/PostgresPlanStore.sql.ts
    dddOwner: PostgreSQL plan-store schema guard
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Hidden authority]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend SQL guard
    unitTests: [adapter-postgres SQL tests]
  - name: sqlAssertStoredPlansCanonicalOwnership
    path: packages/@dvt/adapter-postgres/src/PostgresPlanStore.sql.ts
    dddOwner: PostgreSQL stored-plan schema guard
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Hidden authority]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend SQL guard
    unitTests: [adapter-postgres SQL tests]
  - name: PLAN_STORE_SCOPE
    path: packages/@dvt/adapter-postgres/test/PostgresPlanStore.integration.helpers.ts
    dddOwner: PostgreSQL plan-store integration fixture
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - integration fixture
    unitTests: [adapter-postgres integration tests]
  - name: storePlanArtifact
    path: packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-core.integration.test.ts
    dddOwner: PostgreSQL plan-store integration fixture
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Coverage refinement]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - integration fixture
    unitTests: [adapter-postgres records tests]
  - name: archive
    path: packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-guards.integration.test.ts
    dddOwner: PostgreSQL plan-store guard fixture
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - integration fixture
    unitTests: [adapter-postgres guard tests]
  - name: scopedPlan
    path: packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-guards.integration.test.ts
    dddOwner: PostgreSQL plan-store guard fixture
    cqRails: [GetPlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - integration fixture
    unitTests: [adapter-postgres guard tests]
  - name: storePlanArtifact
    path: packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-guards.integration.test.ts
    dddOwner: PostgreSQL plan-store guard fixture
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Coverage refinement]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - integration fixture
    unitTests: [adapter-postgres guard tests]
  - name: supersession
    path: packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-guards.integration.test.ts
    dddOwner: PostgreSQL plan-store guard fixture
    cqRails: [GetPlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - integration fixture
    unitTests: [adapter-postgres guard tests]
  - name: fetcher
    path: packages/@dvt/adapter-temporal/test/activityDeps.typecheck.ts
    dddOwner: Temporal adapter typecheck fixture
    cqRails: [FetchPlanForEngineDispatch]
    fowlerSignals: [Coverage refinement]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - adapter typecheck fixture
    unitTests: [adapter-temporal typecheck tests]
  - name: scopedPlanRef
    path: packages/@dvt/adapter-temporal/test/dbtRuntimeFixtures.test.ts
    dddOwner: Temporal adapter DBT runtime fixture
    cqRails: [FetchPlanForEngineDispatch]
    fowlerSignals: [Coverage refinement]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - adapter test fixture
    unitTests: [adapter-temporal runtime fixture tests]
  - name: TestPlanFetcher
    path: packages/@dvt/adapter-temporal/test/helpers/integration/testActivities.ts
    dddOwner: Temporal adapter integration fixture
    cqRails: [FetchPlanForEngineDispatch]
    fowlerSignals: [Coverage refinement]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - integration fixture
    unitTests: [adapter-temporal integration tests]
  - name: createUnusedFetcher
    path: packages/@dvt/adapter-temporal/test/temporalPlanArtifactReader.test.ts
    dddOwner: Temporal plan artifact reader test fixture
    cqRails: [FetchPlanForEngineDispatch]
    fowlerSignals: [Coverage refinement]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - unit test fixture
    unitTests: [adapter-temporal reader tests]
  - name: ScopedPlanExecutabilityQuery
    path: packages/@dvt/artifacts/src/ports/IPlanStoreReader.ts
    dddOwner: Artifacts plan-store read port
    cqRails: [GetPlanRecord]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend port type
    unitTests: [artifacts build and consumer tests]
  - name: ArchivePlanInput
    path: packages/@dvt/artifacts/src/ports/IPlanStoreWriter.ts
    dddOwner: Artifacts plan-store write port
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend port type
    unitTests: [artifacts build and consumer tests]
  - name: MarkPlanSupersededInput
    path: packages/@dvt/artifacts/src/ports/IPlanStoreWriter.ts
    dddOwner: Artifacts plan-store write port
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend port type
    unitTests: [artifacts build and consumer tests]
  - name: IStoredPlanArtifactReader
    path: packages/@dvt/artifacts/src/ports/IStoredPlanArtifactStore.ts
    dddOwner: Artifacts stored-plan artifact port
    cqRails: [FetchPlanForValidation]
    fowlerSignals: [Semantic duplication]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend port type
    unitTests: [artifacts build and consumer tests]
  - name: IStoredPlanArtifactStore
    path: packages/@dvt/artifacts/src/ports/IStoredPlanArtifactStore.ts
    dddOwner: Artifacts stored-plan artifact port
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Semantic duplication]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend port type
    unitTests: [artifacts build and consumer tests]
  - name: IStoredPlanArtifactWriter
    path: packages/@dvt/artifacts/src/ports/IStoredPlanArtifactStore.ts
    dddOwner: Artifacts stored-plan artifact port
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Semantic duplication]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend port type
    unitTests: [artifacts build and consumer tests]
  - name: MarkStoredPlanArtifactInvalidInput
    path: packages/@dvt/artifacts/src/ports/IStoredPlanArtifactStore.ts
    dddOwner: Artifacts stored-plan artifact port
    cqRails: [RecordPlanExecutability]
    fowlerSignals: [Semantic duplication]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend port type
    unitTests: [artifacts build and consumer tests]
  - name: StorePlanArtifactInput
    path: packages/@dvt/artifacts/src/ports/IStoredPlanArtifactStore.ts
    dddOwner: Artifacts stored-plan artifact port
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Semantic duplication]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend port type
    unitTests: [artifacts build and consumer tests]
  - name: StoredPlanArtifact
    path: packages/@dvt/artifacts/src/ports/IStoredPlanArtifactStore.ts
    dddOwner: Artifacts stored-plan artifact port
    cqRails: [FetchPlanForValidation]
    fowlerSignals: [Semantic duplication]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - backend port type
    unitTests: [artifacts build and consumer tests]
  - name: PlanAdmissionLink
    path: packages/@dvt/contracts/src/contracts/planner/PlanAdmissionLink.v1.ts
    dddOwner: Plan admission link contract
    cqRails: [MarkPlanAdmitted]
    fowlerSignals: [Boundary drift]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - backend contract
    unitTests: [contracts plan-store record tests]
  - name: PlanExecutabilityRecordBase
    path: packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityRecord.v1.ts
    dddOwner: Plan executability record contract
    cqRails: [RecordPlanExecutability]
    fowlerSignals: [Boundary drift]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - backend contract
    unitTests: [contracts plan-store record tests]
  - name: PlanRecordBase
    path: packages/@dvt/contracts/src/contracts/planner/PlanRecord.v1.ts
    dddOwner: Plan record contract
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Boundary drift]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - backend contract
    unitTests: [contracts plan-store record tests]
  - name: StoredPlanArtifactValidationState
    path: packages/@dvt/contracts/src/contracts/planner/StoredPlanArtifactValidation.v1.ts
    dddOwner: Stored-plan artifact validation DTO vocabulary
    cqRails: [FetchPlanForValidation]
    fowlerSignals: [Boundary drift]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - backend contract
    unitTests: [contracts plan-store record tests]
  - name: StoredPlanArtifactValidationRecord
    path: packages/@dvt/contracts/src/contracts/planner/StoredPlanArtifactValidation.v1.ts
    dddOwner: Stored-plan artifact validation DTO vocabulary
    cqRails: [FetchPlanForValidation]
    fowlerSignals: [Boundary drift]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - backend contract
    unitTests: [contracts plan-store record tests]
  - name: PlanStoreScope
    path: packages/@dvt/contracts/src/contracts/planner/PlanRecord.v1.ts
    dddOwner: Plan-store scope value object
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Boundary drift]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - backend contract
    unitTests: [contracts plan-store record tests]
  - name: ScopedPlanId
    path: packages/@dvt/contracts/src/contracts/planner/PlanRecord.v1.ts
    dddOwner: Scoped plan identifier value object
    cqRails: [GetPlanRecord]
    fowlerSignals: [Boundary drift]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - backend contract
    unitTests: [contracts plan-store record tests]
  - name: ScopedPlanRef
    path: packages/@dvt/contracts/src/contracts/planner/PlanRecord.v1.ts
    dddOwner: Scoped plan reference value object
    cqRails: [FetchPlanForValidation]
    fowlerSignals: [Boundary drift]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - backend contract
    unitTests: [contracts plan-store record tests]
  - name: PlanStoreScopeSchema
    path: packages/@dvt/contracts/src/schema-packs/plan-records.ts
    dddOwner: Plan-store scope schema pack
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Boundary drift]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - backend schema pack
    unitTests: [contracts schema-pack tests]
  - name: validateCanonicalOwnership
    path: packages/@dvt/contracts/src/schema-packs/plan-records.ts
    dddOwner: Plan-store ownership schema pack
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Hidden authority]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - backend schema pack
    unitTests: [contracts schema-pack tests]
  - name: VALID_EXECUTION_PLAN_V1_FIXTURE
    path: packages/@dvt/contracts/test/fixtures/planner-contract.fixtures.ts
    dddOwner: Planner contract fixture
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - test fixture
    unitTests: [contracts fixture tests]
  - name: VALID_PLANNER_BUILD_RESULT_V1_FIXTURE
    path: packages/@dvt/contracts/test/fixtures/planner-contract.fixtures.ts
    dddOwner: Planner build-result fixture
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - test fixture
    unitTests: [contracts fixture tests]
  - name: ADAPTER_POSTGRES_SRC_ROOT
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: API_STORED_PLAN_PORT
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [FetchPlanForValidation]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: ARTIFACTS_SRC_ROOT
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: COMPONENT_GUIDE
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: CONTRACTS_SRC_ROOT
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: ENGINE_PLAN_ARTIFACT_READER
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [FetchPlanForEngineDispatch]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: MAILBOX_REVIEW
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: PLANNER_LIFECYCLE_PORT
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [RecordPlanExecutability]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: PLAN_ADMISSION_SOURCE
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [MarkPlanAdmitted]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: PLAN_EXECUTABILITY_SOURCE
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [RecordPlanExecutability]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: PLAN_RECORD_SCHEMA_PACK
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: PLAN_RECORD_SOURCE
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: PLAN_STORE_READER_PORT
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [GetPlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: PLAN_STORE_WRITER_PORT
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: POSTGRES_PLAN_RECORD_REPOSITORY
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [GetPlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: POSTGRES_PLAN_STORE_SOURCE
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: POSTGRES_PLAN_STORE_SQL
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: POSTGRES_PLAN_STORE_MAPPERS
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: POSTGRES_PLAN_STORE_SCHEMA_MANAGER
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: POSTGRES_PLAN_EXECUTABILITY_REPOSITORY
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [RecordPlanExecutability]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: POSTGRES_PLAN_ADMISSION_REPOSITORY
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [MarkPlanAdmitted]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: POSTGRES_PLAN_EXECUTABLE_BLOB_REPOSITORY
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [FetchPlanForEngineDispatch]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: SYSTEM_OPERATIONS_INVENTORY
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Documentation drift]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: REPO_ROOT
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: SCOPED_RECORD_ADR
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: STORED_PLAN_ARTIFACT_PORT
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: USER_STORIES_DOC
    path: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    dddOwner: Plan-store architecture test
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [contracts architecture tests]
  - name: planStoreScope
    path: packages/@dvt/contracts/test/validation/plan-records.ts
    dddOwner: Contracts plan-record validation fixture
    cqRails: [CreatePlanRecord]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - validation fixture
    unitTests: [contracts validation tests]
  - name: validCanonicalPlanJson
    path: packages/@dvt/contracts/test/validation/plan-records.ts
    dddOwner: Contracts plan-record validation fixture
    cqRails: [CreateStoredPlan]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - validation fixture
    unitTests: [contracts validation tests]
  - name: toScopedPlanRef
    path: packages/@dvt/engine/src/application/RecoverRunApplicationService.ts
    dddOwner: Engine recovery application service
    cqRails: [FetchPlanForEngineDispatch]
    fowlerSignals: [Boundary drift]
    architectureGuard: packages/@dvt/engine/test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts
    cypressCoverage: N/A - backend engine helper
    unitTests: [engine application tests]
  - name: toScopedPlanRef
    path: packages/@dvt/engine/src/application/StartRunApplicationService.ts
    dddOwner: Engine start-run application service
    cqRails: [FetchPlanForEngineDispatch]
    fowlerSignals: [Boundary drift]
    architectureGuard: packages/@dvt/engine/test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts
    cypressCoverage: N/A - backend engine helper
    unitTests: [engine application tests]
  - name: IPlanIntegrityValidator
    path: packages/@dvt/engine/src/ports/IPlanIntegrityValidator.ts
    dddOwner: Engine runtime materialization boundary
    cqRails: [FetchPlanForEngineDispatch]
    fowlerSignals: [Semantic duplication]
    architectureGuard: packages/@dvt/engine/test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts
    cypressCoverage: N/A - backend engine port
    unitTests: [engine architecture and contract tests]
  - name: API_STORED_PLAN_VALIDATOR
    path: packages/@dvt/engine/test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts
    dddOwner: Engine boundary architecture test
    cqRails: [FetchPlanForEngineDispatch]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/engine/test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [engine architecture tests]
  - name: ARTIFACTS_STORED_PLAN_PORT
    path: packages/@dvt/engine/test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts
    dddOwner: Engine boundary architecture test
    cqRails: [FetchPlanForEngineDispatch]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/engine/test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests: [engine architecture tests]
  - name: makeScopedPlanRef
    path: packages/@dvt/engine/test/contracts/engine.test.ts
    dddOwner: Engine contract test fixture
    cqRails: [FetchPlanForEngineDispatch]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/engine/test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts
    cypressCoverage: N/A - contract test fixture
    unitTests: [engine contract tests]
  - name: InMemoryPlanFetcher
    path: packages/@dvt/engine/test/contracts/helpers.ts
    dddOwner: Engine contract test fixture
    cqRails: [FetchPlanForEngineDispatch]
    fowlerSignals: [Coverage refinement]
    architectureGuard: packages/@dvt/engine/test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts
    cypressCoverage: N/A - contract test fixture
    unitTests: [engine contract tests]
  - name: WorkflowEngineFixture
    path: packages/@dvt/engine/test/helpers/workflowEngine.fixture.ts
    dddOwner: Engine workflow fixture
    cqRails: [FetchPlanForEngineDispatch]
    fowlerSignals: [Large context]
    architectureGuard: packages/@dvt/engine/test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts
    cypressCoverage: N/A - engine test fixture type
    unitTests: [engine contract tests]
  - name: WorkflowEngineFixtureInput
    path: packages/@dvt/engine/test/helpers/workflowEngine.fixture.ts
    dddOwner: Engine workflow fixture
    cqRails: [FetchPlanForEngineDispatch]
    fowlerSignals: [Large context]
    architectureGuard: packages/@dvt/engine/test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts
    cypressCoverage: N/A - engine test fixture type
    unitTests: [engine contract tests]
  - name: createWorkflowEngineFixture
    path: packages/@dvt/engine/test/helpers/workflowEngine.fixture.ts
    dddOwner: Engine workflow fixture
    cqRails: [FetchPlanForEngineDispatch]
    fowlerSignals: [Large context]
    architectureGuard: packages/@dvt/engine/test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts
    cypressCoverage: N/A - engine test fixture factory
    unitTests: [engine contract tests]
  - name: PlanExecutabilityValidationInput
    path: packages/@dvt/planner/src/contracts/PlanExecutabilityValidation.ts
    dddOwner: Planner executability validation contract
    cqRails: [FetchPlanForValidation]
    fowlerSignals: [Boundary drift]
    architectureGuard: packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
    cypressCoverage: N/A - backend planner contract
    unitTests: [planner contract tests]
```
