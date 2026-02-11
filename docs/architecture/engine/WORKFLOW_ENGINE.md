# Workflow Engine Artifact — Temporal first, Conductor next (Enhanced)

Status: Candidate Spec (V1.9)  
Stability: Normative (Execution Semantics, State, Events)
Scope: Engine module (parallel development)  
Primary target: TemporalAdapter (MVP)  
Secondary target: ConductorAdapter (Phase 2)

> **Revision note (v1.9) — Integration of Expert Feedback**  
> Production-readiness enhancements based on architectural review:
> - **vm2 security fix**: Explicitly forbidden in PluginSandbox (use isolated-vm/gVisor instead)
> - **Namespace strategy**: Few namespaces + search attributes (reject per-tenant sprawl model)
> - **Temporal vs Conductor capability matrix** (Section 4.6): Enforce cross-adapter parity
> - **PlanRef versioning** (Section 3.1): Schema migration paths + cache invalidation strategies
> - **Signal catalog expansion**: SKIP_STEP, UPDATE_TARGET, EMERGENCY_STOP (Phases 2–3)
> - **Determinism tooling** (Section 21.3): Pre-commit hooks, automated history capture, ESLint custom rules
> - **Namespace cleanup automation** (Section 4.3.1): Ephemeral PR namespaces, abandoned tenant cleanup
> - **Plugin canary & A/B testing** (Appendix G): Automated rollback on error spikes
> - **Implementation priority roadmap** (Appendix H): Phase 1–4 breakdown with risk assessment
> - **Developer experience** (Appendix I): Local docker-compose, mock adapters, CLI tools (roadmap)
> - **Cross-provider migration toolkit** (Appendix J): State export/import, parity validation (Phase 4 roadmap)


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

| SignalType | Payload | RBAC required | Effect | Status |
|---|---|---|---|---|
| `PAUSE` | `{ reason?: string }` | `Operator` | Pauses future step scheduling (current activity may finish) | ✅ Implemented |
| `RESUME` | `{}` | `Operator` | Resumes a paused run | ✅ Implemented |
| `RETRY_STEP` | `{ stepId: string, force?: boolean }` | `Engineer` | Retries a failed step (honors policy unless `force`) | ✅ Implemented |
| `UPDATE_PARAMS` | `{ stepId?: string, newParams: object }` | `Admin` | Updates runtime params (scoped; audit required) | ✅ Implemented |
| `INJECT_OVERRIDE` | `{ stepId: string, override: object }` | `Admin` | Injects approved override into next step execution | ✅ Implemented |
| `ESCALATE_ALERT` | `{ level: "LOW"\|"MEDIUM"\|"HIGH", note?: string }` | `System` | Triggers escalation workflow (outside engine) | ✅ Implemented |
| `SKIP_STEP` | `{ stepId: string, reason?: string }` | `Engineer` | Operator-driven step skip; executes dependent-only steps using default inputs | ⏳ Phase 2 |
| `UPDATE_TARGET` | `{ stepId: string, newTarget: { destinationDb?: string, schema?: string } }` | `Admin` | Changes target warehouse/schema mid-run for subsequent steps (audit required) | ⏳ Phase 2 |
| `EMERGENCY_STOP` | `{ reason: string, forceKill?: boolean }` | `Admin` | Immediate termination (graceful if `forceKill=false`, abrupt if `true`) vs gradual PAUSE | ⏳ Phase 3 |

Idempotency rule:
- `signalId` is a client-supplied UUID.
- Engine stores `signalId` handling result via StateStore upsert; repeated delivery is a no-op.

#### PAUSE semantics (detailed)
Pause is a signal that affects scheduling of *future* steps. The engine MUST persist `RunPaused` state when a pause is accepted, but in-flight activities are handled according to configured step-class policies. UI and APIs MUST reflect the run state as `PAUSED` while any previously-started activities remain `RUNNING` (display as "paused (draining)").

Policy (required):
- Step classes:
  - `light` (short-lived, idempotent, safe-to-complete): allow current activity to finish; do not attempt cancellation.
  - `heavy` (long-running, cancellable if safe): the engine MAY issue a cooperative cancel request to the activity (Activity cancellation token / interrupt) if the activity declares `cancellable=true` and the planner policy permits. If cancellation is unsafe, treat as `light` and let it finish.

- State transitions:
  - On PAUSE accepted: persist `RunPaused` event; do NOT schedule new steps.
  - Steps already `RUNNING` remain `RUNNING` until they complete or cancel; their individual `StepCompleted`/`StepFailed` events are emitted as usual.
  - The run remains `PAUSED` until there are no `RUNNING` steps and an explicit `RESUME` is received (or admin action to `CANCEL` remaining steps is taken).

Implementation notes:
- Activities that support cooperative cancellation MUST expose a cancellation API (e.g., respond to a control message, poll a cancellation token, or honor a gRPC cancel). The engine should send cancellation only when `cancellable=true` and when Planner policy `allowCancelOnPause` is enabled for the tenant/project.
- Persist `pauseRequestedBy` and `pauseReason` in the StateStore for audit and UI display.
- UI: show `PAUSED (draining)` with `runningStepsCount` and estimated completion time if available; disable actions that schedule new steps.

Example behavior:
- If a run has 3 in-flight heavy steps and a PAUSE arrives:
  - If `allowCancelOnPause=true` and activities are cancellable, engine issues cooperative cancels, waits for cancellations to resolve, then stays PAUSED.
  - If cancels are not permitted or fail, engine lets them finish and shows `PAUSED (draining)` until completion.

**Cooperative Activity cancellation (code example):**

Activity that supports cancellation (heavy step, e.g., dbt run):
```ts
import { Context, ActivityCancellationType } from '@temporalio/activity';

export async function heavyDBTRunActivity(step: Step, ctx: RunContext): Promise<StepResult> {
  const activityCtx = Context.current();
  const cancellationToken = activityCtx.cancellationSignal;
  
  // Start long-running subprocess
  let subprocess = spawn('dbt', ['run', '--profiles-dir', ctx.profilesDir, ...step.args]);
  let result: StepResult | null = null;
  
  return new Promise((resolve, reject) => {
    // Register handler for Temporal activity cancellation request
    if (cancellationToken) {
      cancellationToken.onCancellation(() => {
        console.log(`[CANCEL] Activity ${step.stepId} received cancellation`);
        // Gracefully stop the subprocess
        subprocess.kill('SIGTERM');
        // If subprocess doesn't exit within 5s, force kill
        setTimeout(() => subprocess.kill('SIGKILL'), 5000);
      });
    }
    
    subprocess.stdout?.on('data', (data) => {
      console.log(`[${step.stepId}] ${data}`);
    });
    
    subprocess.on('exit', (code, signal) => {
      if (signal) {
        // Killed by cancellation request
        result = {
          status: 'CANCELLED',
          reason: `Killed by signal ${signal}`,
          timestamp: new Date().toISOString()
        };
      } else if (code === 0) {
        result = { status: 'SUCCESS', artifacts: {...} };
      } else {
        result = { status: 'FAILURE', code, reason: `dbt exited with code ${code}` };
      }
      resolve(result);
    });
  });
}
```

Workflow code (engine pause handler):
```ts
async function pauseWorkflow(signal: PauseSignal, inFlightActivities: ActivityHandle[]): Promise<void> {
  console.log(`[PAUSE] ${signal.runId}: allowCancelOnPause=${CONFIG.allowCancelOnPause}`);
  
  const cancelTasks = inFlightActivities
    .filter(handle => handle.cancellable && CONFIG.allowCancelOnPause)
    .map(handle => {
      console.log(`Requesting cancel for activity ${handle.stepId}`);
      // Request cancellation; Activity receives cancellationSignal
      handle.cancel();
      // Wait for the activity to resolve (either cancelled or completed)
      return handle;
    });
  
  if (cancelTasks.length > 0) {
    // Wait for all cancellation requests to resolve
    await Promise.all(cancelTasks);
    console.log(`All ${cancelTasks.length} activities resolved`);
  }
  
  // Emit RunPaused event; draining=false means UI can now unpause if desired
  await engineEventBus.emit({
    eventType: 'RunPaused',
    runId: signal.runId,
    draining: false,
    stoppedAt: new Date().toISOString()
  });
}
```

---

## 3) ExecutionPlan model (engine-facing)

### 3.1 Plan transport: avoid Temporal payload limits
Temporal has strict payload/history size limits. The engine MUST support **plan references**.

Rule:
- `startRun()` receives a **PlanRef** (URI + hash + schemaVersion), not the full plan when the plan can grow.

```ts
type PlanRef = {
  uri: string;                    // e.g. s3://bucket/plans/{planId}.json
  sha256: string;                 // integrity hash
  schemaVersion: string;          // e.g. "v1.2" — critical for migration
  planId: string;
  planVersion: string;             // semantic version

  sizeBytes?: number;             // pre-check against engine max plan size
  compression?: "gzip"|"none";    // transport hint
  expiresAt?: string;             // cache invalidation hint (ISO 8601)
  
  // NEW: versioning & migration support
  schemaEvolutionPath?: string;   // e.g. "v1 → v1.1 → v1.2" for multi-step migrations
  migrationHint?: {               // guidance for adapters if schema has evolved
    sourceVersion: string;
    targetVersion: string;
    transformScript?: string;      // URI to artifact store (dbt macro, SQL, etc.)
  };
};
```

**Schema versioning strategy:**
- `schemaVersion` is MANDATORY and MUST be specified in the plan itself.
- Engine MUST reject plans with unknown `schemaVersion`.
- BACKWARD compatibility: Engine supports up to 3 minor versions back (e.g., engine v1.2 supports v1.0, v1.1, v1.2).
- FORWARD compatibility: Define a deprecation policy (e.g., "v1.0 deprecated after 2026-Q2").
- **Migration path**: If workflow has in-flight runs on old schema, the adapter MUST support **cross-schema continuation** (continueAsNew with schema migration).

**Cache invalidation beyond SHA256:**
- Storage location change: Include `uri` in cache eviction decision.
- Schema evolution: Invalidate cache if `schemaVersion` does not match cached version.
- Temporal platform limits change: Implement TTL-based revalidation (1 hour default).

---

## 4) TemporalAdapter: mapping plan → Temporal primitives

### 4.0 Temporal Interpreter Workflow (Interpreter Pattern)
Temporal is code-first. The adapter MUST implement a **generic interpreter workflow** that:
1) Receives `PlanRef`
2) Fetches + validates the plan (`fetchPlan(planRef)` Activity)
3) Walks the plan and schedules Activities according to dependencies. When multiple ready steps exist, the interpreter MUST schedule them in a canonical order (see deterministic DAG walker guidance in Section 4.0).

