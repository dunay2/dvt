# Workflow Engine Artifact — Temporal first, Conductor next (Enhanced)

Status: Draft (V1.7)  
Scope: Engine module (parallel development)  
Primary target: TemporalAdapter (MVP)  
Secondary target: ConductorAdapter (Phase 2)

> **Revision note (v1.7)**  
> This revision incorporates enterprise-grade operational, security, and scalability refinements:
> - Explicit health checks & degraded-mode behaviors
> - Runtime isolation & sandboxing
> - Backpressure mechanics
> - Determinism testing
> - Multi-region DR
> - Cost, compliance, and on-call procedures
> - Phased implementation roadmap


---

This document defines a stable workflow-engine abstraction (`IWorkflowEngine`) so we can implement **Temporal first** and add **Conductor** later **without changing Planner/State/UI**.

References:
- Temporal docs: https://docs.temporal.io/
- Temporal TypeScript SDK: https://docs.temporal.io/develop/typescript
- Netflix Conductor: https://conductor.netflix.com/
- Orkes Conductor: https://orkes.io/
- OpenTelemetry: https://opentelemetry.io/
- Prometheus: https://prometheus.io/

---

## 1) Engine Boundary: what the engine MUST do (and MUST NOT do)

### MUST
- Accept a **versioned** `ExecutionPlan` and execute its steps reliably.
- Emit **run/step lifecycle events** (persisted into `IRunStateStore`).
- Support retries/backoff as specified by Planner policy (engine-agnostic rules).
- Support cancellation and “stop” semantics.
- Support **resuming / continuing** after transient failures.
- Provide correlation identifiers: `tenantId`, `projectId`, `environmentId`, `runId`, `attemptId`.

### MUST NOT
- Perform planning (ordering/skip/cost decisions belong to `IExecutionPlanner`).
- Become the source of truth for state (`IRunStateStore` is the source of truth).
- Store secrets (`ISecretsProvider` handles that).

---

## 2) Minimal Contract: IWorkflowEngine (TypeScript sketch)

### 2.1 Operations
- `startRun(executionPlan, context) -> engineRunRef`
- `cancelRun(engineRunRef)`
- `getRunStatus(engineRunRef) -> status snapshot` *(optional; StateStore is primary)*
- `signal(engineRunRef, signalType, payload)` *(optional but useful)*

### 2.1.1 EngineRunRef (explicit, enriched)
For adapter-compatibility, `engineRunRef` is a structured reference.

```ts
type EngineRunRef =
  | {
      provider: "temporal";
      namespace: string;
      workflowId: string;
      runId?: string;
      taskQueue?: string; // debugging / routing visibility
    }
  | {
      provider: "conductor";
      workflowId: string;
      runId?: string;
      conductorUrl?: string; // multi-instance (prod/stage)
    };
```

Notes:
- Temporal operations may accept `workflowId` alone (latest run), but **cancellation/queries/debug** SHOULD include `runId` when available.
- `namespace` is included for multi-namespace deployments.
- `taskQueue` helps debugging routing and worker topology.
- `conductorUrl` is required for multi-instance Conductor (prod/stage, multi-region).

### 2.2 Event emission
Events are written to `IRunStateStore` (synchronous primary path) and may also be published to `IEventBus` (asynchronous secondary path).

Lifecycle events:
- `onRunStarted`
- `onStepStarted`
- `onStepCompleted`
- `onStepFailed`
- `onRunCompleted`
- `onRunFailed`
- `onRunCancelled`

Contract notes:
- Events **MUST** include `runId + stepId + attemptId` (where applicable).
- Events **MUST** include `idempotencyKey` for safe upserts.

### 2.3 Supported Signals Catalog (SignalType)
Signals are **operator actions** routed to the engine, always enforced by `IAuthorization` (RBAC + tenant scoping).  
All signals include `signalId` for deduplication (`hash(runId, signalType, signalId)`).

| SignalType | Payload | RBAC required | Effect |
|---|---|---|---|
| `PAUSE` | `{ reason?: string }` | `Operator` | Pauses future step scheduling (current activity may finish) |
| `RESUME` | `{}` | `Operator` | Resumes a paused run |
| `RETRY_STEP` | `{ stepId: string, force?: boolean }` | `Engineer` | Retries a failed step (honors policy unless `force`) |
| `UPDATE_PARAMS` | `{ stepId?: string, newParams: object }` | `Admin` | Updates runtime params (scoped; audit required) |
| `INJECT_OVERRIDE` | `{ stepId: string, override: object }` | `Admin` | Injects approved override into next step execution |
| `ESCALATE_ALERT` | `{ level: "LOW"|"MEDIUM"|"HIGH", note?: string }` | `System` | Triggers escalation workflow (outside engine) |

