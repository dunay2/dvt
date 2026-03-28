---
title: DVT System Architecture — Technical Overview
status: Active
last_reviewed: 2026-03-27
---

# DVT — System Architecture

## What DVT Is

DVT is a **workflow execution assurance layer**. It sits between a caller (CLI,
API, scheduler) and a workflow runtime (Temporal, Conductor, or anything else)
and takes ownership of three things that workflow engines deliberately do not
provide:

1. **Execution sovereignty** — the domain owns the lifecycle state machine and
   its valid transitions, independent of what the underlying engine does or
   does not report.
2. **Self-auditing** — every state change is an immutable, ordered, signed
   fact. The full history of a run is always reconstructable from first
   principles.
3. **Runtime portability** — the execution contract is expressed in DVT terms.
   Adapters translate those terms into provider APIs. Swapping Temporal for
   Conductor — or for a custom engine — does not change business logic.

The primary use case today is **dbt workflow orchestration**, but the contract
is deliberately generic. A run is any unit of work described by an immutable
`PlanRef`. That plan could describe dbt node execution, a data ingestion
pipeline, a multi-step game loop, or arbitrary async task graphs. DVT does not
parse the plan; adapters do.

> **Architectural view**: DVT is not a workflow engine. It is the authority
> layer that sits above engines and enforces consistency, auditability, and
> portability guarantees that engines cannot or do not provide.

---

## System Modules

### Top-Level Map

```mermaid
graph TD
    subgraph Clients
        Web([web\nReact SPA])
        CLI([CLI / Scheduler])
    end

    subgraph Entry["apps — Entry Layer"]
        API[api\nFastify HTTP]
    end

    subgraph Domain["packages — Domain & Engine"]
        ENG["@dvt/engine\nWorkflowEngine"]
        CONTRACTS["@dvt/contracts\nShared types & ports"]
    end

    subgraph Adapters["packages — Adapters"]
        TEMPORAL["@dvt/adapter-temporal\nTemporal.io"]
        POSTGRES["@dvt/adapter-postgres\nState Store"]
    end

    subgraph Workers["apps — Background Workers"]
        OW[outbox-worker]
        LW[lineage-worker]
        PW[projector-worker]
    end

    subgraph Infra["Infrastructure"]
        PG[(PostgreSQL)]
        TMP[(Temporal Server)]
        OAPI([OpenLineage API\ne.g. Marquez])
        EXTEVT([External Event Bus\ne.g. Kafka])
    end

    Web -->|REST| API
    CLI -->|REST| API
    API --> ENG
    ENG --> CONTRACTS
    ENG --> TEMPORAL
    ENG --> POSTGRES
    TEMPORAL --> TMP
    POSTGRES --> PG
    OW --> PG
    LW --> PG
    PW --> PG
    OW --> EXTEVT
    LW --> OAPI
    TMP -->|writes run events| PG
```

### Module Responsibilities

| Module                  | Kind              | Owns                                                         |
| ----------------------- | ----------------- | ------------------------------------------------------------ |
| `apps/api`              | HTTP entry point  | Route handling, auth, backpressure, readiness                |
| `apps/web`              | Frontend          | Run explorer, workflow DAG visualization (plugin-extensible) |
| `apps/outbox-worker`    | Background worker | At-least-once delivery of outbox records to external bus     |
| `apps/lineage-worker`   | Background worker | OpenLineage event emission from lineage outbox               |
| `apps/projector-worker` | Background worker | Snapshot projection maintenance (keeps read model fresh)     |
| `@dvt/engine`           | Core domain       | Lifecycle state machine, orchestration, invariants           |
| `@dvt/contracts`        | Shared kernel     | Types, port interfaces, event schemas — no logic             |
| `@dvt/adapter-temporal` | Provider adapter  | Translates DVT semantics → Temporal workflow API             |
| `@dvt/adapter-postgres` | State adapter     | Implements `IRunStateStore`, `IStartRunIntentStore`          |
| `@dvt/observability`    | Technical         | Structured logs, distributed traces, metrics facades         |

---

## Architecture Layers