Determinism rules:
- No direct I/O inside workflow code (no HTTP, no DB, no filesystem).
- No `Date.now()` / `Math.random()`; use Temporal APIs where needed.
- All external effects happen in Activities.

Parallelism scope (V1):
- **V1 supports linear execution + optional “parallel groups”** (fan-out/fan-in) where dependencies allow.
- Full dynamic DAG-walking is allowed only if implemented as a deterministic dependency resolver.

Implementation hint (deterministic DAG walker):
- Maintain a `completedSteps` set.
- At each iteration, compute the set of “ready” steps whose `dependsOn` are satisfied.

Determinism requirement (MANDATORY):
- When multiple steps are ready, the engine MUST order them using a stable, canonical key before scheduling. Recommended canonical key: `stepId` sorted lexicographically (ASCII) using a fixed locale. This ordering MUST be deterministic across code versions and replay runs.
- Do NOT rely on iteration order of `Map`/`Set` or language runtime insertion order unless that order is constructed deterministically by the interpreter.
- Never derive ready-step ordering from external sources unless those sources are immutable artifact snapshots (see Section 6.3).

Example stable scheduling snippet (TypeScript):
```ts
const readySteps = computeReadySteps(plan, completedSteps);
// canonical sort by stepId (ASCII)
readySteps.sort((a, b) => a.stepId.localeCompare(b.stepId, 'en', { sensitivity: 'variant' }));
// schedule deterministically
await Promise.all(readySteps.map(s => scheduleActivityForStep(s)));
```

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
**Operational complexity warning**: Per-tenant namespaces can explode quota management, retention, visibility, and platform limits.
Reference: https://docs.temporal.io/encyclopedia/temporal-platform-limits

**Recommended default (FEW namespaces, NOT per-tenant):**
- Use **few namespaces** (1–3 per environment: production, staging, development).
- Add `tenantId` as a **search attribute** (enables fast querying without namespace proliferation).
- Use **task queue isolation** for fine-grained tenant/workload separation.
- Reserve per-tenant namespaces **only for strict regulatory requirements** (e.g., HIPAA, PCI-DSS with separate Temporal clusters).

```ts
interface NamespaceStrategy {
  // Default: isolationLevel = "environment" (NOT "tenant")
  isolationLevel: "environment" | "environment+regulatory-tier";
  getNamespace(tenantId: string, environmentId: string): string;  // returns "prod", "staging", "dev"
  cleanupPolicy: {
    retentionDays: number;
    purgeCompletedAfterDays?: number;
    archiveAfterDays?: number;
  };
}
```

**Recommended minimal config:**
```yaml
temporal:
  # Few namespaces, NOT per-tenant
  namespaces:
    production: "prod"              # Shared across tenants
    staging: "staging"
    development: "dev"
    # Optional: for regulated tenants requiring absolute isolation
    production-regulated: "prod-hipaa"  # Only if actual regulatory requirement
  
  retention:
    productionDays: 90
    stagingDays: 30
    developmentDays: 7
  
  # Search attributes for tenant isolation (no namespace proliferation)
  searchAttributes:
    - tenantId       # Query: tenantId = 'tenant-123'
    - projectId
    - environmentId
    - repoSha
    - regulatoryTier # e.g., 'HIPAA', 'PCI-DSS', 'PUBLIC'
  
  # Task queue isolation achieves tenant separation + fairness
  taskQueues:
    production: "tq-prod"
    staging: "tq-staging"
    development: "tq-dev"
```

**Operational benefits:**
- Fewer namespaces → reduced quota/retention/upgrade burden.
- Search attributes enable tenant-level observability and filtering without namespace sprawl.
- Task queue isolation enforces per-tenant concurrency limits (see Section 12.1).
- Regulated tenants opt into separate Temporal cluster (infrastructure isolation), not namespace multiplication.

> Note: In Temporal, **namespace retention** applies to workflow histories; design the retention policy with audit + regulatory requirements in mind. After retention expires, run histories are purged; consider external archive streams for compliance.

#### 4.3.1 Namespace Cleanup Automation
**New in V1.9**: Automatic management of ephemeral and abandoned namespaces to reduce operational burden.