Idempotency rule:
- `signalId` is a client-supplied UUID.
- Engine stores `signalId` handling result via StateStore upsert; repeated delivery is a no-op.

---

## 3) ExecutionPlan model (engine-facing)

### 3.1 Plan transport: avoid Temporal payload limits
Temporal has strict payload/history size limits. The engine MUST support **plan references**.

Rule:
- `startRun()` receives a **PlanRef** (URI + hash + schemaVersion), not the full plan when the plan can grow.

```ts
type PlanRef = {
  uri: string;           // e.g. s3://bucket/plans/{planId}.json
  sha256: string;        // integrity
  schemaVersion: string; // e.g. "v1"
  planId: string;
  planVersion: string;

  sizeBytes?: number;          // pre-check against engine max plan size
  compression?: "gzip"|"none"; // transport hint
  expiresAt?: string;          // cache invalidation hint
};
```

Temporal pattern:
- Workflow input: `PlanRef`
- First step: call an Activity `fetchPlan(planRef)` (with caching) and validate against JSON Schema.
- Keep only minimal fields in workflow memory; avoid writing large blobs to workflow history.

`ExecutionPlan vN` contains:
- `metadata: { planId, planVersion, createdAt, createdBy, schemaVersion }`
- `scope: { tenantId, projectId, environmentId, repoSha }`
- `steps[]`: each step has:
  - `stepId`
  - `type`: e.g. `DBT_COMPILE`, `DBT_RUN`, `DBT_TEST`, `CUSTOM_PLUGIN_STEP`
  - `inputs`: references to artifacts/config (**no secrets inline**)
  - `retryPolicyRef` (or inline policy id)
  - `timeout`
  - `dependsOn[]`
  - `observabilityTags: { nodeId, modelName, packageName }`
  - `dispatch: { taskQueue, workerPool?, runtime?, resourceClass? }` *(Temporal routing / worker segregation)*

Engine expectations:
- Steps produce deterministic state transitions for the same `planVersion` + inputs.
- Each step produces:
  - state update (success/failure)
  - artifact references (outputs)
  - telemetry

### 3.2 Plan caching strategy
`fetchPlan()` may be called frequently; caching reduces latency and avoids storage hot-spots.

**Cache layers:**
1. Temporal workflow cache (in-memory, single run)
2. Activity-level LRU cache (cross-run, same worker)
3. Distributed cache (Redis) for hot plans

**Invalidation:**
- Cache key: `sha256(planRef.uri + planRef.sha256)`
- Invalidate on: plan update, schema version change
- TTL: 1 hour (configurable)
- If `planRef.expiresAt` is present, TTL MUST NOT exceed it.

---

## 4) TemporalAdapter: mapping plan → Temporal primitives

### 4.0 Temporal Interpreter Workflow (Interpreter Pattern)
Temporal is code-first. The adapter MUST implement a **generic interpreter workflow** that:
1) Receives `PlanRef`
2) Fetches + validates the plan (`fetchPlan(planRef)` Activity)
3) Walks the plan and schedules Activities according to dependencies

Determinism rules:
- No direct I/O inside workflow code (no HTTP, no DB, no filesystem).
- No `Date.now()` / `Math.random()`; use Temporal APIs where needed.
- All external effects happen in Activities.

Parallelism scope (V1):
- **V1 supports linear execution + optional “parallel groups”** (fan-out/fan-in) where dependencies allow.
- Full dynamic DAG-walking is allowed only if implemented as a deterministic dependency resolver.

Implementation hint (deterministic DAG walker):
- Maintain a `completedSteps` set.
- At each iteration, select “ready” steps whose `dependsOn` are satisfied.
- Schedule ready steps (optionally in `Promise.all`) and await completion.
- Persist state transitions via idempotent StateStore events.

### 4.1 Mapping
- One run = one Temporal Workflow execution
- Each step = one Temporal Activity
- Dependencies:
  - simplest: sequential execution (plan already ordered)
  - optional: parallel activities when plan indicates safe parallelism
- Retries: Activity retry policy derived from Planner policy
- Timeouts: Activity start-to-close / schedule-to-close derived from `step.timeout`
- Cancellation: workflow cancellation propagates to activities; persist cancellation state
- Signals: supports `SignalType` catalog (pause/resume/retry/etc.), strict RBAC

### 4.2 Idempotency & State
Temporal activities are **at-least-once**; StateStore writes must be idempotent.

Recommended idempotency key:
- `idempotencyKey = sha256(runId + stepId + attemptId + eventType + planVersion)`