```mermaid
graph TB
    subgraph L1["Layer 1 — Entry (apps/api)"]
        AUTH[Auth / OIDC]
        BKPR[Backpressure Guard]
        ROUTES[Route Handlers]
    end

    subgraph L2["Layer 2 — Application (engine/application)"]
        COORD[StartRunCoordinator]
        GUARD[StartRunAdmissionGuard]
        CORE[WorkflowEngineCoreService]
    end

    subgraph L3["Layer 3 — Domain (engine/core)"]
        WE[WorkflowEngine facade]
        PROJ[SnapshotProjector]
        EVTFCT[Event Factory]
    end

    subgraph L4["Layer 4 — Ports (contracts)"]
        ISS[IRunStateStore]
        IINT[IStartRunIntentStore]
        IPAD[IProviderAdapter]
    end

    subgraph L5["Layer 5 — Adapters (implementations)"]
        TAPAD[TemporalAdapter]
        PGSS[PostgresStateStoreAdapter]
        PGINT[PostgresStartRunIntentStore]
        MOCK[MockAdapter]
    end

    L1 --> L2
    L2 --> L3
    L3 --> L4
    L4 --> L5
```

**Rule**: Dependencies flow strictly downward. Layer 3 (domain) never imports
Layer 5 (implementations). Layer 5 never imports Layer 2 (application). This
is enforced by package boundaries and the ESLint determinism scan in CI.

---

## Core Domain Contract

### WorkflowEngine — Public API

The `WorkflowEngine` is the single entry point for the domain. All
application-layer code talks to it through `IWorkflowEngine`.

```mermaid
classDiagram
    class IWorkflowEngine {
        +startRun(planRef, context) EngineRunRef
        +cancelRun(runRef) void
        +getRunStatus(runRef) RunStatusSnapshot
        +enrichRunStatus(runRef) RunStatusSnapshot
        +signal(runRef, request) void
        +healthCheck() HealthStatus
    }

    class WorkflowEngine {
        -StartRunCoordinator coordinator
        -WorkflowEngineCoreService core
        +startRun()
        +cancelRun()
        +getRunStatus()
        +enrichRunStatus()
        +signal()
    }

    class WorkflowEngineCoreService {
        -adapters Map~Provider IProviderAdapter~
        -stateStore IRunStateStore
        -projector SnapshotProjector
        +cancelRun()
        +getRunStatus()
        +signal()
    }

    class StartRunCoordinator {
        -guard StartRunAdmissionGuard
        -intentStore IStartRunIntentStore
        -adapters Map~Provider IProviderAdapter~
        +execute(planRef, context)
    }

    IWorkflowEngine <|.. WorkflowEngine
    WorkflowEngine --> StartRunCoordinator
    WorkflowEngine --> WorkflowEngineCoreService
```

**`getRunStatus` vs `enrichRunStatus`** (ADR-0015):

- `getRunStatus` — reads from the local event log and materialized snapshot.
  Never calls the adapter. Latency is independent of provider availability.
- `enrichRunStatus` — additionally calls the adapter for real-time substatus.
  Use for UI polling; acceptable latency.

### Provider Adapter Contract

```mermaid
classDiagram
    class IProviderAdapter {
        +provider string
        +startRun(planRef, ctx) EngineRunRef
        +cancelRun(runRef) void
        +getRunStatus(runRef) RunStatusSnapshot
        +signal(runRef, request) void
        +ping()* void
        +estimateRunRef(ctx)* EngineRunRef
        +capabilities()* string[]
        +lookupRunRef(runId, tenantId)* EngineRunRef
    }

    class TemporalAdapter {
        -client TemporalClient
        +startRun() starts Temporal workflow
        +cancelRun() requests cancellation
        +getRunStatus() queries Temporal
    }

    class MockAdapter {
        -store InMemoryMap
        +startRun() records in memory
        +cancelRun() marks cancelled
        +getRunStatus() reads from memory
    }

    IProviderAdapter <|.. TemporalAdapter
    IProviderAdapter <|.. MockAdapter
```

**Plan integrity boundary** (ADR-0012): The engine passes a `PlanRef` (URI +
SHA-256 hash) to the adapter. The adapter owns fetching the plan bytes,
validating the hash, and validating schema version. The engine never fetches
plan bytes.

