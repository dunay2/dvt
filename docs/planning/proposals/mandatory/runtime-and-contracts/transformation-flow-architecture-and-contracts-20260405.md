---
title: Transformation Flow Architecture And Contracts 2026-04-05
status: Proposed
owner: Architecture / API / Web / Planner
last_reviewed: 2026-04-05
planning_type: proposal
lane: E
task_id: F-22
---

# Transformation Flow Architecture And Contracts 2026-04-05

## Purpose

This document defines the execution model, contracts, terms, and boundaries for
the first transformation vertical.

It answers four technical questions:

1. what the operator designs
2. what preview validates and persists
3. what the runtime actually executes
4. what the read surfaces must return afterward

## Current state and target state

| Surface         | Exists now                                           | Must be added for this vertical                            |
| --------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| Canvas          | Canvas shell and run actions already exist           | governed `source -> sql_transform -> sink` design contract |
| Web plan client | frontend already expects `/plans/preview`            | protected API route plus persisted-plan semantics          |
| Web run client  | frontend already uses `/runs/start` and run reads    | result UX aligned to materialization evidence              |
| Runtime routes  | run start and run read routes exist                  | preview-persist route and SQL-first execution path         |
| Planner         | deterministic planning boundary exists               | design-graph-to-step compiler for SQL-first flow           |
| Runtime         | `PlanRef` is the execution boundary                  | persisted plan issuance for this flow                      |
| Executor        | no PostgreSQL transformation executor is visible yet | governed PostgreSQL execution seam                         |

## Canonical terms for this vertical

### Design graph

The user-authored intent surface. In v1 it is exactly one:

- `source`
- `sql_transform`
- `sink`

### Plan

The immutable persisted execution contract derived from the design graph. It
contains:

- identity
- context
- ordered execution steps
- executor selection
- provenance

### Step

A runtime unit inside the plan. In v1, a meaningful plan is not a single opaque
blob. It is an ordered set of concrete units.

### Run

A runtime instance started from a persisted `PlanRef`.

### Materialization evidence

The runtime proof that the sink was written, how many rows were affected, and
under which executor and environment the write happened.

## Component responsibilities

| Component            | Responsibility                                                      |
| -------------------- | ------------------------------------------------------------------- |
| Canvas               | collect design intent and show validation, run, and result states   |
| Web services         | call preview and run routes and hold `PlanRef` between states       |
| API                  | authenticate, validate, persist, and return runtime-safe references |
| Planner and compiler | convert design graph to deterministic execution plan                |
| Plan store           | persist immutable plan bytes plus provenance and issue `PlanRef`    |
| Runtime engine       | start and track runs by `PlanRef`                                   |
| Executor             | execute the step payload against PostgreSQL or dbt in phase 2       |
| PostgreSQL           | first data target and first proof environment                       |

## System boundary

```mermaid
flowchart LR
  UI[Canvas and run views] --> API[Protected API]
  API --> COMP[Planner and compiler]
  API --> STORE[Plan store]
  API --> RT[Runtime engine]
  RT --> EXEC[Executor]
  EXEC --> PG[PostgreSQL]
  STORE --> RT
```

## V1 design graph contract

### Node types

```ts
type DesignNodeType = 'source' | 'sql_transform' | 'sink';
```

### Artifact provenance

```ts
type GitArtifactRef = {
  repo: string;
  path: string;
  ref: string;
  commitSha: string;
  contentSha256: string;
};
```

### Nodes

