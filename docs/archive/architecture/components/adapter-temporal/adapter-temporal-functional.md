---
title: adapter-temporal Functionalities
status: Draft
owner: Execution Domain
last_reviewed: 2026-03-28
---

# adapter-temporal Functionalities

## Functionalities

| #   | Functionality                 | Description                                                                                               |
| --- | ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Workflow Execution            | Submits new workflow runs to the Temporal service and tracks their execution lifecycle.                   |
| 2   | Adapter Connection Management | Manages the Temporal client connection lifecycle, including initialisation, keep-alive, and shutdown.     |
| 3   | Workflow Status Reporting     | Queries Temporal for the current execution status of a workflow and returns it to the engine.             |
| 4   | Run Reference Lookup          | Resolves an external DVT run ID to the corresponding Temporal workflow execution handle (`lookupRunRef`). |
| 5   | Workflow Definition Storage   | Stores and retrieves workflow definitions used to start Temporal workflows.                               |

## Main Methods

- `manageWorkflowExecution(runId: string, workflowDef: WorkflowDefinition): Promise<void>`: Submits a workflow execution request to the Temporal service for the given run.
- `manageAdapterConnections()`: Initialises and maintains the Temporal client used by all adapter operations.
- `reportWorkflowStatus(runId: string): WorkflowStatus`: Queries Temporal and returns the current execution status of the specified workflow run.
- `lookupRunRef(runId: string): Promise<TemporalRunRef>`: Resolves a DVT run ID to a Temporal workflow execution reference, enabling signal and query routing.
- `storeWorkflowDefinition(def: WorkflowDefinition): Promise<void>`: Persists a workflow definition so it can be referenced when starting new Temporal executions.

## Key Files

- `packages/@dvt/adapter-temporal/src/TemporalAdapterAggregate.ts`
- `packages/@dvt/adapter-temporal/src/WorkflowAggregate.ts`
- `packages/@dvt/adapter-temporal/src/TemporalRunAdapter.ts`
