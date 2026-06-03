---
title: Fowler analysis and remediation for WE-HX-6 boundary fitness
status: Accepted
owner: Codex / Architecture
last_reviewed: 2026-05-12
planning_type: analysis
---

# Fowler Analysis And Remediation For WE-HX-6 Boundary Fitness

## Scope

This record reviews the `WorkflowEngine` decomposition branch series after
`WE-HX-5`. The current code already moved provider lookup behind
`IEngineProviderResolver`, start/success telemetry behind
`StartRunTelemetryPolicy`, runtime command and signal behavior behind dedicated
services, and API runtime assembly behind composition-root modules.

`WE-HX-6` closes the remaining test and architecture-governance gap: fixture
modules and architecture fitness checks must encode semantic ownership, not only
prove that production barrels are thin.

## Fowler Architecture Analysis

The branch sequence has moved the engine toward Fowler's Service Layer, Gateway,
Policy, and Facade patterns. The remaining risk is not runtime behavior; it is
test-only authority. Mature systems treat test doubles and architecture tests as
part of the boundary model because ungoverned fixtures can reintroduce real
adapter behavior, hidden environment selection, or duplicate source-reading
logic that hides drift.

The immediate smell is duplicate semantics in the architecture tests. Recent
guards repeat repository-root discovery, source readers, documentation readers,
and heading checks. That repetition makes future boundary checks easier to copy
incorrectly and harder to update consistently. The second smell is missing
semantic headers in test helper modules: the helpers build fake provider
adapters and compose engine services, but their owned concern is implicit.

## Mature-System Comparison

| Concern                    | Current posture                                                                      | Mature-system expectation                                                                        | WE-HX-6 remediation                                                               |
| -------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Architecture guard support | Each recent architecture test owns local file readers and doc path constants.        | Shared test utility owns source/doc discovery and assertion vocabulary.                          | Add `engineArchitectureTestSupport.ts` and reuse it in recent guards.             |
| Test doubles               | Engine fixtures are practical but do not state their owned concern.                  | Test doubles declare whether they are fake providers, in-memory stores, or composition fixtures. | Add short owned-concern headers to fixture modules.                               |
| Adapter boundary           | Fixtures use temporal-shaped fakes, which can look like real Temporal adapter usage. | Fake provider doubles must not import provider SDKs or adapter packages.                         | Add semantic architecture checks for forbidden runtime imports.                   |
| Documentation              | WE-HX-5 docs mention WE-HX-6 as future fitness work.                                 | Component guide, stories, proposal, and target docs describe the current boundary-fitness model. | Add WE-HX-6 component guide, stories, proposal block, diagrams, and drift guards. |

## Improved Patterns

- **Test Double:** engine tests use fake provider adapters and in-memory stores
  as explicit substitutes, not production adapters.
- **Role Interface:** fixture inputs are organized around engine-owned ports and
  service roles.
- **Semantic Architecture Fitness Function:** the guard validates owned concern,
  forbidden adapter/runtime bleed, documentation coverage, and shared assertion
  vocabulary.
- **Shared Test Utility:** repeated source/document reading moves behind one
  test-support module.

## Antipatterns Detected

| Antipattern                      | Risk                                                                   | Remediation                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Test-only hidden authority       | A fixture can accidentally create production runtime behavior.         | Guard fixtures against adapter packages, Temporal SDK, DB migration, and environment selection imports. |
| Copy-pasted architecture readers | Drift checks fork their own path conventions and assertions.           | Centralize architecture test readers and doc assertions.                                                |
| Ambiguous fake provider naming   | A temporal-shaped fake can be mistaken for the real Temporal adapter.  | Document the fixture as a fake provider adapter and guard against real adapter imports.                 |
| Documentation drift              | Target docs say fitness checks are future work after the branch lands. | Update target, roadmap, proposal, component guide, and stories together.                                |

## Component Grouping