Canonicalization:
- Concatenate as UTF-8 with `|` separators.
- Lowercase `eventType`.
- `attemptId` is per-activity-attempt (Temporal retry attempt), not per-run.

### 4.3 Namespace Strategy (Temporal)
We support a pluggable `NamespaceStrategy` for isolation and retention.

```ts
interface NamespaceStrategy {
  isolationLevel: "tenant" | "environment" | "project";
  getNamespace(tenantId: string, environmentId: string, projectId?: string): string;
  cleanupPolicy: {
    retentionDays: number;
    purgeCompletedAfterDays?: number;
    archiveAfterDays?: number;
  };
}
```

**Recommended default (balanced):**
- Isolation: `environment` (prod/stage/dev separation) + `tenant` suffix
- TaskQueues: per environment

Example:
```yaml
temporal:
  namespaceStrategy:
    isolationLevel: environment
    templates:
      production: "prod-{tenantId}"
      staging: "staging-{tenantId}"
      development: "dev-{tenantId}"
  retention:
    productionDays: 90
    stagingDays: 30
    developmentDays: 7
  taskQueues:
    production: "tq-prod"
    staging: "tq-staging"
    development: "tq-dev"
```

Cleanup automation (operational policy):
- Completed runs older than `purgeCompletedAfterDays` are purged (subject to audit requirements).
- Namespaces older than retention are archived/rotated (implementation-specific; may be external cron/ops tool).

> Note: In Temporal, **namespace retention** applies to workflow histories; design the retention policy with audit requirements in mind.

### 4.4 Search attributes
Tag runs with search attributes for fast lookup:
- `tenantId`, `projectId`, `environmentId`, `runId`, `repoSha`, `planId`, `planVersion`

### 4.5 Task routing & worker topology (Task Queues)
Do NOT assume a single monolithic worker.

Production guidance:
- Heavy steps (e.g. `DBT_RUN`) and light steps (e.g. `HTTP_NOTIFY`) SHOULD run on different **Task Queues** / worker pools.
- The interpreter dispatches each Activity to `step.dispatch.taskQueue`.

Example:
```yaml
steps:
  - stepId: dbt_run_orders
    type: DBT_RUN
    dispatch:
      taskQueue: data-plane-v1
      runtime: python
      resourceClass: heavy

  - stepId: notify_slack
    type: HTTP_NOTIFY
    dispatch:
      taskQueue: control-plane
      runtime: node
      resourceClass: light
```

If `dispatch.taskQueue` is not provided:
- Use adapter default by environment (e.g. `tq-prod`, `tq-staging`).

### 4.5.1 Worker topology implementation (concrete)
**Control Plane Workers:**
- Task Queue: `tq-control-{env}`
- Responsibilities:
  - Plan fetch/validation
  - StateStore writes
  - Light HTTP/API steps
  - Signal processing
- Resources: Low CPU/memory (e.g., 0.5 CPU / 1Gi)
- Scale: 2–10 pods (CPU-based HPA)

**Data Plane Workers:**
- Task Queue: `tq-data-{env}`
- Responsibilities:
  - `DBT_RUN`, heavy computation steps
- Resources: High CPU/memory (GPU optional)
- Isolation: Docker/Kubernetes per tenant when required (enterprise tiers)

**Isolation Plane Workers (optional / enterprise):**
- Task Queue: `tq-isolation-{tenant}-{env}`
- Responsibilities:
  - Tenant-isolated steps (security/regulatory)
- Resources: Dedicated per tenant (fixed or tenant-managed)

**Routing logic**
```ts
function getTaskQueue(step: Step, env: string): string {
  return (
    step.dispatch?.taskQueue ??
    (step.type.includes("DBT") ? `tq-data-${env}` : `tq-control-${env}`)
  );
}
```

### 4.6 Workflow code versioning (Temporal `getVersion`)
The plan can be stable while engine code evolves. To avoid breaking determinism for in-flight runs:
- Use Temporal workflow versioning (`getVersion`) around behavioral changes in the interpreter.
- Gate new logic behind version checks so old runs replay safely.

Rule:
- Any change that affects control-flow, activity scheduling order, retries, or branching MUST be protected by workflow versioning.

Reference:
- https://docs.temporal.io/workflows#versioning

---

## 5) ConductorAdapter: planned mapping (second phase)

Mapping:
- One run = one Conductor workflow execution
- Each step = one Conductor task
- Dependencies expressed in Conductor workflow definition
- Retries/timeouts configured per task based on Planner policy
- Cancellation uses Conductor terminate workflow APIs

Notes:
- Conductor workflow JSON can be generated from `ExecutionPlan` and submitted on-demand.
- Keep event model identical; StateStore is still source of truth.

