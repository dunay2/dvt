---
title: Fowler hardcut analysis for WE-HX-3 start-run decomposition
status: Accepted
owner: Codex / Architecture
last_reviewed: 2026-05-15
planning_type: analysis
---

# Fowler Hardcut Analysis For WE-HX-3 Start-Run Decomposition

## Scope

This analysis closes the remaining WE-HX-3 drift after the start-run phase
services had already been implemented. The code had the mature shape, but the
architecture map still carried two active identities for the same product
intent: a previous DHM-named slice and the current WE-HX-3 slice.

The hardcut rule is explicit: no historical alias, no compatibility story, and
no duplicate active component guide for the same start-run decomposition.

## Fowler Architecture Analysis

The code posture is already aligned with Fowler-style Service Layer and Policy
Object separation:

- `StartRunApplicationService` coordinates phases.
- `StartRunAdmissionService` owns admission, provider resolution, scoped plan
  integrity, and capability checks.
- `StartRunIntentService` owns deterministic pre-dispatch intent creation.
- `StartRunExecutionService` owns adapter dispatch and bootstrap compensation.
- `StartRunFailurePolicy` owns guarded failure reporting and `RunFailed`
  emission.

The remaining smell was not runtime behavior. It was documentation and fitness
drift: duplicate active component docs and an older architecture test still
claimed a narrower construction-seam closure under `DHM-WS3`, while the current
implementation and planning task are `WE-HX-3`.

## Mature-System Comparison

Mature systems do not keep two active architecture identities for one command
path. They preserve one current component API and let old implementation slices
disappear from the active architecture map once replaced.

WE-HX-3 now follows that posture:

- one command rail: `IWorkflowEngine.startRun`;
- one feature mechanization id: `WE-HX-3-START-RUN-DECOMPOSITION`;
- one active component guide: `start-run-application-decomposition-component.md`;
- one semantic architecture guard:
  `startRunApplicationDecomposition.architecture.test.ts`.

## Improved Patterns

- **Canonical ownership:** the start-run application flow has one active owner
  in the WE-HX line.
- **Architecture fitness function:** the guard parses structured
  `feature-mechanization` data instead of depending on proposal prose.
- **Hardcut documentation:** old DHM-named active docs, evidence, risk, and
  architecture guard files are removed rather than archived.

## Antipatterns Detected

| Antipattern          | Risk                                                              | Hardcut fix                                                  |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| Duplicate semantics  | Reviewers see two task identities for one start-run decomposition | Remove DHM-WS3 start-run artifacts and keep WE-HX-3 only     |
| Documentation drift  | Target architecture links to a deleted or superseded component    | Repoint active docs to the WE-HX-3 component guide           |
| Test-only confidence | A guard can pass while validating the old label                   | Parse structured feature mechanization ids and command rails |

## Repetitions Fixed

- Removed the duplicate DHM-named component guide and user stories.
- Removed the duplicate DHM-named architecture guard.
- Removed duplicate DHM-named evidence, risk, and closeout artifacts for the
  same start-run decomposition.

## Drift Fixed

- The hexagonal derivation plan now exposes only the WE-HX-3 feature identity
  for start-run decomposition.
- Active engine architecture docs now link only to the WE-HX-3 component guide.
- The semantic closure validation command no longer references the deleted
  DHM-named architecture guard.

## Future Lessons

- A decomposition is not complete until the active architecture map has one
  identity for the component.
- Fitness tests should validate structured governance data and domain ownership,
  not brittle sentences.
- Hardcut slices should delete duplicate active docs instead of archiving aliases
  when the user has rejected retrocompatibility.

## ADR Decision

No new ADR is required. This is a documentation and architecture-fitness
hardcut that preserves the accepted `IWorkflowEngine.startRun` command rail and
the ADR-backed runtime semantics.
