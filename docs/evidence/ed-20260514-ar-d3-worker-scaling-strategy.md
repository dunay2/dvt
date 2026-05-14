---
title: AR-D3 worker scaling strategy closeout
status: Accepted
date: 2026-05-14
owners:
  - '@dvt/adapter-temporal'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/test/worker-scaling-strategy.architecture.test.ts
  - docs/architecture/components/engine/adapters/temporal/temporal-worker-scaling-strategy.md
  - docs/runbooks/temporal-worker-scaling-operations.md
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts
---

# AR-D3 Worker Scaling Strategy Closeout

## Evidence Summary

AR-D3 now closes as a documented Temporal worker scaling strategy rather than a
runtime rewrite:

- queue-local worker pools are the supported scaling unit;
- `toTemporalTaskQueue()` remains the tenant queue assignment authority;
- `TemporalWorkerHost` remains a single configured task-queue host;
- a global shared worker pool is explicitly not implemented;
- the operator runbook names capacity, cold-start, autoscaling, and production
  readiness evidence requirements.

## Validation

The architecture test
`packages/@dvt/adapter-temporal/test/worker-scaling-strategy.architecture.test.ts`
was introduced red against the previous docs, then passed after the strategy and
runbook were updated.