---

## Key Domain Types

```mermaid
classDiagram
    class RunContext {
        +tenantId string
        +projectId string
        +environmentId string
        +runId string
        +targetAdapter Provider
    }

    class ResolvedRunContext {
        +logicalAttemptId number
        +parentRunId string
        +originRunId string
    }

    class PlanRef {
        +uri string
        +sha256 string
        +schemaVersion string
        +planId string
        +planVersion string
        +requiresCapabilities string[]
    }

    class EngineRunRef {
        +provider string
        +tenantId string
        +workflowId string
        +runId string
    }

    class RunStatusSnapshot {
        +runId string
        +status RunStatus
        +substatus RunSubstatus
        +startedAt IsoUtcString
        +completedAt IsoUtcString
        +hash string
    }

    class SignalRequest {
        +signalId string
        +type PAUSE|RESUME|CANCEL|RETRY_STEP|RETRY_RUN
        +stepId string
        +reason string
    }

    RunContext <|-- ResolvedRunContext
```

`EngineRunRef` is a **discriminated union** — each provider variant carries its
own addressing fields (Temporal: `namespace + workflowId + runId`, Conductor:
`conductorUrl + workflowId`, etc.).

---

## Sequence Diagrams

### 1 — Start a Run (happy path)

```mermaid
sequenceDiagram
    actor Caller
    participant API as api
    participant Guard as AdmissionGuard
    participant Intent as IntentStore (Postgres)
    participant Engine as WorkflowEngine
    participant Adapter as TemporalAdapter
    participant Temporal
    participant Store as StateStore (Postgres)

    Caller->>API: POST /runs {planRef, runContext}
    API->>Guard: shouldAdmit(planRef, context)
    Guard-->>API: ok

    API->>Intent: recordIntent(runId) → PENDING
    API->>Engine: startRun(planRef, context)
    Engine->>Adapter: startRun(planRef, resolvedContext)
    Adapter->>Temporal: startWorkflow(workflowId, taskQueue)
    Temporal-->>Adapter: workflowHandle
    Adapter-->>Engine: EngineRunRef

    Engine->>Store: append RunStarted event
    Engine->>Intent: markDispatched(runId) → DISPATCHED

    Engine-->>API: EngineRunRef
    API-->>Caller: 202 {runId, workflowId}

    Note over Temporal,Store: Temporal executes steps async
    Temporal->>Store: append StepStarted / StepCompleted / RunCompleted
```

### 2 — Crash-safe startRun (intent durability, ADR-0030)

```mermaid
sequenceDiagram
    participant Intent as IntentStore
    participant Adapter as TemporalAdapter
    participant Temporal
    participant Reconciler as RunMaintenanceService

    Note over Intent,Temporal: Normal flow
    Intent->>Intent: PENDING
    Adapter->>Temporal: startWorkflow()
    Intent->>Intent: DISPATCHED

    Note over Intent,Reconciler: Crash between startWorkflow and markDispatched
    Intent->>Intent: PENDING (stuck)
    Reconciler->>Intent: findPending()
    Intent-->>Reconciler: [{runId}]
    Reconciler->>Adapter: lookupRunRef(runId)
    Adapter->>Temporal: describeWorkflow()
    alt workflow exists on Temporal
        Reconciler->>Adapter: cancelRun(runRef)
        Reconciler->>Intent: markOrphaned(runId)
    else workflow not found
        Reconciler->>Intent: markUnstarted(runId)
    end
```

### 3 — Read run status (ADR-0015)

```mermaid
sequenceDiagram
    actor Caller
    participant API as api
    participant Engine as WorkflowEngine
    participant Store as StateStore (Postgres)
    participant Adapter as TemporalAdapter

    Caller->>API: GET /runs/:runId
    API->>Engine: getRunStatus(runRef)
    Engine->>Store: getSnapshot(tenantId, runId)
    Store-->>Engine: RunStatusSnapshot
    Engine-->>API: snapshot (no adapter call)
    API-->>Caller: {status, substatus, ...}

    Note over Caller,Adapter: Optional enriched path (UI polling)
    Caller->>API: GET /runs/:runId?enriched=true
    API->>Engine: enrichRunStatus(runRef)
    Engine->>Store: getSnapshot()
    Engine->>Adapter: getRunStatus(runRef)
    Adapter-->>Engine: real-time substatus
    Engine-->>API: merged snapshot
    API-->>Caller: {status, substatus (live), ...}
```

