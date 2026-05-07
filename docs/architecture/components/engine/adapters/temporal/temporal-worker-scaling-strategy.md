---
title: Temporal Worker Scaling Strategy
status: Active
owner: Runtime / Temporal / Architecture
last_reviewed: 2026-05-07
domain: runtime
---

# Temporal Worker Scaling Strategy

This document defines the worker scaling strategy for 1000+ tenants. It covers
worker topology, task-queue density, cold-start latency, autoscaling triggers,
tenant-to-queue assignment policy, noisy-tenant isolation, and operational
failure modes.

Use this document with:

- [Temporal adapter specification](./temporal-adapter-spec.md)
- [Temporal PlanRef capacity SLA](./temporal-planref-capacity-sla.md)
- [Temporal DBT worker plugin profile](./temporal-dbt-worker-plugin-profile.md)
- [Temporal step plugin profile](./temporal-step-plugin-profile.md)
- [Temporal Worker DBT Runtime Runbook](../../../../../runbooks/temporal-worker-dbt-plugin-runtime-20260414.md)
- [Temporal Worker Scaling Operations Runbook](../../../../../runbooks/temporal-worker-scaling-operations.md)
- [Reference Architecture](../../../../reference-architecture.md)
- [ADR-0003 execution model](../../../../../adr/ADR-0003-execution-model.md)

## Owned Concern

The component owns one concern: define the worker topology and scaling rules for
multi-tenant Temporal execution so that operators can provision, monitor, and
evolve worker capacity without ad hoc routing decisions.

It does **not** own:

- Temporal cluster sizing or namespace topology
- PlanRef workflow orchestration or capacity SLA
- DBT or plugin execution profiles
- Billing, compliance, or enterprise pilot work
- Production scale proof — this document defines design readiness, not load-test
  evidence

## Worker Topology

### Default: Shared Worker Pool

The default topology is a **shared worker pool** that polls all tenant task
queues. This is the simplest operational model and the recommended starting
point.

```
┌─────────────────────────────────────────┐
│           Shared Worker Pool            │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Worker 1 │  │ Worker 2 │  │Worker N│ │
│  └──────────┘  └──────────┘  └────────┘ │
│         │              │           │      │
│         ▼              ▼           ▼      │
│  ┌─────────────────────────────────────┐  │
│  │  Task Queues: dvt_tenant-{A..Z}     │  │
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Characteristics:**

- All workers in the pool share the same task queue subscription set.
- Temporal distributes tasks across available workers within the pool.
- Worker count scales horizontally within the pool.
- No tenant affinity — any worker can pick up any tenant's task.

**When to use:**

- Fewer than 1000 tenants with moderate activity.
- Homogeneous workload profiles across tenants.
- No tenant requires dedicated capacity guarantees.

### Alternative: Dedicated Per-Tenant Workers

For high-volume tenants, dedicated worker processes can be assigned to a single
tenant's task queue.

```
┌──────────────────┐   ┌──────────────────┐
│ Dedicated Worker  │   │ Dedicated Worker  │
│ for tenant-A      │   │ for tenant-B      │
│ polls:            │   │ polls:            │
│ dvt_tenant-A      │   │ dvt_tenant-B      │
└──────────────────┘   └──────────────────┘