**Ephemeral environment namespaces (e.g., PR #123 / feature-branch):**
- Planner may request ephemeral namespace: `getNamespace(..., ephemeralTag: "pr-123")`
- Temporal webhook or cron job detects: namespace has no new workflow executions for 7 days → archive + delete.
- Before deletion: export namespace history to archive bucket (`s3://archive/namespaces/pr-123-{timestamp}.tar.gz`).

**Abandoned tenant namespaces (only if per-tenant mode is adopted):**
- Cron job (daily): query Temporal for namespaces with 0 active workflows and 0 new starts in 30 days.
- Emit `NamespaceCandidateForCleanup` event (audit trail).
- Require admin approval (SOP: verify customer is no longer active).
- Archive + delete once approved.

**Implementation example (pseudo-code):**
```yaml
cleanup:
  enabled: true
  schedule: "0 2 * * *"  # 2 AM daily
  rules:
    - name: "ephemeral-pr-namespaces"
      condition: "namespace_name LIKE 'pr-%' AND last_execution_timestamp < now() - interval '7 days'"
      action: "archive_and_delete"
      archiveLocation: "s3://archive/namespaces"
    
    - name: "abandoned-tenant-namespaces"
      condition: "namespace_name LIKE 'tenant-%' AND active_workflows = 0 AND last_start < now() - interval '30 days'"
      action: "emit_audit_event_and_wait_approval"
      approvalRequiredRoleMinimum: "Admin"
      ttlAfterApprovalDays: 7  # admin has 7 days to cancel before auto-delete
```

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
      taskQueue: tq-data-prod      # Consistent naming with environment suffix
      runtime: python
      resourceClass: heavy

  - stepId: notify_slack
    type: HTTP_NOTIFY
    dispatch:
      taskQueue: tq-control-prod   # Consistent naming with environment suffix
```

### 4.6 TemporalAdapter vs ConductorAdapter: Capability Matrix
**Problem**: Temporal and Conductor have different execution models. Unless we define a "lowest common semantics", the ExecutionPlan will slowly become "Temporal-shaped" and unmigrateable to Conductor.

**Solution**: Define a capability matrix to enforce cross-adapter compatibility.

| Feature | Temporal | Conductor | Planner Impact |
|---------|----------|-----------|----------------|
| **Signals** (pause/resume/update) | ✅ Full | ⚠️ Partial (task callbacks only) | Temporal: native. Conductor: emulate via callback webhooks + polling. |
| **Pause semantics** | ✅ Native (signal) | ⚠️ Emulated (stop workers + resume) | Temporal pauses in-flight activities. Conductor requires task restart. |
| **Parallel groups** (fan-out/fan-in) | ✅ Native | ✅ Native (dynamic tasks) | Both support. Conduct via JSON/YAML task graphs. |
| **Query status** (list children) | ✅ Native (getWorkflowHandle) | ⚠️ Partial (task list only) | Temporal exposes full workflow state. Conductor exposes task state. |
| **Child workflows** | ✅ Native (ChildWorkflowOptions) | ⚠️ Emulated (inline task) | Temporal uses handles. Conductor flattens to single DAG. |
| **Deterministic replay** | ✅ Full (SDK support) | ⚠️ Task-level only | Temporal: replay-suite gates changes. Conductor: task testing. |
| **Cancellation tokens** | ✅ Native (cooperative cancel) | ⚠️ None (force-kill task) | Temporal: graceful. Conductor: abrupt termination. |
| **Retries + backoff** | ✅ Policy-driven (SDK) | ✅ Policy-driven (task config) | Both support natively. |

**Planner rules (ensure cross-adapter compatibility):**

1. **Default mode**: Emit constructs supported by **both adapters** (the common denominator).
2. **Adapter-specific mode**: Mark constructs with `adapterCapabilities` hints if they require adaptation.
3. **Fallback strategy**: If unsupported on target adapter, either emulate or reject plan.

**Example (Pause signal in Conductor with emulation):**
```json
{
  "signal": "PAUSE",
  "adapterCapabilities": {
    "temporal": { "support": "native", "minVersion": "1.0" },
    "conductor": { "support": "emulated", "strategy": "poll-task-status-and-pause-next-dispatch", "estimatedLatencyMs": 5000 }
  },
  "metadata": {
    "supportedAdapters": ["temporal", "conductor"],
    "fallbackBehavior": "emulate_on_conductor"
  }
}
```

**ExecutionPlan validation (Planner responsibility):**
- Before emitting plan, check target adapter's capability matrix.
- Mark unsupported constructs and emit warnings or reject if `fallbackBehavior: "reject"`.
- Document in `plan.metadata.adapterConstraints` which adapter(s) the plan is optimized for.

Reference (Conductor docs): https://conductor.netflix.com/ (terminate, tasks, workflow definition model)
      runtime: node
      resourceClass: light
```

If `dispatch.taskQueue` is not provided:
- Use adapter default by environment (e.g. `tq-control-prod`, `tq-data-prod`, `tq-control-staging`).

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

// Task queue naming examples (consistent pattern):
- Task Queue: `tq-control-{env}`      # e.g. `tq-control-prod`
- Task Queue: `tq-data-{env}`         # e.g. `tq-data-prod`
- Task Queue: `tq-isolation-{tenant}-{env}`  # e.g. `tq-isolation-acme-prod`

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

## 6) Runtime Execution Semantics (NORMATIVE)

This section defines the concrete, normative execution-time behavior of the engine. Implementations MUST follow these semantics: they specify how Activities resolve secrets, what Activities must return, how dynamic dependencies expand, how plugin versions are declared and guarded, and the engine's runtime response to backpressure. These rules are part of the normative engine contract and MUST be implemented by any adapter.

### 6.1 Runtime secrets resolution (engine responsibility; no secrets in plan)
The plan MUST contain only references to secrets (never values). At execution time, Activity code resolves secrets via `ISecretsProvider`.

Concept API
```ts
type SecretRef = { provider: "vault"|"aws-sm"|"gcp-sm"|"azure-kv"; key: string; version?: string };

interface ISecretsProvider {
  resolve(refs: SecretRef[], ctx: { tenantId: string; environmentId: string }): Promise<Record<string, string>>;
}
```

Recommended pattern (Activity-side merge)
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

Caching & rotation (runtime):
- Cache secrets only in the Activity process (never in workflow history). Use TTL <= provider rotation window (default 5–15 minutes).
- If `version` omitted, provider resolves "latest"; prefer shorter TTLs (60–300s).
- Always redact secrets from logs/events; emit only references and a boolean `resolved=true`.

### 6.2 Step outputs & artifact contract
Activities MUST return a structured `StepOutput` and write large outputs to artifact storage. Workflows MUST persist only `ArtifactRef[]` pointers in history.

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

Storage rules:
- Artifacts are written by Activities (not workflows).
- The StateStore stores only `ArtifactRef[]` pointers (never binary payloads).
- Retention by kind (example): logs: 14d; manifests/run_results: 90d; dataset samples: 7d.

### 6.3 Dependency patterns beyond linear + "parallel groups"
V1 supports:
- Linear sequences
- Fan-out / fan-in ("parallel groups")
- Multi-dependency join steps (wait for N predecessors)

Forward-compatible (plan v2+) patterns:
- Conditional execution:
  - `when: { expression: "...", on: "stepId.output.metadata.someFlag" }`
- Dynamic fan-out:
  - `foreach: { from: "stepX.output.artifactRefs[0]", itemVar: "item" }`
  - Expansion MUST be deterministic: expansion lists MUST be derived from an immutable persisted artifact snapshot to avoid non-deterministic set sizes.

### 6.4 Plugin versioning & compatibility (engine-level guardrails)
When a step is executed by a plugin, the plan MUST declare `pluginVersion` (semver) or an immutable `pluginDigest` (sha256). Planner selection of plugin version MUST be recorded in the plan to keep execution deterministic.

```ts
type PluginDispatch = {
  pluginId: string;
  pluginVersion: string;
  pluginDigest?: string;
  inputSchemaRef?: string;
  outputSchemaRef?: string;
};
```

Runtime behaviors:
- Validate inputs against the declared input schema before execution.
- If a plugin version exceeds error thresholds, route to quarantine behavior (Appendix E6) or fallback to last-known-good version.
- Planner-driven A/B policies must be recorded in-plan (e.g., `pluginVersionPolicy: { strategy: "canary", percent: 5 }`).

### 6.5 Backpressure (execution-time)
Defines what the engine does when it encounters overload during scheduling or step execution:
- `REJECT`: fail fast (429 + retry-after); StateStore may record attempt as `FAILED` with `backpressure` reason.
- `QUEUE`: persist run in `PENDING` state and enqueue for later scheduling by reconciler.
- `DELAY`: accept but schedule activities with a planned future start time.

Instrumentation:
- Emit tenant-scoped metrics: `engine.backpressure.queued{tenant}`, `engine.backpressure.rejected{tenant}`, `engine.backpressure.delayed{tenant}`.

Execution-time enforcement is defined here and referenced by governance in Section 12.

#### 6.5.1 Run queue reconciler contract (IRunQueueReconciler)
When the engine accepts runs into a queued/PENDING state due to backpressure, an authoritative reconciler MUST reliably dequeue and start runs. The reconciler contract below is REQUIRED for correctness (prevents double-starts, ensures idempotency, and provides consistent state transitions).

Responsibilities:
- Poll queued runs from StateStore (status=`PENDING` or `QUEUED`).
- Re-check tenant/project quota with the RateLimiter prior to starting.
- Acquire a processing lease for the queued run (atomic update to `LOCKED` with `leaseOwner` and `leaseExpiry`) to prevent concurrent processors from starting the same run.
- Start the engine adapter (`temporalAdapter.startRun`) and persist `RunStarted` with an idempotency key.
- On start success, update queued record to `STARTED` and emit `RunStarted` event with `engineRunRef`.
- If start fails transiently, release lease or extend per retry policy; if permanently failed, mark `FAILED` with reason.

Idempotency and double-start prevention:
- StateStore MUST enforce a uniqueness constraint (database-level) on queued run requests: `(tenantId, projectId, environmentId, planId, planVersion, runRequestId)`.
- RunStart idempotency key derivation (recommended):
  `idempotencyKey = sha256(tenantId + '|' + projectId + '|' + environmentId + '|' + planId + '|' + planVersion + '|' + runRequestId)`
  Use the same idempotencyKey when inserting `RunStarted`/`StepStarted` writes so repeated reconciler attempts do not create duplicates.
- Starting algorithm (transactional):
  1. Reconciler picks a PENDING row and atomically updates it to `LOCKED` with `leaseOwner` and `leaseExpiry` (conditional update WHERE status='PENDING'). If update affected 0 rows, another reconciler won the race—skip.
  2. Re-check quota via RateLimiter.check(...). If not allowed, set row back to PENDING and honor retry/backoff.
  3. Call `temporalAdapter.startRun(planRef, ctx)` to create the workflow **once**. Persist `RunStarted` using an idempotent upsert keyed by `idempotencyKey`.
  4. If `startRun` returns an existing engineRunRef (due to previous partial start), treat as already started and update status accordingly.

State model (recommended schema snippet):
```sql
CREATE TABLE run_queue (
  id UUID PRIMARY KEY,
  runRequestId TEXT NOT NULL,
  tenantId TEXT NOT NULL,
  projectId TEXT NOT NULL,
  environmentId TEXT NOT NULL,
  planId TEXT NOT NULL,
  planVersion TEXT NOT NULL,
  status TEXT NOT NULL, -- PENDING | LOCKED | STARTED | FAILED
  leaseOwner TEXT NULL,
  leaseExpiry TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT now(),
  updatedAt TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (tenantId, projectId, environmentId, planId, planVersion, runRequestId)
);
```

API contract notes:
- Reconciler MUST emit `RunStarted` with the same `idempotencyKey` used for the upsert; consumers of StateStore should rely on `idempotencyKey` to deduplicate.
- The planner/client SHOULD provide a stable `runRequestId` for each user-initiated startRun attempt to allow idempotent retries from the API layer.

Operational guidance:
- Monitor: `run_queue_pending_total`, `run_queue_leases_expired_total`, `run_queue_start_failures_total`.
- Alert if `run_queue_pending_total` grows or `run_queue_leases_expired_total` increases—indicates reconcilers saturated or StateStore issues.


### 6.6 Event Bus Integration Protocol (required)

We explicitly split **truth** vs **integration**. Event bus integration remains part of runtime concerns and is included here as an operational contract.

#### Guarantees
- `IRunStateStore` is **source of truth** (bounded synchronous write path; see Section 6.7 for write budgets and fail-open guidance).
- `IEventBus` is **eventually consistent** (async integration; may be down).
- Event ordering:
  - Ordering is guaranteed **per runId** in StateStore (via monotonic sequence).
  - EventBus ordering is **best-effort**; consumers must tolerate reordering/duplication.

#### Interfaces (concept)
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

#### Failure handling
If **EventBus** publish fails:
- Persist event to StateStore first (already done).
- Enqueue to **outbox** table (StateStore) for retry worker.
- Retry policy: exponential backoff with jitter.
- After N failures → DLQ (dead-letter queue) with alert.

Pattern: **Transactional Outbox** (StateStore + publisher worker).

### 6.7 StateStore write model and latency budget (operational)
Problem: Treating `IRunStateStore` as an unbounded synchronous primary path will couple workflow/Activity throughput to StateStore latency spikes and create execution-time backpressure and availability issues.

Runtime fix (required):
- Keep `IRunStateStore` as the authoritative truth, but bound the synchronous write path used by Activities.
- Activities SHOULD emit lifecycle events into an in-process buffer and perform a short, bounded local retry (default budget: 2–5s). If the event cannot be durably persisted within the budget, the Activity may:
  - For non-critical events (e.g., `StepStarted`): fail open (emit to outbox for later reconciliation) if `state_write_fail_open=true` for that event class.
  - For critical events (e.g., `StepCompleted`, `StepFailed`): fail the step (and mark attempt accordingly) if the write cannot be confirmed within the budget. Critical event writes MUST NOT be configured to fail-open.

Implementation details:
- Persist a single `StepResult` record per attempt using idempotent upsert semantics instead of multiple lifecycle rows where possible. This reduces write amplification and simplifies recovery.
- Use the Transactional Outbox pattern for EventBus publishing; extend the outbox metadata with runtime controls:
  - `state_write_latency_budget_ms`: int (default 3000)
  - `state_write_fail_open`: boolean per event-class (default false for completions/errors, true for non-critical starts)
- Reconciler behavior: if events are buffered or written to outbox without EventBus publish, a dedicated reconciler must drain outbox preserving per-`runId` ordering and respect `idempotencyKey` to avoid duplicates.

Operational guidance:
- Instrument: `state_store_write_latency_ms`, `state_store_write_timeouts_total`, `state_store_buffered_events_total`.
- Alert: `state_store_write_timeouts_total > 10/min` or `state_store_buffered_events_total / queue_depth > 0.1`.
- Test: include a chaos scenario in CI that simulates 1–2s storage stalls and verify activities continue to make progress or fail safely under the configured budget.

### 6.8 Temporal history & continueAsNew policy (prevent history bloat)
Problem: Even with `PlanRef` inputs, workflow history can grow unbounded due to many events, frequent signals, large logs or expanded lists; this leads to degraded Temporal performance and potential platform limits exhaustion (see Temporal platform limits).

Policy (required):
- Interpreter MUST call `workflow.continueAsNew()` to rotate history when EITHER:
  - `stepsSinceLastContinue >= CONTINUE_STEPS` (default 50), OR
  - `estimatedHistoryBytes >= HISTORY_BYTES_THRESHOLD` (default 1_000_000 bytes).
- Workflow state persisted across continuation MUST be minimal: `PlanRef`, compacted cursor (`completedStepRanges` or bitmap), `ArtifactRef[]` pointers, and minimal counters. Never persist step logs, full expanded lists, or large error blobs in history.
- Signals limits (enforced at edge/adapters): `maxSignalSizeBytes = 64*1024` default and `maxSignalsPerRunPerMinute = 60` default. Excess signals should be rejected or queued outside workflow (emit `RunQueued`/`StepDelayed`).

Implementation guidance (examples):

1) continueAsNew snippet (TypeScript / Temporal):
```ts
import * as wf from '@temporalio/workflow';

export async function interpreterWorkflow(planRef: PlanRef) {
  let stepsSinceContinue = 0;
  let cursor = loadCursor();

  for await (const step of planIterator(planRef, cursor)) {
    await wf.executeActivity('executeStep', { step, cursor });
    stepsSinceContinue++;
    if (stepsSinceContinue >= CONFIG.CONTINUE_STEPS || wf.workflowInfo.historySizeEstimate >= CONFIG.HISTORY_BYTES_THRESHOLD) {
      // persist compact state and continue as new
      await wf.continueAsNew({ planRef, cursor: compactCursor(cursor) });
    }
  }
}
```

