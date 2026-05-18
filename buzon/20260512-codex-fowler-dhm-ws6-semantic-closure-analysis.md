---
title: Fowler analysis and remediation for DHM-WS6 semantic closure
status: Accepted
owner: Codex / Architecture
last_reviewed: 2026-05-12
planning_type: analysis
---

# Fowler Analysis And Remediation For DHM-WS6 Semantic Closure

## Scope

This mailbox record reviews the completed `DHM` modularization stream in the
`WorkflowEngine` context. It covers the recent WS2, WS3, and WS4 work:
API-side intent reconciler composition, start-run phase decomposition, and
runtime command/signal decomposition.

The active question is whether the branch improved architecture in a Fowler
sense, whether any residual antipatterns remain, and which fixes are required
so the code and documentation describe one current system.

## Mature-System Comparison

| Concern               | Current branch posture                                                               | Mature-system expectation                                                                                         | DHM-WS6 closure                                                                          |
| --------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Composition root      | API binds Postgres, providers, maintenance, and worker runtime                       | Infrastructure assembly is explicit and outside domain packages                                                   | `IntentReconcilerRuntimeComposition` stays in `apps/api` and has an owned concern header |
| Application service   | Start-run flow is split into named admission, intent, execution, and failure owners  | Service Layer coordinates domain/application services instead of owning all phase rules                           | Start-run docs and guards identify phase owners and transitions                          |
| Runtime control       | Cancel and signal behavior use separate role interfaces                              | Interface Segregation and role interfaces prevent command drift                                                   | `IRunCommandService` and `IRunSignalService` remain separate and documented              |
| Compatibility surface | `WorkflowEngineCoreService` remains for old combined callers                         | Compatibility adapters delegate and do not regain domain authority                                                | DHM-WS6 guard checks delegation and forbidden ownership                                  |
| Documentation         | Component guides exist per slice but did not yet contain one semantic closure record | Mature systems keep a local component engineering record with API, invariants, transitions, consumers, and guards | Added semantic closure guide and stories                                                 |
| Fitness function      | Existing tests mostly checked split shape per slice                                  | Fitness functions should test semantic ownership, not only barrels                                                | Added cross-slice architecture guard                                                     |

## Improved Patterns

- **Service Layer:** `StartRunApplicationService` coordinates named phase
  services instead of implementing admission, intent, dispatch, and failure
  policy itself.
- **Role Interface:** cancel and signal runtime commands are expressed through
  `IRunCommandService` and `IRunSignalService`.
- **Separated Interface / Hexagonal Composition:** API runtime composition owns
  concrete Postgres and provider binding, while engine receives ports.
- **Compatibility Adapter:** `WorkflowEngineCoreService` preserves the combined
  run-control surface but delegates to role-specific services.
- **Architecture Fitness Function:** DHM-WS6 adds a semantic guard that ties
  code ownership headers, component docs, stories, and runtime authority
  together.

## Antipatterns Detected

- **Documentation drift:** WS2, WS3, and WS4 had separate guides, but no
  single closure record explained how the seams compose as one mature system.
- **Semantic anonymity:** `intentReconcilerRuntime.ts`,
  `WorkflowEngineFactory.ts`, `WorkflowEngineCoreService.ts`, and the command
  role ports did not consistently state their owned concern in the module
  header.
- **Fitness-function narrowness:** existing architecture tests protected
  selected files but did not verify the cross-slice semantic contract.
- **Compatibility gravity:** `WorkflowEngineCoreService` could regain cancel or
  signal semantics unless a guard made its adapter-only role explicit.

## Component Grouping

| Group            | Components                                                                                                                                 | Owned concern                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| API composition  | `WorkflowEngineFactory`, `IntentReconcilerRuntimeComposition`                                                                              | Build concrete runtime graphs and keep infrastructure binding in `apps/api` |
| Facade use cases | `WorkflowStartRunUseCase`, `WorkflowCancelRunUseCase`, `WorkflowSignalRunUseCase`, `WorkflowRunStatusUseCase`, `WorkflowRecoverRunUseCase` | Adapt public engine facade calls to application services                    |
| Start-run phases | `StartRunAdmissionService`, `StartRunIntentService`, `StartRunExecutionService`, `StartRunFailurePolicy`                                   | Own the start-run command phases behind the application service             |
| Runtime control  | `RunCommandService`, `RunSignalService`                                                                                                    | Own cancel and signal runtime semantics behind role interfaces              |
| Compatibility    | `WorkflowEngineCoreService`, `buildRunControlService`                                                                                      | Preserve the legacy combined run-control shape without owning behavior      |
| Semantic guard   | `workflowEngineSemanticClosure.architecture.test.ts`                                                                                       | Validate cross-slice ownership, docs, stories, and drift controls           |

