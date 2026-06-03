---
title: Start-run application decomposition user stories
status: Active
owner: Architecture / Engine
last_reviewed: 2026-05-12
---

# Start-Run Application Decomposition User Stories

## Stories

### US-WE-HX-3-001: Pre-dispatch admission

As an engine maintainer, I want start-run admission to be owned by a dedicated
phase service so access, duplicate-run checks, provider resolution, plan
integrity, capability checks, and run-execution-context admission can be tested
without invoking provider dispatch.

Acceptance:

- admission receives `PlanRef` and `ResolvedRunContext`
- admission returns the selected adapter and verified artifact
- provider dispatch is not called during admission
- plan artifact access uses `ScopedPlanRef`

### US-WE-HX-3-002: Deterministic intent creation

As an operations engineer, I want intent creation to be isolated so crash
restarts derive the same pre-dispatch intent id and never create a second active
intent for the same run.

Acceptance:

- `StartRunIntentService` derives `intentId` through `IdempotencyKeyBuilder`
- `IStartRunIntentStore.createIntent` is called before dispatch
- repeated creation with the same semantic input returns the same intent id

### US-WE-HX-3-003: Dispatch isolation

As a provider adapter owner, I want dispatch and bootstrap behavior to remain in
`StartRunExecutionService` so adapter start, provider-ref reconciliation,
bootstrap, and compensation are not reimplemented by the application
coordinator.

Acceptance:

- `StartRunApplicationService` calls `executeStartRun(...)`
- bootstrap behavior remains in `StartRunExecutionService`
- compensation on bootstrap failure remains in the execution/failure policies

### US-WE-HX-3-004: Failure policy isolation

As a reliability reviewer, I want start-run failure handling to stay behind a
policy object so the system does not emit lifecycle facts for runs that never
completed bootstrap.

Acceptance:

- failures route through `StartRunFailurePolicy.handleStartRunError`
- `RunFailed` emission remains guarded by persisted metadata and intent state
- observability failures do not mask the domain error

### US-WE-HX-3-005: Semantic architecture guard

As an architecture reviewer, I want an automated guard that verifies ownership
semantics instead of only checking exports so future refactors cannot quietly
move provider resolution, plan integrity, or intent creation back into the
application coordinator.

Acceptance:

- the architecture test checks forbidden implementation details in
  `StartRunApplicationService`
- the architecture test requires module `@ownedConcern` headers
- the architecture test requires this component guide, stories, mailbox review,
  closeout, and diagrams

## Negative Scenarios

| Scenario                               | Expected behavior                                       | Guard                                                        |
| -------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| invalid tenant access                  | reject before plan integrity or provider dispatch       | `StartRunAdmissionService` sequencing test                   |
| invalid plan identity                  | reject before intent creation and dispatch              | `StartRunAdmissionService` and existing plan integrity tests |
| unsupported provider capability        | reject before intent creation and dispatch              | `StartRunAdmissionGuard.assertExecutionPolicyAllowed`        |
| duplicate run id                       | reject before intent creation and dispatch              | `StartRunValidationPolicy` via admission                     |
| intent-store active conflict           | reject before provider dispatch                         | `StartRunIntentService` plus store contract                  |
| bootstrap failure after provider start | cancel best-effort, resolve intent best-effort, rethrow | `StartRunExecutionService` existing tests                    |
| observability sink failure             | continue or rethrow the domain error, never hide it     | existing start-run service tests                             |

## Scenario Coverage Matrix

| Story            | Code owner                  | Primary test                                            | Architecture guard                                      |
| ---------------- | --------------------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| `US-WE-HX-3-001` | `StartRunAdmissionService`  | `StartRunApplicationDecomposition.test.ts`              | `startRunApplicationDecomposition.architecture.test.ts` |
| `US-WE-HX-3-002` | `StartRunIntentService`     | `StartRunApplicationDecomposition.test.ts`              | `startRunApplicationDecomposition.architecture.test.ts` |
| `US-WE-HX-3-003` | `StartRunExecutionService`  | existing `StartRunApplicationService` / execution tests | `startRunApplicationDecomposition.architecture.test.ts` |
| `US-WE-HX-3-004` | `StartRunFailurePolicy`     | existing failure-policy behavior tests                  | `startRunApplicationDecomposition.architecture.test.ts` |
| `US-WE-HX-3-005` | architecture tests and docs | `startRunApplicationDecomposition.architecture.test.ts` | same                                                    |
