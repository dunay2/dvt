---
title: WorkflowEngine start-run decomposition user stories
status: Active
owner: Architecture / Engine
last_reviewed: 2026-05-12
---

# WorkflowEngine Start-Run Decomposition User Stories

## User Stories

### US-DHM-WS3-001

As an engine maintainer, I want `StartRunApplicationService` to depend on an
execution seam so adapter dispatch and bootstrap compensation can evolve without
changing command orchestration.

Acceptance criteria:

- the application service receives `IStartRunExecutionService`;
- adapter dispatch goes through `executeStartRun`;
- existing start-run success behavior remains unchanged.

### US-DHM-WS3-002

As an engine maintainer, I want start-run failure handling behind a failure
policy seam so failed-start reporting and pending-intent behavior do not grow
inside the application service.

Acceptance criteria:

- the application service receives `IStartRunFailurePolicy`;
- start-run errors call `handleStartRunError`;
- best-effort intent resolution remains owned by the failure policy.

### US-DHM-WS3-003

As a composition-root maintainer, I want a single engine-owned builder for the
default start-run service graph so production and tests use the same internal
collaborator wiring.

Acceptance criteria:

- default construction lives in `buildStartRunApplicationService`;
- API and engine test fixtures use the builder;
- the public `IWorkflowEngine.startRun` command remains unchanged.

## Negative Scenarios

- If `StartRunApplicationService` constructs `StartRunExecutionService`
  directly, the architecture guard fails.
- If `StartRunApplicationService` constructs `StartRunFailurePolicy` directly,
  the architecture guard fails.
- If the start-run execution and failure interfaces are removed, the
  architecture guard fails.

## Scenario Coverage Matrix

| Story            | Code guard                                                 | Behavior test                        |
| ---------------- | ---------------------------------------------------------- | ------------------------------------ |
| `US-DHM-WS3-001` | `workflowEngineStartRunDecomposition.architecture.test.ts` | `StartRunApplicationService.test.ts` |
| `US-DHM-WS3-002` | `workflowEngineStartRunDecomposition.architecture.test.ts` | existing start-run failure tests     |
| `US-DHM-WS3-003` | `workflowEngineStartRunDecomposition.architecture.test.ts` | engine/API composition typechecks    |