### 4 — Outbox delivery

```mermaid
sequenceDiagram
    participant API as api
    participant PG as PostgreSQL
    participant OW as outbox-worker
    participant Bus as Event Bus (Kafka / HTTP)

    Note over API,PG: Atomic write
    API->>PG: BEGIN
    API->>PG: INSERT run_events
    API->>PG: INSERT outbox (EventEnvelope, status=pending)
    API->>PG: COMMIT

    loop Poll every N ms
        OW->>PG: SELECT outbox WHERE status=pending LIMIT batch
        PG-->>OW: [records]
        OW->>Bus: publish EventEnvelope
        alt delivery ok
            OW->>PG: UPDATE outbox SET status=delivered
        else max retries exceeded
            OW->>PG: INSERT outbox_dead_letter
            OW->>PG: DELETE FROM outbox
        end
    end
```

### 5 — Lineage + projection workers

```mermaid
sequenceDiagram
    participant PG as PostgreSQL
    participant LW as lineage-worker
    participant Marquez as Marquez / OpenLineage API
    participant PW as projector-worker
    participant CH as ClickHouse (future)

    loop lineage polling
        LW->>PG: SELECT lineage_outbox WHERE pending
        PG-->>LW: [step events]
        LW->>LW: map StepStarted → OpenLineage job facets
        LW->>Marquez: POST /api/v1/lineage
        Marquez-->>LW: 200 ok
        LW->>PG: mark lineage_outbox delivered
    end

    loop snapshot projection
        PW->>PG: SELECT runs WHERE snapshot_stale=true
        PG-->>PW: [runIds]
        PW->>PG: SELECT run_events WHERE runId IN (...)
        PW->>PW: SnapshotProjector.rebuild(events)
        PW->>PG: UPSERT run_snapshots
        Note over PW,CH: future — also project to ClickHouse for analytics
    end
```

### 6 — Readiness probe chain

```mermaid
sequenceDiagram
    participant K8s as Kubernetes
    participant API as api /readyz
    participant Rec as ReconcilerHealthState
    participant DB as Database Probe
    participant Ada as AdapterProbe

    K8s->>API: GET /readyz
    API->>Rec: getIntentReconcilerHealth()
    alt reconciler degraded or starting
        API-->>K8s: 503 {ok:false, reasonCode: reconciler_*}
    else reconciler ok
        API->>DB: checkDatabaseReady()
        alt db not configured or unreachable
            API-->>K8s: 503 {reasonCode: database_*}
        else db ok
            API->>Ada: checkRuntimeAdaptersReady()
            alt adapter not configured or unavailable
                API-->>K8s: 503 {reasonCode: adapter_*}
            else all ok
                API-->>K8s: 200 {ok:true, status:ready}
            end
        end
    end
```

---

## Subsystem Communication

```mermaid
graph LR
    subgraph Sync["Synchronous"]
        A1[Caller → api\nHTTPS REST]
        A2[api → WorkflowEngine\nin-process]
        A3[WorkflowEngine → Adapter\nin-process]
        A4[TemporalAdapter → Temporal\ngRPC]
    end

    subgraph Async["Asynchronous — table polling"]
        B1[Temporal Worker → Postgres\nrun_events append]
        B2[outbox-worker ← Postgres outbox\nSELECT FOR UPDATE SKIP LOCKED]
        B3[lineage-worker ← Postgres lineage_outbox]
        B4[projector-worker ← Postgres snapshots]
    end

    subgraph Outbound["Outbound Delivery"]
        C1[outbox-worker → Kafka / HTTP]
        C2[lineage-worker → Marquez / OpenLineage]
        C3[observability → Jaeger / Datadog / Vector]
    end
```

