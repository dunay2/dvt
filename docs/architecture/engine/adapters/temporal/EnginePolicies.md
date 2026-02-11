# Temporal Engine Policies

**Status**: Implementation Guide  
**Version**: 1.0  
**Engine**: Temporal  
**Contract**: [ExecutionSemantics.v1.md](../../../contracts/engine/ExecutionSemantics.v1.md)  

---

## Purpose

This document specifies **Temporal-specific policies** required to implement the [Execution Semantics Contract](../../../contracts/engine/ExecutionSemantics.v1.md).

These policies address Temporal platform constraints and best practices:
- **History size limits** (50MB hard limit per workflow)
- **Continue-as-new** rotation strategy
- **Signal limits** (rate and size)
- **Activity timeout policies**

**References**:
- [Temporal Platform Limits](https://docs.temporal.io/encyclopedia/temporal-platform-limits)
- [Continue-as-new Best Practices](https://docs.temporal.io/workflows#continue-as-new)

---

## 1) Continue-As-New Policy (NORMATIVE)

### 1.1 Trigger Conditions

Workflow MUST call `continueAsNew()` when **EITHER** condition is met:

| Condition | Threshold | Rationale |
|-----------|-----------|-----------|
| **Steps executed** | 50 steps | Prevent history bloat (50 steps ≈ 200-500 events) |
| **Estimated history size** | 1 MB | Safety margin (hard limit is 50MB, but performance degrades above 10MB) |

**Implementation**:
```typescript
class WorkflowEngine {
  private stepsSinceLastContinue = 0;
  private estimatedHistoryBytes = 0;
  private readonly CONTINUE_STEPS = 50;
  private readonly HISTORY_BYTES_THRESHOLD = 1_000_000; // 1 MB

  async executeStep(step: Step): Promise<void> {
    // ... step execution logic
    
    this.stepsSinceLastContinue++;
    this.estimatedHistoryBytes += estimateEventSize(step);
    
    // Check continue-as-new triggers
    if (
      this.stepsSinceLastContinue >= this.CONTINUE_STEPS ||
      this.estimatedHistoryBytes >= this.HISTORY_BYTES_THRESHOLD
    ) {
      await this.continueAsNew();
    }
  }
  
  private async continueAsNew(): Promise<void> {
    // Compact state before continuation
    const compactedState = this.compactState();
    
    // Continue workflow in new run
    workflow.continueAsNew({
      planRef: this.planRef,           // Reference only (not full plan)
      cursor: compactedState.cursor,   // Compacted: completed step ranges or bitmap
      artifacts: compactedState.artifacts, // ArtifactRef[] pointers only
      counters: {
        totalSteps: this.totalStepsExecuted,
        failedSteps: this.failedStepCount,
        // ... other minimal counters
      }
    });
  }
}
```

### 1.2 State Persisted Across Continuation

**MUST persist (minimal state)**:
- `PlanRef` (reference to plan in StateStore, NOT full plan JSON)
- `cursor` (compacted: completed step ranges `[[0,10],[15,20]]` or bitmap)
- `ArtifactRef[]` (pointers to S3/GCS, NOT binary payloads)
- Minimal counters (totalSteps, failedSteps, retriedSteps)

**MUST NOT persist**:
- Full plan JSON (retrieve from StateStore on continuation)
- Step logs (retrieve from StateStore if needed)
- Expanded lists (compress to ranges or bitmaps)
- Large error blobs (store in StateStore, reference by eventId)

**Compaction example**:
```typescript
interface CompactedState {
  planRef: PlanRef;                      // 100 bytes
  cursor: { start: number; end: number }[]; // O(log N) ranges
  artifacts: ArtifactRef[];              // 50-200 bytes per artifact
  counters: {
    totalSteps: number;
    failedSteps: number;
    retriedSteps: number;
  };
}

function compactState(): CompactedState {
  // Compress completed steps: [1,2,3,5,6,7,10,11,12] → [[1,3],[5,7],[10,12]]
  const ranges = compressRanges(this.completedStepIds);
  
  return {
    planRef: { planId: this.planId, version: this.planVersion },
    cursor: ranges,
    artifacts: this.artifactRefs, // Already compacted (pointers only)
    counters: {
      totalSteps: this.totalStepsExecuted,
      failedSteps: this.failedStepCount,
      retriedSteps: this.retriedStepCount,
    }
  };
}
```

---

## 2) Signal Limits (NORMATIVE)

Temporal enforces platform limits on signals (see [docs](https://docs.temporal.io/encyclopedia/temporal-platform-limits#signal-limits)).

### 2.1 Size Limits

**MUST enforce**:
- `maxSignalSizeBytes = 64 KB` per signal
- Total signal payload per workflow ≤ 2 MB (before continue-as-new)

**Implementation**:
```typescript
const MAX_SIGNAL_SIZE_BYTES = 64 * 1024; // 64 KB

async function sendSignal(signal: Signal): Promise<void> {
  const payload = JSON.stringify(signal);
  
  if (Buffer.byteLength(payload, 'utf8') > MAX_SIGNAL_SIZE_BYTES) {
    throw new Error(
      `Signal exceeds size limit: ${Buffer.byteLength(payload)} > ${MAX_SIGNAL_SIZE_BYTES} bytes. ` +
      `Use artifact storage for large payloads.`
    );
  }
  
  await workflow.signal('handleSignal', signal);
}
```

**Mitigation for large signals**:
```typescript
// BAD: Inline large payload in signal
await workflow.signal('deploySnapshot', { snapshot: largeJSON }); // 500KB payload

// GOOD: Store in StateStore, send reference
const snapshotRef = await stateStore.storeArtifact({
  kind: 'snapshot',
  data: largeJSON,
  runId: workflow.info().workflowId
});

await workflow.signal('deploySnapshot', { snapshotRef: snapshotRef.uri }); // 100 bytes
```

### 2.2 Rate Limits

**MUST enforce**:
- `maxSignalsPerRunPerMinute = 60` (configurable, default conservative)

**Implementation**:
```typescript
class SignalRateLimiter {
  private signalTimestamps: number[] = [];
  private readonly MAX_SIGNALS_PER_MINUTE = 60;
  
  async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    
    // Prune old timestamps
    this.signalTimestamps = this.signalTimestamps.filter(ts => ts > oneMinuteAgo);
    
    if (this.signalTimestamps.length >= this.MAX_SIGNALS_PER_MINUTE) {
      throw new Error(
        `Signal rate limit exceeded: ${this.signalTimestamps.length} signals in last 60s ` +
        `(max: ${this.MAX_SIGNALS_PER_MINUTE})`
      );
    }
    
    this.signalTimestamps.push(now);
  }
}
```

---

## 3) Activity Timeout Policies

### 3.1 Default Timeouts

**MUST configure** for all activities:

```typescript
const defaultActivityOptions: ActivityOptions = {
  // Start-to-close: total time allowed (including retries)
  startToCloseTimeout: '30m',
  
  // Schedule-to-start: max queue time before activity starts
  scheduleToStartTimeout: '5m',
  
  // Schedule-to-close: total time from schedule to completion
  scheduleToCloseTimeout: '35m',
  
  // Heartbeat: activity must heartbeat every N seconds
  heartbeatTimeout: '60s',
  
  // Retry policy
  retry: {
    initialInterval: '1s',
    maximumInterval: '60s',
    backoffCoefficient: 2.0,
    maximumAttempts: 5,
    nonRetryableErrorTypes: ['AuthorizationError', 'ValidationError']
  }
};
```

### 3.2 Per-Step-Type Overrides

```typescript
const activityOptionsPerStepType: Record<string, Partial<ActivityOptions>> = {
  // dbt runs can take hours
  'dbt-run': {
    startToCloseTimeout: '4h',
    scheduleToCloseTimeout: '5h',
    heartbeatTimeout: '5m', // Heartbeat every 5 min
  },
  
  // Quick healthchecks
  'healthcheck': {
    startToCloseTimeout: '10s',
    scheduleToCloseTimeout: '15s',
    retry: { maximumAttempts: 1 }, // No retries
  },
  
  // Warehouse queries (variable time)
  'warehouse-query': {
    startToCloseTimeout: '15m',
    heartbeatTimeout: '30s',
  }
};
```

---

## 4) Workflow History Size Monitoring

### 4.1 Estimate History Size (Heuristic)

```typescript
function estimateEventSize(step: Step): number {
  // Rough estimates (bytes per event type)
  const EVENT_SIZE_ESTIMATES = {
    ActivityScheduled: 500,
    ActivityStarted: 200,
    ActivityCompleted: 1000,  // Includes result payload
    ActivityFailed: 800,
    TimerStarted: 300,
    TimerFired: 200,
    SignalReceived: 400,
    MarkerRecorded: 600,
  };
  
  // Estimate: 4 events per step (scheduled, started, completed, marker)
  return (
    EVENT_SIZE_ESTIMATES.ActivityScheduled +
    EVENT_SIZE_ESTIMATES.ActivityStarted +
    EVENT_SIZE_ESTIMATES.ActivityCompleted +
    EVENT_SIZE_ESTIMATES.MarkerRecorded
  );
}
```

### 4.2 Query Actual History Size (Observability)

```typescript
async function getHistorySizeBytes(workflowId: string): Promise<number> {
  const client = new WorkflowClient();
  const handle = client.getHandle(workflowId);
  
  // Fetch history (paginated)
  let totalBytes = 0;
  let nextPageToken: Uint8Array | undefined;
  
  do {
    const response = await handle.fetchHistory({ nextPageToken });
    totalBytes += response.history.events.reduce((sum, event) => {
      return sum + event.toJSON().toString().length; // Rough estimate
    }, 0);
    nextPageToken = response.nextPageToken;
  } while (nextPageToken);
  
  return totalBytes;
}
```

---

## 5) Pause/Resume Semantics (Temporal-Specific)

Temporal workflows can be **paused** via signals, but NOT via native platform feature (unlike some engines).

### 5.1 Signal-Based Pause

```typescript
class WorkflowEngine {
  private isPaused = false;
  
  @workflow.defineSignal('pause')
  async handlePauseSignal(): Promise<void> {
    this.isPaused = true;
    await stateStore.appendEvent({
      runId: workflow.info().workflowId,
      eventType: 'RunPaused',
      eventData: { reason: 'operator-signal', timestamp: Date.now() },
      idempotencyKey: generateIdempotencyKey('RunPaused', ...),
    });
  }
  
  @workflow.defineSignal('resume')
  async handleResumeSignal(): Promise<void> {
    this.isPaused = false;
    await stateStore.appendEvent({
      runId: workflow.info().workflowId,
      eventType: 'RunResumed',
      eventData: { timestamp: Date.now() },
      idempotencyKey: generateIdempotencyKey('RunResumed', ...),
    });
  }
  
  async executeStep(step: Step): Promise<void> {
    // Check pause state before each step
    if (this.isPaused) {
      // Block until resumed (with timeout)
      await workflow.condition(() => !this.isPaused, '24h');
    }
    
    // ... execute step
  }
}
```

---

## 6) Idempotency Key Generation (Temporal-Specific)

**MUST use `logicalAttemptId`, NOT `engineAttemptId`** (Temporal's `attemptNumber`).

```typescript
function generateIdempotencyKey(
  runId: string,
  stepId: string,
  logicalAttemptId: string, // NOT workflow.info().attempt
  eventType: string,
  planVersion: string
): string {
  const payload = `${runId}|${stepId}|${logicalAttemptId}|${eventType}|${planVersion}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// WRONG (uses engineAttemptId)
const wrongKey = generateIdempotencyKey(
  runId,
  stepId,
  workflow.info().attempt.toString(), // ❌ Temporal retry counter
  eventType,
  planVersion
);

// CORRECT (uses logicalAttemptId)
const correctKey = generateIdempotencyKey(
  runId,
  stepId,
  this.logicalAttemptId, // ✅ Business-level retry counter
  eventType,
  planVersion
);
```

---

## 7) Determinism Constraints

### 7.1 Forbidden Operations in Workflows

Temporal workflows MUST be deterministic (see [Temporal docs](https://docs.temporal.io/workflows#deterministic-constraints)).

**FORBIDDEN** (will fail replay):
- ❌ `Math.random()`, `Date.now()`, `new Date()`
- ❌ Non-deterministic loops (`while (Math.random() > 0.5)`)
- ❌ Direct network calls (`fetch()`, `axios.get()`)
- ❌ File I/O (`fs.readFile()`)
- ❌ Global state mutations

**ALLOWED**:
- ✅ `workflow.uuid()` (deterministic UUID via workflow context)
- ✅ `workflow.now()` (deterministic timestamp)
- ✅ Activities (encapsulate non-deterministic operations)
- ✅ Signals, timers, queries

### 7.2 Linting Rules (Enforcement)

Use ESLint plugin: `@temporalio/eslint-plugin`

```json
// .eslintrc.json
{
  "plugins": ["@temporalio"],
  "rules": {
    "@temporalio/no-date-now": "error",
    "@temporalio/no-math-random": "error",
    "@temporalio/no-side-effects": "error"
  }
}
```

---

## 8) Migration from Other Engines

### 8.1 Conductor → Temporal

| Conductor Concept | Temporal Equivalent | Notes |
|-------------------|---------------------|-------|
| Task | Activity | Similar semantics |
| Wait task | Timer (`workflow.sleep()`) | Temporal more flexible |
| Switch task | Workflow branching (`if/else`) | Native in Temporal |
| Sub-workflow | Child workflow (`workflow.executeChild()`) | Temporal has better lifecycle mgmt |
| Webhook callback | Signal | Temporal signal more reliable |

**Migration checklist**:
- [ ] Replace `wait` tasks with `workflow.sleep()`
- [ ] Replace webhook callbacks with signals
- [ ] Add continue-as-new logic (Conductor has no history limit)
- [ ] Convert sub-workflows to child workflows

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-02-11 | Initial Temporal engine policies (extracted from ExecutionSemantics.v1.md) |