---

## 6) Event Bus Integration Protocol (required)

We explicitly split **truth** vs **integration**.

### 6.1 Guarantees
- `IRunStateStore` is **source of truth** (synchronous write path).
- `IEventBus` is **eventually consistent** (async integration; may be down).
- Event ordering:
  - Ordering is guaranteed **per runId** in StateStore (via monotonic sequence).
  - EventBus ordering is **best-effort**; consumers must tolerate reordering/duplication.

### 6.2 Interfaces (concept)
```ts
interface EngineEventBus {
  // primary: synchronous, required
  emitToStateStore(event: EngineEvent): Promise<void>;

  // secondary: asynchronous, best-effort
  emitToEventBus(event: EngineEvent): Promise<void>;

  // recovery: optional reconciliation
  reconcileFromEventBus(runId: string): Promise<void>;
}
```

### 6.3 Failure handling
If EventBus publish fails:
- Persist event to StateStore first (already done).
- Enqueue to **outbox** table (StateStore) for retry worker.
- Retry policy: exponential backoff with jitter.
- After N failures → DLQ (dead-letter) with alert.

Pattern: **Transactional Outbox** (StateStore + publisher worker).

---

## 7) “Done” criteria for the Engine module (team-ready)

TemporalAdapter (MVP in V2):
- `startRun()` executes a simple 3-step plan:
  1) `DBT_COMPILE`
  2) `DBT_RUN`
  3) `DBT_TEST` *(optional)*
- Emits lifecycle events into StateStore (idempotent).
- Supports `cancelRun()`.
- Supports `SignalType` catalog: `PAUSE/RESUME/RETRY_STEP` minimally.
- Exposes minimal debug endpoints (see Section 8).

ConductorAdapter (Phase 2):
- `startRun()` generates Conductor workflow definition + executes it.
- Same event model/state updates as Temporal.
- Supports `cancelRun()`.

---

## 8) Debug Interface & Observability (operations)

This section is **for operations and engineering**. UI remains state-driven.

### 8.1 Debug endpoints (API module)
- `GET /engine/runs/{runId}/debug` → engine ref + last known internal mapping (planId, provider IDs)
- `GET /engine/runs/{runId}/steps/{stepId}/logs` → log pointers + recent lines (if available)
- `POST /engine/runs/{runId}/inspect` → snapshot (state + artifacts pointers + provider status)

> These endpoints are **read-only** except `inspect`. Mutations are via Signals with RBAC + audit logs.

### 8.2 Metrics (Prometheus / OTel)
Minimum metrics:
- `engine_steps_executed_total{type,status}`
- `engine_execution_duration_seconds{type}`
- `engine_queue_depth{adapter,taskQueue}`
- `engine_errors_total{category}`
- `eventbus_publish_failures_total{bus}`

Tracing:
- Every step activity creates a span: `runId`, `stepId`, `planVersion`, `tenantId`
- Correlate with dbt runner spans where possible.

Logging:
- Structured logs (JSON) with: `runId`, `stepId`, `attemptId`, `providerRunId`

---

## 9) Risks & mitigations (short)

Risk: **Interpreter complexity / DAG determinism**
- Mitigation: explicit Interpreter Pattern; V1 scope = linear + optional parallel groups; DAG walker must be deterministic.

Risk: **Worker topology / noisy neighbors**
- Mitigation: `dispatch.taskQueue` per step; separate control-plane vs data-plane workers.

Risk: **Temporal payload/history limits (2MB trap)**
- Mitigation: `PlanRef` + `fetchPlan()` Activity; avoid large arguments/signals; store large artifacts in blob storage.

Risk: **Workflow code changes break determinism (in-flight runs)**
- Mitigation: Temporal workflow versioning (`getVersion`) for behavioral changes; keep backward-compatible replay.

Risk: event duplication / retries
- Mitigation: idempotency keys + StateStore upserts + signal dedupe (`signalId`)

Risk: planner/engine responsibility creep
- Mitigation: keep ordering/skip/cost in planner; engine only executes plan

Risk: secrets leakage in plan
- Mitigation: plan references secret IDs; adapter fetches via `ISecretsProvider` at runtime

Risk: EventBus outage causes missing integrations
- Mitigation: Transactional Outbox + retry worker + DLQ

---

## 10) Health Checks & Degraded Mode (Extended)

### 10.1 Health Check Contract

```ts
interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    temporal: {
      namespace: string;
      workflowCount?: number;
      startLatencyP95Ms?: number;
    };
    stateStore: {
      latencyMs: number;
      connections: number;
    };
    secretsProvider: {
      reachable: boolean;
      latencyMs?: number;
    };
    artifactStore: {
      writable: boolean;
      latencyMs?: number;
    };
    eventBus: {
      connected: boolean;
      backlogDepth?: number;
    };
  };
}
```