```ts
type SourceNode = {
  id: string;
  type: 'source';
  payload: {
    kind: 'postgres_table';
    schema: string;
    table: string;
    alias: string;
  };
};

type SqlTransformNode = {
  id: string;
  type: 'sql_transform';
  payload: {
    dialect: 'postgres';
    sqlArtifact: GitArtifactRef;
    entrypoint: string;
  };
};

type SinkNode = {
  id: string;
  type: 'sink';
  payload: {
    kind: 'postgres_table';
    schema: string;
    table: string;
    materialization: 'table' | 'view';
    writeMode: 'replace' | 'append';
  };
};

type DesignNode = SourceNode | SqlTransformNode | SinkNode;

type DesignEdge = {
  fromNodeId: string;
  toNodeId: string;
};

type DesignGraphDraft = {
  context: {
    tenantId: string;
    projectId: string;
    environmentId: string;
    executionTarget: 'postgres';
    graphArtifact: GitArtifactRef;
    requestedBy?: string;
  };
  nodes: DesignNode[];
  edges: DesignEdge[];
};
```

## V1 invariants

1. exactly one source node
2. exactly one sql transform node
3. exactly one sink node
4. exactly two edges: `source -> sql_transform` and `sql_transform -> sink`
5. no cycles
6. SQL artifact provenance is required
7. execution target is `postgres` only
8. preview must persist when valid
9. start is blocked without a real `PlanRef`

## Graph to plan compiler mapping

The compiler is deterministic. It does not invent business logic. It maps the
three-node graph into an ordered execution plan.

### Step kinds for v1

```ts
type ExecutionStepKind =
  | 'PREPARE_POSTGRES_TRANSFORM'
  | 'POSTGRES_SQL_TRANSFORM'
  | 'CAPTURE_MATERIALIZATION_EVIDENCE'
  | 'DBT_PLAN_EXECUTION';
```

### Mapping rule

| Design element                    | Execution output                                                        |
| --------------------------------- | ----------------------------------------------------------------------- |
| `source`                          | source binding data inside the prepare step                             |
| `sql_transform`                   | executable SQL reference and transform config inside the transform step |
| `sink`                            | sink binding and write mode inside transform and evidence steps         |
| `source -> sql_transform -> sink` | ordered dependencies between prepare, transform, and evidence           |

### Minimum plan shape

```ts
type ExecutionStep = {
  stepId: string;
  kind: ExecutionStepKind;
  dependsOnStepIds: string[];
  stepTypeConfig: Record<string, unknown>;
};

type PersistedTransformationPlan = {
  planId: string;
  planVersion: string;
  schemaVersion: string;
  executor: 'postgres' | 'dbt';
  steps: ExecutionStep[];
  provenance: {
    graphArtifact: GitArtifactRef;
    sqlArtifact: GitArtifactRef;
  };
};
```

## Preview and persistence contract

### Request

```json
{
  "draft": {
    "context": {
      "tenantId": "tenant-a",
      "projectId": "sales",
      "environmentId": "dev",
      "executionTarget": "postgres",
      "graphArtifact": {
        "repo": "dunay2/dvt",
        "path": "graphs/orders-daily.json",
        "ref": "refs/heads/main",
        "commitSha": "abc123",
        "contentSha256": "sha256-graph"
      }
    },
    "nodes": [
      {
        "id": "src",
        "type": "source",
        "payload": {
          "kind": "postgres_table",
          "schema": "raw",
          "table": "orders",
          "alias": "orders"
        }
      },
      {
        "id": "tx",
        "type": "sql_transform",
        "payload": {
          "dialect": "postgres",
          "sqlArtifact": {
            "repo": "dunay2/dvt",
            "path": "sql/orders_daily.sql",
            "ref": "refs/heads/main",
            "commitSha": "abc123",
            "contentSha256": "sha256-sql"
          },
          "entrypoint": "main"
        }
      },
      {
        "id": "sink",
        "type": "sink",
        "payload": {
          "kind": "postgres_table",
          "schema": "analytics",
          "table": "orders_daily",
          "materialization": "table",
          "writeMode": "replace"
        }
      }
    ],
    "edges": [
      { "fromNodeId": "src", "toNodeId": "tx" },
      { "fromNodeId": "tx", "toNodeId": "sink" }
    ]
  },
  "persist": true
}
```

### Response

