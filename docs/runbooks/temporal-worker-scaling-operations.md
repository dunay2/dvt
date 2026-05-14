---
title: Temporal Worker Scaling Operations
status: Active
owner: Runtime / SRE / Delivery
last_reviewed: 2026-05-14
---

# Temporal Worker Scaling Operations

## Purpose

Operate and scale `apps/temporal-worker` using the topology implemented in the
repository today.

Current invariant:

- `TemporalAdapter` starts tenant-scoped workflows on `<baseQueue>-<tenantId>`.
- each worker process polls exactly one `TEMPORAL_TASK_QUEUE`.
- a "pool" means multiple worker replicas polling the same queue.
- `TEMPORAL_STEP_ACTIVITY_ROUTES` can route only `executeStep` activities to
  capability-specific activity queues.
- a global shared pool that polls all tenant queues is not implemented.
- AR-D3 closes on this queue-local strategy; automated 1000+ tenant worker
  provisioning remains future platform work.

## Queue Naming

Use the same derivation as `toTemporalTaskQueue()`:

| Value                        | Example                 |
| ---------------------------- | ----------------------- |
| base queue                   | `dvt-temporal`          |
| tenant id                    | `tenant-a`              |
| tenant queue                 | `dvt-temporal-tenant-a` |
| worker `TEMPORAL_TASK_QUEUE` | `dvt-temporal-tenant-a` |

For a non-empty tenant id, do not use `dvt_<tenantId>`. The worker queue must
match `<baseQueue>-<tenantId>`.

## Tenant Queue Assignment Policy

Use the same assignment policy as the adapter:

```bash
TEMPORAL_TASK_QUEUE=<baseQueue>-<tenantId>
```

Rules:

1. Use `<baseQueue>` only when the run has a blank tenant id.
2. Use `<baseQueue>-<tenantId>` for every non-empty tenant id.
3. Deploy one worker pool per queue that must be polled.
4. Label the deployment, dashboard, and alert route with the queue name.
5. Do not move in-flight workflows by changing worker environment variables;
   queued workflow tasks stay on the queue selected at start-run time.

Capability activity queues are separate. If
`TEMPORAL_STEP_ACTIVITY_ROUTES` maps a step kind to `dvt-temporal-python`, the
worker polling `dvt-temporal-python` must include the matching plugin/runtime.
The workflow itself still starts on the tenant workflow queue.

## Required Environment

### Always Required

| Variable                             | Required | Default   | Purpose                            |
| ------------------------------------ | -------- | --------- | ---------------------------------- |
| `DATABASE_URL`                       | Yes      | none      | Postgres connection string         |
| `TEMPORAL_ADDRESS`                   | Yes      | none      | Temporal server gRPC address       |
| `TEMPORAL_NAMESPACE`                 | Yes      | none      | Temporal namespace                 |
| `TEMPORAL_TASK_QUEUE`                | Yes      | none      | The single queue this worker polls |
| `DVT_PG_SCHEMA`                      | No       | `dvt`     | State-store schema                 |
| `DVT_TEMPORAL_WORKER_RUN_MIGRATIONS` | No       | `false`   | Run worker-owned migrations        |
| `TEMPORAL_STEP_ACTIVITY_ROUTES`      | No       | none      | Optional step kind activity routes |
| `DVT_TEMPORAL_ADMIN_HOST`            | No       | `0.0.0.0` | Operational server bind host       |
| `DVT_TEMPORAL_ADMIN_PORT`            | No       | `9468`    | Operational server port            |
| `DVT_TEMPORAL_DBT_ENABLED`           | No       | `false`   | Enable DBT worker profile          |

### Required When DBT Mode Is Enabled

| Variable                       | Required when DBT enabled | Default | Purpose                       |
| ------------------------------ | ------------------------- | ------- | ----------------------------- |
| `DVT_DBT_BIN`                  | No                        | `dbt`   | DBT executable                |
| `DVT_DBT_WORKDIR_ROOT`         | No                        | OS temp | DBT materialization root      |
| `DVT_DBT_BUNDLE_STORE_BACKEND` | Yes                       | none    | `s3` or `file` bundle backend |
| `DVT_DBT_BUNDLE_S3_BUCKET`     | If backend is `s3`        | none    | Bundle bucket                 |
| `DVT_DBT_BUNDLE_FILE_ROOT`     | If backend is `file`      | none    | Bundle file root              |

## Provision A Worker Pool For One Queue

1. Choose the queue.

   ```bash
   # Example for base queue dvt-temporal and tenant tenant-a:
   TEMPORAL_TASK_QUEUE=dvt-temporal-tenant-a
   ```

2. Deploy one or more worker replicas with that same queue.

   ```bash
   # Example only; use the environment's deployment mechanism.
   kubectl apply -f temporal-worker-tenant-a.yaml
   ```