### 10.2 Degraded Mode Rules

| Condition | Behavior |
|---------|----------|
| Temporal `startRun` > 5s P95 | Reject new runs with `503`, exponential backoff |
| Redis / Outbox latency > 2s | Disable async integrations, StateStore only |
| SecretsProvider timeout | Fail affected step, retry with jitter |
| EventBus down | Enter outbox-only mode |

---

## 11) Runtime Isolation & Plugin Sandboxing

### 11.1 Data Plane Worker Isolation

```yaml
dataPlaneWorkers:
  runtime:
    type: docker | gvisor | firecracker
    resourceLimits:
      memory: "8Gi"
      cpu: "4"
      disk: "20Gi"
    networkPolicy: isolated
    userNamespace: true
```

### 11.2 Plugin Sandbox Contract

```ts
interface PluginSandbox {
  runtime: "vm2" | "isolated-vm" | "web-worker" | "container";
  resourceLimits: {
    timeoutMs: number;
    memoryMB: number;
    network: "none" | "localhost-only" | "tenant-network";
  };
  allowedAPIs: string[];
}
```

---

## 12) Backpressure & Fairness

### 12.1 Rate Limiting Interface

```ts
interface RateLimiter {
  algorithm: "token-bucket" | "fixed-window" | "sliding-log";
  check(
    tenantId: string,
    action: "startRun" | "heavyStep"
  ):
    | { allowed: true }
    | { allowed: false; retryAfter: number };
}
```

### 12.2 Tenant Metrics

- `engine_tenant_quota_used{tenant}`
- `engine_tenant_queue_depth{tenant}`
- `engine_tenant_cost_usd{tenant}`

---

## 13) Determinism & Testing Strategy

### 13.1 Workflow Replay Testing

```ts
test("workflow replay determinism", async () => {
  const history = await runWorkflowAndCaptureHistory(testPlan);
  await replayHistoryAndVerifySameOutcome(history);
});
```

### 13.2 Test Levels
- Unit: interpreter logic
- Integration: Temporal test framework
- Chaos: worker kill, latency injection
- Load: parallel DAG stress tests

---

## 14) Cross-Region Disaster Recovery

### 14.1 Strategy

| Mode | Description |
|----|-------------|
| Active-Passive | Primary executes, secondary standby |
| Active-Active | Per-tenant region affinity |

### 14.2 Recovery Rules
- StateStore: async replication
- Artifacts: cross-region object replication
- In-flight workflows: resumed only in primary; secondary replays from StateStore

---

## 15) Cost Optimization

- Spot instances for data-plane
- Namespace TTL shutdown
- Artifact compression
- Autoscaling based on cost-per-run

---

## 16) Compliance & Audit

- GDPR retention enforcement
- SOC2 change/audit trails
- HIPAA tenant isolation (optional)
- Immutable audit log for signals

---

## 17) On-call & Escalation

| Scenario | Action |
|--------|--------|
| Workflow stuck > 1h | SEV-2, manual inspect |
| Secrets leakage suspected | SEV-1, rotate + freeze |
| Data corruption | SEV-1, halt writes |
| Tenant isolation breach | SEV-0, shutdown tenant |

---

## 18) Implementation Phases & Milestones

### Phase 1 — MVP (4 weeks)
- Temporal interpreter (linear)
- StateStore integration
- DBT_COMPILE / RUN / TEST
- Basic health checks

### Phase 2 — Robustness (3 weeks)
- Parallel groups
- Signal handling
- Transactional outbox
- Observability

### Phase 3 — Scale (3 weeks)
- Multi-queue workers
- Rate limiting
- Plugin system v1
- DR basics

### Phase 4 — Enterprise (4 weeks)
- Conductor adapter
- mTLS & network policies
- Cross-region
- Compliance tooling

---

> This version elevates the engine from **product-ready** to **enterprise-operable** while preserving the original architectural philosophy.


## 19) Runtime secrets, artifacts, and advanced execution semantics (additions)

### 19.1 Runtime secrets resolution (engine responsibility; no secrets in plan)
The plan MUST contain **only references** to secrets (never values). At execution time, the step Activity resolves secrets via `ISecretsProvider`.

**Concept API**
```ts
type SecretRef = { provider: "vault"|"aws-sm"|"gcp-sm"|"azure-kv"; key: string; version?: string };

interface ISecretsProvider {
  resolve(refs: SecretRef[], ctx: { tenantId: string; environmentId: string }): Promise<Record<string, string>>;
}
```

