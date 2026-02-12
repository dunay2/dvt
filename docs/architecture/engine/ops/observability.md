# Observability Guide (Operational)

**Audience**: Platform engineers, SREs, operations  
**Scope**: Metrics, traces, logs, alerts, SLOs  
**Status**: Phase 1 MVP  
**References**: [IWorkflowEngine](../contracts/engine/IWorkflowEngine.v1.1.md), [ExecutionSemantics](../contracts/engine/ExecutionSemantics.v1.md)

---

## 1) Observability Stack

```yaml
metrics:
  backend: Prometheus + Grafana
  cardinality: ~2000 series (runId, stepId, tenantId, errorCode)

traces:
  backend: Jaeger
  sampling: 100% for errors; 10% for success (Phase 1)

logs:
  backend: ELK (Elasticsearch + Logstash + Kibana)
  retention: 30 days (ops), 90 days (audit trail)

slo:
  targets:
    completion-latency-p99: 5s (StateStore projection)
    pause-latency-p99: 1s (signal processing)
    failure-detection-p99: 2s (error propagation)
```

---

## 2) Key Metrics (Phase 1)

### 2.1 Workflow Lifecycle

```prometheus
# Counter: total runs started (by plan, environment, adapter)
dvt_runs_started_total{planId, planVersion, environmentId, adapter} = counter

# Gauge: currently in-flight runs
dvt_runs_in_flight{environmentId, adapter} = gauge

# Histogram: run completion latency (end-to-end)
dvt_run_completion_duration_seconds{planId, status} = histogram
  quantiles: .5, .95, .99
  buckets: [0.5, 1, 2, 5, 10, 30, 60]

# Counter: run outcomes (success/failure/cancelled)
dvt_runs_completed_total{planId, status, error_code} = counter
```

### 2.2 Step Execution

```prometheus
# Histogram: per-step execution time
dvt_step_duration_seconds{planId, stepId, status} = histogram
  quantiles: .5, .95, .99

# Counter: step retries (by cause)
dvt_step_retries_total{planId, stepId, cause} = counter
  causes: ["timeout", "transient_error", "resource_exhausted"]

# Counter: step artifacts written
dvt_step_artifacts_written_bytes_total{planId, stepId} = counter
```

### 2.3 StateStore & Projection

```prometheus
# Histogram: StateStore write latency
dvt_statestore_write_duration_ms{event_type} = histogram
  quantiles: .5, .95, .99
  buckets: [1, 5, 10, 50, 100, 500]

# Gauge: snapshot projection lag (runSeq distance)
dvt_projection_lag_events{adapter} = gauge
  interpretation: lag in events behind live writes

# Counter: projection gap detections (P1 alert)
dvt_projection_gaps_total = counter

# Histogram: event emission latency (StateStore → EventBus)
dvt_event_emission_duration_ms{event_type} = histogram
```

### 2.4 Plugin Execution

```prometheus
# Counter: plugin invocations (by type, status)
dvt_plugin_invocations_total{plugin_type, status} = counter
  statuses: [success, timeout, permission_denied, isolated_failure]

# Histogram: plugin execution time
dvt_plugin_duration_seconds{plugin_type} = histogram

# Gauge: plugin sandbox memory (per-tenant)
dvt_plugin_sandbox_memory_bytes{tenantId, plugin_type} = gauge
```

### 2.5 Signals & Cancellation

```prometheus
# Counter: signals received (by type)
dvt_signals_received_total{signal_type, status} = counter
  signal_types: [PAUSE, RESUME, RETRY_STEP, CANCEL, CUSTOM_1, ...]
  statuses: [accepted, rejected, deferred]

# Histogram: signal processing latency
dvt_signal_processing_duration_ms{signal_type} = histogram

# Gauge: deferred signals in queue
dvt_deferred_signals_queue_length = gauge
```

### 2.6 Adapter Health

```prometheus
# Gauge: worker availability (by adapter, domain)
dvt_workers_available{adapter, domain} = gauge

# Counter: adapter API errors (by endpoint)
dvt_adapter_api_errors_total{adapter, endpoint, status_code} = counter

# Histogram: adapter RPC latency
dvt_adapter_rpc_duration_ms{adapter, method} = histogram
```

---

## 3) Critical Dashboards (Grafana)

### 3.1 Executive Dashboard (C-Suite, Product)

