---
title: DHM-WS4 Fowler runtime path boundary hardening analysis
status: Review
owner: Architecture / Engine
last_reviewed: 2026-05-18
planning_type: analysis
---

# DHM-WS4 Fowler Runtime Path Boundary Hardening Analysis

## Context

`DHM-WS4` had already split runtime cancel and signal behavior into
`RunCommandService` and `RunSignalService`. The remaining drift was subtler:
`WorkflowEngineCoreService` still imported those concrete classes and built them
from a wide dependency bag. The wrapper looked thin at method level, but it still
owned composition knowledge.

Mature hexagonal systems keep compatibility wrappers as role-interface
delegators. Concrete construction belongs at composition boundaries or explicit
factory helpers, not inside the delegator that is supposed to prove the boundary.

## Fowler Assessment

| Signal                  | Finding                                                                              | Applied pattern                  | Result                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------ | -------------------------------- | --------------------------------------------------------------------------- |
| Boundary drift          | `WorkflowEngineCoreService` imported concrete runtime services.                      | Dependency Inversion             | The core wrapper now receives `IRunCommandService` and `IRunSignalService`. |
| Responsibility overload | The wrapper delegated calls and assembled collaborator graphs.                       | Extract Service / Pure Delegator | Runtime behavior and service construction no longer share the same class.   |
| Test-only confidence    | The guard proved adapter dispatch was absent, but not concrete construction.         | Semantic architecture test       | The guard now fails if the wrapper imports or constructs runtime services.  |
| Documentation drift     | Component docs called the wrapper a delegator while code still constructed services. | Current-state doc alignment      | Docs now name the pure-delegator invariant.                                 |

## Anti-Patterns Removed

- Hidden collaborator construction inside a compatibility wrapper.
- A wide dependency bag crossing into a class whose owned concern is delegation.
- Architecture guard coverage that checked only behavior strings and missed
  composition authority.

## Components To Group

- `WorkflowEngineCoreService`: combined run-control delegator only.
- `IRunCommandService` + `RunCommandService`: cancel command path.
- `IRunSignalService` + `RunSignalService`: runtime signal path.
- Test fixtures and API factories: composition surfaces that may assemble
  command and signal services.

## Repetitions And Drift Fixed

- The command/signal construction recipe existed implicitly in the wrapper and
  explicitly in fixtures/factories. The wrapper copy is removed.
- The component guide now matches code: the delegator accepts role services, not
  infrastructure collaborators.
- The architecture guard now validates semantic encapsulation, not just barrel
  thinness or absence of adapter method calls.

## Opportunities

- Future runtime-control work should introduce decorators for telemetry or
  retries outside the role services instead of widening `WorkflowEngineCoreService`.
- Provider resolution and telemetry seams remain separate WE-HX follow-up work;
  this slice intentionally avoids changing runtime semantics.

## Lessons For Future Work

- A class can be thin and still own the wrong concern if it constructs concrete
  collaborators.
- Architecture tests should assert forbidden construction/import authority when
  a component's owned concern is delegation.
- Component docs should name constructor invariants, not only public methods.

## ADR Decision

No new ADR is required. This hardening implements existing decisions:
`ADR-0003` keeps execution semantics engine-owned, and `ADR-0039` requires
explicit ports and hexagonal boundary hardening. No public contract, command,
query, adapter behavior, or lifecycle semantics changed.
