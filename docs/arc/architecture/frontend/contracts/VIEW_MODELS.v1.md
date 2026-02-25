# VIEW_MODELS.v1.md - UI View Models

**Version**: 1.0  
**Date**: 2026-02-11  
**Status**: Normative (Contract)  
**Location**: docs/architecture/frontend/contracts/VIEW_MODELS.v1.md

---

## Executive Summary

View models are **UI-ready data structures** returned by the API. They are NOT raw engine models — they are **transformed** for optimal UI consumption (denormalized, enriched, formatted).

**Key Principles**:

- **UI-optimized**: No N+1 queries, pre-computed aggregations
- **Stable**: Don't expose internal engine structure
- **Versioned**: Breaking changes → new version

---

## Core View Models

### RunSummary

Lightweight run info for list views.

```typescript
interface RunSummary {
  runId: string;
  planId: string;
  planName: string; // Denormalized for display

  status: RunStatus;
  startedAt: string; // ISO8601
  completedAt?: string;
  duration?: number; // Milliseconds (computed)

  progress: {
    completed: number;
    total: number;
    percentage: number; // Pre-computed: (completed / total) * 100
  };

  cost?: {
    estimate: string; // "$1.23 USD" (formatted)
    breakdown?: CostBreakdown;
  };

  author: {
    userId: string;
    name: string;
    avatar?: string;
  };
}

type RunStatus = 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
```

---

### RunDetail

Full run info + timeline + logs.

```typescript
interface RunDetail extends RunSummary {
  timeline: StepTimelineItem[];

  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;

  signals: SignalEvent[]; // PAUSE, RESUME, CANCEL history

  artifacts: ArtifactSummary[];

  metrics?: {
    cpuSeconds: number;
    memoryPeakMB: number;
    networkEgressGB: number;
  };
}
```

---

### StepTimelineItem

Individual step in run timeline (for Gantt chart / timeline view).

```typescript
interface StepTimelineItem {
  stepId: string;
  nodeId: string; // Link to graph node
  nodeName: string; // Denormalized

  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: number;

  retries: number;
  attempt: number; // Current attempt (1-indexed)

  logs?: {
    snippet: string; // Last 100 chars for preview
    fullUrl: string; // Link to full logs
  };

  error?: {
    code: string;
    message: string;
    stackTrace?: string; // Only if user has debug permission
  };
}

type StepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
```

---

### NodeStatus

Graph node status (for React Flow rendering).

```typescript
interface NodeStatus {
  nodeId: string;
  status: NodeDisplayStatus;

  lastRunId?: string;
  lastRunStatus?: RunStatus;
  lastRunAt?: string;

  // Aggregated stats (last 30 days)
  stats?: {
    successRate: number; // 0.0-1.0
    avgDuration: number; // Seconds
    failureCount: number;
  };
}

type NodeDisplayStatus =
  | 'idle' // Never run
  | 'running' // Currently executing
  | 'success' // Last run succeeded
  | 'failed' // Last run failed
  | 'warning'; // Last run succeeded but with warnings
```

---

### PlanSummary

Plan list item.

```typescript
interface PlanSummary {
  planId: string;
  name: string;
  status: PlanStatus;
  version: number;

  lastRunId?: string;
  lastRunStatus?: RunStatus;
  lastRunAt?: string;

  createdAt: string;
  updatedAt: string;

  author: {
    userId: string;
    name: string;
    avatar?: string;
  };

  stats: {
    totalRuns: number;
    nodeCount: number;
    edgeCount: number;
  };
}

type PlanStatus = 'draft' | 'published' | 'archived';
```

---

### PlanDetail

Full plan + graph definition.

```typescript
interface PlanDetail extends PlanSummary {
  graph: GraphDefinition;

  validation?: ValidationResult;

  permissions?: {
    // User's permissions on this plan
    canEdit: boolean;
    canDelete: boolean;
    canRun: boolean;
  };
}

interface GraphDefinition {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface GraphNode {
  id: string;
  type: string; // 'dbt-model', 'python-task', etc.
  config: Record<string, unknown>;
  position: { x: number; y: number };
  data?: {
    label: string;
    icon?: string;
  };
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type?: 'default' | 'conditional';
  condition?: string;
}
```

---

### AuditLogEntry

Audit log entry for audit viewer.

```typescript
interface AuditLogEntry {
  auditId: string;
  timestamp: string;

  actor: {
    userId: string;
    name: string;
    email?: string; // Redacted if PII protection enabled
  };

  action: string; // 'RUN_START', 'PLAN_UPDATE', etc.

  resource: {
    type: string;
    id: string;
    name?: string; // Denormalized for display
  };

  decision: 'GRANTED' | 'DENIED';

  context?: {
    ip?: string; // Redacted if PII protection enabled
    userAgent?: string;
  };
}
```

---

### CostBreakdown

Cost breakdown for billing/analytics.

```typescript
interface CostBreakdown {
  total: string; // "$1.23 USD" (formatted)
  currency: string; // "USD"

  breakdown: {
    compute: number;
    storage: number;
    network: number;
  };

  details?: CostLineItem[];
}

interface CostLineItem {
  resource: string; // "dbt-model:staging.users"
  cost: number;
  unit: string; // "cpu-seconds", "GB-egress"
  quantity: number;
}
```

---

## Transformation Rules

### Date Formatting

```typescript
// ❌ DON'T: Return Unix timestamps
{ "startedAt": 1707648000 }

// ✅ DO: Return ISO8601 strings
{ "startedAt": "2026-02-11T10:00:00Z" }
```

### Denormalization

```typescript
// ❌ DON'T: Require frontend to join
{
  "runId": "run-1",
  "planId": "plan-abc"
  // Frontend must fetch /plans/plan-abc to get name
}

// ✅ DO: Denormalize for display
{
  "runId": "run-1",
  "planId": "plan-abc",
  "planName": "dbt_daily_build"  // Included for UI
}
```

### Pre-computed Fields

```typescript
// ❌ DON'T: Force frontend to compute
{
  "completed": 5,
  "total": 10
  // Frontend computes percentage
}

// ✅ DO: Pre-compute on backend
{
  "completed": 5,
  "total": 10,
  "percentage": 50  // Already computed
}
```

---

## Testing Requirements

### Contract Tests

```typescript
describe('VIEW_MODELS.v1', () => {
  it('RunSummary has required fields', () => {
    const run: RunSummary = fetchRunSummary();

    expect(run).toHaveProperty('runId');
    expect(run).toHaveProperty('status');
    expect(run).toHaveProperty('progress.percentage');
    expect(typeof run.progress.percentage).toBe('number');
  });

  it('StepTimelineItem includes denormalized nodeName', () => {
    const step: StepTimelineItem = fetchStep();

    expect(step).toHaveProperty('nodeName');
    expect(typeof step.nodeName).toBe('string');
    // Should NOT require separate API call to get node name
  });
});
```

---

## References

- [UI_API_CONTRACT.v1.md](./UI_API_CONTRACT.v1.md) - API endpoints
- [ExecutionSemantics.v1.md](../../engine/contracts/engine/ExecutionSemantics.v1.md) - Engine model alignment

---

_Last updated: 2026-02-11_  
_Version: 1.0_  
_Status: Normative - Backend MUST return these structures_