3. Verify liveness on the configured admin port.

   ```bash
   curl -fsS http://<worker-host>:9468/healthz
   ```

4. Verify readiness.

   ```bash
   curl -fsS http://<worker-host>:9468/readyz
   ```

5. Verify metrics.

   ```bash
   curl -fsS http://<worker-host>:9468/metrics
   ```

Expected metrics for a ready worker:

```text
dvt_temporal_worker_up 1
dvt_temporal_worker_ready 1
dvt_temporal_worker_state{state="running"} 1
```

1. Confirm Temporal shows pollers for the exact `TEMPORAL_TASK_QUEUE`.

If Temporal shows workflows queued on `<baseQueue>-<tenantId>` but no pollers on
that queue, the worker is configured for the wrong queue.

## Scale Capacity For One Queue

Use this when queue delay or backlog rises for a queue that already has a worker
deployment.

```bash
# Example only.
kubectl scale deployment temporal-worker-tenant-a --replicas=4
```

After scaling:

1. confirm all replicas return `/readyz` 200;
2. confirm `dvt_temporal_worker_ready 1` per replica;
3. confirm Temporal poller count increases for the same queue;
4. watch queue delay until it returns below target.

Rollback: scale the deployment back to the previous replica count.

## Capacity Model

Capacity is queue-local. Estimate desired replicas per queue:

```text
desiredReplicas(queue) =
  max(minReadyReplicas(queue),
      ceil(peakConcurrentTasks(queue) / safeConcurrentTasksPerReplica(queue)))
```

Operator inputs:

| Input                         | How to use it                                      |
| ----------------------------- | -------------------------------------------------- |
| `peakConcurrentTasks(queue)`  | highest expected workflow/activity tasks in queue  |
| safe tasks per replica        | measured from the worker profile under load        |
| minimum ready replicas        | protects cold-start-sensitive active tenant queues |
| schedule-to-start latency     | shows work waiting for a worker slot               |
| worker CPU, memory, and error | detects overloaded or failing replicas             |

Generic workflow workers, DBT-enabled workers, and capability activity workers
must be sized separately. Do not reuse a DBT-safe concurrency number for a
generic worker profile without profiling.

## Add Capacity For A New Tenant Queue

Use this when a tenant has started workflows on `<baseQueue>-<tenantId>` and no
worker pool exists for that queue.

1. Derive the queue from the API adapter base queue and tenant id.
2. Create a worker deployment with that exact `TEMPORAL_TASK_QUEUE`.
3. Start with one replica unless queue latency already requires more.
4. Verify readiness and poller registration.
5. Record the queue/deployment mapping in the environment inventory.

Do not change a generic worker from `dvt-temporal` to `dvt-temporal-tenant-a`
unless that worker was intended to stop polling the generic queue.

## Route A Step Kind To A Capability Activity Queue

Use this when one step kind needs a specialized runtime image or dependency set.

1. Choose the activity queue.

   ```bash
   TEMPORAL_TASK_QUEUE=dvt-temporal-python
   ```

2. Configure the API Temporal adapter to freeze the route into new workflow
   inputs.

   ```json
   {
     "PYTHON_SCRIPT": {
       "capability": "executor.python",
       "taskQueue": "dvt-temporal-python"
     }
   }
   ```

3. Deploy a worker pool with `TEMPORAL_TASK_QUEUE=dvt-temporal-python`.
4. Ensure that worker image and composition root register the matching step
   activity plugin.
5. Verify Temporal pollers exist for `dvt-temporal-python`.
6. Start a run containing the routed step kind and confirm activity
   schedule-to-start latency stays within target.

The workflow itself still starts on `<baseQueue>-<tenantId>`. Only the
`executeStep` activity moves to the configured capability queue.

## Monitoring Saturation

### Worker Metrics

| Metric                               | Meaning                                   |
| ------------------------------------ | ----------------------------------------- |
| `dvt_temporal_worker_up`             | Process is alive enough to report health. |
| `dvt_temporal_worker_ready`          | Worker is ready to poll Temporal.         |
| `dvt_temporal_worker_state{state=*}` | Current runtime state as labelled gauges. |
| `dvt_temporal_worker_dbt_enabled`    | DBT profile enabled for this worker.      |
| `dvt_temporal_worker_error_total`    | Worker runtime error count.               |

`dvt_temporal_worker_up 1` is not the readiness signal. Use
`dvt_temporal_worker_ready 1` and
`dvt_temporal_worker_state{state="running"} 1` for readiness.

### Queue Metrics

Use the Temporal UI or exported Temporal metrics for the affected queue:

- schedule-to-start latency or equivalent queue delay
- queued workflow/activity task count
- poller count for the exact task queue
- task failure/retry rate

