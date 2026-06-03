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

### US-DHM-WS3-004

As an engine maintainer, I want `StartRunApplicationService` to depend on an
admission seam so plan integrity, provider resolution, capability checks, and
run-execution-context admission cannot grow back into the coordinator.

Acceptance criteria:

- the application service receives `IStartRunAdmissionService`;
- admission goes through `admissionService.admit`;
- the application service does not construct `StartRunAdmissionService`;
- existing start-run success and rejection behavior remains unchanged.

### US-DHM-WS3-005

As an architecture reviewer, I want start-run phase ownership checked
semantically so future cleanup cannot satisfy a thin barrel/import rule while
reintroducing hidden phase construction.

Acceptance criteria:

- the architecture test fails if `StartRunApplicationService` imports or
  constructs `StartRunAdmissionService`;
- the architecture test requires `IStartRunAdmissionService` in the start-run
  phase type surface;
- component documentation lists admission as a public phase seam with
  invariants, transitions, consumers, and diagrams.

## Negative Scenarios

- If `StartRunApplicationService` constructs `StartRunAdmissionService`
  directly, the architecture guard fails.
- If `StartRunApplicationService` constructs `StartRunExecutionService`
  directly, the architecture guard fails.
- If `StartRunApplicationService` constructs `StartRunFailurePolicy` directly,
  the architecture guard fails.
- If the start-run admission, execution, or failure interfaces are removed, the
  architecture guard fails.

## Scenario Coverage Matrix

| Story            | Code guard                                                 | Behavior test                        |
| ---------------- | ---------------------------------------------------------- | ------------------------------------ |
| `US-DHM-WS3-001` | `workflowEngineStartRunDecomposition.architecture.test.ts` | `StartRunApplicationService.test.ts` |
| `US-DHM-WS3-002` | `workflowEngineStartRunDecomposition.architecture.test.ts` | existing start-run failure tests     |
| `US-DHM-WS3-003` | `workflowEngineStartRunDecomposition.architecture.test.ts` | engine/API composition typechecks    |
| `US-DHM-WS3-004` | `startRunApplicationDecomposition.architecture.test.ts`    | `StartRunApplicationService.test.ts` |
| `US-DHM-WS3-005` | `startRunApplicationDecomposition.architecture.test.ts`    | architecture test red/green cycle    |
