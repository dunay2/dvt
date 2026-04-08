---
title: ED-20260316 - G7 closeout
status: accepted
owners: delivery
date: 2026-03-16
gap: G7
arc: ARC-1
arc_level: ARC-1
breaking: false
evidence_class: critical
code_refs:
  - packages/@dvt/engine/src/core/WorkflowEngine.ts
  - packages/@dvt/engine/src/ports/IRunStateStore.ts
  - packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
  - packages/@dvt/delivery/src/application/ProjectorWorkerRuntime.ts
  - apps/projector-worker/src/server.ts
evidence:
  tests: []
  notes:
    - G7.1 delivered numbered migration 004 plus rebuildSnapshot support.
    - G7.2 delivered standalone projector runtime support in delivery and apps/projector-worker.
    - G7.3 delivered provider run-id reconciliation after pre-bootstrap start.
    - Active status docs were synchronized to mark G7 as closed.
---

# ED-20260316 - G7 closeout

## Summary

`G7` is closed.

The delivered scope is:

1. `G7.1` - `run_snapshots` formalization and `rebuildSnapshot`
2. `G7.2` - standalone projector runtime and `apps/projector-worker`
3. `G7.3` - provider run-id reconciliation after pre-bootstrap start
4. `G7.4` - evidence plus status-doc synchronization

## Sub-slice evidence

- [ED-20260316 - G7.3 provider run-id reconciliation](ED-20260316-g7-provider-ref-reconciliation.md)

## Closure criteria

| Criterion                                                                          | Status |
| ---------------------------------------------------------------------------------- | ------ |
| `run_snapshots` is governed by numbered migration `004`                            | Met    |
| `rebuildSnapshot(tenantId, runId)` exists and is implemented end-to-end            | Met    |
| Standalone projector runtime exists in `@dvt/delivery` and `apps/projector-worker` | Met    |
| Provider run-id reconciliation is implemented in the pre-bootstrap engine path     | Met    |
| Active status docs mark `G7` consistently as `Closed`                              | Met    |

## Verification tuple

- Canonical spec:
  [G7 - AI Execution Tracker](../../planning/archive/gaps/G7-AI-EXECUTION-TRACKER.md)
  and
  [ADR-0004](../../adr/ADR-0004-event-sourcing-strategy.md)
  and
  [ADR-0015](../../adr/ADR-0015-getRunStatus-read-model-separation.md)
- Code paths:
  `packages/@dvt/engine/src/core/WorkflowEngine.ts`,
  `packages/@dvt/engine/src/ports/IRunStateStore.ts`,
  `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`,
  `packages/@dvt/delivery/src/application/ProjectorWorkerRuntime.ts`,
  `apps/projector-worker/src/server.ts`
- Tests:
  `packages/@dvt/engine/test/core/WorkflowEngine.test.ts`,
  `packages/@dvt/delivery/test/ProjectorWorkerRuntime.test.ts`,
  `apps/projector-worker/test/env.test.ts`,
  `packages/@dvt/adapter-postgres/test/smoke.test.ts`