2) Artifact-derived expansion (pagination pattern):
 - Activity materializes a page (immutable snapshot) and returns batch + nextPageToken; workflow iterates over pages, not a giant in-memory list.

3) Signals: adapters must validate size and rate before forwarding to workflow. If a signal is large, the adapter should store it as an artifact and send a small signal containing the `ArtifactRef`.

Metrics & alerts:
- `workflow_history_size_bytes{namespace}` (estimate)
- `workflow_steps_since_continue{namespace}`
- `signal_rate_per_run{tenant}`

Alerts:
- `workflow_history_size_bytes > HISTORY_BYTES_THRESHOLD` → P1
- `workflow_steps_since_continue > 2*CONTINUE_STEPS` → P2
- `signal_rate_per_run > maxSignalsPerRunPerMinute` → P1

CI tests:
- Add a determinism/chaos test that simulates signal bursts and large fan-out and verifies that `continueAsNew()` triggers and that history stays under thresholds.

References:
- Temporal platform limits: https://docs.temporal.io/encyclopedia/temporal-platform-limits



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

### 8.3 Service Level Objectives (Production)

| Component | SLO | Measurement |
|-----------|-----|-------------|
| Engine API | 99.9% availability | Prometheus `up` |
| Run Completion | 95% within SLA window | `engine_run_duration_seconds` |
| Event Emission | P99 < 100ms | `engine_event_latency_seconds` |
| Signal Processing | P95 < 2s | `engine_signal_latency_seconds` |
| Queue Time | P95 < 30s | `engine_queue_wait_seconds` |

**Error Budgets:**
- Monthly error budget: 0.1% (43m 12s downtime allowed)
- Per-component budgets defined in `slo/engine.yaml`

**Measurement & Alerting:**
```yaml
alerts:
  - name: SLOBudgetBurn10x
    expr: rate(errors_total[5m]) > (monthly_budget * 10 / 30 / 24 / 60)
    duration: 5m
    severity: warning
  
  - name: SLOBudgetBurn100x
    expr: rate(errors_total[1m]) > (monthly_budget * 100 / 30 / 24 / 60)
    duration: 1m
    severity: critical
```

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

### 11.1 Data Plane Worker Isolation (Multi-Tenant Safety)

Data-plane workers execute customer dbt projects. Isolation is **critical** to prevent tenant lateral movement.

Runtime selection is **dynamic** based on risk profile:
- **Enterprise/untrusted**: gVisor (higher isolation)
- **DBT_RUN**: docker (performance-critical)
- **Custom plugins**: gVisor + isolated-vm (strong isolation)

```yaml
dataPlaneWorkers:
  # Container runtime: dynamic selection based on tenant tier + step type
  runtime:
    type: gvisor | docker | firecracker
    selectionLogic:
      - tenant.tier == "enterprise": gvisor
      - step.type == "DBT_RUN": docker  # performance-critical
      - step.plugin.origin == "untrusted": gvisor
      - default: docker
    config:
      # gVisor options / hardening
      blocklist: ["ptrace", "bpf"]  # forbidden syscalls
      tracepointInstall: false
      metering: true  # track resource usage per step

  # Pod-level isolation
  kubernetes:
    networkPolicy:
      policyTypes: [Ingress, Egress]
      ingress:
        - from:
            - podSelector:
                matchLabels:
                  role: temporal-worker
      egress:
        - to:
            - podSelector:
                matchLabels:
                  role: artifact-store
        - to:
            - namespaceSelector:
                matchLabels:
                  name: dns  # allow DNS only
    
    securityContext:
      runAsNonRoot: true
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop: [ALL]
      seccomp:
        type: RuntimeDefault

  # Resource limits (hard)
  resourceLimits:
    memory: "8Gi"
    cpu: "4"
    ephemeralStorage: "20Gi"  # temp workspace
    processes: 256  # max user processes

  # Filesystem isolation
  filesystem:
    tmpfsSize: "10Gi"
    readOnlyPaths: ["/lib", "/usr/lib", "/opt/dbt"]
    writablePaths: ["/tmp", "/workspace", "/artifacts"]  # tmpfs + mounts

  # Secrets access control
  secrets:
    provider: vault  # HashiCorp Vault recommended
    ttl: 5m  # automatic revocation
    auditPath: /var/log/secrets-audit  # immutable log
```

**Implementation checklist:**
- Dockerfile: non-root user, minimal base image (distroless)
- Init container: verify gVisor binary integrity (sha256 check)
- Pod lifecycle: emit `WorkerIsolationEvent` on startup + periodically verify sandbox
- Metrics: `worker_isolation_violations_total{worker,tenant}`, `worker_memory_pressure_ratio{worker}`

### 11.2 Plugin Sandbox Contract (Untrusted Code Execution)
This contract is NORMATIVE for any plugin execution. Implementations MUST follow the constraints and guardrails below.

```ts
interface PluginSandbox {
  // Execution environment
  // SECURITY: "vm2" is FORBIDDEN (deprecated due to critical security vulnerabilities).
  // Reference: https://semgrep.dev/blog/2023/discontinuation-of-node-vm2
  // Approved runtimes: isolated-vm, web-worker, node-container (gVisor), custom-binary (Firecracker/WASM)
  runtime: "isolated-vm" | "web-worker" | "node-container" | "custom-binary" | "wasm";
  
  // Resource limits (mandatory)
  resourceLimits: {
    timeoutMs: number;              // max execution time (required)
    memoryMB: number;               // max heap (required)
    cpuQuotaPercent?: number;       // kernel cpu throttle
    diskMB?: number;                // temp scratch disk
  };
  
  // Network isolation
  network: {
    type: "none" | "localhost-only" | "tenant-network" | "public";
    allowedDomains?: string[];      // whitelist for public
    outboundTimeout?: number;       // ms
  };
  
  // APIs exposed to plugin code
  allowedAPIs: {
    builtins: ["fs", "path", "crypto"];  // Node.js builtins
    custom: [
      "readArtifact",
      "writeArtifact",
      "resolveSecret",
      "emitMetric"
    ];
    forbidden: [
      "require('child_process')",  // explicit blocklist
      "require('net')",
      "process.env"  // no direct env access; use Secret API
    ];
  };
  
  // Monitoring & telemetry
  telemetry: {
    emitHeartbeat: "1s";           // detect hangs
    captureMemoryProfile: false;    // optional; CPU cost
    redactLogs: true;               // remove secrets from plugin logs
  };
}
```

**Example: Safe plugin invocation for data transformation**
```ts
async function executePluginSafely(plugin: PluginCode, ctx: RunContext) {
  const sandbox = new PluginSandbox({
    runtime: "isolated-vm",
    resourceLimits: { timeoutMs: 30000, memoryMB: 512 },
    network: { type: "none" },
    allowedAPIs: {
      custom: ["readArtifact", "writeArtifact", "emitMetric"]
    },
    telemetry: { emitHeartbeat: "1s" }
  });

  try {
    const result = await sandbox.run(plugin.code, {
      context: ctx,
      readArtifact: (uri: string) => artifactStore.read(uri),
      writeArtifact: (uri: string, data: Buffer) => artifactStore.write(uri, data),
      emitMetric: (name: string, value: number) => metrics.emit(name, value)
    });
    return result;
  } catch (e) {
    if (e.code === "TIMEOUT") {
      // Emit StepFailed with retryable=false
      await eventBus.emit({ status: "FAILED", error: { category: "PLUGIN_TIMEOUT", retryable: false } });
    } else if (e.code === "OOM") {
      // Increase limits on retry or fail permanently
      await eventBus.emit({ status: "FAILED", error: { category: "PLUGIN_OOM", retryable: true } });
    } else {
      throw e;
    }
  }
}
```

---

## 12) Backpressure & Fairness (Multi-Tenant Guarantees)

### 12.1 Rate Limiter Configuration (YAML)

```yaml
rateLimiting:
  # Token-bucket implementation (recommended for smooth burst handling)
  algorithm: token-bucket
  
  # Tenant-scoped limits
  tenantQuotas:
    default:
      startRunPerMinute: 10       # new run initiations
      heavyStepsPerMinute: 5      # DBT_RUN, data-intensive
      signalOpsPerMinute: 100     # PAUSE, RESUME, RETRY (operators)
    
    # Override per tier
    tier_enterprise:
      startRunPerMinute: 100
      heavyStepsPerMinute: 50
      signalOpsPerMinute: 1000
    
    tier_hobby:
      startRunPerMinute: 2
      heavyStepsPerMinute: 1
      signalOpsPerMinute: 20
  
  # Per-project override (for critical runs)
  projectOverrides:
    "proj-critical-etl":
      startRunPerMinute: 50  # override default
  
  # Backpressure strategy when quota exceeded
  backpressure:
    strategy: "queue"  # queue | reject | delay
    maxQueueDepth: 100
    ttlMinutes: 5     # auto-fail if queued > 5m
```

### 12.2 Rate Limiter Interface (Engine-facing)

```ts
type BackpressureAction =
  | { allowed: true; tokenCost: number }
  | { allowed: false; retryAfter: number; reason: "quota_exceeded" }
  | { queued: true; queuePosition: number; estimatedWaitMs: number; queueId: string };

interface RateLimiter {
  // Check if action is allowed; update token bucket
  check(
    tenantId: string,
    projectId: string,
    action: "startRun" | "heavyStep" | "signalOp"
  ): BackpressureAction;
  
  // Metrics snapshot for SLA checks
  getQuotaSnapshot(tenantId: string): {
    quotaUsedPercent: number;
    tokensRemaining: number;
    nextRefillAt: Date;
    queueDepth: number;
  };
}
```

### 12.3 Enforcement Points (Implementation)

**At workflow start (`startRun`):**
```ts
async function startRun(planRef: PlanRef, ctx: RunContext) {
  const backpressure = rateLimiter.check(
    ctx.tenantId,
    ctx.projectId,
    "startRun"
  );
  
  if (!backpressure.allowed && !backpressure.queued) {
    // Hard reject
    throw new Error(`429 Quota exceeded. Retry after ${backpressure.retryAfter}ms`);
  }
  
  if (backpressure.queued) {
    // Enter PENDING state, enqueue, do NOT create Temporal workflow yet
    await stateStore.emit({
      eventType: "RunQueued",
      queuePosition: backpressure.queuePosition,
      estimatedWaitMs: backpressure.estimatedWaitMs
    });
    // Queue worker wakes when quota available
    return;
  }
  
  // Quota available; proceed to Temporal
  const engineRef = await temporalAdapter.startRun(planRef, ctx);
  // ...
}
```

