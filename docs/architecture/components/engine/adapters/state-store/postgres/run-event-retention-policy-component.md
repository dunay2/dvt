---
title: Run Event Retention Policy Component
status: Implementation Guide
owner: Architecture / State Store / Adapter Postgres
last_reviewed: 2026-05-22
planning_type: architecture
---

# Run Event Retention Policy Component

## Identity

- Component ID: `DVT-STATE-STORE-RUN-EVENT-RETENTION-POLICY-001`
- Packages:
  - `@dvt/state-store`
  - `@dvt/adapter-postgres`
  - `dvt-outbox-worker`
- Primary code:
  - `packages/@dvt/state-store/src/lifecycle/archiveRuntime.ts`
  - `packages/@dvt/adapter-postgres/src/PostgresRunArchiveStore.ts`
  - `apps/outbox-worker/src/runtime/buildRunEventRetentionRuntime.ts`

## Owned Concern

This component owns the policy that decides when hot `run_events` are old
enough to enter ADR-0037 archive export. It owns the
`ConfigureRunEventRetentionPolicy` command rail across worker configuration,
state-store policy resolution, and Postgres archive eligibility. Its core
behavior is tenant-specific hot-retention without changing archive-unit
identity. It does not own engine event semantics, object-storage layout,
restore, or delete-after-grace.

## Public API

```ts
interface RunEventRetentionPolicy {
  readonly hotRetentionDays: number;
  readonly archiveBucketCount: number;
  readonly pinTerminalSnapshots: boolean;
  readonly tenantHotRetentionDays?: readonly TenantRunEventRetentionOverride[];
}

interface TenantRunEventRetentionOverride {
  readonly tenantId: string;
  readonly hotRetentionDays: number;
}

function validateRunEventRetentionPolicy(policy: RunEventRetentionPolicy): void;
function resolveTenantHotRetentionDays(policy: RunEventRetentionPolicy, tenantId: string): number;
```

Adapter entry point:

```ts
IRunArchiveStore.listEligibleArchiveUnits(policy, nowIso);
```

Runtime configuration surface:

```text
DVT_RUN_EVENT_RETENTION_HOT_RETENTION_DAYS=90
DVT_RUN_EVENT_RETENTION_TENANT_HOT_RETENTION_DAYS=free-tier=7,enterprise=365
```

## Invariants

- `run_events` remains authoritative event history under ADR-0004.
- The lifecycle unit remains `tenant_bucket + persisted_at_day` under ADR-0037.
- `archiveBucketCount` remains deployment-configured and deterministic.
- A tenant override applies only to the named tenant.
- A tenant without override uses the default `hotRetentionDays`.
- Tenant IDs in overrides must be non-empty and unique.
- Every retention-day value must be a positive integer.
- A shared archive unit is eligible only when every tenant in that unit satisfies
  its own resolved retention window.
- The adapter enters service access through
  `POSTGRES_SERVICE_ACCESS.runArchiveMaintenance` before scanning archive
  candidates.
- The component does not partially export tenant subsets under an existing
  archive-unit key.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> PolicyLoaded
  PolicyLoaded --> UnitScanned
  UnitScanned --> BlockedByTenantWindow: at least one tenant is still hot
  UnitScanned --> BlockedBySnapshot: at least one run is non-terminal
  UnitScanned --> Eligible: all tenants satisfy policy and all runs are terminal
  Eligible --> Exported: coordinator starts archive batch
```

## Diagrams

### Runtime Flow

```mermaid
sequenceDiagram
  participant Env as Outbox worker env
  participant Runtime as buildRunEventRetentionRuntime
  participant Coord as RunArchiveCoordinator
  participant Store as PostgresRunArchiveStore
  participant Pg as PostgreSQL

  Env->>Runtime: default policy + tenant overrides
  Runtime->>Coord: archiveEligibleHotData(policy)
  Coord->>Store: listEligibleArchiveUnits(policy, now)
  Store->>Pg: scan run_events grouped by tenant/day/run
  Store->>Store: resolveTenantHotRetentionDays()
  Store-->>Coord: full eligible units only
```

### Component Boundary

```mermaid
flowchart LR
  Env["dvt-outbox-worker env"] --> Policy["RunEventRetentionPolicy"]
  Policy --> Resolver["resolveTenantHotRetentionDays"]
  Resolver --> Adapter["PostgresRunArchiveStore"]
  Adapter --> Unit["tenant_bucket + persisted_at_day"]
  Unit --> Eligible["Full-unit ELIGIBLE"]
  Unit --> Blocked["Blocked until every tenant satisfies policy"]
