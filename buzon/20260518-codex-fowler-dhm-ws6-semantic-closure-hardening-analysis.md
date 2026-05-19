---
title: DHM-WS6 Fowler semantic closure hardening analysis
status: Accepted
owner: Codex / Architecture
last_reviewed: 2026-05-18
planning_type: analysis
work_item: DHM-WS6
---

# DHM-WS6 Fowler Semantic Closure Hardening Analysis

## Mature-System Comparison

`DHM-WS6` already had the right Fowler intent: close modularization by proving
semantic ownership instead of celebrating thin barrels. The latest WS2 hardening
split `intentReconcilerRuntime.ts` into a public facade and
`intentReconcilerRuntimeComposition.ts` as the concrete composition root. Mature
systems keep that distinction explicit in both code and documentation because a
facade is a compatibility surface, while a composition root owns concrete
adapter wiring.

| Concern              | Mature-system expectation                                           | Drift found in this pass                                                | Applied closure                                                                  |
| -------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Runtime facade       | Stable public factory with no infrastructure authority              | DHM-WS6 guard still expected concrete assembly in the facade            | Guard now requires facade delegation and forbids Postgres/provider/worker wiring |
| Composition root     | Concrete adapter graph assembly remains root-owned                  | Docs collapsed facade and composition into one runtime surface          | Component guide names both runtime surfaces                                      |
| Architecture fitness | Tests validate semantic ownership after every decomposition         | Existing guard failed for the wrong reason after WS2 moved the assembly | Guard checks current ownership instead of historical shape                       |
| User story coverage  | Scenarios cover future refactors that preserve compile-time exports | No story covered facade/composition drift                               | Added `US-DHM-WS6-006`                                                           |
| Planning closure     | Planning state follows executable evidence                          | `DHM-WS6` remained queued after implementation artifacts existed        | This pass prepares validated evidence for DB closeout                            |

## Improved Patterns

- **Facade plus Composition Root:** `intentReconcilerRuntime.ts` now reads as a
  stable public runtime facade, while `intentReconcilerRuntimeComposition.ts`
  owns Postgres stores, migrations, provider resolution, maintenance, and
  worker creation.
- **Architecture Fitness Function:** the semantic guard now fails when runtime
  authority moves to the wrong owner, not when a historical file name changes.
- **Component Engineering Record:** the local component guide now separates API
  runtime facade, API runtime composition, engine facade adaptation, start-run
  phases, runtime control, and compatibility delegation.
- **Strangler Compatibility:** `WorkflowEngineCoreService` remains a delegating
  compatibility surface rather than a place to rebuild cancel or signal
  semantics.

## Antipatterns Detected

- **Stale guard as hidden legacy:** the DHM-WS6 guard still encoded the pre-WS2
  file layout. It caught drift, but the assertion described old ownership.
- **Documentation collapse:** the component guide listed
  `intentReconcilerRuntime.ts` as concrete runtime composition after the code
  had moved that concern elsewhere.
- **Scenario gap:** the stories covered semantic closure broadly but did not
  name the facade/composition split as a future regression vector.

## Component Grouping

| Group                   | Owned concern                                                         | Current files                                                                      |
| ----------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| API runtime facade      | Public factory and handle contract for the reconciler runtime         | `apps/api/src/runtime/intentReconcilerRuntime.ts`                                  |
| API runtime composition | Concrete Postgres, provider, maintenance, worker, and handle assembly | `apps/api/src/runtime/intentReconcilerRuntimeComposition.ts`                       |
| Engine runtime factory  | Production WorkflowEngine graph assembly and test seam                | `apps/api/src/application/services/WorkflowEngineFactory.ts`                       |
| Runtime control roles   | Cancel and signal behavior through role interfaces                    | `IRunCommandService`, `IRunSignalService`, `RunCommandService`, `RunSignalService` |
| Compatibility delegate  | Combined run-control API without behavior ownership                   | `WorkflowEngineCoreService`, `buildRunControlService`                              |
| Semantic guard          | Cross-slice ownership and docs alignment                              | `workflowEngineSemanticClosure.architecture.test.ts`                               |

## Future Lessons

- A semantic guard must evolve when the architecture improves; otherwise the
  guard becomes legacy even if it still fails.
- A facade should never be documented as a composition root once the concrete
  graph has moved behind it.
- Component guides should name both compatibility surfaces and concrete owners,
  because mature systems preserve old call shapes while moving authority.
- Planning DB state is part of architecture hygiene: queued work with accepted
  artifacts is a drift signal.

## Repetition Register

| Repetition                    | Finding                                                        | Fix                                                          |
| ----------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| Facade/composition vocabulary | `intentReconcilerRuntime.ts` was repeatedly called composition | Docs now distinguish facade and composition root             |
| Runtime ownership assertions  | Guard expected assembly in the facade                          | Guard now checks facade delegation plus composition assembly |
| Story acceptance language     | Existing stories did not mention this regression path          | Added `US-DHM-WS6-006`                                       |

## Opportunity Register

| Opportunity                         | Fowler signal         | Action taken                                                                |
| ----------------------------------- | --------------------- | --------------------------------------------------------------------------- |
| Retire historical ownership wording | Documentation drift   | Updated component guide and user stories                                    |
| Strengthen semantic guard           | Architecture fitness  | Test now validates both facade non-authority and composition root authority |
| Prepare DHM closeout                | Process drift         | Evidence is ready to update Planning DB after validation                    |
| Reduce future review cost           | Component engineering | Component grouping makes the runtime facade/composition boundary explicit   |

## Drift Register

| Drift                                                                   | Type      | Risk                                              | Resolution                                            |
| ----------------------------------------------------------------------- | --------- | ------------------------------------------------- | ----------------------------------------------------- |
| Guard expected `IntentReconcilerRuntimeComposition` in the facade       | Code test | False failure after a valid refactor              | Guard reads facade and composition separately         |
| Component guide named only `intentReconcilerRuntime.ts` for composition | Docs      | Maintainers could put concrete wiring back there  | Guide names `intentReconcilerRuntimeComposition.ts`   |
| User stories lacked facade/composition split coverage                   | Docs      | Future changes could satisfy old closure criteria | Added `US-DHM-WS6-006` and coverage matrix entry      |
| Planning state still showed `DHM-WS6` as queued                         | Planning  | Workboard no longer matched accepted artifacts    | Will close through Planning DB after green validation |

## Applied Fixes

- Updated `workflowEngineSemanticClosure.architecture.test.ts` so the red/green
  proof validates current semantic ownership.
- Updated the DHM-WS6 component guide with the API runtime facade and concrete
  composition root split.
- Added the `US-DHM-WS6-006` user story and negative scenario for runtime
  facade/composition drift.
- Recorded this 2026-05-18 Fowler hardening analysis in `buzon`.
- No ADR is needed: ADR-0003 and ADR-0039 already govern the composition-root
  and hexagonal ownership decision.