| Pair                        | Protocol                                     | Notes                                             |
| --------------------------- | -------------------------------------------- | ------------------------------------------------- |
| Caller → api                | HTTPS REST                                   | OIDC-protected for write operations               |
| api → WorkflowEngine        | In-process                                   | No serialization overhead                         |
| WorkflowEngine → Adapter    | In-process `Map<Provider, IProviderAdapter>` | Selected by `targetAdapter`                       |
| TemporalAdapter → Temporal  | gRPC (Temporal SDK)                          | Timeout-wrapped by engine                         |
| Temporal Worker → Postgres  | Direct SQL                                   | Writes `run_events`; bypasses engine on read path |
| Postgres → outbox-worker    | `SELECT FOR UPDATE SKIP LOCKED`              | Sharded by `shard_id`                             |
| Postgres → lineage-worker   | Table polling                                | Separate `lineage_outbox` table                   |
| Postgres → projector-worker | Table polling                                | Detects stale snapshots                           |
| outbox-worker → Kafka       | Kafka producer                               | At-least-once; dead-letter on max retries         |
| outbox-worker → HTTP        | HTTP POST                                    | Alternative delivery mode (configurable)          |
| lineage-worker → Marquez    | HTTP POST OpenLineage v1                     | `DVT_LINEAGE_API_URL`                             |

---

## Integration Landscape

DVT is designed to be the assurance and audit layer in the center of a broader
data platform. Each integration plugs into a specific layer of the system.

```mermaid
graph TD
    subgraph DVT["DVT Core"]
        API2[api]
        ENG2[engine]
        OW2[outbox-worker]
        LW2[lineage-worker]
        PW2[projector-worker]
        OBS["@dvt/observability"]
        PG2[(PostgreSQL)]
    end

    subgraph StreamLayer["Stream Layer"]
        KAFKA[Kafka]
    end

    subgraph LineageLayer["Lineage & Catalog Layer"]
        MARQUEZ[Marquez]
        OL[OpenLineage spec]
    end

    subgraph QualityLayer["Data Quality Layer"]
        MONTE[Monte Carlo]
    end

    subgraph ObsLayer["Observability Layer"]
        VECTOR[Vector]
        JAEGER[Jaeger]
        DD[Datadog]
    end

    subgraph AnalyticsLayer["Analytics Layer"]
        CH[ClickHouse]
    end

    subgraph UILayer["Visualization Layer"]
        WEB2[web — React SPA\nPlugin architecture]
    end

    OW2 -->|EventEnvelopes\nat-least-once| KAFKA
    LW2 -->|OpenLineage events| OL
    OL --> MARQUEZ
    MARQUEZ -->|metadata API| MONTE
    KAFKA -->|run events| MONTE
    OBS -->|OTLP traces| JAEGER
    OBS -->|metrics + logs| VECTOR
    VECTOR -->|aggregated telemetry| DD
    PW2 -->|projected run events\nfuture| CH
    CH -->|analytics queries\nfuture| WEB2
    MARQUEZ -->|lineage graph\nfuture| WEB2
    API2 -->|run status| WEB2
```

### Integration points by tool

| Tool            | Layer                | Plugs into DVT at                               | Status                                                            |
| --------------- | -------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| **Kafka**       | Stream               | `outbox-worker` delivery target                 | Planned — outbox-worker already supports pluggable delivery modes |
| **Marquez**     | Lineage catalog      | `lineage-worker` → `DVT_LINEAGE_API_URL`        | Active — lineage-worker emits OpenLineage v1                      |
| **OpenLineage** | Lineage spec         | `lineage-worker` event schema                   | Active — StepStarted events mapped to OpenLineage job facets      |
| **Monte Carlo** | Data quality         | Consumes from Marquez API + Kafka events        | Planned — Monte Carlo has native Marquez integration              |
| **Jaeger**      | Distributed tracing  | `@dvt/observability` OTLP exporter              | Planned — observability facade is backend-agnostic                |
| **Datadog**     | APM + metrics + logs | `@dvt/observability` → Vector → Datadog agent   | Planned — metrics/logs/traces via OTLP                            |
| **Vector**      | Telemetry pipeline   | Collects from all DVT apps, routes to sinks     | Planned — sits between DVT and Datadog/other sinks                |
| **ClickHouse**  | Analytics            | `projector-worker` additional projection target | Planned — projector can target multiple sinks                     |

