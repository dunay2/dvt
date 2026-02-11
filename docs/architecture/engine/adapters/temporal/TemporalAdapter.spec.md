# TemporalAdapter Specification (Normative v1.0)

**Status**: Normative (Temporal-specific contract)  
**Version**: 1.0  
**Stability**: Adapter specification — breaking changes require version bump  
**Target**: Temporal 1.0+ (TypeScript SDK)  
**References**: [IWorkflowEngine Contract](../../contracts/engine/IWorkflowEngine.v1.md), [Temporal SDK](https://docs.temporal.io/develop/typescript), [Temporal Platform Limits](https://docs.temporal.io/encyclopedia/temporal-platform-limits)

---

## 1) Plan Transport: PlanRef Versioning

The adapter receives a **plan reference**, not the full plan (Temporal payload limits).

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

When `fetchPlan(planRef)` downloads the plan, the adapter MUST compute SHA256 and compare it to `planRef.sha256`.
If the hash does **not** match, the Activity MUST fail with error code `VALIDATION_FAILED` and the workflow MUST NOT continue.

---

## 2) Interpreter Workflow Pattern (Required)

Temporal is code-first. The adapter MUST implement a **generic interpreter workflow** that:

1. Receives `PlanRef`.
2. Fetches + validates plan via Activity (`fetchPlan(planRef)`).
3. Walks the plan, scheduling Activities according to dependencies (DAG walker, deterministic order).
4. Emits lifecycle events to StateStore.
5. Handles signals (PAUSE, RESUME, RETRY_STEP, etc.).
6. Calls `continueAsNew()` when history exceeds limits.

**Interpreter workflow signature** (TypeScript):

```ts
export async function interpreterWorkflow(
  planRef: PlanRef,
  context: RunContext
): Promise<RunSnapshot> {
  // 1. Fetch plan
  const plan = await workflow.executeActivity('fetchPlan', planRef);

  // 2. Validate capabilities (check against adapterCapabilities.json)
  const validationReport = await workflow.executeActivity('validatePlan', plan);
  if (validationReport.status === 'ERRORS') {
    throw new PlanValidationError('Plan validation failed', validationReport);
  }

  // 3. Initialize state
  let cursor = { completedStepIds: new Set<string>(), artifacts: [] };
  let stepsSinceContinue = 0;

  // 4. Walk plan, schedule Activities
  for (const step of planWalker.walk(plan, cursor)) {
    const stepResult = await workflow.executeActivity('executeStep', { step, context });
    cursor.completedStepIds.add(step.stepId);
    stepsSinceContinue++;

    // 5. Check for continueAsNew trigger
    if (
      stepsSinceContinue >= CONFIG.CONTINUE_STEPS ||
      workflow.workflowInfo.historySizeEstimate >= CONFIG.HISTORY_BYTES_THRESHOLD
    ) {
      await workflow.continueAsNew({ planRef, cursor });
    }
  }

  // 6. Return final snapshot
  return workflow.executeActivity('compileRunSnapshot', cursor);
}
```

---

## 2.1) fetchPlan Activity (Normative Validation)

The `fetchPlan` Activity MUST implement strict integrity validation to prevent execution of tampered or mismatched plans.

**Activity Signature**:

```ts
interface FetchPlanActivity {
  fetchPlan(planRef: PlanRef): Promise<ExecutionPlan>;
}
```

**NORMATIVE Requirements**:

1. **Download Plan**: Fetch the plan from `planRef.uri` (e.g., from S3, GCS, Azure Blob, or HTTP endpoint).

2. **Compute SHA256**: Calculate the SHA256 hash of the downloaded plan content (after decompression if `planRef.compression` is set).

3. **Strict Hash Validation** (CRITICAL):
   - If the computed SHA256 does **NOT** match `planRef.sha256`, the Activity MUST:
     - **Fail immediately** with error code `PLAN_INTEGRITY_VALIDATION_FAILED`
     - **NOT proceed with execution**
     - Emit a critical alert (P1) to operations/security team
     - Record the mismatch in audit logs with both expected and actual hash values
4. **Error Response Structure**:

   ```ts
   {
     category: "VALIDATION_ERROR",
     code: "PLAN_INTEGRITY_VALIDATION_FAILED",
     message: "Plan hash mismatch: expected sha256 does not match downloaded content",
     retryable: false,
     details: {
       expectedSha256: planRef.sha256,
       actualSha256: computedSha256,
       planUri: planRef.uri,
       planId: planRef.planId,
       planVersion: planRef.planVersion
     }
   }
   ```

5. **Retry Policy**: This error is **NOT retryable**. The workflow MUST transition to `FAILED` status immediately.

6. **Security Rationale**:
   - Prevents execution of plans that have been modified after approval
   - Detects cache poisoning, man-in-the-middle attacks, or storage corruption
   - Ensures audit trail integrity (executed plan matches approved plan)

**Implementation Example** (TypeScript):

```ts
import { createHash } from 'crypto';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { ungzip } from 'node:zlib';
import { promisify } from 'node:util';

const ungzipAsync = promisify(ungzip);

export async function fetchPlan(planRef: PlanRef): Promise<ExecutionPlan> {
  // 1. Download plan
  const s3 = new S3Client({});
  const command = new GetObjectCommand({
    Bucket: extractBucket(planRef.uri),
    Key: extractKey(planRef.uri),
  });

  const response = await s3.send(command);
  let content = await response.Body!.transformToByteArray();

  // 2. Decompress if needed
  if (planRef.compression === 'gzip') {
    content = await ungzipAsync(Buffer.from(content));
  }

  // 3. Compute SHA256
  const computedSha256 = createHash('sha256').update(content).digest('hex');

  // 4. STRICT VALIDATION (NORMATIVE)
  if (computedSha256 !== planRef.sha256) {
    throw new PlanIntegrityError({
      category: 'VALIDATION_ERROR',
      code: 'PLAN_INTEGRITY_VALIDATION_FAILED',
      message: 'Plan hash mismatch: expected sha256 does not match downloaded content',
      retryable: false,
      details: {
        expectedSha256: planRef.sha256,
        actualSha256: computedSha256,
        planUri: planRef.uri,
        planId: planRef.planId,
        planVersion: planRef.planVersion,
      },
    });
  }

  // 5. Parse and return
  const plan = JSON.parse(content.toString('utf-8')) as ExecutionPlan;

  // 6. Schema version validation (bonus)
  if (!isSupportedSchemaVersion(plan.schemaVersion, planRef.schemaVersion)) {
    throw new PlanSchemaError({
      category: 'VALIDATION_ERROR',
      code: 'PLAN_SCHEMA_VERSION_MISMATCH',
      message: `Plan schema version ${plan.schemaVersion} does not match PlanRef ${planRef.schemaVersion}`,
      retryable: false,
    });
  }

  return plan;
}

function isSupportedSchemaVersion(planVersion: string, refVersion: string): boolean {
  // Support exact match or backward compatible versions (e.g., v1.2 plan can run with v1.2 or v1.3 ref)
  return planVersion === refVersion; // Simplified; implement semver logic as needed
}
```

**Operational Monitoring**:

- Alert: `PLAN_INTEGRITY_VALIDATION_FAILED` (P1, critical)
- Metrics:
  - `plan_fetch_integrity_failure_count` (counter)
  - `plan_fetch_duration_ms` (histogram)
  - `plan_fetch_size_bytes` (histogram)

**Testing Requirements**:

- Unit test: Tampered plan content (modified after hashing) → MUST fail
- Unit test: Correct plan → MUST succeed
- Unit test: Network-corrupted download → MUST fail with integrity error (not generic network error)
- Integration test: End-to-end workflow with mismatched hash → workflow transitions to FAILED

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

| Class         | Task Queue                    | Responsibilities                                                              | Resources                     |
| ------------- | ----------------------------- | ----------------------------------------------------------------------------- | ----------------------------- |
| **Control**   | `tq-control-{env}`            | Plan fetch/validation, StateStore writes, light HTTP steps, signal processing | 0.5 CPU, 1Gi RAM, 2-10 pods   |
| **Data**      | `tq-data-{env}`               | `DBT_RUN`, heavy computation steps                                            | High CPU/memory, GPU optional |
| **Isolation** | `tq-isolation-{tenant}-{env}` | Tenant-isolated steps (security/regulatory)                                   | Dedicated per tenant          |

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

- `PlanRef` (reference only, not full plan)
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
