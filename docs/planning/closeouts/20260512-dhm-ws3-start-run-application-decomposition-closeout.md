---
title: DHM-WS3 start-run application decomposition closeout
status: Draft
owner: Architecture / Engine
last_reviewed: 2026-05-12
planning_type: closeout
---

# DHM-WS3 Start-Run Application Decomposition Closeout

## Think-First Analysis

### Problem Summary

`DHM-WS3` must execute the next bounded DDD seam in the engine modularization
track. The active WorkflowEngine architecture already moved public facade
adaptation out of `WorkflowEngine`, but `StartRunApplicationService` still
constructs its own execution, failure, event-factory, and default
plan-integrity collaborators. That keeps orchestration and composition
responsibility in the same class.

### Root Cause

Earlier start-run slices extracted concrete collaborators from the original
engine path but left their construction inside the application service to keep
the migration small. That closed the large facade concern, yet left a smaller
SRP/DIP drift: the start-run use case both coordinates the command and decides
which concrete execution and failure services implement the command path.

### Constraints And Invariants

- `ADR-0003`: execution semantics stay DVT-owned and must remain behind the
  engine boundary.
- `ADR-0004`: run lifecycle facts stay event-sourced and writes must continue
  through the run-state write port.
- `ADR-0012`: plan dispatch must remain protected by the PlanRef integrity
  gate.
- `ADR-0014`: providers remain run-driven adapters behind the engine boundary.
- `ADR-0030`: start-run crash consistency remains protected by the intent log.
- `ADR-0034`: bounded-context communication must remain explicit through ports.
- `ADR-0039`: start-run orchestration belongs in the application service, while
  `WorkflowEngine` remains a facade and collaborator construction should move to
  composition seams.

### Options Considered

1. Keep collaborator construction inside `StartRunApplicationService` and only
   document the current state. Rejected because it leaves the W4 drift named in
   the subsystem context.
2. Move all start-run construction to `apps/api`. Rejected because engine tests
   and other composition roots still need an engine-local factory for the
   canonical internal service graph.
3. Add engine-owned execution/failure interfaces and a
   `buildStartRunApplicationService` composition helper. Selected because the
   use case depends on narrow ports, while production and test wiring can reuse
   one explicit builder.

### Selected Option And Rationale

Introduce explicit start-run execution and failure policy interfaces, make
`StartRunApplicationService` depend on those interfaces, and move concrete
`StartRunExecutionService`, `StartRunFailurePolicy`, `StartRunEventFactory`, and
default `PlanIntegrityValidator` construction into a builder function. This
keeps runtime behavior unchanged while closing the internal-construction drift.

### Rejected Alternatives

- Add optional override dependencies while keeping the old internal fallback.
  Rejected because the hidden fallback would preserve the drift.
- Create a new public engine contract. Rejected because this is an internal
  architecture decomposition with no external behavior change.
- Split adapter dispatch and bootstrap compensation further in this slice.
  Rejected as scope creep; the target is the construction seam, not new runtime
  semantics.

### Fowler Opportunity Matrix

| Scenario                                                     | Opportunity   | Fowler pattern                        | DDD owner                                                 | Command/query rail               | Allowed surfaces                                                                                                             | Tests                                                              | Out of scope                           |
| ------------------------------------------------------------ | ------------- | ------------------------------------- | --------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------- |
| Start-run service constructs execution/failure collaborators | SRP/DIP drift | Constructor Injection, Factory Method | Execution bounded context / start-run application service | Existing `startRun` command rail | `packages/@dvt/engine/src/application`, `packages/@dvt/engine/src/services/startRun`, engine tests, engine architecture docs | architecture guard, service injection unit test, engine test suite | API route behavior, provider semantics |

## Pre-Implementation Brief

- **Mode:** Full.
- **Scope:** engine start-run application composition seam, tests, architecture
  docs, closeout, ARC evidence/risk if required.