**Recommended pattern (Activity-side merge)**
```ts
async function executeStep(step: Step, ctx: RunContext) {
  const secrets = await secretsProvider.resolve(step.secretRefs ?? [], {
    tenantId: ctx.tenantId,
    environmentId: ctx.environmentId,
  });

  const resolvedInputs = mergeWithSecrets(step.inputs, secrets);

  // Execute the step with resolved inputs
  return stepExecutor.execute(resolvedInputs, ctx);
}
```

**Caching & rotation**
- Cache secrets only **in the Activity process** (never in workflow history), with:
  - TTL <= provider rotation window (default 5–15 minutes).
  - cache-key: `tenantId|environmentId|secretRef.key|secretRef.version`.
- If `version` is omitted, provider resolves “latest”; cache TTL SHOULD be shorter (e.g., 60s–300s).
- Always redact secrets from logs/events; emit only references (e.g., `secretRef.key`) and a boolean `resolved=true`.

### 19.2 Step outputs and artifact contract
Each step Activity returns a structured `StepOutput` and stores any large outputs in artifact storage.

```ts
type ArtifactRef = {
  uri: string;                 // s3://... or gs://... or azure://...
  kind: "dbt-manifest"|"dbt-run-results"|"log-bundle"|"dataset-sample"|"custom";
  sha256?: string;
  sizeBytes?: number;
  contentType?: string;
  expiresAt?: string;          // optional retention policy per artifact kind
};

type ExecutionMetrics = {
  startedAt: string;           // ISO
  finishedAt: string;          // ISO
  durationMs: number;
  rowsRead?: number;
  rowsWritten?: number;
  bytesProcessed?: number;
  costUnits?: number;          // optional normalized cost
};

interface StepOutput {
  status: "SUCCESS"|"FAILED"|"SKIPPED";
  artifactRefs: ArtifactRef[];
  metadata: Record<string, any>;
  metrics?: ExecutionMetrics;
  error?: { category: string; code?: string; message: string; retryable?: boolean };
}
```

**Storage rules**
- Artifacts are written by Activities (not workflows).
- The StateStore stores only `ArtifactRef[]` pointers (never binary payloads).
- Retention by kind (example):
  - logs: 14d
  - manifests / run_results: 90d (or aligned with audit)
  - dataset samples: 7d

### 19.3 Dependency patterns beyond linear + “parallel groups”
V1 supports:
- Linear sequences
- Fan-out / fan-in (“parallel groups”)
- Multi-dependency join steps (a step waits for N predecessors)

Forward-compatible (plan v2+) patterns:
- Conditional execution:
  - `when: { expression: "...", on: "stepId.output.metadata.someFlag" }`
- Dynamic fan-out:
  - `foreach: { from: "stepX.output.artifactRefs[0]", itemVar: "item" }`
  - Engine MUST treat dynamic expansion deterministically:
    - expansion is derived from a persisted artifact (immutable snapshot) to avoid non-deterministic set sizes.

### 19.4 Plugin versioning and compatibility (engine-level guardrails)
When a step is executed by a plugin:
- `step.type` maps to `pluginId + handler`
- Plan MUST declare `pluginVersion` (semver) or an immutable `pluginDigest` (sha256)

```ts
type PluginDispatch = {
  pluginId: string;
  pluginVersion: string;     // e.g. "1.4.2"
  pluginDigest?: string;     // immutable build identity
  inputSchemaRef?: string;   // JSON Schema URI
  outputSchemaRef?: string;  // JSON Schema URI
};
```

Recommended behaviors:
- **Compatibility gate**: validate inputs against the plugin’s declared schema before execution.
- **Rollback**: if a plugin version exceeds an error threshold (Appendix E quarantine rules), route to:
  - last known-good plugin version, or
  - a quarantine queue (`tq-isolation-*`) for operator review.
- **A/B testing**: planner can select plugin versions via policy:
  - `pluginVersionPolicy: { strategy: "canary", percent: 5 }`
  - selection MUST be decided by planner and recorded in plan to keep engine deterministic.

### 19.5 Backpressure and fairness (multi-tenant)
When load spikes, the platform MUST enforce fairness:
- Rate limits by `tenantId`, optionally `projectId`.
- Separate limits for:
  - run starts (`startRun`)
  - heavy steps (`DBT_*`)
  - signal operations (operator actions)

Policies:
- `REJECT` (fail fast, return 429 + retry-after)
- `QUEUE` (accept and enqueue in a “pending” state)
- `DELAY` (accept, but schedule with a planned start time)