```
┌─────────────────────────────────────────────────────────────┐
│ DVT Platform Health                                        │
├─────────────────────────────────────────────────────────────┤
│ Runs/min (last 1h)   │ Completion SLA (p99)  │ Errors (24h) │
│      250 ↑ 12%       │      5.2s ✓            │    0.1%  ✓  │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│ In-Flight Runs       │ Pause Latency (p99)   │ Plugin Errors │
│      42              │      0.8s ✓            │     0/120  ✓ │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│ Top Plans by Runtime │ Adapters (active)    │ Incidents (7d)│
│ plan-1: 2.1s         │ Temporal: 2 (healthy) │      1 P1    │
│ plan-2: 3.5s         │ Conductor: 0 (beta)   │      3 P2    │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Operations Dashboard (SRE, On-Call)

```
┌─────────────────────────────────────────────────────────────┐
│ DVT Operations                                              │
├─────────────────────────────────────────────────────────────┤
│ StateStore Write Latency (ms)  │ Events/sec by Type        │
│ [graph: p50=2, p95=5, p99=12]  │ [graph: started, failed...] │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│ Projection Lag (events)        │ Worker Capacity            │
│ [graph: lag, gaps]             │ [graph: tq-control, tq-data] │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│ Error Rate by Plan             │ Top Failing Steps          │
│ [list: plan-1: 0.01%, ...]     │ [list: step-id, error...]  │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│ Deferred Signals              │ Plugin Sandbox Health      │
│ [graph: queue length]         │ [heatmap: memory by tenant] │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Developer Dashboard (Engineers, QA)

```
┌─────────────────────────────────────────────────────────────┐
│ DVT Development / Feature Testing                           │
├─────────────────────────────────────────────────────────────┤
│ Test Plan (plan-test-1) Status │ Determinism Check         │
│ [graph: step timings, retries] │ [table: attempt diffs]     │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│ Tracing: Plan X, Run Y         │ Event Replay               │
│ [trace: full waterfall]        │ [graph: event sequence]    │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│ Log Tail (last 100 for runId)  │ Plugin Invocation Log       │
│ [scrollable log]               │ [table: timing, sandbox mem] │
└─────────────────────────────────────────────────────────────┘
```

---

## 4) Alerting Rules (Prometheus AlertManager)

### 4.1 P1 Alerts (Page On-Call)

```yaml
alerts:
  - name: ProjectionGapDetected
    condition: dvt_projection_gaps_total > 0
    for: 1m
    severity: P1
    message: 'Projection gaps detected; StateStore may be diverged. Check reconciler.'
    runbook: 'docs/ops/runbooks/projection_gap_recovery.md'

  - name: StateStoreWriteFailure
    condition: |
      rate(dvt_statestore_write_errors_total[5m]) > 0
    for: 2m
    severity: P1
    message: 'StateStore write failures; workflows may stall.'

  - name: RunCompletionSLAViolation
    condition: |
      histogram_quantile(0.99, dvt_run_completion_duration_seconds) > 30
    for: 5m
    severity: P1
    message: 'Run completion p99 > 30s; investigate latency sources.'

  - name: AdapterHeartbeatLost
    condition: |
      (time() - dvt_adapter_last_heartbeat_seconds{adapter="temporal"}) > 60
    for: 2m
    severity: P1
    message: 'Temporal adapter heartbeat lost; cluster may be down.'
```

### 4.2 P2 Alerts (Slack Notification)

```yaml
alerts:
  - name: HighErrorRate
    condition: |
      (rate(dvt_runs_completed_total{status="failed"}[10m]) / 
       rate(dvt_runs_completed_total[10m])) > 0.05
    for: 10m
    severity: P2
    message: 'Error rate > 5% (10m window); check most-failing plans.'

  - name: ProjectionLag
    condition: |
      dvt_projection_lag_events > 100
    for: 5m
    severity: P2
    message: 'Snapshot projection lag > 100 events; reconciler may be slow.'

  - name: DeferredSignalsQueueBuildup
    condition: |
      dvt_deferred_signals_queue_length > 1000
    for: 10m
    severity: P2
    message: 'Deferred signals queue > 1000; system may be rate-limited.'

  - name: PluginRejectRate
    condition: |
      (rate(dvt_plugin_invocations_total{status="permission_denied"}[5m]) / 
       rate(dvt_plugin_invocations_total[5m])) > 0.01
    for: 5m
    severity: P2
    message: 'Plugin permission denials > 1%; check sandbox policies.'
```

---

## 5) Tracing Instrumentation (Jaeger)

### 5.1 Trace Spans

```
Span Hierarchy:

workflow.start
  ├─ engine.validatePlan
  │  └─ adapter.validateCapabilities
  ├─ engine.executeRun
  │  ├─ plan.fetch
  │  ├─ step[1].execute
  │  │  ├─ plugin.invoke (if applicable)
  │  │  ├─ artifact.store
  │  │  └─ statestore.emit_event
  │  ├─ signal.accept (PAUSE)
  │  │  └─ step[1].cancel
  │  └─ step[2].execute
  │     └─ statestore.emit_event
  └─ workflow.complete
     └─ statestore.finalizeRun
```