If the environment exposes different Temporal metric names, dashboard the
environment-specific names but keep the same operational meaning.

### Warning Thresholds

| Signal         | Warning             | Critical            | Action                         |
| -------------- | ------------------- | ------------------- | ------------------------------ |
| queue delay    | > 5s for 5 min      | > 15s for 5 min     | Add replicas for that queue.   |
| ready replicas | below desired count | zero ready replicas | Restart or roll back workers.  |
| worker CPU     | > 70% for 10 min    | > 90% for 5 min     | Add replicas or larger nodes.  |
| worker memory  | > 75% for 10 min    | > 90% for 5 min     | Add replicas or larger nodes.  |
| `error_total`  | any increase        | rapid increase      | Inspect logs and state metric. |

## Autoscaling Policy

Autoscaling must target the deployment that polls the affected
`TEMPORAL_TASK_QUEUE`.

Use these signals in priority order:

1. schedule-to-start latency for the workflow or activity task queue;
2. backlog or queued task count for the exact queue;
3. ready replica count and Temporal poller count;
4. worker CPU and memory;
5. `dvt_temporal_worker_error_total` and failing worker state gauges.

KEDA Temporal Worker scaler is the preferred future Kubernetes integration
when queue metrics are available. Until this repository ships a KEDA
ScaledObject or equivalent deployment artifact, use the same signal policy with
the environment's existing autoscaler or manual scaling procedure.

Scale down only after queue latency, backlog, and resource pressure stay below
target for the environment cooldown window.

## Rebalance Or Drain

### Increase Tenant Queue Capacity

1. Scale the worker deployment for `<baseQueue>-<tenantId>`.
2. Wait for new replicas to become ready.
3. Confirm additional pollers on the same queue.
4. Keep the higher replica count until latency is stable.

### Reduce Tenant Queue Capacity

1. Confirm queue delay and backlog are below target.
2. Reduce replicas gradually.
3. Keep at least the environment's minimum ready count for active tenants.
4. Watch `/readyz`, `dvt_temporal_worker_ready`, and queue delay.

### Drain A Queue

1. Stop new workflow starts for the tenant or queue at the ingress/admission
   layer.
2. Let existing workflows complete or follow the approved drained-cutover
   process for workflow-shape migrations.
3. Scale the queue's worker deployment down after drain evidence is recorded.

Do not assume in-flight workflows move to another task queue when a worker is
stopped.

## Failure Triage

### `/healthz` 200 But `/readyz` 503

1. Check `dvt_temporal_worker_state{state=*}`.
2. Check `dvt_temporal_worker_error_total`.
3. Check Temporal connectivity and namespace.
4. Check Postgres connectivity and circuit-breaker metrics.
5. If DBT mode is enabled, check `DVT_DBT_*` configuration and DBT binary
   availability.

### Workflows Queued But Not Executing

1. Identify the task queue used by the workflow in Temporal.
2. Compare it with worker `TEMPORAL_TASK_QUEUE`.
3. If they differ, deploy a worker for the workflow queue.
4. If they match, scale replicas or inspect worker errors.

### Routed Activities Queued But Not Executing

1. Identify the activity task queue from `TEMPORAL_STEP_ACTIVITY_ROUTES`.
2. Confirm Temporal shows pollers for that activity queue.
3. Confirm the worker image has the runtime dependency for the capability.
4. Confirm the worker composed the matching plugin registry for the step kind.
5. If pollers are present but work fails closed, inspect
   `UnsupportedStepKindError` and plugin startup logs.

### DBT-Enabled Worker Failing

1. Verify `DVT_TEMPORAL_DBT_ENABLED=true` was intended.
2. Verify `DVT_DBT_BUNDLE_STORE_BACKEND`.
3. Verify `DVT_DBT_BUNDLE_S3_BUCKET` or `DVT_DBT_BUNDLE_FILE_ROOT`.
4. Verify `DVT_DBT_BIN` is available inside the worker image.
5. Check artifact-read and bundle-integrity errors.

## Production Readiness Contract

Before claiming production-scale readiness for a specific environment, collect
evidence for:

1. queue-local pool scale-up and scale-down;
2. tenant queue provisioning for at least one tenant-scoped queue;
3. a noisy-tenant drill showing only that tenant queue was scaled;
4. readiness and metrics dashboards using the exact worker metric semantics;
5. load evidence for the target tenant and queue count;
6. an explicit decision on whether 1000+ tenant provisioning is manual,
   generated, or controlled by a tenant-to-queue assignment service.

Current status: AR-D3 provides the documented worker topology and operations
contract. The repository has queue-local runtime building blocks, but does not
yet have a global shared worker pool or automated 1000+ tenant worker
provisioning.