## Future Lessons

- A decomposition is not closed when the file is thinner; it is closed when the
  module can say what concern it owns and tests can detect if that concern
  moves back.
- Compatibility surfaces should be named as compatibility surfaces in code
  headers and component docs.
- Component records should be created before or with the code seam, not after a
  reviewer asks what the component means.
- Architecture tests should assert semantic ownership and forbidden authority,
  not only import/export shape.

## Repetition Register

| Repetition                | Finding                                                                                               | Fix                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Runtime docs per slice    | WS2, WS3, and WS4 each explained local behavior but not the composed closure                          | Added DHM-WS6 semantic closure guide                                                     |
| Header vocabulary         | Some modules used `@ownedConcern`; others relied on file names or prose                               | Added/normalized owned concern docblocks                                                 |
| Architecture guard intent | Existing tests repeated source reads and doc checks per slice                                         | Added one cross-slice semantic guard for closure                                         |
| Component API phrasing    | API/invariant/consumer language was present in multiple docs but not centrally tied to DHM completion | Added one guide with API, invariants, transitions, consumers, diagrams, and drift guards |

## Opportunity Register

| Opportunity                    | Fowler signal                        | Selected action                                                   |
| ------------------------------ | ------------------------------------ | ----------------------------------------------------------------- |
| Make compatibility explicit    | Hidden authority                     | Header and guard for `WorkflowEngineCoreService`                  |
| Make composition root explicit | Boundary drift                       | Header and docs for API runtime composition surfaces              |
| Prevent doc/code divergence    | Documentation drift                  | Component guide plus stories plus architecture guard              |
| Reduce future review cost      | Duplicate semantics                  | Component grouping table and scenario coverage matrix             |
| Prepare WE-HX-5                | Boundary drift / duplicate telemetry | Keep provider/telemetry standardization separate from DHM closure |

## Drift Register

| Drift                                               | Code or docs | Risk                                                         | Resolution                                    |
| --------------------------------------------------- | ------------ | ------------------------------------------------------------ | --------------------------------------------- |
| Missing owned concern on API reconciler runtime     | Code         | API composition could be mistaken for engine domain behavior | Added owned concern header                    |
| Missing owned concern on API engine factory         | Code         | Runtime graph assembly could be treated as engine semantics  | Added owned concern header                    |
| Missing owned concern on core compatibility wrapper | Code         | Wrapper could regain cancel or signal implementation         | Added owned concern header and semantic guard |
| Command/signal role ports named behavior indirectly | Code         | Port ownership unclear to future changes                     | Clarified role-interface headers              |
| No DHM-level closure guide                          | Docs         | WS2/WS3/WS4 remain understandable only as separate slices    | Added semantic closure component guide        |
| No DHM-level scenario set                           | Docs/tests   | Missing review surface for future maintainers                | Added DHM-WS6 user stories                    |

## Applied Fixes

- Added module-level `@ownedConcern` docblocks where semantic ownership was
  implicit.
- Added `workflow-engine-semantic-closure-component.md` with public API,
  invariants, transitions, consumers, diagrams, and drift guards.
- Added DHM-WS6 user stories and scenario coverage.
- Added `workflowEngineSemanticClosure.architecture.test.ts` to validate
  semantic ownership across API composition, engine compatibility, command,
  signal, and documentation.
- Updated the WorkflowEngine hexagonal derivation plan with a DHM-WS6
  feature-mechanization block.

## 2026-05-18 Hardening Addendum

The WS2 follow-up split `intentReconcilerRuntime.ts` into a public facade and
`intentReconcilerRuntimeComposition.ts` as the concrete API runtime composition
root. The DHM-WS6 semantic guard and local component guide were updated to
model that current shape instead of the earlier single-file composition shape.
See
`buzon/20260518-codex-fowler-dhm-ws6-semantic-closure-hardening-analysis.md`.
