---
title: DHM-WS4 runtime path decomposition closeout
status: Draft
owner: Architecture / Engine
last_reviewed: 2026-05-12
planning_type: closeout
---

# DHM-WS4 Runtime Path Decomposition Closeout

## Think-First Analysis

### Problem Summary

`DHM-WS4` must close the next engine modularization seam after `DHM-WS3`.
`WE-HX-4` already documented the target split of runtime query, command,
signal, and enrichment paths, and earlier slices moved status reads and
enrichment to dedicated services. The remaining executable drift is that
`WorkflowEngineCoreService` still owns both cancel-command dispatch and signal
dispatch, including shared adapter lookup, authorization, observability, and
signal transition rules in one class.

### Root Cause

The original runtime-control service was kept as a compatibility seam while
read status, enrichment, recovery, and facade use cases were extracted around
it. That avoided broad call-site churn, but it left a residual SRP/DIP issue:
facade command use cases depend on a combined `IRunControlService`, and the
implementation class has two independent reasons to change.

### Constraints And Invariants

- `ADR-0003`: execution lifecycle authority stays inside DVT-owned engine
  boundaries.
- `ADR-0004`: lifecycle facts remain event-sourced; signal-derived facts must
  continue through the run-state write port.
- `ADR-0007`: cancel request semantics remain runtime-owned and must not
  invent duplicate engine-owned lifecycle facts.
- `ADR-0008`: signal idempotency remains deterministic through the canonical
  idempotency key builder.
- `ADR-0039`: engine runtime behavior must move behind explicit ports and
  application seams without leaking infrastructure construction into the
  public facade.
- `ADR-0047`: `PAUSE` and `RESUME` realized lifecycle facts remain
  runtime-owned, with engine-side guard/idempotency checks preserving
  fail-closed behavior.
- `ADR-0049`: `RETRY_RUN` remains a separate recovery use case, not a
  canonical signal.

### Options Considered

1. Keep `WorkflowEngineCoreService` as-is and only add documentation. Rejected
   because it leaves the residual DHM-WS4 target unclosed in code.
2. Delete `WorkflowEngineCoreService` and change every caller to new services
   in one cut. Rejected because public factory exports and tests already use
   `buildRunControlService`; removing the seam would create avoidable churn.
3. Introduce `IRunCommandService` and `IRunSignalService`, move cancel and
   signal logic into dedicated services, and keep `buildRunControlService` as a
   compatibility assembler. Selected because it closes ownership drift while
   keeping composition roots stable.

### Selected Option And Rationale

Add dedicated command and signal ports plus services:
`RunCommandService` owns cancel-command authorization, metadata lookup, adapter
dispatch, timeout, and cancel observability. `RunSignalService` owns signal
request parsing, signal transition guard, adapter dispatch, signal-derived event
emission, timeout, and signal observability. `WorkflowEngineCoreService` becomes
a thin compatibility adapter for the old combined run-control surface, and
facade use-case construction receives command and signal services separately.

### Rejected Alternatives

- Add optional command/signal overrides to `WorkflowEngineCoreService` while
  leaving fallback logic in the same class. Rejected because hidden fallback
  logic would preserve the drift.
- Move cancel and signal services into `apps/api`. Rejected because these are
  engine runtime semantics, not API composition behavior.
- Change `IWorkflowEngine` or the public route contract. Rejected because
  `DHM-WS4` is an internal decomposition with no external behavior change.

### Fowler Opportunity Matrix

<!-- markdownlint-disable MD060 -->

| Scenario                                             | Opportunity             | Fowler pattern                                  | DDD owner                               | Command/query rail                 | Allowed surfaces                                                                                                                                       | Tests                                                                                                 | Out of scope                             |
| ---------------------------------------------------- | ----------------------- | ----------------------------------------------- | --------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Cancel and signal share one runtime service          | Responsibility overload | Extract Service, Interface Segregation          | Execution bounded context / run control | Existing runtime run-control rail  | `packages/@dvt/engine/src/domain`, `packages/@dvt/engine/src/services/runControl`, `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts`        | runtime-path architecture guard, focused command/signal tests, existing core-service regression tests | public `IWorkflowEngine` changes         |
| Facade use cases depend on a combined service        | Boundary drift          | Dependency Inversion, Role Interface            | Facade-facing command use cases         | Existing cancel and signal rails   | `packages/@dvt/engine/src/application/workflow-engine-use-cases`, API/engine factory wiring, engine fixtures                                           | architecture guard proving separate command/signal dependencies                                       | changing start-run/recovery/status paths |
| Docs still name `WorkflowEngineCoreService` as mixed | Documentation drift     | Current-state component documentation alignment | Engine architecture docs                | none - internal architecture guard | `docs/architecture/components/engine/architecture`, `docs/planning/proposals/mandatory/runtime-and-contracts`, closeout, evidence, risk-register files | markdown lint, feature mechanization implementation check, governance refresh, `verify:prepush`       | broad historical doc rewrite             |

<!-- markdownlint-enable MD060 -->

## Pre-Implementation Brief

- **Mode:** Full.
- **Scope:** engine runtime cancel/signal decomposition, facade use-case
  dependency split, compatibility builder retention, architecture docs, ARC
  evidence/risk, and planning closeout.