```ts
type PlanRef = {
  uri: string;
  sha256: string;
  schemaVersion: string;
  planId: string;
  planVersion: string;
  sizeBytes?: number;
  expiresAt?: string;
  requiresCapabilities?: string[];
};

type PlanPreviewPersistResponse = {
  planRef: PlanRef;
  planSummary: {
    executor: 'postgres';
    nodeCount: number;
    stepCount: number;
    sourceTables: string[];
    sinkTables: string[];
  };
  persisted: {
    planRecordId: string;
    canonicalPlanSha256: string;
  };
  validation: {
    valid: true;
    warnings: string[];
  };
  provenance: {
    graphArtifact: GitArtifactRef;
    sqlArtifact: GitArtifactRef;
  };
};
```

### Error contract

| Status | Meaning                          |
| ------ | -------------------------------- |
| `400`  | malformed request envelope       |
| `401`  | unauthenticated                  |
| `403`  | authenticated but not authorized |
| `422`  | graph or SQL contract invalid    |
| `500`  | persistence or internal failure  |

## Preview and persist sequence

```mermaid
sequenceDiagram
  participant U as Operator
  participant W as Canvas
  participant A as API
  participant P as Planner and compiler
  participant S as Plan store

  U->>W: Design source transform sink graph
  U->>W: Click Plan
  W->>A: POST plans preview
  A->>P: Validate graph and compile plan
  alt Invalid draft
    P-->>A: Validation errors
    A-->>W: 422 error response
    W-->>U: Show inline graph and SQL errors
  else Valid draft
    P-->>A: Canonical plan
    A->>S: Persist plan and provenance
    S-->>A: PlanRef and plan record id
    A-->>W: Plan summary and PlanRef
    W-->>U: Enable Start run
  end
```

## Start run and result surfaces

### Start run

The runtime contract stays reference-based:

```json
{
  "planRef": {
    "uri": "plan://persisted/123",
    "sha256": "sha256-plan",
    "schemaVersion": "v1",
    "planId": "plan-001",
    "planVersion": "1"
  }
}
```

### Result model

```ts
type MaterializationEvidence = {
  executor: 'postgres' | 'dbt';
  environmentId: string;
  sinkTable: string;
  rowsWritten: number;
  startedAt: string;
  completedAt: string;
  durationMs: number;
};

type RunOutcome = {
  runId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStepId?: string;
  failedStepId?: string;
  errorReason?: string;
  materialization?: MaterializationEvidence;
};
```

### Read surface requirements

`GET /runs/:runId` must expose at least:

- current and final run status
- executor identity
- current or failed step id when applicable
- materialization evidence on success
- error reason on failure

`GET /runs/:runId/events` must expose at least:

- step transitions
- start and completion timestamps
- failure event with step attribution
- materialization evidence event when sink write succeeds

## Execution sequence

```mermaid
sequenceDiagram
  participant W as Web client
  participant A as API
  participant R as Runtime engine
  participant S as Plan store
  participant E as Executor
  participant PG as PostgreSQL

  W->>A: POST runs start with PlanRef
  A->>R: Start run by PlanRef
  R->>S: Load persisted plan
  S-->>R: PersistedTransformationPlan
  R->>E: Execute ordered steps
  E->>PG: Prepare bindings and execute SQL
  alt Execution failed
    PG-->>E: SQL error
    E-->>R: Failed step and diagnostics
    R-->>A: Failed outcome
    A-->>W: failed run state
  else Execution succeeded
    PG-->>E: Sink written
    E-->>R: Materialization evidence
    R-->>A: Completed outcome
    A-->>W: completed run state with evidence
  end
```

## Phase 2 dbt compatibility rule

Phase 2 may replace the executor implementation for some plans, but it must not
replace the outer contract.

Allowed in phase 2:

- compiler emits dbt-backed execution steps
- runtime dispatches to dbt executor
- result surfaces show `executor: dbt`

Not allowed in phase 2:

- bypassing preview persistence
- bypassing `PlanRef`
- creating a second user-facing flow for dbt runs