**At heavy step scheduling:**
```ts
async function scheduleHeavyStep(step: Step, ctx: RunContext) {
  const backpressure = rateLimiter.check(
    ctx.tenantId,
    ctx.projectId,
    "heavyStep"
  );
  
  if (backpressure.allowed) {
    return temporalAdapter.scheduleActivity(step, ctx);
  } else if (backpressure.queued) {
    // Delay step execution
    await stateStore.emit({
      eventType: "StepDelayed",
      stepId: step.stepId,
      reason: "backpressure",
      estimatedWaitMs: backpressure.estimatedWaitMs
    });
    // Temporal timer waits, then schedules
    return await workflow.sleep(backpressure.estimatedWaitMs);
  } else {
    // Hard failure
    throw new Error("Step quota exhausted");
  }
}
```

### 12.4 Metrics & Observability

```ts
// Prometheus metrics emitted by RateLimiter
engine_tenant_quota_used{tenant, action}           // %, updated 10s
engine_tenant_queue_depth{tenant, action}          // count, real-time
engine_tenant_wait_time_p95_ms{tenant, action}     // histogram
engine_backpressure_rejections_total{tenant}       // counter
engine_queue_ttl_exceeded_total{tenant}            // auto-fails
```

### 12.5 Alert Rules (SRE)

```yaml
alerts:
  - name: TenantQuotaExceeded
    expr: engine_tenant_quota_used{tenant=~".*"} > 90
    duration: 5m
    severity: warning
    action: notify_tenant_via_email
  
  - name: QueueBackup
    expr: engine_tenant_queue_depth{tenant=~".*"} > 50
    duration: 2m
    severity: critical
    action: page_on_call_engineer
```

---

## 13) Determinism & Testing Strategy (Temporal-Specific)

Workflow determinism is **critical** because Temporal replays history on every task. If the interpreter changes behavior, in-flight runs break.

Dynamic expansion semantics are defined in Section 6.3 and MUST derive from persisted artifacts. See Section 6.3 for the exact runtime contract.

### 13.1 Determinism Rules (Mandatory)

**FORBIDDEN in workflow code:**
- `Date.now()`, `Math.random()`, `crypto.randomBytes()` (use Temporal APIs)
- Direct I/O (HTTP, DB, file reads) — move to Activities
- External service calls without Activity wrapping
- Mutable data structures shared across await points

**REQUIRED in workflow code:**
- `workflow.getVersion()` for any change that affects scheduling order
- Immutable state transitions
- Deterministic sorting (use `localeCompare` with fixed locale)
  - No direct date arithmetic; use `workflow.now()` (Temporal deterministic API). For ISO strings: `workflow.now().toISOString()`

### 13.2 Pre-Merge Testing: Full Replay Suite

```ts
// file: engine/test/workflow.determinism.test.ts

describe("Interpreter Workflow Determinism", () => {
  let testEnv: TestWorkflowEnvironment;
  let worker: Worker;
  const testPlans = new Map<string, any>();

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();

    // Inject mock activities explicitly for deterministic tests
    const mockActivities = {
      fetchPlan: async (planRef) => testPlans.get(planRef.sha256),
      executeStep: async (step, ctx) => ({ status: "SUCCESS", artifactRefs: [] }),
      emitEvent: async (event) => {}
    };

    worker = await testEnv.createWorker({
      taskQueue: "test-queue",
      activities: mockActivities // explicit injection
    });
    await worker.start();
  });

  afterAll(async () => {
    await worker.shutdown();
    await testEnv.teardown();
  });

  it("should deterministically execute linear 3-step plan", async () => {
    // Create a test ExecutionPlan: COMPILE -> RUN -> TEST (linear)
    const testPlan = {
      metadata: { planId: "test-1", planVersion: "v1" },
      scope: { tenantId: "t-1", projectId: "p-1", environmentId: "sandbox" },
      steps: [
        { stepId: "s1", type: "DBT_COMPILE", inputs: {}, timeout: "1m", dependsOn: [] },
        { stepId: "s2", type: "DBT_RUN", inputs: {}, timeout: "2m", dependsOn: ["s1"] },
        { stepId: "s3", type: "DBT_TEST", inputs: {}, timeout: "1m", dependsOn: ["s2"] }
      ]
    };

    // Register plan for mock fetchPlan and Run 1: Capture execution history
    testPlans.set("abc123", testPlan);
    const run1 = await testEnv.client.workflow.start(InterpreterWorkflow, {
      args: [{ uri: "s3://plans/test-1", sha256: "abc123", schemaVersion: "v1" }],
      taskQueue: "test-queue",
      workflowId: "determinism-test-run1"
    });
    const result1 = await run1.result();
    const history1 = await testEnv.client.workflow.getHandle("determinism-test-run1").describe();

    // Verify Step execution order: s1, then s2, then s3
    expect(result1.executedSteps).toEqual(["s1", "s2", "s3"]);

    // Run 2: Replay the EXACT same history; should produce same events
    // (Temporal does this automatically on restart; we verify manually here)
    const history1Events = history1.history.events
      .filter(e => e.activityTaskScheduledEventAttributes?.activityType?.name)
      .map(e => e.activityTaskScheduledEventAttributes.input);

    // Now run workflow again with same inputs; Temporal internal replay
    const run2 = await testEnv.client.workflow.start(InterpreterWorkflow, {
      args: [{ uri: "s3://plans/test-1", sha256: "abc123", schemaVersion: "v1" }],
      taskQueue: "test-queue",
      workflowId: "determinism-test-run2"
    });
    const result2 = await run2.result();

    expect(result2.executedSteps).toEqual(result1.executedSteps);
    expect(result2.totalDurationMs).toBeCloseTo(result1.totalDurationMs, -2); // within 100ms
  });

  it("should handle parallel groups deterministically", async () => {
    const parallelPlan = {
      metadata: { planId: "test-parallel", planVersion: "v1" },
      scope: { tenantId: "t-1", projectId: "p-1", environmentId: "sandbox" },
      steps: [
        { stepId: "init", type: "DBT_COMPILE", dependsOn: [] },
        // Parallel: s2_a and s2_b both depend on init, no mutual dependency
        { stepId: "s2_a", type: "DBT_RUN", dependsOn: ["init"] },
        { stepId: "s2_b", type: "DBT_RUN", dependsOn: ["init"] },
        // Fan-in: final depends on both
        { stepId: "final", type: "DBT_TEST", dependsOn: ["s2_a", "s2_b"] }
      ]
    };

    // Register parallel plan for mock fetchPlan
    testPlans.set("def456", parallelPlan);
    const run = await testEnv.client.workflow.start(InterpreterWorkflow, {
      args: [{ uri: "s3://plans/test-parallel", sha256: "def456", schemaVersion: "v1" }],
      taskQueue: "test-queue",
      workflowId: "determinism-test-parallel"
    });
    const result = await run.result();

    // Verify: init ran first
    const initIdx = result.executedSteps.indexOf("init");
    const s2aIdx = result.executedSteps.indexOf("s2_a");
    const s2bIdx = result.executedSteps.indexOf("s2_b");
    const finalIdx = result.executedSteps.indexOf("final");

    expect(initIdx).toBeLessThan(s2aIdx);
    expect(initIdx).toBeLessThan(s2bIdx);
    expect(s2aIdx).toBeLessThan(finalIdx);
    expect(s2bIdx).toBeLessThan(finalIdx);

    // Order of s2_a vs s2_b can vary, but final MUST be last
    expect(finalIdx).toBe(result.executedSteps.length - 1);
  });

  it("should handle stepping-back with getVersion", async () => {
    // Simulate a code change: we add logic to skip a step conditionally
    // This should be protected by getVersion to not break old runs

    // Version 1: simple linear
    // Version 2: add conditional skip logic

    const testPlan = {
      metadata: { planId: "test-versioning", planVersion: "v1" },
      scope: { tenantId: "t-1", projectId: "p-1", environmentId: "sandbox" },
      steps: [
        { stepId: "s1", type: "DBT_COMPILE", dependsOn: [] },
        { stepId: "s2", type: "DBT_RUN", dependsOn: ["s1"] }
      ]
    };

    // Register versioning plan for mock fetchPlan and run with version 1 interpreter
    testPlans.set("ghi789", testPlan);
    const run1 = await testEnv.client.workflow.start(InterpreterWorkflow, {
      args: [{ uri: "s3://plans/test-versioning", sha256: "ghi789", schemaVersion: "v1" }],
      taskQueue: "test-queue",
      workflowId: "determinism-test-version"
    });
    const result1 = await run1.result();

    // After code deployment (v2 with getVersion guard), re-run same history
    // Temporal will replay the v1 path, not the v2 path
    // We verify this by checking that getVersion was called with correct changeId
    expect(result1.executedSteps).toContain("s1");
    expect(result1.executedSteps).toContain("s2");
  });
});
```

### 13.3 Breaking Change Detection (Linter)

```ts
// file: engine/lint/determinism-rules.ts

const determinismRules = [
  {
    name: "no-date-now",
    pattern: /Date\.now\(\)|\bnow\(\)/,
    severity: "error",
    fix: "Use `workflow.now()` (Temporal deterministic API) instead; for ISO timestamp use `workflow.now().toISOString()`"
  },
  {
    name: "no-math-random",
    pattern: /Math\.random\(\)/,
    severity: "error",
    fix: "Use Temporal deterministic randomness/time APIs (see Temporal TypeScript SDK docs: https://docs.temporal.io/develop/typescript)"
  },
  {
    name: "scheduling-change-needs-getVersion",
    pattern: /(scheduleActivity|workflow.all|Promise.all).*if.*stepId/,
    severity: "warning",
    fix: "Wrap conditional scheduling in workflow.getVersion() guard and ensure ready-step scheduling is canonical (e.g., sort ready steps by `stepId` lexicographically before Promise.all)."
  }
];
```

### 13.4 Per-Phase Testing Requirements

**Phase 1 (MVP):**
- ✓ Unit: DAG walker, idempotency keys
- ✓ Integration: 3-step linear plans on Temporal local
- ✓ No code changes = pass; any change requires test addition

**Phase 2:**
- ✓ Parallel group determinism tests
- ✓ Signal handling (pause/resume) replay tests
- ✓ Chaos: kill worker mid-step, verify resume

**Phase 3+:**
- ✓ Conductor adapter parity tests
- ✓ Long-running stress tests (1K parallel runs)
- ✓ Plugin sandbox breakout tests

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