### 5.2 Span Attributes

```
Span: engine.executeRun
  Attributes:
    runId: "run-1a2b3c"
    planId: "plan-dbt-01"
    planVersion: "v2.1"
    tenantId: "tenant-123"
    engineAttemptId: "temporal-attempt-42"
    logicalAttemptId: "log-attempt-1"
    adapter: "temporal"

  Events:
    - name: "plan_fetched"
      attributes:
        sizeBytes: 125000
        sha256: "abc123..."
        cached: false

    - name: "step_started"
      attributes:
        stepId: "dbt-run-1"
        workerDomain: "tq-data"

  Status: OK | ERROR (with error code)
```

---

## 6) Logging Strategy

### 6.1 Log Levels

```
DEBUG:  Step input/output (PII masked), plugin sandbox activity
INFO:   Run lifecycle (start, pause, complete), signal acceptance
WARNING: Retries, degraded capability, deferred signals
ERROR:  Step failure, StateStore write error, plugin isolation
FATAL:  Adapter crash, StateStore unavailable, system-wide issue
```

### 6.2 Structured Logging (JSON)

```json
{
  "timestamp": "2026-02-11T14:25:30.123Z",
  "level": "INFO",
  "component": "engine",
  "message": "Run started",

  "runId": "run-abc123",
  "planId": "plan-dbt-01",
  "planVersion": "v2.1",
  "tenantId": "tenant-123",
  "environmentId": "prod",
  "adapter": "temporal",

  "context": {
    "engineAttemptId": "temporal-attempt-42",
    "logicalAttemptId": "log-attempt-1",
    "sourceIP": "192.168.1.100",
    "requestId": "req-xyz789"
  },

  "metrics": {
    "planFetchDurationMs": 125,
    "validationDurationMs": 45
  }
}
```

---

## 7) SLOs (Service Level Objectives)

### 7.1 SLO Targets (Phase 1)

| Objective                    | Target | Window | Alert Threshold  |
| ---------------------------- | ------ | ------ | ---------------- |
| **Completion Latency p99**   | 5s     | 30d    | 30s (5m window)  |
| **Pause Latency p99**        | 1s     | 30d    | 5s (5m window)   |
| **Availability**             | 99.5%  | 30d    | <99% (4h window) |
| **Error Rate**               | <0.1%  | 30d    | >1% (10m window) |
| **Projection Gap Detection** | 0 gaps | 30d    | >0 (1m window)   |

### 7.2 SLO Error Budget

```
Q1 2026 Availability Budget (99.5% target):
  Total minutes: 43,200
  Allowed downtime (0.5%): 216 minutes (3.6 hours)

Current consumption:
  [Week 1] Adapter upgrade: 12 minutes
  [Week 2] StateStore write issue: 8 minutes
  Remaining: 196 minutes

Burn rate (if continued at week 2 pace): ~0.9 hours/week
Alert threshold: If 50% of budget consumed before 50% of period elapsed.
```

---

## 8) On-Call Runbooks (Quick Reference)

| Scenario            | Detection                     | First Steps                                     | Runbook                               |
| ------------------- | ----------------------------- | ----------------------------------------------- | ------------------------------------- |
| **Adapter Down**    | Heartbeat lost (P1)           | Check Temporal cluster status; restart workers  | `runbooks/adapter_recovery.md`        |
| **Projection Gap**  | Projection gaps alert (P1)    | Check reconciler logs; manually align snapshot  | `runbooks/projection_gap_recovery.md` |
| **High Error Rate** | Error rate > 5% (P2)          | Identify failing plan; check step logs          | `runbooks/investigation_framework.md` |
| **Stuck Workflow**  | In-flight > 30m + no progress | Check StateStore + Adapter; manual intervention | `runbooks/stuck_workflow_recovery.md` |

---

## 9) Observability Evolution (Post-MVP)

- [ ] **Phase 2**: Auto-remediation workflows (P2 alerts → auto-restart, rebalance, etc.).
- [ ] **Phase 3**: ML-based anomaly detection (unusual tenants, plans, error patterns).
- [ ] **Phase 4**: Cost attribution per tenant (compute, storage, network).

---

## References

- [Prometheus Operator Helm Chart](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
- [Grafana Dashboarding Guide](https://grafana.com/docs/grafana/latest/dashboards/)
- [Jaeger Sampling Strategies](https://www.jaegertracing.io/docs/features/#adaptive-sampling-strategies)
- [Runbooks Directory](./runbooks/)
