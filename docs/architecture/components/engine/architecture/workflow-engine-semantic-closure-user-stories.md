---
title: WorkflowEngine semantic closure user stories
status: Active
owner: Architecture / Engine
last_reviewed: 2026-05-12
planning_type: architecture
---

# WorkflowEngine Semantic Closure User Stories

## Purpose

These stories make DHM-WS6 executable. They cover the final semantic closure
needed after the WS2 runtime composition, WS3 start-run decomposition, and WS4
runtime path decomposition slices.

## User Stories

### US-DHM-WS6-001: declare owned concern headers

As an engine maintainer, I need each composition, run-control, command, and
signal module to declare its owned concern so review can detect misplaced
runtime authority before reading the full implementation.

Acceptance criteria:

- `intentReconcilerRuntime.ts` declares API-side runtime composition ownership.
- `WorkflowEngineFactory.ts` declares API engine runtime composition ownership.
- `WorkflowEngineCoreService.ts` declares combined run-control delegator
  ownership.
- command and signal role ports declare role-interface ownership.

### US-DHM-WS6-002: keep composition roots outside engine semantics

As an architecture reviewer, I need concrete Postgres and provider assembly to
stay in `apps/api` so the engine remains port-driven.

Acceptance criteria:

- API runtime composition may create Postgres stores, provider adapters,
  maintenance services, and workers.
- `@dvt/engine` modules must not read API env values for the reconciler
  runtime.
- `WorkflowEngineCoreService` must not import reconciler runtime assembly.

### US-DHM-WS6-003: keep run-control delegation semantic

As a runtime maintainer, I need `WorkflowEngineCoreService` to expose combined
run-control delegation without regaining cancel or signal behavior.

Acceptance criteria:

- cancel dispatch remains in `RunCommandService`.
- signal validation, dispatch, and signal-derived event emission remain in
  `RunSignalService`.
- `WorkflowEngineCoreService` delegates cancel and signal calls only.

### US-DHM-WS6-004: provide a complete local component record

As a new contributor, I need one local component record that explains public
API, invariants, transitions, consumers, diagrams, and drift guards for the
closed DHM stream.

Acceptance criteria:

- The component guide contains public API, invariants, transitions, consumers,
  component grouping, current-state diagram, runtime sequence, and drift
  guards.
- The guide references current code surfaces rather than historical lanes.

### US-DHM-WS6-005: validate semantics rather than barrel thinness

As a maintainer, I need an architecture guard that fails when ownership moves
to the wrong component even if exports still compile.

Acceptance criteria:

- The guard checks owned concern headers.
- The guard checks forbidden authority in `WorkflowEngineCoreService`.
- The guard checks local component docs, user stories, mailbox analysis, and
  closeout evidence.

## Negative Scenarios

- A future edit removes owned concern headers from composition or runtime
  control modules.
- A future edit moves signal transition validation back into
  `WorkflowEngineCoreService`.
- A future edit puts API-side reconciler store/provider assembly into engine
  core code.
- A future edit updates code without updating the semantic closure guide or
  story coverage.
- A future edit only proves barrel thinness and misses semantic authority.

## Scenario Coverage Matrix

| Story            | Primary surface                                                      | Validation                                                                                                          |
| ---------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `US-DHM-WS6-001` | API and engine module headers                                        | `workflowEngineSemanticClosure.architecture.test.ts`                                                                |
| `US-DHM-WS6-002` | `intentReconcilerRuntime.ts`, `WorkflowEngineCoreService.ts`         | `workflowEngineSemanticClosure.architecture.test.ts`                                                                |
| `US-DHM-WS6-003` | `RunCommandService`, `RunSignalService`, `WorkflowEngineCoreService` | `workflowEngineRuntimePathDecomposition.architecture.test.ts`, `workflowEngineSemanticClosure.architecture.test.ts` |
| `US-DHM-WS6-004` | semantic closure component guide                                     | `workflowEngineSemanticClosure.architecture.test.ts`, docs governance gates                                         |
| `US-DHM-WS6-005` | semantic closure architecture guard                                  | `workflowEngineSemanticClosure.architecture.test.ts`                                                                |