Implementation notes:
- If `StateStore` is up, you can accept a run into `PENDING` even if Temporal is degraded, then schedule later when recovered.
- “Queue depth” metrics MUST be emitted per tenant to detect noisy neighbors.

---

## 20) Deployment & Operations Guide (team-ready)

### 20.1 Infrastructure requirements (baseline)
- Kubernetes (or equivalent) for workers and API.
- Artifact storage (S3/GCS/Azure Blob).
- StateStore (SQL or KV) with transactional guarantees for outbox.
- Secrets provider (Vault / cloud secret managers).
- Observability stack (OpenTelemetry + Prometheus + log aggregation).

### 20.2 Configuration management
- All runtime config via:
  - env vars (bootstrap)
  - versioned config files (YAML) loaded by Config Loader
  - feature flags for risky behavior changes (paired with Temporal `getVersion` for determinism)

### 20.3 Scaling strategies
- API layer: scale by RPS.
- Workers: scale by **task queue depth** + resource metrics.
- Enforce max concurrency per worker pool:
  - control-plane: high concurrency
  - data-plane: low concurrency, high memory/CPU
- Implement graceful drain:
  - stop polling the task queue
  - finish in-flight activities
  - terminate after drain timeout

### 20.4 Disaster recovery (minimum viable)
- StateStore:
  - PITR / snapshots + restore drills
  - verify outbox replay after restore
- Artifact store:
  - versioned buckets + lifecycle policies
- Temporal:
  - multi-AZ recommended
  - document namespace retention vs audit requirements
- Cross-region:
  - optional for Phase 2+; define RPO/RTO in platform SLOs

### 20.5 Operational checklists (minimum)
**Pre-deploy**
- namespaces exist (or auto-provisioned) with correct retention
- task queues defined and workers deployed
- StateStore migrations applied
- outbox publisher running
- alerts configured for queue depth, error rate, stuck workflows

**Post-deploy**
- run a smoke plan (3 steps)
- verify StateStore events and artifact refs
- verify signals (pause/resume/retry)
- verify worker drain (rolling restart)

---

## 21) Testing & Quality Assurance

### 21.1 Test strategy
- Unit tests:
  - deterministic DAG walker (ready-set selection)
  - routing rules (taskQueue inference)
  - idempotency key canonicalization
- Integration tests:
  - Temporal local test environment + real worker processes
  - StateStore outbox publish + DLQ behavior
- End-to-end:
  - run sample dbt project with compile/run/test
  - verify artifacts, metrics, logs, and UI state transitions
- Chaos / resilience:
  - kill data-plane workers mid-run
  - simulate EventBus outage (outbox recovery)
  - simulate artifact store latency / intermittent failures
- Performance:
  - high-concurrency runs for control-plane
  - capacity tests for DBT runs (data-plane)

### 21.2 Quality gates
- Required:
  - schema validation for PlanRef + ExecutionPlan
  - lint + typecheck
  - security scanning (deps + container)
- Recommended:
  - coverage thresholds for interpreter + router
  - replay tests for workflow versioning changes (Temporal determinism)

References:
- Temporal docs (general): https://docs.temporal.io/
- Temporal TypeScript SDK docs: https://docs.temporal.io/develop/typescript
- Temporal versioning (`getVersion`) guidance: https://docs.temporal.io/workflows#versioning

---

# Appendix A — Event Schemas (restored; normative)
Canonical event schemas persisted in `IRunStateStore`.

**Principles**
- Every event is versioned (`schemaVersion`) and backward compatible within a major version.
- Schema is authoritative: JSON Schema files are the source of truth.
- Idempotency: `idempotencyKey` required for every persistence write.

**Common envelope (concept)**
```json
{
  "schemaVersion": "v1",
  "eventId": "uuid",
  "eventType": "RunStarted|StepStarted|StepCompleted|StepFailed|RunCompleted|RunFailed|RunCancelled",
  "occurredAt": "2026-02-10T12:34:56.000Z",
  "tenantId": "t-...",
  "projectId": "p-...",
  "environmentId": "env-...",
  "runId": "r-...",
  "attemptId": "a-...",
  "stepId": "optional",
  "idempotencyKey": "sha256(...)",
  "engineRunRef": { "provider": "temporal", "namespace": "prod-x", "workflowId": "wf", "runId": "..." },
  "payload": {}
}
```

**Event list**
- `RunStarted`
- `StepStarted`
- `StepCompleted`
- `StepFailed`
- `RunCompleted`
- `RunFailed`
- `RunCancelled`

