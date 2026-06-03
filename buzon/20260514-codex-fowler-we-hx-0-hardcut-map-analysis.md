---
title: WE-HX-0 hardcut canonical map analysis
status: Draft
date: 2026-05-14
owner: codex
---

# WE-HX-0 Hardcut Canonical Map Analysis

## Mature-System Comparison

Mature hexagonal systems do not describe an active architecture cutover as
"compatibility-first" after the decision has moved to hardcut. They keep one
canonical map, one component vocabulary, and one current runtime truth. Old
consumer-migration language belongs in archived closeouts or migration notes,
not in the active component API, target architecture, or architecture fitness
tests.

## Improved Patterns

- **Replace Conditional With Explicit Boundary**: the active docs must describe
  `WorkflowEngine` as the public command/query boundary and
  `WorkflowEngineCoreService` as a combined run-control delegator, not as a
  compatibility adapter.
- **Introduce Semantic Architecture Guard**: tests should reject stale
  compatibility language in the WE-HX-0 canonical docs and owned-concern
  headers.
- **Consolidate Canonical Reading Path**: component home, subsystem context,
  target architecture, user manual, and proposal must agree on the hardcut
  posture.

## Antipatterns Detected

- **Documentation drift**: the proposal and component docs still describe
  compatibility-first strategy while the current user instruction is hardcut.
- **Duplicate semantics**: "compatibility facade", "compatibility adapter",
  "legacy combined surface", and "old callers" all point at one current
  run-control delegation concern.
- **Test-only confidence**: existing architecture tests checked that the
  compatibility adapter stayed thin; they did not prevent the stale posture from
  remaining canonical.

## Component Grouping

| Group                  | Owned concern                                                       | Canonical surfaces                                                                                                       |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Engine public boundary | Command/query facade normalization and delegation                   | `WorkflowEngine.ts`, `IWorkflowEngine.v1.md`                                                                             |
| Facade use cases       | Operation-specific start, recover, cancel, status, and signal ports | `workflow-engine-use-cases/*`                                                                                            |
| Run-control delegator  | Combined cancel/signal delegator over command and signal services   | `WorkflowEngineCoreService.ts`, `RunCommandService.ts`, `RunSignalService.ts`                                            |
| Canonical docs         | Hardcut architecture map and user-facing runtime guide              | `workflow-engine-subsystem-context.md`, `workflow-engine-target-architecture.v1.md`, `workflow-engine-user-manual.v1.md` |

## Future Lessons

- A hardcut decision must update architecture tests before code or docs can
  keep migration vocabulary alive.
- "Compatibility" is allowed for plugin/runtime fingerprint compatibility, but
  not for the active WorkflowEngine architecture posture.
- Canonical docs should name current responsibilities, not transition comfort.

## Repetition Register

- `compatibility facade` repeated in proposal and target docs.
- `compatibility adapter` repeated in subsystem context, runtime path docs,
  semantic closure docs, and tests.
- `unchanged public contract` repeated as a migration reassurance rather than a
  current architecture invariant.

## Opportunity Register

| Scenario                                                             | Opportunity         | Fowler pattern                                              | DDD owner                    | Command/query rail                                    | Test                                                     |
| -------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------- | ---------------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| Canonical WE-HX-0 docs still promise compatibility-first posture     | Documentation drift | Substitute explicit current boundary for migration language | Engine architecture map      | None - documentation and architecture guard only      | `workflowEngineCanonicalMapHardcut.architecture.test.ts` |
| `WorkflowEngineCoreService` owned concern says compatibility adapter | Duplicate semantics | Rename semantic role to current delegator concern           | Engine run-control delegator | `IWorkflowEngine.cancelRun`, `IWorkflowEngine.signal` | `workflowEngineSemanticClosure.architecture.test.ts`     |
| User manual links old architecture paths                             | Documentation drift | Consolidate canonical reading path                          | Engine documentation         | None - documentation only                             | `workflowEngineCanonicalMapHardcut.architecture.test.ts` |

## Drift Register

- `workflow-engine-hexagonal-derivation-plan-20260403.md` still says
  "compatibility-first" and "compatibility facade".
- `workflow-engine-target-architecture.v1.md` still routes the derivation
  roadmap through "compatibility facade narrowing".
- `workflow-engine-subsystem-context.md` still names
  `WorkflowEngineCoreService` as a compatibility adapter.
- `workflow-engine-user-manual.v1.md` links stale `docs/architecture/engine/*`
  paths instead of current component paths.

## Applied Fixes

- Add a WE-HX-0 architecture guard that fails on compatibility posture in the
  active WorkflowEngine canonical docs.
- Replace WorkflowEngine compatibility language with hardcut, canonical
  command/query, and run-control delegator language.
- Keep plugin compatibility fingerprint language untouched because it refers to
  plan/runtime compatibility semantics, not public API retrocompatibility.