```

## Consumers

- `RunArchiveCoordinator` consumes eligible units and runs export.
- `RunEventRetentionRuntime` schedules the lifecycle command.
- `dvt-outbox-worker` composes the runtime policy from environment variables.
- Operators configure tenant overrides through deployment environment.

## Tests

- `packages/@dvt/state-store/test/RunEventRetentionPolicy.test.ts`
  - override resolution
  - invalid override rejection
- `packages/@dvt/adapter-postgres/test/PostgresRunArchiveStore.tenant-retention.test.ts`
  - shared archive units are not partially exported
  - shared units become eligible after all tenants satisfy their policy
- `packages/@dvt/adapter-postgres/test/PostgresRunArchiveStore.tenant-retention.integration.test.ts`
  - optional real-Postgres proof under `DVT_PG_INTEGRATION=1`
- `apps/outbox-worker/test/plugins/env.test.ts`
  - env override parsing
- `apps/outbox-worker/test/runtime/createOutboxWorkerRuntime.test.ts`
  - runtime passes overrides into the coordinator policy
- `packages/@dvt/adapter-postgres/test/PostgresRunEventRetentionPolicy.architecture.test.ts`
  - semantic alignment across policy object, adapter gateway, env parsing,
    component docs, evidence, risk, and Fowler analysis

## Drift Guard

If archive-unit key semantics change, this component must be reviewed with
ADR-0037 because tenant-specific retention and partial export semantics are
coupled to the physical unit key.

<a id="section-run-event-retention-policy-user-stories"></a>

## Run Event Retention Policy User Stories

### Story 1: Default Retention

Story id: `US-RER-001`

As an operator with no tenant-specific retention requirements, I want run-event
archival to keep using the default hot-retention window so existing deployments
do not need a new setting.

Acceptance:

- A policy without overrides resolves every tenant to `hotRetentionDays`.
- Existing archive bucket and terminal-snapshot rules still apply.
- Existing runtime defaults remain valid.

### Story 2: Free-Tier Purging

Story id: `US-RER-002`

As an operator managing free-tier tenants, I want a tenant override with a short
hot-retention window so hot storage can be reduced aggressively for those
tenants.

Acceptance:

- `DVT_RUN_EVENT_RETENTION_TENANT_HOT_RETENTION_DAYS=free-tier=7` parses into a
  tenant override.
- The archive store resolves `free-tier` to 7 days.
- Other tenants keep the default policy.

### Story 3: Enterprise Retention

Story id: `US-RER-003`

As an operator managing enterprise tenants, I want a tenant override with a
longer hot-retention window so enterprise data is not archived from hot storage
too early.

Acceptance:

- `enterprise=365` resolves only for tenant `enterprise`.
- A run from `enterprise` younger than 365 days remains hot.
- The default retention window for other tenants is unchanged.

### Story 4: Shared Archive Unit

Story id: `US-RER-004`

As the archive lifecycle owner, I want mixed-tenant archive units to preserve
ADR-0037 unit integrity so partial exports do not strand tenant data under an
already-used archive-unit key.

Acceptance:

- A bucket/day unit containing free-tier and enterprise tenants is not eligible
  while enterprise is still inside its retention window.
- The same unit becomes eligible when both tenants satisfy their resolved
  retention windows.
- The emitted eligible unit contains the full sorted tenant set.

### Story 5: Invalid Configuration

Story id: `US-RER-005`

As an operator, I want malformed tenant-retention overrides rejected during
configuration so lifecycle behavior cannot silently drift.

Acceptance:

- Empty tenant IDs are rejected.
- Non-positive retention days are rejected.
- Duplicate tenant IDs are rejected by policy validation.

### Scenario Coverage

```mermaid
flowchart TD
  Default["US-RER-001 default retention"]
  Short["US-RER-002 short tenant override"]
  Long["US-RER-003 long tenant override"]
  Mixed["US-RER-004 shared archive unit"]
  Invalid["US-RER-005 invalid configuration"]

  Default --> Policy["RunEventRetentionPolicy"]
  Short --> Policy
  Long --> Policy
  Policy --> Mixed
  Invalid --> Reject["fail closed before runtime starts"]
```

> Acceptance scope status: Implementation Guide. Owner: Architecture / State Store / Adapter Postgres.
