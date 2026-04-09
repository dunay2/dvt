# TemporalAdapter Specification (Normative v1.0)

**Status**: Normative (Temporal-specific contract)  
**Version**: 1.0  
**Stability**: Adapter specification — breaking changes require version bump  
**Target**: Temporal 1.0+ (TypeScript SDK)  
**References**: [IWorkflowEngine Contract](../../contracts/engine/IWorkflowEngine.v1.md), [Temporal SDK](https://docs.temporal.io/develop/typescript), [Temporal Platform Limits](https://docs.temporal.io/encyclopedia/temporal-platform-limits)

---

## 1) Plan Transport: Engine-Verified Payload

The adapter receives a verified **execution plan plus its plan reference**.
`PlanRef` remains the persisted identity handle, but authoritative fetch and
integrity verification now happen at the engine entry point before Temporal
dispatch.

```ts
type PlanRef = {
  uri: string; // e.g., s3://bucket/plans/{planId}.json
  sha256: string; // integrity hash
  schemaVersion: string; // MANDATORY, e.g., "v1.2"
  planId: string;
  planVersion: string;

  sizeBytes?: number;
  compression?: 'gzip' | 'none';
  expiresAt?: string; // cache invalidation hint

  schemaEvolutionPath?: string; // e.g., "v1 → v1.1 → v1.2"
  migrationHint?: {
    sourceVersion: string;
    targetVersion: string;
    transformScript?: string; // URI to artifact (dbt macro, SQL, etc.)
  };
};
```

**Versioning rules**:

- `schemaVersion` MANDATORY.
- Engine MUST reject plans with unknown `schemaVersion`.
- BACKWARD compatibility: Adapter supports ≤3 minor versions back.
- FORWARD compatibility: Deprecation policy (e.g., "v1.0 deprecated 2026-Q3").
- **Cross-schema continuation**: If in-flight runs on old schema, adapter MUST support `continueAsNew` with schema migration.

**Integrity Validation (NORMATIVE)**:

The engine MUST fetch the executable plan, validate metadata alignment against
`PlanRef`, and recompute canonical planner identity (`planId`) before it calls
the Temporal adapter. The adapter MUST treat the incoming `ExecutionPlan` as
the authoritative verified payload and MUST NOT create a second authoritative
integrity check by refetching the plan during workflow execution.

---

## 2) Interpreter Workflow Pattern (Required)

Temporal is code-first. The adapter MUST implement a **generic interpreter workflow** that:

1. Receives the engine-verified `ExecutionPlan` plus `PlanRef`.
2. Walks the plan, scheduling Activities according to dependencies (DAG walker, deterministic order).
3. Uses `PlanRef` for event identity/audit metadata, not as a runtime fetch authority.
4. Emits lifecycle events to StateStore.
5. Handles canonical runtime-control signals (PAUSE, RESUME, CANCEL).
6. Calls `continueAsNew()` when history exceeds limits.

Business run recovery is a separate engine or application use case and MUST
NOT be reintroduced through the generic signal boundary.

**Interpreter workflow signature** (TypeScript):

```ts
export async function interpreterWorkflow(
  plan: ExecutionPlan,
  planRef: PlanRef,
  context: RunContext
): Promise<RunSnapshot> {
  // 1. Validate capabilities (check against adapterCapabilities.json)
  const validationReport = await workflow.executeActivity('validatePlan', plan);
  if (validationReport.status === 'ERRORS') {
    throw new PlanValidationError('Plan validation failed', validationReport);
  }

  // 2. Initialize state
  let cursor = { completedStepIds: new Set<string>(), artifacts: [] };
  let stepsSinceContinue = 0;

  // 3. Walk plan, schedule Activities
  for (const step of planWalker.walk(plan, cursor)) {
    const stepResult = await workflow.executeActivity('executeStep', { step, context });
    cursor.completedStepIds.add(step.stepId);
    stepsSinceContinue++;

    // 4. Check for continueAsNew trigger
    if (
      stepsSinceContinue >= CONFIG.CONTINUE_STEPS ||
      workflow.workflowInfo.historySizeEstimate >= CONFIG.HISTORY_BYTES_THRESHOLD
    ) {
      await workflow.continueAsNew({ planRef, cursor });
    }
  }

  // 5. Return final snapshot
  return workflow.executeActivity('compileRunSnapshot', cursor);
}
```

---

## 2.1) Entry-Point Verification Boundary

The authoritative integrity proof is complete before the Temporal adapter is
called.

**NORMATIVE Requirements**:

1. The engine MUST fetch the executable plan bytes using `PlanRef`.
2. The engine MUST validate executable-plan metadata against `PlanRef`.
3. The engine MUST recompute canonical planner identity from the resolved plan
   core and reject dispatch on mismatch.
4. The Temporal adapter MUST accept the verified `ExecutionPlan` as the
   authoritative payload.
5. Temporal workflow execution MUST NOT refetch the plan as a second
   authoritative integrity step.

**Operational Implication**:

- integrity failures occur before workflow start, at the engine boundary
- workflow input size grows because the verified plan crosses the adapter
  boundary as payload
- runtime monitoring should focus on payload size, start latency, and
  `continueAsNew` cadence rather than plan-download integrity metrics

**Testing Requirements**:

- engine tests MUST fail closed when fetched bytes do not match `planId` or
  required metadata
- adapter tests MUST prove workflow start consumes the verified plan payload
  without runtime `fetchPlan` ownership
- integration tests MUST show dispatch does not occur after engine-side
  verification failure

---

## 3) Namespace Strategy (Temporal)

**Recommendation**: FEW namespaces, **NOT per-tenant**.

```yaml
temporal:
  namespaces:
    production: 'prod' # Shared across tenants
    staging: 'staging'
    development: 'dev'
    production-regulated: 'prod-hipaa' # ONLY if actual regulatory requirement

  retention:
    productionDays: 90
    stagingDays: 30
    developmentDays: 7

  searchAttributes:
    - tenantId # Query: tenantId = 'tenant-123'
    - projectId
    - environmentId
    - regulatoryTier # 'HIPAA', 'PCI-DSS', 'PUBLIC'

  taskQueues:
    production: 'tq-prod'
    staging: 'tq-staging'
    development: 'tq-dev'
```

**Rationale**:

- Few namespaces → reduced quota/retention/upgrade burden.
- Search attributes → fast tenant-level queries without namespace sprawl.
- Task queue isolation → enforces per-tenant concurrency limits (Section 4.1).
- Regulated tenants → opt into **separate Temporal cluster** (infrastructure isolation), not namespace multiplication.

### 3.1 Namespace Cleanup Automation

**Ephemeral environment namespaces** (e.g., PR #123):

- Planner may request: `getNamespace(..., ephemeralTag: "pr-123")`.
- Cron job: detect namespace with 0 active workflows + 0 new starts for 7 days → archive + delete.
- Before deletion: export history to `s3://archive/namespaces/pr-123-{timestamp}.tar.gz`.

---

## 4) Worker Topology & Task Queue Routing

**Worker classes**:

| Class         | Task Queue                    | Responsibilities                                       | Resources                     |
| ------------- | ----------------------------- | ------------------------------------------------------ | ----------------------------- |
| **Control**   | `tq-control-{env}`            | StateStore writes, light HTTP steps, signal processing | 0.5 CPU, 1Gi RAM, 2-10 pods   |
| **Data**      | `tq-data-{env}`               | `DBT_RUN`, heavy computation steps                     | High CPU/memory, GPU optional |
| **Isolation** | `tq-isolation-{tenant}-{env}` | Tenant-isolated steps (security/regulatory)            | Dedicated per tenant          |

**Routing logic** (in step dispatch):

```ts
function getTaskQueue(step: Step, env: string, tenantId: string): string {
  if (step.dispatch?.taskQueue) {
    return step.dispatch.taskQueue;
  }
  if (step.class === 'isolation') {
    return `tq-isolation-${tenantId}-${env}`;
  }
  if (step.type.includes('DBT')) {
    return `tq-data-${env}`;
  }
  return `tq-control-${env}`;
}
```

---

## 5) Determinism & Workflow Versioning (`getVersion`)

The plan is stable while engine code evolves. To avoid breaking determinism for in-flight runs:

**Rule**: Use `workflow.getVersion()` around any behavioral change.

```ts
export async function interpreterWorkflow(planRef: PlanRef, context: RunContext) {
  // ... initialization

  for (const step of planWalker.walk(plan, cursor)) {
    // Gate new logic behind versioning
    const versionUntil = workflow.getVersion('executeStepLogic', 0, 1);

    if (versionUntil <= 0) {
      // Old logic (for replaying old runs)
      await executeStepLegacy(step, context);
    } else {
      // New logic (for new runs)
      await executeStepV2(step, context);
    }
  }
}
```

**Best practices**:

- Version ANY change to: control flow, activity scheduling order, retries, branching, error handling.
- Old runs replay deterministically (SDK replays old branch).
- New runs take new branch.
- Deprecate old versions after 2–3 runs have drained.

**Reference**: [Temporal Versioning](https://docs.temporal.io/workflows#versioning)

---

## 6) Activity Lifecycle & Error Handling

**Activity contract**:

```ts
interface ActivityContext {
  tenantId: string;
  environmentId: string;
  runId: string;
  stepId: string;
  engineAttemptId: string; // Temporal SDK provides
  logicalAttemptId: string; // Engine-assigned
  secrets: Record<string, string>;
}

async function executeStepActivity(step: Step, ctx: ActivityContext): Promise<StepOutput> {
  try {
    // 1. Resolve secrets
    const secrets = await secretsProvider.resolve(step.secretRefs, {
      tenantId: ctx.tenantId,
      environmentId: ctx.environmentId,
    });

    // 2. Execute step (plugin/built-in)
    const result = await stepExecutor.execute(step, { ...ctx, secrets });

    // 3. Write artifacts to storage
    const artifacts = await artifactStore.writeArtifacts(result.artifacts);

    // 4. Return structured output
    return {
      status: 'SUCCESS',
      artifactRefs: artifacts,
      metrics: result.metrics,
    };
  } catch (error) {
    // Emit StepFailed event with retryability info
    return {
      status: 'FAILED',
      error: {
        category: error.category,
        code: error.code,
        message: error.message,
        retryable: isRetryable(error),
      },
    };
  }
}
```

**Retry strategy** (Temporal SDK):

- Temporal retries up to `maxAttempts` (default 3).
- Each retry increments `engineAttemptId`.
- If Activity succeeds on retry, only ONE `StepCompleted` event emitted (same `logicalAttemptId`).

---

## 7) Signals & Pause Semantics

**Pause signal** (native to Temporal):

```ts
export async function pauseWorkflow(signal: PauseSignal, inFlightActivities: ActivityHandle[]) {
  logger.info(`[PAUSE] ${signal.runId}: allowCancelOnPause=${CONFIG.allowCancelOnPause}`);

  const cancelTasks = inFlightActivities
    .filter((h) => h.cancellable && CONFIG.allowCancelOnPause)
    .map((h) => {
      logger.info(`Requesting cancel for ${h.stepId}`);
      h.cancel(); // Activity receives cancellation token
      return h;
    });

  if (cancelTasks.length > 0) {
    await Promise.all(cancelTasks);
  }

  // Emit RunPaused event
  await stateStore.emit({
    eventType: 'RunPaused',
    runId: signal.runId,
    draining: false,
    emittedAt: new Date().toISOString(),
    idempotencyKey: `pause-${signal.runId}`,
  });
}
```

**Activity-side cancellation** (cooperative):

```ts
import { Context, ActivityCancellationType } from '@temporalio/activity';

export async function heavyDBTRunActivity(step: Step, ctx: ActivityContext) {
  const activityCtx = Context.current();
  const cancellationToken = activityCtx.cancellationSignal;

  let subprocess = spawn('dbt', ['run', ...step.args]);

  return new Promise((resolve, reject) => {
    if (cancellationToken) {
      cancellationToken.onCancellation(() => {
        logger.info(`[CANCEL] Activity ${step.stepId} received cancellation`);
        subprocess.kill('SIGTERM');
        setTimeout(() => subprocess.kill('SIGKILL'), 5000);
      });
    }

    subprocess.on('exit', (code, signal) => {
      if (signal) {
        resolve({ status: 'CANCELLED', reason: `Killed by signal ${signal}` });
      } else if (code === 0) {
        resolve({ status: 'SUCCESS', artifacts: {...} });
      } else {
        resolve({ status: 'FAILURE', code });
      }
    });
  });
}
```

---

## 8) Continue-As-New Policy

Workflow MUST call `continueAsNew()` when EITHER:

- `stepsSinceLastContinue >= CONTINUE_STEPS` (default 50), OR
- `workflow.workflowInfo.historySizeEstimate >= HISTORY_BYTES_THRESHOLD` (default 1MB).

```ts
if (
  stepsSinceContinue >= CONFIG.CONTINUE_STEPS ||
  historySizeEstimate >= CONFIG.HISTORY_BYTES_THRESHOLD
) {
  logger.info(`[CONTINUE_AS_NEW] steps=${stepsSinceContinue}, historySize=${historySizeEstimate}`);

  // Persist only minimal state
  const minimalCursor = {
    completedStepIds: Array.from(cursor.completedStepIds),
    artifacts: cursor.artifacts.map((a) => ({ uri: a.uri, sha256: a.sha256 })),
  };

  await workflow.continueAsNew({ planRef, cursor: minimalCursor });
}
```

**State persisted across continuation** (MINIMAL):

- `ExecutionPlan` plus `PlanRef` from the engine-verified dispatch payload
- `cursor` (compacted: step IDs + artifact pointers)
- No logs, expanded lists, or large errors

**Limits** (enforced at signal handler):

- `maxSignalSizeBytes = 64KB`.
- `maxSignalsPerRunPerMinute = 60`.
- Excess signals → reject or queue.

---

## Change Log

| Version | Date       | Change                                |
| ------- | ---------- | ------------------------------------- |
| 1.0     | 2026-02-11 | Initial TemporalAdapter specification |