- **Touched files or paths:**
  - `packages/@dvt/engine/src/domain/*`
  - `packages/@dvt/engine/src/services/runControl/*`
  - `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts`
  - `packages/@dvt/engine/src/application/workflow-engine-use-cases/*`
  - `packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts`
  - `packages/@dvt/engine/test/architecture/*`
  - `packages/@dvt/engine/test/helpers/workflowEngine.fixture.ts`
  - `apps/api/src/application/services/WorkflowEngineFactory.ts`
  - `apps/api/test/integration/plannerEngineContract.test.ts`
  - `docs/architecture/components/engine/architecture/*`
  - `docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md`
- **Expected outcome:** cancel and signal behavior are executable through
  dedicated services, while `buildRunControlService` remains as a compatibility
  assembler for existing composition roots.
- **Risks and mitigations:** Signal semantics are subtle; preserve existing
  `WorkflowEngineCoreService.test.ts` behavior and add architecture tests that
  prevent adapter dispatch and signal transition logic from returning to the
  compatibility wrapper.
- **Out-of-scope items:** no public route change, no provider signal semantic
  change, no `IWorkflowEngine` contract change, no retry-run behavior change,
  no status/enrichment contract change.
- **Validation plan:** RED architecture/service tests first; targeted engine
  tests; engine/API typechecks; API integration test; feature mechanization;
  docs sync/status generation; governance refresh; `pnpm verify:prepush`.
- **Test coverage plan:** fail-closed signal tests stay in the existing core
  regression suite; new tests prove command and signal services can be injected
  independently and that the compatibility wrapper is delegation-only.
- **Libraries evaluated:** None evaluated; this is internal TypeScript
  decomposition and no new runtime capability is introduced.
- **Command/query rail impact:** reuses existing cancel and signal runtime
  command rails; no new externally observable command or query is introduced.
- **Fowler planning impact:** addresses responsibility overload, boundary drift,
  and documentation drift for the runtime-control seam; broader provider
  telemetry standardization remains for `WE-HX-5`.

## Work Performed

- Added `IRunCommandService` and `IRunSignalService` and narrowed
  `IRunControlService` to a compatibility interface over both role interfaces.
- Added `RunCommandService` for cancel runtime-command dispatch and
  `RunSignalService` for signal transition, adapter dispatch, and
  signal-derived event emission.
- Converted `WorkflowEngineCoreService` into a compatibility adapter that
  delegates cancel and signal calls to the dedicated services.
- Updated facade use-case construction, API factory wiring, and engine test
  fixtures to inject command and signal services separately.
- Added the DHM-WS4 architecture guard, component guide, user stories, ARC
  evidence, risk-register entry, and feature-mechanization manifest coverage.
- Regenerated documentation indexes, generated code status, docs manifest, and
  governance projections through the repository refresh rail.
- Performed a second Fowler hardening pass on 2026-05-18 and removed the
  remaining hidden construction legacy from `WorkflowEngineCoreService`.
- Added a semantic architecture guard proving the combined run-control wrapper
  cannot import or instantiate concrete runtime command/signal services.
- Updated the runtime path component guide and user stories to document the
  pure-delegator constructor invariant.

## Validation Evidence

- `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts test/core/WorkflowEngineCoreService.test.ts`
  failed first as the RED cycle because command/signal services and docs were
  not present yet.
- `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts test/core/WorkflowEngineCoreService.test.ts`
  passed after extraction.
- `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts test/core/WorkflowEngineCoreService.test.ts test/application/workflowEngineUseCases.factory.test.ts`
  passed.
- `pnpm --filter @dvt/engine typecheck` passed after preserving exact optional
  property semantics for runtime timeouts.
- `pnpm --filter dvt-api typecheck` passed.
- `pnpm --filter @dvt/engine test` passed with 51 files and 399 tests.
- `pnpm --filter dvt-api test -- test/integration/plannerEngineContract.test.ts`
  passed with 1 file and 7 tests.
- `pnpm docs:feature-mechanization -- --feature DHM-WS4-RUNTIME-PATH-DECOMPOSITION`
  passed.
- `pnpm docs:status:generate` passed and updated generated code status.
- `pnpm docs:sync` passed and regenerated evidence/risk indexes.
- `pnpm governance:refresh` passed and stabilized generated governance surfaces
  after two passes.
- `pnpm docs:feature-mechanization:implementation` passed after governance
  refresh.
- `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts`
  failed first on 2026-05-18 because `WorkflowEngineCoreService` still imported
  and constructed `RunCommandService` and `RunSignalService`.
- `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts`
  passed after the wrapper accepted only role services.
- `pnpm --filter @dvt/engine test -- test/core/WorkflowEngineCoreService.test.ts test/application/workflowEngineUseCases.factory.test.ts`
  passed after the fixture moved composition outside the wrapper.
- `pnpm --filter @dvt/engine typecheck` passed after the constructor contract
  was narrowed.
- `pnpm --filter @dvt/engine test` passed on 2026-05-18 with 64 files and 452
  tests.
- `pnpm arch:deps` passed.
- `pnpm governance:refresh` passed with governance coverage
  `files=4762 governed=4762 ungoverned=0 drift=0 legacy=0`.

## Debt And Stub Evidence

- No debt entry was created for this slice.
- No public route, contract, provider adapter, or signal semantic downgrade was
  introduced.
- No lint, type, test, feature-mechanization, ARC, governance, or hook rule was
  disabled or relaxed.
- No stubs, placeholders, fake adapters, fake success paths, TODO, or FIXME
  markers were added.
- The compatibility wrapper is explicit retained surface, not an unfinished
  fallback: cancel and signal runtime logic now live in the dedicated services.
- The compatibility wrapper no longer constructs concrete runtime services; it
  accepts role services and delegates only.