**Schema pointers (project-local paths)**
- `contracts/events/run_started.v1.schema.json`
- `contracts/events/step_started.v1.schema.json`
- `contracts/events/step_completed.v1.schema.json`
- `contracts/events/step_failed.v1.schema.json`
- `contracts/events/run_completed.v1.schema.json`
- `contracts/events/run_failed.v1.schema.json`
- `contracts/events/run_cancelled.v1.schema.json`

---

# Appendix B — Run State Machine (restored; normative)

```
PENDING → RUNNING → (PAUSED) → COMPLETED
                   ↘ FAILED
                   ↘ CANCELLED
```

**Allowed transitions**
- `PENDING -> RUNNING`
- `RUNNING -> PAUSED`
- `PAUSED -> RUNNING`
- `RUNNING -> COMPLETED`
- `RUNNING -> FAILED`
- `RUNNING -> CANCELLED`
- `PAUSED -> CANCELLED`

**Notes**
- A step may be `RUNNING` while run is `PAUSED` only if pause means “stop scheduling new steps”. Documented by signal semantics.

---

# Appendix C — Execution Contract (restored; normative)

**Responsibility split**
- Planner: ordering / skip / cost / retry policy selection (`IExecutionPlanner`)
- Engine: deterministic execution of the plan (`IWorkflowEngine`)
- State: persisted truth (`IRunStateStore`)
- UI: read-only over state + debug views (no direct provider coupling)

**Execution invariants**
- Engine never mutates plan ordering.
- Engine never stores secrets in plan or event payloads.
- Every externally visible state change is an event persisted in StateStore.

---

# Appendix D — ExecutionPlan Versioning & Migration

## D1) Current Version: v1
- Released: 2026-Q1 *(target)*
- Stability: Stable
- Validation: JSON Schema (required)
- Breaking changes: none within v1 minor revisions

**ExecutionPlan v1 (minimum):**
```yaml
ExecutionPlan:
  schemaVersion: "v1"
  required: [metadata, scope, steps]
  metadata.required: [planId, planVersion, createdAt, createdBy, schemaVersion]
  scope.required: [tenantId, projectId, environmentId, repoSha]
  steps[].required: [stepId, type, inputs, timeout]
```

## D2) Planned: v2 (2026-Q3) — optional / forward design
Planned changes:
```yaml
changes:
  - parallelSteps: true
  - dynamicDependencies: expression-based
  - checkpointing: incremental state saves
  - hooks: preStep/postStep callbacks
```

> Note: `planVersion` is distinct from **engine code versioning**. Engine code changes for Temporal MUST use workflow versioning (`getVersion`) to preserve determinism for in-flight runs.

## D3) Migration path
- Engine supports v1 and v2 concurrently.
- Planner decides which version to generate per run.
- Legacy runs continue on their original schemaVersion.
- Auto-upgrade is allowed only for “simple plans” (no dynamic deps) and must be explicit.

---

# Appendix E — Error Recovery & Operational Playbook (additive; informative)
This appendix defines operational procedures for common failure scenarios. It is for SRE/operators, not engine core.

## E1) Temporal Workflow Stuck Detection & Recovery
**Detection signals**
- Activity heartbeat staleness: `lastHeartbeatAge > stepTimeout * 2`
- Run duration anomaly: `duration > p99 * 3`
- Activity failure rate spikes: `rate(5m) > threshold`

**Automatic recovery (Tier 1)**
- Signal `RETRY_STEP` with `force=true` for last known active step
- If signal fails: terminate workflow with state preservation and open incident

**Manual recovery**
- Use Temporal CLI to inspect history
- Signal retry
- If still stuck: terminate with reason and mark state in StateStore

## E2) Plan Fetch & Validation Failures
- Retry: exponential backoff (max 3 attempts)
- Fallback: secondary storage (if configured)
- Emit `RunFailed` with `error.category=VALIDATION` on final failure
- Enforce `sizeBytes` pre-check when available

## E3) Worker Health & Degradation Management
- `GET /engine/health` basic
- `GET /engine/health/detailed` SRE-only
- Degraded mode:
  - Temporal down, StateStore up: stop accepting new runs
  - StateStore down: severe; block execution, preserve memory state if possible

## E4) Incident response runbooks
- Maintain runbooks in `runbooks/engine/`
- SEV-1 complete outage, SEV-2 partial degradation, SEV-3 performance degradation

## E5) Dashboards & alert routing
- Grafana dashboards for engine overview, temporal health, data-plane
- Route alerts to PagerDuty + Slack; tenant notification when tenant-affected

---

## Links (quick)
- Temporal: https://temporal.io/
- Temporal docs: https://docs.temporal.io/
- Conductor: https://conductor.netflix.com/
- Orkes: https://orkes.io/
- OpenTelemetry: https://opentelemetry.io/
- Prometheus: https://prometheus.io/