- `packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts`
  owns architecture-test source and documentation discovery.
- `packages/@dvt/engine/test/architecture/workflowEngineBoundaryFitness.architecture.test.ts`
  owns the semantic WE-HX-6 fitness function.
- `packages/@dvt/engine/test/helpers/workflowEngine.fixture.ts` owns
  WorkflowEngine test composition with fake providers and in-memory ports.
- `packages/@dvt/engine/test/helpers/runLifecycle.fixture.ts` owns persisted
  run lifecycle setup for engine tests.
- `packages/@dvt/engine/test/core/WorkflowEngine.helpers.ts` owns behavior-test
  helper vocabulary for the `WorkflowEngine` facade.

## Repetition Register

| Repetition                                                                  | Owner after WE-HX-6                | Fix                                                  |
| --------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------- |
| `TEST_ROOT`, `ENGINE_ROOT`, and `REPO_ROOT` constants in architecture tests | `engineArchitectureTestSupport.ts` | Export canonical test, source, repo, and docs roots. |
| `readEngineSource` / `readRepoSource` helpers                               | `engineArchitectureTestSupport.ts` | Export shared readers.                               |
| Manual markdown heading checks                                              | `engineArchitectureTestSupport.ts` | Export `expectMarkdownSections`.                     |
| Manual owned-concern checks                                                 | `engineArchitectureTestSupport.ts` | Export `expectOwnedConcernHeader`.                   |

## Opportunity Register

| Opportunity                                                     | Follow-up posture                                                                                                                  |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Provider fake naming can be further narrowed later.             | Keep compatibility names now; use the component guide to state fake-provider semantics.                                            |
| Older architecture tests still contain local readers.           | Do not churn all tests in this slice; move recent WE-HX tests first and let future changes migrate older guards opportunistically. |
| Runtime telemetry policies beyond start/success remain broader. | Keep out of WE-HX-6; this slice is test and architecture boundary fitness only.                                                    |

## Drift Register

| Drift                                                        | Fix                                                                                    |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| WE-HX proposal only sketches WE-HX-6.                        | Add a feature-mechanization block with rails, surfaces, symbols, and red/green cycles. |
| Engine architecture index does not expose the WE-HX-6 guide. | Add component and user-story links.                                                    |
| Target architecture treats WE-HX-6 as future fitness work.   | Update the gap section with boundary-fitness current posture.                          |
| Roadmap groups WE-HX-5 and WE-HX-6 as queued.                | Mark the track as active and describe landed WE-HX-5 plus active WE-HX-6.              |

## Applied Fixes

The intended branch fixes are:

- add the WE-HX-6 local component guide and scenario coverage;
- add the Fowler mailbox record and proposal mechanization block;
- add a shared architecture-test support module;
- refactor recent semantic architecture tests to use the shared support;
- add owned-concern headers to test helper modules;
- add a WE-HX-6 architecture guard that rejects real adapter/runtime bleed in
  engine test doubles.

## Future Lessons

- A mature boundary is not only a production boundary. Test fixtures and
  architecture tests can become unauthorized composition roots unless they are
  governed.
- Fitness functions should use intention-revealing assertion helpers. Repeated
  path and file-reading code is a sign that the test harness itself lacks a
  component boundary.
- A fake provider should be described by the role it satisfies, not by the
  production adapter implementation it resembles.
- Architecture docs should name both the public API and the test/evidence API
  when the slice is about keeping future changes from drifting.

## ADR Decision

No new ADR is required. `WE-HX-6` applies existing repository decisions:
ADR-0000 requires normative traceability, ADR-0003 keeps the engine as execution
authority, ADR-0004 preserves event-sourced runtime state, ADR-0014 keeps
provider runtime behavior behind adapters, and ADR-0034 keeps bounded-context
communication explicit. The slice adds test and documentation fitness; it does
not change a public runtime contract or introduce a new architecture decision.