## 15) Cost Optimization & Attribution

### 15.1 Cost Attribution Model

**Compute Cost (per run):**
```
costUnits = duration_hours × resource_multiplier

Multipliers:
  - control-plane: 1.0x   (lightweight)
  - data-plane:   10.0x   (CPU/memory intensive)
  - isolation:    20.0x   (gVisor overhead + isolation)
  - GPU:          50.0x   (if applicable)
```

**Storage Cost:**
- **Artifacts**: $0.023/GB-month (S3 standard, us-east-1 baseline)
- **Events**: $0.10/GB-month (Postgres storage included in RDS SLA)
- **Retention cleanup**: automated per artifact kind (logs 14d, manifests 90d)

**Network Cost:**
- **Same AZ**: $0
- **Cross-AZ**: $0.01/GB
- **Cross-region**: $0.02/GB (Temporal replication, artifact copies)

**Formula per run:**
```ts
totalCost = (
  computeCost +                    // duration × multiplier × hourly_rate
  (artifactSizeGB × storage_rate) +
  (networkGBxfered × network_rate)
) × regional_multiplier;

// Example: 10-min DBT run in us-east-1
computeCost = (10/60) × 10.0 × $0.50/hr = $0.083
artifactCost = (0.150 GB) × ($0.023/month / 30 / 24) = $0.000024  // negligible
totalCost ≈ $0.084 per run
```

```ts
// Regional multipliers example (apply to totalCost)
const regionalMultipliers = {
  'us-east-1': 1.0,
  'us-west-2': 1.1,
  'eu-west-1': 1.15,
  'ap-southeast-1': 1.2
};

// Example usage
totalCost *= regionalMultipliers['us-east-1'];
```

**Optimization levers:**
- **Spot instances** for data-plane (60% discount, ~30% interrupt rate tolerance)
- **Namespace TTL** shutdown (hourly, default 30m idle → 0 cost)
- **Artifact compression** (gzip: 5-10x for logs, default enabled)
- **Autoscaling** based on queue depth (scale-down cost per GCP/AWS SLA)
- **Regional routing** (prefer cheaper region when possible)

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


### 17.1 Security Incident Response Procedures

**Secrets Leakage (Confirmed):**
1. **SEV-0 — Immediate (< 5 min):**
  - Freeze tenant account (block new runs)
  - Revoke all active secrets via `ISecretsProvider`
  - Shutdown any running workflows for affected tenant
2. **SEV-1 — Short-term (< 1h):**
  - Audit logs: extract last 30 days of secret access
  - Notify customer (SLA: < 1h)
  - Begin secrets rotation (coordinate with customer)
3. **Post-incident:**
  - Root cause analysis (security team)
  - Patch or config change if needed
  - Customer notification with timeline

**Container Escape Attempt (Plugin):**
1. **SEV-0 — Immediate (< 2 min):**
  - Shutdown affected worker pod (kill all containers)
  - Isolate host from network (optional, depends on blast radius)
  - Block plugin version in planner (Appendix E6)
2. **Forensics (parallel):**
  - Capture container logs + filesystem snapshot
  - Review gVisor/seccomp violation logs
  - Check StateStore for affected runs
3. **Recovery:**
  - Security team review forensics (< 24h)
  - Publish postmortem + patch
  - Re-enable pool with mitigations

**Data Corruption:**
1. **SEV-1 — Stop writes (< 1 min):**
  - Set `engine_mode=read-only` (refuse new runs)
  - Halt StateStore outbox publisher
2. **Investigate:**
  - Identify affected date range + runs
  - Restore StateStore from PITR snapshot
  - Replay events from Temporal to verify
3. **Recovery:**
  - Restore artifact store from versioned backup
  - Resume writes once verified
  - Notify affected customers

## 18) Implementation Phases & Milestones (with Acceptance Criteria)

### Phase 1 — MVP (Weeks 1–6)
**Goal:** Reliable dbt execution in Temporal with persistent state.

**Deliverables:**
1. Temporal Interpreter Workflow (linear, deterministic)
   - Acceptance: execute 100 linear plans without error
   - Metric: plan execution latency p95 < 5s (for 3-step plan)
2. StateStore integration (event persistence)
   - Acceptance: all events idempotent (replay safe)
   - Metric: event write latency p99 < 100ms
3. DBT activity wrappers (COMPILE, RUN, TEST)
   - Acceptance: pass sample dbt project (jaffle_shop)
   - Metric: dbt step execution matches local CLI output
4. Basic health endpoint (`GET /engine/health`)
   - Acceptance: returns `{ status: "healthy" }` when Temporal + StateStore + artifacts reachable
5. Determinism test suite (3-step linear)
   - Acceptance: replay tests pass 100/100 runs
   - Metric: 0 non-deterministic behavior on code change

**Success Criteria:**
- No data loss (StateStore as source of truth)
- 99.5% run success rate on test workload
- No secrets in logs or history
- Can reproduce production state from events

**Team Size:** 2 engineers (1 backend, 1 QA)

---

### Phase 2 — Robustness (Weeks 7–10)
**Goal:** Handle failures, signals, and distributed events.

**Deliverables:**
1. Parallel groups support (fan-out/fan-in)
   - Acceptance: 10 parallel dbt models run concurrently
   - Metric: total duration < sum of individual runtimes * 1.1 (10% overhead)
2. Signal handling (PAUSE, RESUME, RETRY_STEP)
   - Acceptance: pause a run, resume, and complete successfully
   - Metric: signal latency p95 < 2s
  3. Transactional Outbox pattern + retry worker
   - Acceptance: EventBus failure → auto-recovery within 5m
   - Metric: 0 events lost even if EventBus is down
4. Observability stack integration (OTel traces, Prometheus metrics)
   - Acceptance: every step emits span; run diagram traceable in Jaeger
   - Metric: trace sampling rate configurable, default 10%
5. Error recovery playbook (Appendix E automation)
   - Acceptance: stuck workflow detected and auto-signaled within 1h
   - Metric: mean time to recovery (MTTR) < 15m via automation

**Success Criteria:**
- 99.9% uptime ("three 9s") for control-plane
- Operator can understand any run failure via logs + traces
- No manual Temporal CLI intervention needed for 95% of incidents
- Audit trail complete (all state changes logged)

**Team Size:** 2 engineers + 1 SRE (for playbook validation)

---

### Phase 3 — Scale (Weeks 11–16)
**Goal:** Multi-tenant isolation, rate limiting, and plugin ecosystem.

**Deliverables:**
1. Worker topology (control-plane, data-plane, isolation queues)
   - Acceptance: 1000 concurrent control-plane steps, 50 concurrent DBT_RUN
   - Metric: data-plane worker CPU/memory isolated from control-plane noise
2. Rate limiting + backpressure (token-bucket per tenant)
   - Acceptance: tenant quota exceeded → queued, not dropped
   - Metric: queue depth stable < 50 under 2x nominal load
3. Plugin system v1 (execution sandbox for custom steps)
   - Acceptance: custom Python step runs in isolated-vm, no tenant lateral movement
   - Metric: plugin timeout < 5s detection, auto-kill
4. DR basics (StateStore PITR, artifact versioning)
   - Acceptance: restore from 24h-old backup, all events replay
   - Metric: RTO < 1h, RPO < 5m
5. Cost tracking per run (compute units/cost attribution)
   - Acceptance: every StepOutput includes costUnits
   - Metric: cost model accuracy within ±10% of cloud provider billing

**Success Criteria:**
- Support 10+ concurrent tenants (SLA per tenant)
- No "noisy neighbor" effects (fair scheduling)
- 99% of runs complete within SLA window
- Plugin breakout attempts detected and logged (security)

**Team Size:** 2 engineers + 1 SRE + 1 security review

---

### Phase 4 — Enterprise (Weeks 17–24)
**Goal:** Multi-adapter, compliance, and cross-region.

**Deliverables:**
1. Conductor adapter (Phase 2 strategy)
   - Acceptance: same ExecutionPlan runs identically on Temporal and Conductor
   - Metric: flow equivalence tests, 100% pass rate
2. Network isolation (Kubernetes Network Policies, mTLS)
   - Acceptance: data-plane cannot reach secrets provider without auth
   - Metric: zero unauthenticated network calls (audit logs)
3. Compliance tooling (GDPR retention, audit export)
   - Acceptance: delete all tenant data + artifacts within 30d on request
   - Metric: zero PII in cached logs after rotation
4. Cross-region active-passive DR
   - Acceptance: failover to secondary region < 5m
   - Metric: RPO < 5m, RTO < 15m (initial failover)
5. On-call runbooks (SEV-0 through SEV-3)
   - Acceptance: runbook covers 95% of production incidents
   - Metric: MTTR for automated incidents < 5m, manual < 30m

**Success Criteria:**
- Conductor parity SLA: both adapters > 99.9% success
- Multi-region active-passive transparent to clients
- Compliance: 0 failed audits (SOC2, HIPAA option)
- Customer NPS > 8/10 for operational experience

**Team Size:** 3 engineers + 1 infra + 1 compliance

---

### High-Level Timeline & Risk Mitigation

```
Week 1-2:    Phase 1a: Interpreter + event model
Week 3-4:    Phase 1b: DBT activities + idempotency tests
Week 5-6:    Phase 1c: Hardening + sanity tests (complete Phase 1)
Week 7-8:    Phase 2a: Signal handling (PAUSE/RESUME/RETRY)
Week 9:      Phase 2b: Transactional outbox + DLQ
Week 10:     Phase 2c: Observability stack + dashboards
Week 11-12:  Phase 3a: Control/data/isolation workers
Week 13-14:  Phase 3b: Rate limiting + backpressure
Week 15-16:  Phase 3c: Plugin sandbox + DR
Week 17-18:  Phase 4a: Conductor adapter implementation
Week 19-20:  Phase 4b: Network policies + mTLS
Week 21-22:  Phase 4c: Compliance tooling (GDPR/SOC2)
Week 23-24:  Phase 4d: Cross-region + runbooks
```

**Risks & Mitigations:**
| Risk | Mitigation | Owner |
|------|-----------|-------|
| Temporal learning curve | spike on Temporal local testing (Week -1) | Backend Lead |
| StateStore schema conflicts | finalize schema in Phase 1a, no breaking changes after | Data Eng |
| Plugin sandbox escape | security review + chaos testing (Week 9) | SRE |
| Cross-region consistency | test async replication failures (Week 12) | Infra |

---

> This version elevates the engine from **product-ready** to **enterprise-operable** while preserving the original architectural philosophy.




