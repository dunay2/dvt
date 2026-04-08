---
title: adapter-temporal Sequence
status: Draft
owner: Execution Domain
last_reviewed: 2026-03-28
---

# adapter-temporal Sequence

## Main Flow: Starting a Temporal Workflow Execution

```mermaid
sequenceDiagram
  participant Engine as @dvt/engine
  participant Adapter as TemporalAdapterAggregate
  participant Workflow as WorkflowAggregate
  participant Temporal as Temporal Service

  Engine->>Adapter: manageWorkflowExecution(runId, workflowDef)
  Adapter->>Adapter: validateConnectionReady()
  Adapter->>Workflow: storeWorkflowDefinition(workflowDef)
  Workflow->>Workflow: validateNoDuplicateRunId(runId)
  Workflow-->>Adapter: definition stored
  Adapter->>Temporal: client.start(workflowType, { workflowId: runId, taskQueue })
  Temporal-->>Adapter: WorkflowHandle
  Adapter-->>Engine: reportWorkflowStatus(runId) → WorkflowStatus { state: RUNNING }
```

## Global Flow Position

`@dvt/adapter-temporal` sits at the workflow-orchestration boundary of the Execution Domain. The engine calls it to start, query, and signal Temporal workflows that back DVT run executions. It depends on the Temporal SDK client and on contracts from `@dvt/contracts`, but it does not call any other DVT package. Upstream: `@dvt/engine` is the sole caller. Downstream: the Temporal service.

## Key Files

- `packages/@dvt/adapter-temporal/src/TemporalAdapterAggregate.ts`
- `packages/@dvt/adapter-temporal/src/WorkflowAggregate.ts`
- `packages/@dvt/adapter-temporal/src/TemporalRunAdapter.ts`
