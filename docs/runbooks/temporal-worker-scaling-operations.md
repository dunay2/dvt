---
title: Temporal Worker Scaling Operations
status: Active
owner: Runtime / Temporal / Operations
last_reviewed: 2026-05-07
---

# Temporal Worker Scaling Operations

This runbook covers operational procedures for provisioning, monitoring, and
scaling Temporal workers in a multi-tenant environment.

Use this runbook with:

- [Temporal Worker Scaling Strategy](../architecture/components/engine/adapters/temporal/temporal-worker-scaling-strategy.md)
- [Temporal Worker DBT Runtime Runbook](./temporal-worker-dbt-plugin-runtime-20260414.md)
- [Temporal PlanRef capacity SLA](../architecture/components/engine/adapters/temporal/temporal-planref-capacity-sla.md)
- [Temporal adapter specification](../architecture/components/engine/adapters/temporal/temporal-adapter-spec.md)

## Provisioning Worker Pools

### Prerequisites

Before provisioning a worker pool, verify:

1. Temporal cluster is reachable and the target namespace exists.
2. Postgres instance is reachable and migrated (`pnpm db:migrate`).
3. Worker image is built and available in the container registry.
4. Environment configuration is complete (see required env vars below).

### Required Environment Variables

| Variable                                     | Required | Default   | Description                                        |
| -------------------------------------------- | -------- | --------- | -------------------------------------------------- |
| `DATABASE_URL`                               | Yes      | —         | Postgres connection string                         |
| `TEMPORAL_ADDRESS`                           | Yes      | —         | Temporal server gRPC address                       |
| `TEMPORAL_NAMESPACE`                         | Yes      | —         | Temporal namespace                                 |
| `TEMPORAL_TASK_QUEUE`                        | Yes      | —         | Default task queue (not used in multi-tenant mode) |
| `DVT_TEMPORAL_DBT_ENABLED`                   | No       | `false`   | Enable DBT plugin profile                          |
| `DVT_TEMPORAL_DBT_BUNDLE_DIR`                | No       | —         | DBT bundle directory (required when DBT enabled)   |
| `DVT_TEMPORAL_DBT_BUNDLE_ARTIFACT_STORE_URL` | No       | —         | DBT artifact store URL (required when DBT enabled) |
| `HOST`                                       | No       | `0.0.0.0` | Operational server bind host                       |
| `PORT`                                       | No       | `3000`    | Operational server port                            |

### Provisioning Steps

#### Shared Pool (Default)

```bash
# Step 1: Deploy worker instances
# (platform-specific: Kubernetes Deployment, Nomad job, etc.)
# Example: kubectl apply -f temporal-worker-deployment.yaml

# Step 2: Verify worker startup
curl http://<worker>:3000/healthz
# Expected: 200 OK

# Step 3: Verify worker readiness
curl http://<worker>:3000/readyz
# Expected: 200 OK

# Step 4: Verify metrics endpoint
curl http://<worker>:3000/metrics
# Expected: text/plain with dvt_temporal_worker_up 1

# Step 5: Confirm worker appears in Temporal Server UI
# Navigate to: https://<temporal-ui>/namespaces/<namespace>/task-queues
```

#### Dedicated Worker (Single Tenant)

```bash
# Deploy a worker that polls only one tenant's task queue
# Set TEMPORAL_TASK_QUEUE=dvt_<tenantId>
# The worker will only poll that specific queue

# Example: kubectl apply -f temporal-worker-dedicated-tenant-a.yaml
```

### Verifying Provisioning

After provisioning, confirm:

1. `/healthz` returns `200` — worker process is running.
2. `/readyz` returns `200` — worker is ready to accept tasks.
3. `/metrics` exposes `dvt_temporal_worker_up 1` — lifecycle metric is healthy.
4. Temporal Server UI shows the worker as a poller for the expected task queues.

## Monitoring Saturation

### Key Metrics

| Metric                                     | Source                  | What It Indicates                                                               |
| ------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------- |
| `dvt_temporal_worker_up`                   | Worker `/metrics`       | Worker lifecycle state (1=running, 0=error)                                     |
| `dvt_temporal_worker_state`                | Worker `/metrics`       | Current runtime state (0=starting, 1=running, 2=stopping, 3=failing, 4=stopped) |
| `dvt_temporal_worker_dbt_enabled`          | Worker `/metrics`       | DBT plugin status (1=enabled, 0=disabled)                                       |
| `dvt_temporal_worker_error_total`          | Worker `/metrics`       | Cumulative error count                                                          |
| `temporal_task_queue_latency`              | Temporal Server metrics | Time tasks wait in queue before pickup                                          |
| `temporal_activity_task_execution_latency` | Temporal Server metrics | Time to execute activity tasks                                                  |
| `temporal_server_poller_count`             | Temporal Server metrics | Number of pollers per task queue                                                |
| Worker CPU                                 | Container/Pod metrics   | Worker process CPU utilization                                                  |
| Worker memory                              | Container/Pod metrics   | Worker process memory utilization                                               |

### Saturation Thresholds