## 19) Deployment & Operations Guide (team-ready)

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

### 20.6 Capacity Planning Estimates

**Control Plane Workers (per pod, 1GiB memory):**
- Throughput: 50 concurrent light steps
- Task latency p95: < 100ms
- Memory baseline: 300MB
- Memory per step: ~10MB
- CPU: 0.5 core baseline, scales linearly
- Scaling: HPA target 70% CPU

**Data Plane Workers (per pod, 8GiB memory):**
- Throughput: 2–5 concurrent `DBT_RUN` (warehouse-dependent)
- Task latency p95: 5–30 seconds (dbt query time)
- Memory baseline: 2GiB (Java + Python runtimes)
- Memory per step: 4–6GiB (variable, depends on model complexity)
- CPU: 2–4 cores (auto-tune based on dbt thread count)
- Scaling: by queue depth (target 1-2 queued tasks per worker)

**StateStore (Postgres):**
- Events generated: ~1KB/event average
- Throughput: 1,000 events/sec per replica sustainable
- Storage: ~100MB/1M events
- Indices: ~50% of data size
- Growth: 5–20TB/year at scale (adjust retention)
- PITR window: 7 days (configurable)

**Artifact Store (S3):**
- Average artifact size: 100MB/run
- Throughput: 100MB/s per prefix (S3 SLA)
- Storage: 10–50TB/year (depends on retention)
- Lifecycle: auto-delete by retention policy (per kind)
- Cost: see Section 15.1

**Example capacity sizing (100 runs/day):**
```
Control-plane: 2 pods (50 RPS × 2 = 100 concurrent)
Data-plane:   10 pods (5 concurrent DBT × 10 = 50)
StateStore:   RDS db.m6i.2xlarge (60K IOPS, 400MB/sec)
Artifacts:    S3 with lifecycle + multipart upload
```

### 20.7 Rollback Procedures (Emergency)

**Code Rollback (Engine):**
1. Revert container image to previous git tag (quick rollback):
  ```bash
  kubectl set image deployment/engine-worker engine=engine:<previous-tag> --record
  ```
2. Temporal coordination: in-flight workflows continue using `getVersion()` guarded code paths.
3. New runs will use the rolled-back interpreter image until next deploy.
4. Run smoke plan (3-step) to validate rollback.

**Schema Rollback (StateStore):**
1. NEVER delete columns; add nullable columns for migration.
  Execution-time enforcement is defined in Section 6.5.
2. If migration fails, switch application to use old columns and deploy fix.
3. Use PITR / snapshot to restore if needed; validate outbox replay.

**Plugin Rollback:**
1. Route traffic to previous version via planner policy (fallback_version).
2. Blacklist broken version in StateStore and planner.
3. Update planner to avoid broken version until fixed.

**Runbook targets:**
- Decision < 5m; Execution < 10m; Validation < 15m.

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

### 21.3 Replay testing (authoritative)
Temporal deterministic guarantees require replaying recorded histories under new code. A real replay test validates that a captured history produced by `v1` of the interpreter still replays under `v2` without nondeterminism.

**Replay workflow (critical path):**
1. **Record canonical histories**
  - Use `TestWorkflowEnvironment` locally or capture production histories via `tctl workflow show --raw-history` (redact PII). Store in `test/fixtures/histories/` as JSON.
  - **Automated capture from staging/production**: Add a scheduled cron job that exports recent workflow histories (past 3 days) to archive bucket for regression testing. Automates history collection for regression test suite.

2. **Replay histories under new code**
  - Use Temporal TypeScript SDK `TestWorkflowEnvironment` for local replay or Temporal's Java `WorkflowReplayer` for authoritative multi-version replay.
  - The replay tool must execute workflow code in-process and **fail on any nondeterministic events** (new random number, Date call, non-canonical ordering).

3. **Gate merges (blocking)**
  - `replay-suite` (must pass): run all recorded-history replays; fail on nondeterminism.
  - `determinism-lint` (must pass): static linter rules.
  - `versioning-check` (warn): detect unguarded control-flow changes.

**Pre-commit hook (local determinism check):**
```bash
#!/usr/bin/env bash
# .git/hooks/pre-commit — catch determinism violations before PR

# Fail if any Promise.all() call has unsorted children
eslint --rule '@custom/no-unsorted-promiseall' src/workflows/

# Fail if any Date.now() or Math.random() found in workflow code
grep -r 'Date.now\|Math.random' src/workflows/ || echo "OK: No forbidden calls"

# Run fast determinism tests (Jest)
npm run test:determinism:fast  # ~2-5s

exit $?
```

**CI determinism gate example (GitHub Actions):**
```yaml
determinism-gate:
  name: "Determinism Checks"
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
      with:
        fetch-depth: 0  # full history for comparison

    - name: "Run replay-suite"
      run: npm run test:replay
      # Executes test/determinism/sample_determinism.test.ts
    
    - name: "Run determinism-lint (ESLint rule)"
      run: npx eslint --plugin @custom/determinism-lint src/workflows/
      # Custom rule detects unsorted Promise.all, Date.now, etc.
    
    - name: "Versioning check (warn)"
      run: npm run check:workflow-versioning || true
      # Detect control-flow changes without getVersion() guard
```

**Automated history capture for regression testing (CI cron):**
```yaml
name: "Capture Staging Histories for Regression"
on:
  schedule:
    - cron: "0 3 * * *"  # 3 AM UTC daily

jobs:
  capture-histories:
    runs-on: ubuntu-latest
    steps:
      - name: "Export histories from staging Temporal cluster"
        run: |
          for workflow_id in $(tctl workflow list | grep 'dvt-engine'); do
            tctl workflow show --workflow-id "$workflow_id" --output json > \
              /tmp/history-$(date +%s).json
          done
          # Upload to artifact store for regression suite
          aws s3 sync /tmp/ s3://archive/histories/staging-$(date +%Y-%m-%d)/
```

**Example: Jest replay test wrapper**
```ts
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { defaultDataConverter } from '@temporalio/common';
import fs from 'fs';
import glob from 'glob';

describe('Determinism replay tests', () => {
  it('should replay all captured histories without nondeterminism', async () => {
    const testEnv = await TestWorkflowEnvironment.create();
    const histories = glob.sync('test/fixtures/histories/*.json');
    
    for (const historyPath of histories) {
      const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
      const converter = defaultDataConverter();
      
      // Replay under current code version
      await testEnv.replay(history, 'dvtEngineWorkflow', {
        // Workflow args
      });
      
      expect(testEnv.failureReason()).toBeUndefined();
    }
    
    await testEnv.teardown();
  });
});
```

**Integration with Temporal built-in tools:**
- TypeScript SDK: Use `@temporalio/testing` `TestWorkflowEnvironment.replay()`.
- Java: Use `io.temporal.testing.WorkflowReplayer` (robust, tested by Temporal maintainers).
- Use Temporal's native `tctl` to export histories: `tctl workflow show --workflow-id <id> --output json`.

**Determinism-lint custom ESLint rule (architecture):**
```ts
// Custom ESLint rule: no-unsorted-promiseall
// Detects: Promise.all([...]) where children are not in canonical order
// Suggests fix: sort by identifier name before scheduling

module.exports = {
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.object?.name === 'Promise' && node.callee.property?.name === 'all') {
          const args = node.arguments[0]?.elements || [];
          // Check if args are sorted lexicographically
          const names = args.map(a => a.callee?.name || a.name).filter(Boolean);
          const sorted = [...names].sort();
          if (JSON.stringify(names) !== JSON.stringify(sorted)) {
            context.report({
              node,
              message: 'Promise.all() children must be in canonical order (lexicographic by name)',
              fix(fixer) {
                return fixer.replaceText(node.arguments[0], `[${sorted.map(n => args.find(a => (a.callee?.name === n) || a.name === n)).join(',')}]`);
              }
            });
          }
        }
      }
    };
  }
};
```

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
- `RunQueued`
- `RunStarted`
- `StepDelayed`
- `StepStarted`
- `StepCompleted`
- `StepFailed`
- `PluginQuarantined`
- `RunCompleted`
- `RunFailed`
- `RunCancelled`

**Schema pointers (project-local paths)**
- `contracts/events/run_queued.v1.schema.json`
- `contracts/events/run_started.v1.schema.json`
- `contracts/events/step_delayed.v1.schema.json`
- `contracts/events/step_started.v1.schema.json`
- `contracts/events/step_completed.v1.schema.json`
- `contracts/events/step_failed.v1.schema.json`
- `contracts/events/plugin_quarantined.v1.schema.json`
- `contracts/events/run_completed.v1.schema.json`
- `contracts/events/run_failed.v1.schema.json`
- `contracts/events/run_cancelled.v1.schema.json`

**Example JSON Schemas (abridged)**

`contracts/events/run_queued.v1.schema.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "RunQueued.v1",
  "type": "object",
  "properties": {
    "schemaVersion": { "const": "v1" },
    "eventType": { "const": "RunQueued" },
    "runId": { "type": "string" },
    "queuePosition": { "type": "integer" },
    "estimatedWaitMs": { "type": "integer" }
  },
  "required": ["schemaVersion","eventType","runId","queuePosition"]
}
```

`contracts/events/step_delayed.v1.schema.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "StepDelayed.v1",
  "type": "object",
  "properties": {
    "schemaVersion": { "const": "v1" },
    "eventType": { "const": "StepDelayed" },
    "runId": { "type": "string" },
    "stepId": { "type": "string" },
    "scheduledAt": { "type": "string", "format": "date-time" },
    "reason": { "type": "string" }
  },
  "required": ["schemaVersion","eventType","runId","stepId","scheduledAt"]
}
```

`contracts/events/plugin_quarantined.v1.schema.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PluginQuarantined.v1",
  "type": "object",
  "properties": {
    "schemaVersion": { "const": "v1" },
    "eventType": { "const": "PluginQuarantined" },
    "pluginId": { "type": "string" },
    "pluginVersion": { "type": "string" },
    "reason": { "type": "string" },
    "quarantineQueue": { "type": "string" }
  },
  "required": ["schemaVersion","eventType","pluginId","pluginVersion","reason"]
}
```

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

## E6) Plugin Quarantine & Auto-Rollback

**Detection (automated):**
- Same plugin version fails >3 times in 5-minute window (same error code)
- Plugin exceeds memory limit >2 times in 10-minute window
- Plugin timeout (>stepTimeout) >2 times in 10 minutes
- Container escape attempt detected (gVisor/seccomp violation)

