---
title: Fowler Analysis - AR-D3 Worker Scaling Strategy
status: Draft
owner: Codex
last_reviewed: 2026-05-14
---

# Fowler Analysis - AR-D3 Worker Scaling Strategy

## Summary

AR-D3 was not missing code for a single worker process to poll all tenant
queues. It was missing an explicit architecture decision that prevents the docs
from implying that topology.

The current executable model is:

- `TemporalAdapter` maps non-empty tenants to `<baseQueue>-<tenantId>`.
- `TemporalWorkerHost` creates one Temporal SDK `Worker` for one configured
  `TEMPORAL_TASK_QUEUE`.
- `TEMPORAL_STEP_ACTIVITY_ROUTES` can route only `executeStep` activities to
  capability-specific activity queues.

## Fowler Signals

| Signal               | Finding                                                                             | Applied response                                                  |
| -------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Documentation drift  | AR-D3 docs said the task remained in progress even after the strategy existed       | Replace the in-progress posture with an explicit closure decision |
| Boundary drift       | A shared-pool claim would move routing authority into prose instead of adapter code | Keep tenant queue assignment bound to `toTemporalTaskQueue()`     |
| Primitive obsession  | "Worker scaling" was described as broad prose rather than capacity rules            | Add queue-local capacity formula and autoscaling policy           |
| Test-only confidence | Existing docs could drift without a semantic guard                                  | Add architecture test for strategy/runbook invariants             |

## Mature-System Comparison

Temporal's current documentation distinguishes worker process, worker entity,
task queue, poller capacity, task slots, and schedule-to-start latency. Mature
Temporal deployments scale the worker pool that polls the affected queue and use
queue delay/backlog alongside CPU and memory. AR-D3 now follows that posture:
the scaling unit is the task queue, not the whole namespace.

## Decision

Close AR-D3 as a strategy and operations contract:

- many queue-local worker pools are the supported posture;
- a global shared worker pool is not implemented;
- automated 1000+ tenant provisioning remains separate future platform work;
- KEDA's Temporal Worker scaler is named as the preferred future Kubernetes
  integration, not as a shipped manifest.

## Residual Opportunities

- Add tenant-to-queue assignment service if DVT wants pooled low-volume tenant
  queues.
- Add Kubernetes/KEDA deployment artifacts when infrastructure ownership is
  ready.
- Add load evidence for target tenant count and queue density before claiming a
  specific production environment is scale-ready.