| Metric                                         | Warning       | Critical        | Action                                     |
| ---------------------------------------------- | ------------- | --------------- | ------------------------------------------ |
| `temporal_task_queue_latency` p50              | > 5s          | > 15s           | Scale up shared pool or move noisy tenant  |
| `temporal_activity_task_execution_latency` p99 | > 30s         | > 60s           | Investigate activity execution (DBT hang?) |
| Worker CPU                                     | > 70%         | > 85%           | Scale up or investigate noisy tenant       |
| Worker memory                                  | > 75%         | > 90%           | Scale up or move large-DAG tenants         |
| `dvt_temporal_worker_error_total`              | Any increment | Rapid increment | Investigate worker logs                    |

### Dashboard Setup

Recommended dashboard panels:

1. **Worker fleet overview**: `dvt_temporal_worker_up` per worker, worker count.
2. **Task queue latency**: Heatmap of `temporal_task_queue_latency` by queue.
3. **Worker resource usage**: CPU and memory per worker.
4. **Error rate**: `dvt_temporal_worker_error_total` rate per worker.
5. **DBT status**: `dvt_temporal_worker_dbt_enabled` per worker.

## Adding Capacity

### When to Add Capacity

Add capacity when any of these conditions are met:

1. `temporal_task_queue_latency` p50 exceeds 5s for more than 5 minutes.
2. Worker CPU exceeds 80% for more than 2 minutes.
3. Worker memory exceeds 80% for more than 2 minutes.
4. A new tenant with high expected activity is being onboarded.

### How to Add Capacity

#### Scale Up Shared Pool

```bash
# Increase the replica count of the shared pool deployment
# Example: kubectl scale deployment temporal-worker --replicas=8

# Verify new workers join the pool
# Check Temporal Server UI for increased poller count
```

#### Add Dedicated Worker for a Tenant

```bash
# 1. Deploy a dedicated worker polling the tenant's queue
# Example: kubectl apply -f temporal-worker-dedicated-tenant-a.yaml

# 2. Verify the dedicated worker starts and polls the queue
curl http://<dedicated-worker>:3000/healthz
curl http://<dedicated-worker>:3000/readyz

# 3. Monitor the tenant's queue latency
# Expected: latency decreases as dedicated worker picks up tasks

# 4. (Optional) Remove the tenant's queue from shared pool polling
# This requires a shared pool configuration update and restart
```

### Capacity Planning Guidelines

| Tenant Tier | Expected Activity | Recommended Workers                                |
| ----------- | ----------------- | -------------------------------------------------- |
| Low         | < 10 runs/day     | Shared pool (default)                              |
| Medium      | 10–100 runs/day   | Shared pool (default)                              |
| High        | 100–1000 runs/day | Shared pool + monitor for dedicated worker trigger |
| Critical    | > 1000 runs/day   | Dedicated worker                                   |

## Rebalancing Tenants or Task Queues

### Moving a Tenant from Shared Pool to Dedicated Worker

```bash
# Step 1: Deploy dedicated worker
kubectl apply -f temporal-worker-dedicated-<tenantId>.yaml

# Step 2: Wait for dedicated worker to start and poll the queue
# Monitor: temporal_server_poller_count for dvt_<tenantId> increases by 1

# Step 3: Monitor queue latency for 5 minutes
# Expected: latency decreases as dedicated worker absorbs load

# Step 4: (Optional) Remove queue from shared pool
# Update shared pool configuration to exclude dvt_<tenantId>
# Restart shared pool workers with updated configuration

# Step 5: Confirm dedicated worker is handling the tenant's tasks
# Check Temporal Server UI for task dispatch on the dedicated worker
```

### Moving a Tenant Back to Shared Pool

```bash
# Step 1: (If queue was removed from shared pool) Add queue back
# Update shared pool configuration to include dvt_<tenantId>
# Restart shared pool workers

# Step 2: Stop dedicated worker
kubectl delete deployment temporal-worker-dedicated-<tenantId>

# Step 3: Confirm shared pool is handling the tenant's tasks
# Check Temporal Server UI for task dispatch on shared pool workers
```

### Rebalancing Multiple Tenants

For bulk rebalancing (e.g., after a large tenant onboarding):

1. Add capacity to the shared pool first (scale up by 20–50%).
2. Move tenants one at a time, monitoring queue latency after each move.
3. Allow 5 minutes between moves for Temporal to redistribute tasks.
4. After all tenants are moved, scale down the shared pool if appropriate.

## Evidence Required Before Claiming Scale Readiness

Before claiming that the worker scaling strategy is production-ready for
1000+ tenants, the following evidence must be produced:

1. **Load test results**: Shared pool handles 1000 task queues with < 5s p50
   latency under expected load.
2. **Cold-start measurement**: Worker cold start completes within 15 seconds
   (including DBT profile init if enabled).
3. **Autoscaling validation**: Autoscaling triggers fire at the configured
   thresholds and workers scale within the cooldown period.
4. **Tenant isolation test**: A noisy tenant on a dedicated worker does not
   affect shared pool latency for other tenants.
5. **Rebalancing drill**: Moving a tenant from shared pool to dedicated worker
   and back completes without task loss or duplicate execution.
6. **Failure mode drill**: Worker crash, degraded state, and circuit breaker
   open scenarios are exercised and recovery procedures are validated.

Until this evidence exists, the scaling strategy is **design-ready only**, not
production-proven.
