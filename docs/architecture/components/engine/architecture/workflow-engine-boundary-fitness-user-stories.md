---
title: WorkflowEngine boundary fitness user stories
status: Active
owner: Architecture / Engine
last_reviewed: 2026-05-12
---

# WorkflowEngine Boundary Fitness User Stories

## Stories

| Story            | User                     | Need                                                                   | Acceptance                                                                                                                                         |
| ---------------- | ------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `US-WE-HX-6-001` | Engine reviewer          | Understand the Fowler analysis behind the boundary-fitness slice       | The mailbox record names mature-system comparison, antipatterns, repetition, opportunity, drift, and applied fixes.                                |
| `US-WE-HX-6-002` | Engine maintainer        | Read a local component guide before changing fixtures                  | The component guide documents API, invariants, transitions, consumers, diagrams, and drift guards.                                                 |
| `US-WE-HX-6-003` | Test author              | Use fake provider behavior without accidentally invoking real adapters | Fixture modules are guarded against adapter packages, provider SDKs, DB migration code, API composition roots, and environment-provider selection. |
| `US-WE-HX-6-004` | Architecture-test author | Avoid copy-pasting source and documentation readers                    | Recent WE-HX architecture tests import `engineArchitectureTestSupport.ts` for shared readers and assertions.                                       |
| `US-WE-HX-6-005` | Reviewer                 | See semantic ownership at module entry                                 | Engine test helper modules declare short owned-concern headers.                                                                                    |
| `US-WE-HX-6-006` | Architect                | Prevent structural-only confidence                                     | The boundary-fitness guard checks documentation, fixture semantics, forbidden runtime bleed, and repetition removal.                               |
| `US-WE-HX-6-007` | Release owner            | Trace the slice from requirement to evidence                           | Proposal, component docs, user stories, architecture test, ARC evidence, risk record, and closeout cite the same WE-HX-6 intent.                   |

## Negative Scenarios

- A fixture imports `@dvt/adapter-temporal`, `@dvt/adapter-postgres`,
  `@temporalio/*`, API runtime composition, DB migration code, or
  `ENGINE_PROVIDER` selection.
- A recent WE-HX architecture test defines its own `TEST_ROOT`,
  `ENGINE_ROOT`, `REPO_ROOT`, `readEngineSource`, or `readRepoSource`.
- The fake temporal provider fixture is treated as the production Temporal
  adapter.
- The architecture guard only checks that a barrel is thin and does not check
  fixture ownership, forbidden imports, documentation, and stories.
- Docs claim boundary-fitness work is complete while the component guide,
  stories, mailbox analysis, evidence, or risk record is missing.

## Scenario Coverage Matrix

| Scenario                                  | Guard                                                | Unit or package proof                                                                                                 |
| ----------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Fixture-owned concern headers             | `workflowEngineBoundaryFitness.architecture.test.ts` | Engine test suite compiles the fixtures.                                                                              |
| Forbidden runtime imports in test doubles | `workflowEngineBoundaryFitness.architecture.test.ts` | Existing engine tests continue using fake providers and in-memory stores.                                             |
| Shared architecture support reuse         | `workflowEngineBoundaryFitness.architecture.test.ts` | `workflowEngineProviderTelemetrySeams.architecture.test.ts` and `workflowEngineSemanticClosure.architecture.test.ts`. |
| Component docs and story coverage         | `workflowEngineBoundaryFitness.architecture.test.ts` | `pnpm docs:feature-mechanization:implementation`.                                                                     |
| ARC traceability                          | ARC docs validation                                  | `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`.                                                     |

## Requirement Trace

| Requirement                                                         | Decision                                             | Design                                                                        | Contract                                       | Code                                                                                 | Test                                                  | Runtime evidence                              |
| ------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------- | --------------------------------------------- |
| Test doubles must not become hidden runtime adapters.               | Existing adapter decisions stay behind engine ports. | Fixture modules declare owned concerns and forbid production adapter imports. | `IProviderAdapter` fake implementation only.   | `workflowEngine.fixture.ts`, `runLifecycle.fixture.ts`, `WorkflowEngine.helpers.ts`. | `workflowEngineBoundaryFitness.architecture.test.ts`. | ARC evidence and closeout for WE-HX-6.        |
| Architecture guards must validate semantics, not only thin barrels. | Use semantic architecture fitness functions.         | Shared support reads source/docs and asserts ownership.                       | `engineArchitectureTestSupport.ts` helper API. | `engineArchitectureTestSupport.ts`.                                                  | `workflowEngineBoundaryFitness.architecture.test.ts`. | Docs feature-mechanization and prepush gates. |