┌─────────────────────────────────────────┐
│           Shared Worker Pool            │
│ polls: dvt_tenant-{C..Z}               │
└─────────────────────────────────────────┘
```

**Characteristics:**

- Dedicated workers subscribe to exactly one task queue.
- No resource contention with other tenants.
- Predictable capacity for SLA-bound tenants.

**When to use:**

- Tenant exceeds 20% of shared pool capacity.
- Tenant requires guaranteed throughput or latency SLOs.
- Tenant runs large DAGs (>500 layers) that need stable worker memory.

### Decision Criteria

| Condition                            | Recommended Topology                               |
| ------------------------------------ | -------------------------------------------------- |
| < 100 tenants, low activity          | Shared pool, 2–4 workers                           |
| 100–1000 tenants, moderate activity  | Shared pool, 4–16 workers                          |
| > 1000 tenants                       | Shared pool + dedicated workers for top 5% tenants |
| Tenant with > 20% pool utilization   | Dedicated worker                                   |
| Tenant with latency SLO              | Dedicated worker                                   |
| Tenant with large DAG (> 500 layers) | Dedicated worker with increased memory             |

## Task Queue Density Model

### Naming Convention

Task queues follow the pattern established in the Temporal adapter spec:

```
dvt_${tenantId}
```

Each tenant gets exactly one task queue. This is the current convention and the
recommended default for 1000+ tenants.

### Temporal Platform Limits

| Limit                            | Value                     | Impact at 1000 tenants                                                                                       |
| -------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Max task queues per cluster      | 100,000 (soft)            | 1000 queues = 1% of limit — safe                                                                             |
| Max task queue pollers           | 2,000 per queue (soft)    | Shared pool: N pollers per queue. At 16 workers × 1000 queues = 16,000 pollers — within Temporal soft limits |
| Max workflow task execution time | 10 seconds (default)      | No direct impact                                                                                             |
| Max activity task execution time | Configurable per activity | DBT activities may need extended time                                                                        |

### Density Considerations

- **Polling overhead**: Each worker polls every subscribed task queue. At 1000
  queues × 16 workers = 16,000 long-poll connections. Temporal handles this, but
  operators should monitor `temporal_server_long_poll_total` and
  `temporal_server_poller_count` metrics.
- **Idle queues**: Tenants with low activity create idle task queues. Idle queues
  consume minimal Temporal server resources (metadata only) but add polling
  overhead on workers. Mitigation: use Temporal's `task_queue_unavailable` TTL
  to clean up truly idle queues after a configurable inactivity period.
- **Queue saturation**: A single tenant with high activity can saturate the
  shared pool. Monitor `temporal_task_queue_latency` per queue. When a queue's
  latency exceeds the SLO threshold, evaluate moving that tenant to a dedicated
  worker.

## Worker Image Specialization

All workers in the shared pool run the **same worker image**. Image
specialization is reserved for dedicated workers that need different resource
profiles (e.g., more memory for large DAGs).

| Worker Type           | Image                    | Resource Profile          |
| --------------------- | ------------------------ | ------------------------- |
| Shared pool           | `temporal-worker:latest` | 2 CPU, 4 GB RAM (default) |
| Dedicated (standard)  | `temporal-worker:latest` | 2 CPU, 4 GB RAM           |
| Dedicated (large DAG) | `temporal-worker:latest` | 4 CPU, 8 GB RAM           |

Image specialization beyond resource profiles is not needed because the worker
image already contains all plugin profiles (DBT, SQL, etc.) and composes them
at startup based on environment configuration.

## Cold-Start Latency

### Sources of Cold Start

1. **Worker process startup**: Load env, create operational server, build
   runtime resources, connect to Temporal and Postgres, start runtime.
   Measured in the runbook as part of the startup sequence.
2. **Task queue polling**: When a worker starts, it must register as a poller
   on all subscribed task queues. Temporal's long-poll mechanism handles this
   within seconds.
3. **DBT profile initialization**: When `DVT_TEMPORAL_DBT_ENABLED=true`, the
   worker builds the DBT plugin profile at startup. This includes creating the
   `DbtCliPluginRunner` and resolving the DBT bundle artifact store.

### Targets

| Phase                  | Target                   | Measurement                                         |
| ---------------------- | ------------------------ | --------------------------------------------------- |
| Worker process startup | < 10 seconds             | Time from process start to `/healthz` returning 200 |
| Task queue polling     | < 5 seconds              | Time from `/healthz` 200 to first task dispatch     |
| DBT profile init       | < 3 seconds (additional) | Included in startup time when DBT enabled           |
| Total cold start       | < 15 seconds             | Time from process start to first task execution     |

These targets are design goals. Actual cold-start latency must be measured in
the target deployment environment before claiming production readiness.

## Autoscaling Signals

### Shared Pool Autoscaling

The shared worker pool scales based on aggregate metrics:

| Signal                   | Metric Source                                                 | Scale-Up Threshold | Scale-Down Threshold | Cooldown |
| ------------------------ | ------------------------------------------------------------- | ------------------ | -------------------- | -------- |
| Task queue backlog       | Temporal `temporal_task_queue_latency` p50 > 5s               | +1 worker          | p50 < 1s for 5 min   | 3 min    |
| Activity task saturation | Temporal `temporal_activity_task_execution_latency` p99 > 30s | +2 workers         | p99 < 10s for 5 min  | 5 min    |
| Worker CPU               | Container/Pod CPU metric                                      | > 80% for 2 min    | < 40% for 5 min      | 3 min    |
| Worker memory            | Container/Pod memory metric                                   | > 80% for 2 min    | < 60% for 5 min      | 5 min    |

### Dedicated Worker Autoscaling

Dedicated workers scale based on per-tenant metrics:

| Signal            | Metric Source                                           | Scale-Up Threshold | Scale-Down Threshold | Cooldown |
| ----------------- | ------------------------------------------------------- | ------------------ | -------------------- | -------- |
| Per-queue backlog | Temporal `temporal_task_queue_latency` for tenant queue | > 10s              | < 2s for 5 min       | 5 min    |
| Worker CPU        | Container/Pod CPU metric                                | > 75% for 2 min    | < 40% for 5 min      | 3 min    |

### Manual Scaling

Operators can override autoscaling decisions through the runbook procedures.
Manual scaling is required for:

- Planned capacity changes (new tenant onboarding, expected load spikes)
- Incident response (circuit breaker open, worker crash loop)
- Topology changes (moving a tenant from shared pool to dedicated worker)

## Tenant-to-Queue Assignment Policy

### Default Assignment

Every tenant is assigned to exactly one task queue named `dvt_${tenantId}`.
This is the current convention and the default for all tenants.

### Rebalancing

When a tenant is moved from the shared pool to a dedicated worker:

1. The dedicated worker starts polling `dvt_${tenantId}`.
2. The shared pool continues to poll the same queue.
3. Temporal distributes tasks to both pollers. The dedicated worker's
   availability guarantees it will receive tasks before the shared pool's
   workers under load.
4. After the transition window (configurable, default 5 minutes), the shared
   pool can optionally stop polling the queue to reduce overhead.

**Rollback**: Stop the dedicated worker. The shared pool resumes full
responsibility for the tenant's queue.

### Queue Lifecycle

| Event                            | Action                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------- |
| New tenant created               | Task queue `dvt_${tenantId}` is created implicitly on first workflow start   |
| Tenant deactivated               | Task queue remains; no new workflows start. Clean up after retention period. |
| Tenant moved to dedicated worker | See rebalancing procedure above                                              |
| Tenant moved back to shared pool | Stop dedicated worker; shared pool resumes                                   |

## Noisy-Tenant Isolation

### Detection

A tenant is considered "noisy" when any of these conditions are met:

- Per-queue task latency exceeds 10s for more than 5 minutes.
- Worker CPU utilization exceeds 80% and the tenant's queue is the top
  contributor.
- Activity execution failures for a single tenant exceed 5% of total attempts
  in a 10-minute window.

### Isolation Actions

| Severity | Action                                           | Response Time     |
| -------- | ------------------------------------------------ | ----------------- |
| Low      | Alert operator, log tenant ID                    | Within 15 minutes |
| Medium   | Move tenant to dedicated worker                  | Within 30 minutes |
| High     | Rate-limit tenant's workflow starts at admission | Within 5 minutes  |

### Rate Limiting

Rate limiting is an admission control concern (Lane C). The scaling strategy
assumes that per-tenant rate limits exist at the API/admission boundary. When a
tenant exceeds its rate limit, the admission layer rejects new workflow starts
before they reach the Temporal worker.

## Operational Failure Modes

### Worker Crash Loop

**Symptoms**: Worker process exits immediately after start. `/healthz` returns
503 or connection refused.

**Causes**:

- Invalid environment configuration
- Temporal or Postgres connection failure
- DBT profile initialization failure (when DBT enabled)

**Mitigation**:

1. Check worker logs for startup errors.
2. Verify environment variables against the runbook.
3. If DBT-related, disable DBT (`DVT_TEMPORAL_DBT_ENABLED=false`) and restart.
4. Escalate to runtime team if configuration is correct but startup still fails.

### Worker Degraded (Running but Not Processing)

**Symptoms**: Worker is up (`/healthz` 200) but not picking up tasks. Task queue
backlog grows.

**Causes**:

- Worker lost Temporal connection but process did not detect it.
- Worker stuck in a long-running activity that blocks the activity worker.
- Poller registration failed for some task queues.

**Mitigation**:

1. Check `/readyz` — if 503, the worker is not ready to accept tasks.
2. Check `/metrics` for `dvt_temporal_worker_up` — if 0, the monitor detected
   an error state.
3. Restart the worker process.
4. If recurring, investigate Temporal connection stability and activity timeouts.

### Task Queue Saturation

**Symptoms**: `temporal_task_queue_latency` exceeds 30s for one or more queues.
Worker CPU/memory remains below thresholds.

**Causes**:

- Insufficient workers in the shared pool.
- A noisy tenant is consuming disproportionate worker capacity.
- Activity execution time is longer than expected (e.g., DBT CLI process hang).

**Mitigation**:

1. Scale up the shared pool (autoscaling should trigger automatically).
2. Identify the saturated queue(s) via Temporal metrics.
3. If a single tenant is the cause, move to dedicated worker.
4. If DBT activity is hanging, investigate the DBT CLI process.

### Circuit Breaker Open

**Symptoms**: Run-state command writes to the state store are failing. The
circuit breaker in `TemporalWorkerMonitor` transitions to `open`.

**Causes**:

- Postgres state store is unavailable or slow.
- Connection pool exhaustion.

**Mitigation**:

1. Check Postgres health and connection pool metrics.
2. The circuit breaker auto-recovers after the configured timeout.
3. If persistent, investigate Postgres state store capacity and connection
   pooling configuration.

## Rollout and Rollback Posture

### Topology Changes

| Change                          | Rollout                                                                                                                                               | Rollback                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Add workers to shared pool      | Deploy new worker instances. No configuration change needed.                                                                                          | Terminate excess workers.                                       |
| Remove workers from shared pool | Gracefully shut down workers (SIGINT). In-flight tasks complete before shutdown.                                                                      | Deploy replacement workers.                                     |
| Move tenant to dedicated worker | Deploy dedicated worker polling the tenant's queue. Shared pool continues polling. After transition window, optionally remove queue from shared pool. | Stop dedicated worker. Shared pool resumes full responsibility. |
| Move tenant back to shared pool | Stop dedicated worker. Shared pool already polls the queue.                                                                                           | Redeploy dedicated worker.                                      |

### Image Changes

Worker image updates follow standard deployment procedures:

1. Deploy new image to a canary worker in the shared pool.
2. Monitor `/healthz`, `/readyz`, `/metrics` for the canary.
3. If canary is healthy for 10 minutes, roll out to remaining workers.
4. If canary fails, roll back to previous image.

### Configuration Changes

Environment variable changes (e.g., enabling/disabling DBT) require a worker
restart. Use gradual rollout:

1. Update configuration for one worker.
2. Restart the worker.
3. Monitor startup sequence via `/healthz` and `/readyz`.
4. If successful, roll out to remaining workers.
5. If failed, revert configuration and restart.

## Current Limits

- The shared pool topology assumes homogeneous worker images. Image
  specialization is only used for dedicated workers with different resource
  profiles.
- Autoscaling signals and thresholds are design targets. They must be validated
  and tuned in the target deployment environment.
- No production scale proof exists for 1000+ tenants. This document defines
  design readiness, not load-test evidence.
- Tenant-to-queue rebalancing is a manual procedure. Automation of rebalancing
  is future work.
- Rate limiting at the admission layer is assumed but not yet implemented
  (Lane C concern).
