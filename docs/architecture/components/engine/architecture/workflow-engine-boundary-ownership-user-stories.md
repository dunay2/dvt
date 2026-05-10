---
title: WorkflowEngine boundary ownership user stories
status: Active
owner: Architecture / Engine / Artifacts / API
last_reviewed: 2026-04-29
planning_type: architecture
---

# WorkflowEngine Boundary Ownership User Stories

## Purpose

These stories make the `WE-HX-1` boundary executable. They cover the vertical
scenarios where contracts, engine, artifacts, and API composition roots meet
around `PlanRef`, `RunExecutionContextRef`, plan artifact reading, and run-state
persistence.

## User Stories

### US-WE-HX-1-001: fetch plan artifacts through the artifacts-owned port

As an engine maintainer, I want start-run and recovery to depend on an
artifacts-owned `IStoredPlanArtifactReader`, so executable plan
materialization remains in one canonical package while the engine owns only the
dispatch integrity rule.

Acceptance criteria:

- `IStoredPlanArtifactReader` and `StoredPlanArtifact` live in
  `packages/@dvt/artifacts/src/ports/IStoredPlanArtifactStore.ts`.
- `IPlanIntegrityValidator` lives in
  `packages/@dvt/engine/src/ports/IPlanIntegrityValidator.ts`.
- `StartRunApplicationService` and `RecoverRunApplicationService` import the
  plan artifact reader from `@dvt/artifacts`.
- Fetch and validation calls require `ScopedPlanRef`.
- No engine-local `IPlanFetcher` or API-local stored-plan port exists.

### US-WE-HX-1-002: keep run-state persistence free of plan artifact concerns

As an architect, I want `IRunStateStore` to own only run-state persistence and
lifecycle event payloads, so plan bytes cannot drift back into the state-store
boundary.

Acceptance criteria:

- `IRunStateStore.ts` does not declare `IStoredPlanArtifactReader`,
  `IPlanIntegrityValidator`, or `StoredPlanArtifact`.
- State-store read, write, and maintenance ports remain focused on run
  metadata, events, snapshots, retries, and maintenance.
- A semantic architecture test fails when plan artifact reader symbols return
  to the state-store module.

### US-WE-HX-1-003: reuse one stored plan artifact shape across API validation

As an API maintainer, I want stored-plan validation to reuse the engine-owned
`StoredPlanArtifact` shape, so the API does not create a second equivalent
artifact DTO for the same plan-integrity seam.

Acceptance criteria:

- API services import `IStoredPlanArtifactReader` and `StoredPlanArtifact`
  from `@dvt/artifacts`.
- API validation calls `fetchStoredPlanArtifactForValidation(ScopedPlanRef)`.
- `apps/api/src/application/ports/storedPlan.ts` does not exist.
- The API does not redeclare `StoredPlanArtifact`.

### US-WE-HX-1-004: keep boundary documentation and module concerns aligned

As a reviewer, I want every boundary module touched by `WE-HX-1` to state its
owned concern and link to local component docs, so future refactors preserve
semantic encapsulation instead of relying on file placement alone.

Acceptance criteria:

- The component guide lists public API, invariants, transitions, consumers,
  user stories, diagrams, and drift guards.
- The Fowler review records the system-level analysis, mature-system
  comparison, antipatterns, repetitions, drift, and future lessons.
- Touched engine modules start with a short `@ownedConcern` docblock.
- The architecture guard validates docs and module concern ownership together.

## Negative Scenarios

- A future change that adds stored-plan artifact reading back to
  `IRunStateStore.ts` fails the architecture guard.
- A future change that recreates `packages/@dvt/engine/src/adapters/IPlanFetcher.ts`
  fails the architecture guard.
- A future change that redeclares `StoredPlanArtifact` in `apps/api` fails the
  architecture guard.
- A future change that removes the local user-story document or Fowler review
  fails the architecture guard.
- A future change that removes the `@ownedConcern` header from a touched
  boundary module fails the architecture guard.

## Scenario Coverage Matrix

| Story            | Primary code                                                            | Primary guard                                          |
| ---------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| `US-WE-HX-1-001` | `packages/@dvt/artifacts/src/ports/IStoredPlanArtifactStore.ts`         | `workflowEngineBoundaryOwnership.architecture.test.ts` |
| `US-WE-HX-1-002` | `packages/@dvt/engine/src/ports/IRunStateStore.ts`                      | `workflowEngineBoundaryOwnership.architecture.test.ts` |
| `US-WE-HX-1-003` | `apps/api/src/application/services/StoredPlanExecutabilityValidator.ts` | `workflowEngineBoundaryOwnership.architecture.test.ts` |
| `US-WE-HX-1-004` | local docs and touched engine module owned-concern docblocks            | `workflowEngineBoundaryOwnership.architecture.test.ts` |

## TDD Traceability

```mermaid
flowchart LR
  Stories["WE-HX-1 stories"] --> Guard["Semantic architecture guard"]
  Guard --> ArtifactPort["IStoredPlanArtifactReader"]
  Guard --> RunState["IRunStateStore"]
  Guard --> ApiService["API stored-plan services"]
  Guard --> Review["Fowler review mailbox"]
  ArtifactPort --> Prepush["verify:prepush"]
  ApiService --> Prepush
```

Red case:

- the guard failed while this story document, the Fowler review, module
  docblocks, and API artifact-shape reuse were missing.

Green case:

- add the stories and review;
- add module-owned concern headers;
- reuse the artifacts-owned `StoredPlanArtifact` shape from API validation;
- rerun the guard and affected package validation.