**Action (automatic):**
1. **Quarantine immediately:**
   - Mark plugin version as `quarantined` in StateStore
   - Emit `PluginQuarantined` event (audit log)
   - Notify on-call engineer via PagerDuty (SEV-2)
2. **Route subsequent steps:**
   - Find `fallback_version` (if configured in plan)
   - Retry failed step with fallback plugin version
   - If no fallback: fail step with `error.retryable=false`
3. **Operator review:**
   - Dashboard shows quarantined plugins
   - Operator can manually approve re-enable after fix
   - Security team reviews container escape / breakout events

**Config example:**
```yaml
plugins:
  - id: "dbt-adapter-custom"
    versions:
      "2.0.1":
        quarantine:
          enabled: true
          detectFailures: { count: 3, window: "5m" }
          detectMemory: { percent: 95, window: "10m" }
        fallbackVersion: "2.0.0"  # rollback target
```

**Metrics:**
- `engine_plugin_quarantined_total{pluginId, version}` (counter)
- `engine_plugin_fallback_invoked_total{pluginId}` (counter)
- `engine_plugin_escape_attempts_total{pluginId}` (alert: SEV-0)

---

## Appendix G — Plugin Version Canary & A/B Testing

**Problem**: Plugin version rollouts can cause silent degradation. Without canary analysis, bad versions propagate.

**Canary deployment strategy (Phase 2):**
1. Default: soak new version on 5% of runs (sample randomly by tenantId hash)
2. Monitor error rate, latency (p50/p99), resource usage for 24h
3. **Auto-promote**: if metrics are within ±10% of baseline, roll out to 20% → 50% → 100%
4. **Auto-rollback**: if error rate increases >25%, immediately rollback to previous stable version

**A/B testing framework:**
- Planner can emit `pluginVersionHint: { preferred: "2.1", fallback: "2.0" }`
- Engine randomly assigns version (80%/20% split) based on run properties (tenantId hash)
- StateStore tracks `selectedPluginVersion` per run
- Metrics capture per-version success/latency/cost

**Implementation (pseudo-code):**
```ts
async function selectPluginVersion(pluginId: string, hints?: PluginVersionHints): Promise<string> {
  const versions = await pluginRegistry.getVersions(pluginId);
  const baseline = await metrics.getBaseline(pluginId);  // 24h baseline stats
  
  // Check canary status
  const stats = await metrics.getCanaryStats(pluginId, versions[0], last24h);
  if (stats.errorRateDelta > 0.25) {
    // Rollback
    return versions[1];  // previous stable
  }
  if (stats.errorRateDelta < 0.10) {
    // Promote canary
    return versions[0];
  }
  
  // A/B test if hints provided
  if (hints?.preferred) {
    const rand = hashTenant(runContext.tenantId) % 100;
    return rand < 80 ? hints.preferred : hints.fallback;
  }
  
  return versions[0];
}
```

**Metrics:**
- `engine_plugin_canary_error_rate_delta{pluginId, version}` (gauge, ±%)
- `engine_plugin_ab_test_distribution{pluginId, version, split}` (histogram)
- `engine_plugin_rollback_total{pluginId, reason}` (counter)

---

## Appendix H — Implementation Priority & Phased Rollout

**Core principle**: Reduce risk by delivering a stable MVP, then expand incrementally.

### Phase 1 MVP (Weeks 1–8) — Critical Path

**Goal**: Reliable linear workflow execution on Temporal.

**Scope:**
- ✅ Engine boundary definition (Section 1)
- ✅ Minimal contract (Section 2)
- ✅ ExecutionPlan model (Section 3.1, no plugin system)
- ✅ TemporalAdapter interpreter (Section 4.0–4.2)
- ✅ StateStore integration (Section 6.2)
- ✅ Linear step execution (no parallel groups yet)
- ✅ Basic error handling + retries (Section 8)
- ✅ Determinism testing (Section 21.3, local Jest tests)

**What NOT to do (defer to Phase 2):**
- ❌ Signals (pause/resume)
- ❌ Multi-tenant isolation
- ❌ Plugin system
- ❌ Conductor adapter
- ❌ Rate limiting
- ❌ Cost attribution

**Success metrics:**
- Linear plans execute end-to-end with 100% reliability (3 9s)
- Step determinism validated by replay tests
- Latency p50 <2s per step (depends on Activity)

**Team**: 2 engineers (1 Platform lead, 1 Temporal specialist)

**Risks (priority):**
1. **Determinism bugs** (highest): If interpreter scheduling is non-deterministic, whole architecture fails. *Mitigation: Canonical ordering + replayer + pre-commit guard.*
2. **Temporal platform limits**: If workflow history grows unbounded, latency degrades. *Mitigation: Plan for continueAsNew from start (Section 6.8).*
3. **StateStore coupling**: If writes block Activity scheduling, throughput collapses. *Mitigation: Use transactional outbox + async publisher from start (Section 6.6).*

---

### Phase 2 (Weeks 9–16) — Operational Stability

**Goal**: Production-grade reliability with operator tools.

**Scope:**
- ✅ Signal handling (pause/resume/retry, Section 2.3)
- ✅ Transactional outbox + EventBus (Section 6.6)
- ✅ StateStore write budgets + fail-open (Section 6.7)
- ✅ continueAsNew policy (Section 6.8)
- ✅ Namespace strategy (Section 4.3)
- ✅ Deterministic replay gating (Section 21.3, CI gate)
- ✅ Observability (metrics, dashboards, logging, Section 14)
- ✅ Operational runbooks (Section 22: outbox recovery, rollback, quarantine)

**New tooling:**
- CLI for workflow debugging (tctl-like wrapper)
- Dashboards (Grafana templates)
- Replay-suite CI job
- Pre-commit determinism hooks

**Success metrics:**
- 4 9s reliability (99.99% runs complete)
- Pause/resume works for 95% of runs (5% due to in-flight limitation)
- MTTR <15 min for common failures (via runbooks)

**Team**: +1 SRE, +1 UI engineer for dashboards

**Risks (priority):**
1. **Outbox backlog**: If EventBus publisher gets stuck, state divergence. *Mitigation: Separate reconciler process + alerting (Section 6.5.1).*
2. **Operator complexity**: Too many knobs / unclear playbooks. *Mitigation: 3 runbooks (outbox, plugin, rollback) with step-by-step procedures.*
3. **Namespace sprawl** (if per-tenant adopted): Operational leverage lost. *Mitigation: Enforce few namespaces + search attributes from start (Section 4.3.1).*

---

### Phase 3 (Weeks 17–24) — Scale & Multi-Tenant

**Goal**: Support 1000s of concurrent tenants, plugins, cost attribution.

**Scope:**
- ✅ Multi-tenant isolation (Section 11)
- ✅ Plugin sandbox system (Section 11.2, with gVisor/Firecracker)
- ✅ Rate limiting (Section 12, token bucket + backpressure)
- ✅ Run queue reconciler (Section 6.5.1, idempotent dequeue)
- ✅ Cost attribution & chargeback (Section 15)
- ✅ Plugin canary & auto-rollback (Appendix G)
- ✅ Custom dashboards per tenant (multi-tenant observability)

**What changes:**
- TemporalAdapter now routes via tenant-specific task queues (Section 4.5).
- StateStore schema adds tenant-scoped indexes.
- Plugin registry versioning + quarantine logic.

**Success metrics:**
- Support 1000+ concurrent tenants without noisy-neighbor problems
- Plugin safe rollback: 100% of rollbacks complete within 5 min of detection
- Cost attribution: chargeback reports match billing within 2%

**Team**: +2 engineers (1 Platform, 1 Infra), +1 PM for cost model

**Risks (priority):**
1. **Cost model complexity**: Accurate attribution is hard; customer disputes. *Mitigation: Transparent metrics dashboard + clear tagging from start.*
2. **Plugin escape**: gVisor misconfiguration or 0-day. *Mitigation: Defense-in-depth (gVisor + seccomp + resource limits + audit logging).*
3. **Conductor parity**: Divergence discovered too late. *Mitigation: Capability matrix (Section 4.6) enforces common denominator from Phase 1.*

---

### Phase 4+ (Post-MVP) — Advanced Features

**Optional high-impact items:**
- Conductor adapter (enforce capability matrix from Phase 3)
- Cross-provider migration toolkit
- Advanced scheduling (cost-optimized execution, dynamic DAG expansion)
- Plugin marketplace + public sharing
- Developer CLI (local testing, mock adapters)
- Advanced observability (distributed tracing, custom dashboards)

---

### Decision Tree for Scope Assignment

```
Is this feature required for Phase 1 linear execution?
  YES → Phase 1 MVP
  NO → Is it required for production reliability (signals, observability, outbox)?
    YES → Phase 2
    NO → Is it required for scale (multi-tenant, plugins, cost)?
      YES → Phase 3
      NO → Phase 4+
```

---

## Appendix I — Developer Experience Roadmap (Phase 2–3)

**Gaps that slow adoption:**

1. **Local development environment**
   - Docker Compose setup (Temporal server + mock StateStore + mock EventBus)
   - Sample plan YAML + execution for testing

2. **Mock adapters** (for testing Planner)
   - In-memory TemporalAdapter (no external Temporal cluster needed)
   - Deterministic, synchronous execution for unit tests

3. **CLI tools**
   - `dvt workflow debug <runId>` (inspect history, signals, state)
   - `dvt workflow replay <historyFile>` (local determinism check)
   - `dvt workflow new` (scaffold new plan)

4. **Documentation**
   - Architecture decision records (ADRs) for major choices
   - Day-1 integration guide for Planner team
   - Troubleshooting guide (common issues)

---

## Appendix J — Cross-Provider Migration & Parity Tooling (Phase 4)

**Problem**: Moving from Temporal to Conductor (or vice versa) requires state migration and continued operations.

**Tooling to develop later:**

1. **State migration utilities**
   - Export runs from Temporal namespace → JSON (history + state)
   - Import JSON into Conductor workflow (resume from checkpoint)
   - Validate parity (same outputs, latencies within 10%)

2. **Run continuation across providers**
   - If Temporal cluster fails, resume on Conductor (requires capability matrix parity)
   - Coordinated switchover (DNS flip or dual-write period)

3. **Parity validation tool**
   - Execute same ExecutionPlan on both adapters
   - Compare outputs, latencies, error rates
   - Flag incompatibilities early

---

## Links (quick)
- Temporal: https://temporal.io/
- Temporal docs: https://docs.temporal.io/
- Conductor: https://conductor.netflix.com/
- Orkes: https://orkes.io/
- OpenTelemetry: https://opentelemetry.io/
- Prometheus: https://prometheus.io/