### Why these integrations make sense architecturally

**Kafka** replaces or augments the HTTP delivery mode in `outbox-worker`. The
outbox pattern already provides at-least-once semantics; Kafka adds durable
replay, consumer group fanout, and schema registry support for the event stream.

**Marquez + OpenLineage** is the lineage catalog. `lineage-worker` already
speaks OpenLineage v1. Marquez is the server. Together they build the full
lineage graph of what ran, what produced what, and what consumed what — across
all workflow domains, not just dbt.

**Monte Carlo** sits above the lineage layer and adds data quality observability
— anomaly detection, freshness checks, schema drift. It can consume the lineage
graph from Marquez and correlate it with run events from Kafka to identify which
DVT run produced a dataset that later failed a quality check.

**Jaeger** receives distributed traces from `@dvt/observability`. Each DVT
operation (startRun, signal, step execution) emits OTLP spans. Jaeger provides
the trace explorer for debugging latency and failure propagation across the
system.

**Vector** is the telemetry aggregation pipeline. It collects logs, metrics, and
traces from all DVT apps and routes them to the appropriate sinks (Datadog,
Jaeger, ClickHouse, S3). This avoids hard-coupling DVT apps to specific
observability vendors.

**Datadog** is the operational monitoring platform. It receives the aggregated
telemetry from Vector and provides dashboards, alerting, and APM for DVT
operations.

**ClickHouse** is the analytics store. The `projector-worker` can be extended to
project run events into ClickHouse alongside PostgreSQL. This enables fast OLAP
queries over run history, step latency distributions, failure rate trends, and
tenant-level analytics — without impacting the transactional Postgres database.

---

## Web Frontend — Plugin Architecture

The `apps/web` frontend is a React SPA built on React Flow (graph visualization)
and Zustand (state management). Its current state and roadmap:

### Current State

```mermaid
graph TD
    subgraph Web["apps/web (current)"]
        CANVAS[Canvas.tsx\nReact Flow graph]
        DBT[DbtNodeComponent\nhardcoded dbt node renderer]
        RUNS[Runs Explorer\nrun list + status]
        PLUGINS[PluginsView\nUI shell only]
        INS[InspectorPanel\ndbt-specific details]
    end

    CANVAS --> DBT
    CANVAS --> INS
```

- **Graph rendering**: React Flow + Dagre layout — generic and reusable
- **Node logic**: `DbtNodeComponent` and edge validation are 100% dbt-specific today
- **Plugin system**: `Plugin` type is defined (`custom_nodes | validators | panels | cost_policies`)
  with a marketplace UI shell, but **no runtime plugin loading** — mock data only
- **Node type registry**: Single entry `{ dbtNode: DbtNodeComponent }` — no plugin-based registry yet

### Target Architecture (plugin model)

```mermaid
graph TD
    subgraph Web["apps/web (target)"]
        CANVAS2[Canvas.tsx\nReact Flow graph]
        REGISTRY[NodeTypeRegistry\nplugin-provided renderers]
        LOADER[PluginLoader\nruntime plugin resolution]

        subgraph Plugins["Domain Plugins"]
            PDBT[dbt plugin\nnodes + validators + panels]
            PKAFKA[Kafka plugin\nfuture]
            PCUSTOM[Custom plugin\nany workflow domain]
        end

        CANVAS2 --> REGISTRY
        REGISTRY --> PDBT
        REGISTRY --> PKAFKA
        REGISTRY --> PCUSTOM
        LOADER --> REGISTRY
    end
```

The plugin contract maps cleanly onto what `PlanRef` already provides: a plan
describes a workflow domain. The web frontend can use the plan's `schemaVersion`
or a `domain` tag to select the correct rendering plugin. A dbt plan gets the
dbt node renderer; a data ingestion plan gets a source/sink renderer; a custom
plan gets whatever plugin is registered for that domain.

**This means the frontend plugin model mirrors the backend adapter model**: just
as the engine selects an adapter by `targetAdapter`, the frontend selects a
renderer by plan domain.

