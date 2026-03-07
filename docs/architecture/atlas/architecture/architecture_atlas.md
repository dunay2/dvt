# DVT+ Architecture Atlas (Code-Aligned)

Date: 2026-03-06
Source: repository code only (`apps/*`, `packages/@dvt/*`)
Goal: reflect implemented architecture, not aspirational architecture.

## Navigation

- [Atlas Home](../README.md)
- [Atlas Index](../index.md)
- [Engineering Playbook](../engineering/engineering_playbook.md)
- [Completion Assessment](../status/code_completion_assessment_2026-03-06.md)
- [Gap Execution Plans](../../../planning/gaps/GAP_EXECUTION_PLANS.md)

## Current Reality Snapshot

- Engine orchestration is implemented as a library (`@dvt/engine`), but not yet composed as a runtime API service.
- Temporal adapter exists in `@dvt/adapter-temporal`, but API runtime currently boots only intent reconciliation with `mock` provider.
- Postgres state + outbox are implemented in `@dvt/adapter-postgres`.
- API exposes infra endpoints (`/healthz`, `/readyz`, `/version`, `/db/ready`) and no run-domain endpoints.
- Web app is mostly wired to local mock datasets.
- Plugin runtime package is not present under `packages/@dvt`.

## Implemented Topology (Today)

```mermaid
flowchart TB
User --> Web["apps/web (mostly mock data)"]
Web --> API["apps/api (infra endpoints)"]
API --> Reconciler["IntentReconcilerRuntime (optional)"]
Reconciler --> RMS["RunMaintenanceService"]
RMS --> IntentStore["PostgresStartRunIntentStore"]
RMS --> StateStore["PostgresStateStoreAdapter"]
RMS --> MockProvider["MockAdapter provider"]

EngineLib["@dvt/engine (library)"] --> ProviderPort["IProviderAdapter port"]
TemporalPkg["@dvt/adapter-temporal (package)"] --> ProviderPort
EngineLib --> TxStore["IRunStateStore + outbox contracts"]
TxStore --> OutboxTable["outbox + outbox_dead_letter (postgres)"]
OutboxWorker["OutboxWorker (library worker)"] --> EventBus["IEventBus"]
```

## Canonical Run Lifecycle (Implemented Contract)

```mermaid
stateDiagram-v2
[*] --> PENDING: RunQueued
PENDING --> RUNNING: RunStarted
RUNNING --> PAUSED: RunPaused
PAUSED --> RUNNING: RunResumed
RUNNING --> RUNNING: StepStarted/StepCompleted
RUNNING --> RUNNING: StepSkipped
RUNNING --> RUNNING: RunCancelRequested
RUNNING --> COMPLETED: RunCompleted
RUNNING --> FAILED: RunFailed or StepFailed
RUNNING --> CANCELLED: RunCancelled
PAUSED --> CANCELLED: RunCancelled
COMPLETED --> [*]
FAILED --> [*]
CANCELLED --> [*]
```

## Event Catalog (Code Contract)

Persisted event types are defined in `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`:

- RunQueued
- RunStarted
- RunPaused
- RunResumed
- RunCancelRequested
- RunCancelled
- RunCompleted
- RunFailed
- StepStarted
- StepCompleted
- StepFailed
- StepSkipped

## Planner Topology (Implemented)

```mermaid
flowchart TB
ManifestOrNodes["PlannerInputEnvelopeV2"] --> GraphBuilder["buildGraph()"]
GraphBuilder --> Select["selection expansion upstream/downstream"]
Select --> Topo["topoSort()"]
Topo --> StepFactory["dbtStepFactory"]
StepFactory --> PlanCore["planCore metadata + steps"]
PlanCore --> Canon["sha256CanonicalJson(planCore)"]
Canon --> ExecutionPlanV2
```

Notes:

- Planner determinism is implemented with canonical JSON hashing.
- 10/100/500 manifest fixtures and 1000-node slow test exist in code.

## Temporal Workflow Topology (Implemented + Limits)

```mermaid
flowchart TB
TemporalWorkflow["runPlanWorkflow"] --> FetchPlan["activity.fetchPlan"]
TemporalWorkflow --> EmitEvent["activity.emitEvent"]
TemporalWorkflow --> ExecuteStep["activity.executeStep (MVP)"]
TemporalWorkflow --> ContinueAsNew["continueAsNew by layer threshold"]
ExecuteStep --> GatewayDSL["gateway DSL evaluation"]
```

Current limits from code:

- `RETRY_STEP` and `RETRY_RUN` signals are explicitly not implemented in adapter.
- `executeStep` still states real step dispatch is Phase 2+.

## Multi-Tenant Boundary (Implemented)

```mermaid
flowchart TB
Request --> TenantContext
TenantContext --> EnginePorts
EnginePorts --> StateStoreTenantMethods["tenant-scoped methods"]
StateStoreTenantMethods --> PostgresContext["set_config('dvt.tenant_id', ...)"]
PostgresContext --> TenantFilteredQueries
```

Notes:

- Tenant-scoped reads/writes are implemented in `PostgresStateStoreAdapter` and tested in integration tests.

## What Is Not Implemented Yet

- Domain API (start run, signal, status, run list/events) in `apps/api`.
- Runtime wiring of `WorkflowEngine` + `TemporalAdapter` in API process.
- Outbox dispatcher runtime process in API (worker exists as library, not bootstrapped).
- Cost attribution backend modules.
- Plugin runtime package (sandbox + capability enforcement).

## References in This Atlas

- Completion and effort model: `../status/code_completion_assessment_2026-03-06.md`
- Active execution roadmap: `../../../planning/gaps/GAP_EXECUTION_PLANS.md`
- Parallel execution tracks: `../../../planning/gaps/GAP_PARALLEL_EXECUTION_TRACKS.md`

## Next

- Continue with [Engineering Playbook](../engineering/engineering_playbook.md)