- **Touched files or paths:**
  - `packages/@dvt/engine/src/application/StartRunApplicationService.ts`
  - `packages/@dvt/engine/src/services/startRun/StartRunTypes.ts`
  - `packages/@dvt/engine/src/services/startRun/StartRunExecutionService.ts`
  - `packages/@dvt/engine/src/services/startRun/StartRunFailurePolicy.ts`
  - `packages/@dvt/engine/test/services/StartRunApplicationService.test.ts`
  - `packages/@dvt/engine/test/architecture/*`
  - `packages/@dvt/engine/test/helpers/workflowEngine.fixture.ts`
  - `apps/api/src/application/services/WorkflowEngineFactory.ts`
  - `docs/architecture/components/engine/architecture/*`
  - `docs/planning/closeouts/*`
- **Expected outcome:** `StartRunApplicationService` coordinates the start-run
  command through injected execution and failure ports and no longer constructs
  those concrete collaborators internally.
- **Risks and mitigations:** Constructor changes affect API and tests; add one
  engine-owned builder and update all composition call sites to use it. Static
  architecture tests can become brittle; check class-level ownership rather than
  formatting.
- **Out-of-scope items:** no public route change, no provider behavior change,
  no intent-log semantic change, no new command/query rail, no broader control
  service split.
- **Validation plan:** targeted RED/GREEN architecture and service tests,
  `pnpm --filter @dvt/engine typecheck`, `pnpm --filter @dvt/engine test`,
  `pnpm --filter dvt-api typecheck`, ARC check, docs generation/sync, and
  `pnpm verify:prepush`.
- **Test coverage plan:** negative architecture guard against collaborator
  construction returning to `StartRunApplicationService`, plus unit coverage
  proving injected execution and failure policies are the invoked seams.
- **Libraries evaluated:** None evaluated; this is TypeScript module and
  composition-boundary refactoring.
- **Command/query rail impact:** reuses the existing protected start-run command
  rail; no new command or query is introduced.
- **Fowler planning impact:** addresses SRP/DIP drift and hidden collaborator
  construction in the start-run application flow; residual deeper policy splits
  remain for future WE-HX/DHM slices.

## Work Performed

- Added `IStartRunExecutionService`, `IStartRunFailurePolicy`, and
  `StartRunExecutionInput` to the start-run seam types.
- Updated `StartRunExecutionService` and `StartRunFailurePolicy` to implement
  those seams.
- Updated `StartRunApplicationService` to receive execution, failure, and
  plan-integrity seams through constructor injection.
- Added `buildStartRunApplicationService` as the default engine-owned
  composition helper.
- Rewired API and engine test composition call sites to use the builder.
- Added architecture and service tests for the new seam.
- Added the start-run decomposition component guide and user stories.
- Added ARC evidence and risk-register material.

## Validation Evidence

| Command                                                                                                                                                         | Result                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineStartRunDecomposition.architecture.test.ts test/services/StartRunApplicationService.test.ts` | RED first, then PASS with 9 tests |
| `pnpm --filter @dvt/engine typecheck`                                                                                                                           | PASS                              |
| `pnpm --filter dvt-api typecheck`                                                                                                                               | PASS                              |
| `pnpm --filter @dvt/engine test`                                                                                                                                | PASS, 50 files / 394 tests        |
| `pnpm --filter dvt-api test -- test/integration/plannerEngineContract.test.ts`                                                                                  | PASS, 1 file / 7 tests            |
| `pnpm docs:status:generate`                                                                                                                                     | PASS                              |
| `pnpm docs:sync`                                                                                                                                                | PASS                              |

## Debt Introduced

None. No compatibility fallback, placeholder, fake adapter, or TODO/FIXME was
added. No rule, lint, test, docs, ARC, or hook gate was relaxed.

## Residual Follow-Up

- `StartRunAdmissionGuard` still mixes admission, capability, adapter
  resolution, and rate-limit policy; that remains a later DHM/WE-HX slice.
- `WorkflowEngineCoreService` still concentrates cancel and signal behavior;
  that remains out of scope for DHM-WS3.