---

## Extensibility Model

### Adding a New Workflow Engine (backend)

1. Implement `IProviderAdapter` from `@dvt/contracts`
2. Register in `buildProviderAdapters()` behind an env flag
3. Write run events to `IRunStateStore` from the adapter/worker
4. Handle plan fetch + SHA-256 validation inside the adapter
5. Map provider errors to DVT `RunStatus` transitions

Engine, API, state store, and all workers remain unchanged.

### Adding a New Workflow Domain (frontend)

1. Define a plan schema for the domain (JSON Schema, `schemaVersion`)
2. Register a `PlanRef` with the appropriate URI and schema version
3. Implement a frontend plugin: node renderer + validators + inspector panel
4. Register the plugin in the `NodeTypeRegistry`

The backend is already domain-agnostic. The frontend plugin is the only
domain-specific artifact.

### Adding a New Delivery Target

1. Implement a delivery adapter in `outbox-worker` (alongside HTTP and log modes)
2. Select it via env configuration (`DVT_OUTBOX_DELIVERY_MODE=kafka`)
3. Outbox guarantees (at-least-once, dead-letter) are inherited automatically

---

## Outbox Pattern

```
┌──────────────────────────────────┐
│         BEGIN TRANSACTION        │
│  INSERT run_events (domain fact) │
│  INSERT outbox    (delivery cue) │
│         COMMIT                   │
└──────────────────────────────────┘
              │
              ▼ (async, retried, sharded)
        outbox-worker
              │
        ┌─────┴─────┐
        ▼           ▼
      Kafka       HTTP target
              │
              ▼ (on max retries)
        outbox_dead_letter
```

The outbox pattern solves the dual-write problem: write to the database and
publish an event in a single atomic operation, then deliver asynchronously with
retries. Consistency is guaranteed at the cost of latency and eventual delivery.

---

## Design Decisions (ADR Index)

| ADR       | Decision                                                                                      |
| --------- | --------------------------------------------------------------------------------------------- |
| ADR-0003  | Domain owns the lifecycle state machine; engines do not define DVT transitions                |
| ADR-0004  | Event sourcing — immutable ordered event log is source of truth                               |
| ADR-0007  | Intent/terminal event split — engine emits `RunCancelRequested`; adapter emits `RunCancelled` |
| ADR-0012  | Adapters own plan fetch and SHA-256 validation; engine never fetches plan bytes               |
| ADR-0013  | `bootstrapRunTx` — atomic run state initialization including `runRef`                         |
| ADR-0014  | Run-driven adapter model — `startRun(planRef)`, not `executeStep(stepId)`                     |
| ADR-0015  | `getRunStatus` reads from local snapshot only; no adapter call on default path                |
| ADR-0018  | `@dvt/contracts` is the authoritative shared kernel; no type duplication                      |
| ADR-0030  | Pre-dispatch intent log for crash-consistent `startRun`                                       |
| ADR-0034  | Seven bounded contexts with explicit one-way dependency rules                                 |
| ADR-0040  | Engine owns `logicalAttemptId` and retry lineage; adapters do not manage retries              |
| ADR-0041  | Contract-first taxonomy: `engine / planner / shared` ownership model                          |
| ADR-0041A | Tri-state readiness probes: `ready \| unavailable \| not_configured`                          |

---

## Health & Operational Endpoints

| Endpoint        | Returns                         | When 503                                                             |
| --------------- | ------------------------------- | -------------------------------------------------------------------- |
| `GET /healthz`  | `{ok:true, status, components}` | Never — always 200                                                   |
| `GET /readyz`   | `{ok, status, reasonCode}`      | Reconciler degraded/starting; DB unreachable; adapter not configured |
| `GET /version`  | `{version, commit}`             | Never                                                                |
| `GET /db/ready` | `{ok}`                          | DB unreachable                                                       |

`/healthz` is liveness (process alive?). `/readyz` is readiness (safe to receive
traffic?). Kubernetes should only route traffic after `/readyz` returns 200. The
reconciler starts in `starting` state — `/readyz` returns 503 until the first
successful sweep confirms the runtime is operational.
