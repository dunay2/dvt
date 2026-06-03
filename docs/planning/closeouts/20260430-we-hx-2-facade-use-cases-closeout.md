---
title: WE-HX-2 facade use-case narrowing closeout
status: Draft
owner: Architecture / Engine / API
last_reviewed: 2026-04-30
planning_type: closeout
---

# WE-HX-2 Facade Use-Case Narrowing Closeout

## Think-First Analysis

### Problem Summary

`WE-HX-2` must reduce `WorkflowEngine` to a compatibility facade over explicit
use-case services. `WE-HX-1` already clarified boundary ownership for plan
artifacts and execution-context references, but `WorkflowEngine` still owns more
than contract normalization and delegation: `startRun()` builds resolved
context, builds trace context, opens the observability span, records exceptions,
and invokes the application service directly. That keeps cross-cutting runtime
orchestration inside the facade and weakens the target architecture stated in
the WorkflowEngine subsystem documents.

### Root Cause

The original facade gradually absorbed runtime wiring while earlier hardening
slices extracted low-level collaborators. The result is a partially narrowed
facade: it no longer owns state stores, plan fetching, health, or enrichment,
but it still adapts start-run caller input to the internal application service
and wraps tracing behavior itself. The dependency names also describe internal
services (`startRunApplicationService`, `runControlService`) instead of
facade-facing use cases, so future edits can re-grow service orchestration in
the facade without tripping a semantic guard.

### Constraints And Invariants

- `ADR-0003`: DVT owns execution semantics, and the engine remains the
  execution boundary.
- `ADR-0004`: lifecycle authority remains event-sourced and must not be hidden
  behind provider behavior.
- `ADR-0014`: providers remain run-driven adapters behind the engine boundary.
- `ADR-0015`: canonical status reads remain separated from provider
  enrichment.
- `ADR-0030`: start-run crash consistency remains in the start-run application
  path, not in the facade.
- `ADR-0034`: bounded-context communication should happen through explicit
  contracts and use-case boundaries.
- `ADR-0039`: the facade must not absorb authorization, intent, or store
  responsibilities.

### Options Considered

1. **Rename existing dependencies only.** Rejected because it would improve
   vocabulary but leave start-run tracing and resolved-context construction
   inside `WorkflowEngine`.
2. **Move all normalization into use cases.** Rejected because `WE-HX-2`
   explicitly keeps the compatibility facade responsible for contract
   normalization before delegation.
3. **Introduce facade-facing use-case interfaces and move start-run tracing into
   a start-run use case adapter.** Selected because it leaves
   `WorkflowEngine` with only parse/normalize/delegate behavior while
   preserving existing application service and crash-consistency semantics.

### Selected Option And Rationale

Add explicit facade-facing use-case services for start, recover, cancel, status,
and signal. `WorkflowEngine` will depend on those use cases, not on internal
application/core service names. `WorkflowStartRunUseCase` will own
resolved-context construction, trace-context construction, observability span
handling, and delegation to `IStartRunApplicationService`. The existing
recovery, control, and status services remain intact behind thin use-case
adapters.

### Rejected Alternatives

- Keep tracing in `WorkflowEngine`: rejected because the facade would still own
  cross-cutting orchestration rather than pure compatibility delegation.
- Create a new public `IWorkflowEngine` version: rejected because this slice
  changes internal architecture, not the external engine contract.
- Replace `StartRunApplicationService`: rejected because `WE-HX-2` is facade
  narrowing; deeper start-run decomposition belongs to later WE-HX waves.

## Pre-Implementation Brief

- **Mode:** Full.
- **Scope:** `@dvt/engine` facade/use-case internals, API and test construction
  fallout, architecture docs, planning closeout, evidence/risk for ARC-2.
- **Touched paths:** `packages/@dvt/engine/src/core/WorkflowEngine.ts`,
  `packages/@dvt/engine/src/application`, engine exports, engine architecture
  tests, engine fixtures, `apps/api/src/application/services/WorkflowEngineFactory.ts`,
  API tests that construct the facade directly, WorkflowEngine architecture
  docs, Lane A planning state, evidence, and risk register.
- **Expected outcome:** `WorkflowEngine` parses/normalizes public inputs and
  delegates to explicit use cases. It does not build trace context, open spans,
  record exceptions, or depend on low-level application/core service names.
- **Risks and mitigations:** Constructor shape changes affect API and tests;
  mitigate with a single builder/helper for use-case construction. Static tests
  can become brittle; make the architecture test validate semantic ownership,
  not exact method formatting.
- **Out-of-scope items:** No public endpoint change, no `IWorkflowEngine`
  surface change, no provider behavior change, no start-run admission
  decomposition beyond moving facade-owned adaptation into a use case.
- **Validation plan:** red/green targeted architecture test, engine tests,
  engine typecheck, API typecheck/test for factory fallout, ARC check,
  docs generation/sync, and `pnpm verify:prepush`.
- **Test coverage plan:** negative architecture coverage for `WorkflowEngine`
  re-growing observability spans, trace-context construction, direct
  `IStartRunApplicationService` dependency, or direct `IRunControlService`
  dependency; behavior coverage remains through existing start/recover/status
  tests and direct constructor tests.
- **Libraries evaluated:** None evaluated; this is internal architecture
  decomposition under existing TypeScript/hexagonal patterns.

## Normative Baseline

- `ADR-0003`
- `ADR-0004`
- `ADR-0014`
- `ADR-0015`
- `ADR-0030`
- `ADR-0034`
- `ADR-0039`

## Work Performed

- Added `packages/@dvt/engine/src/application/workflow-engine-use-cases/`
  with explicit facade-facing use-case interfaces and one module per start,
  recover, cancel, status, signal, and composition concern.
- Moved start-run resolved-context construction, trace-context construction,
  span handling, and exception span recording out of `WorkflowEngine` and into
  `WorkflowStartRunUseCase`.
- Updated `WorkflowEngine` to parse and normalize public inputs, then delegate
  to `IWorkflowStartRunUseCase`, `IWorkflowRecoverRunUseCase`,
  `IWorkflowCancelRunUseCase`, `IWorkflowRunStatusUseCase`, and
  `IWorkflowSignalRunUseCase`.
- Updated `apps/api` and engine test fixtures to construct the use cases through
  `buildWorkflowEngineUseCases`.
- Added semantic architecture coverage and a local component guide for the
  facade use-case component.
- Added local user stories in
  `docs/architecture/components/engine/architecture/workflow-engine-facade-use-cases-user-stories.md`.
- Added Fowler mailbox analysis in
  `buzon/20260430-codex-fowler-we-hx-2-facade-use-cases-analysis-and-remediation.md`.
- Added ARC-2 evidence and risk-register material.

## Validation Evidence

- Red first:
  `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineFacadeUseCases.architecture.test.ts`
  failed because `WorkflowEngineUseCases.ts` and the component guide were
  missing, and `WorkflowEngine` still contained tracing and internal service
  dependencies.
- Red follow-up:
  the same command failed when the component remained monolithic, the facade
  lacked an `@ownedConcern` line, and local stories plus mailbox review were
  missing.
- Green:
  `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineFacadeUseCases.architecture.test.ts`
  passed, 3 tests.
- `pnpm --filter @dvt/engine typecheck`
  passed.
- `pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.test.ts test/core/WorkflowEngine.planRef.test.ts test/architecture/workflowEngineFacadeUseCases.architecture.test.ts`
  passed, 39 tests.
- `pnpm --filter dvt-api typecheck`
  passed.
- `pnpm --filter @dvt/engine test`
  passed, 48 files and 383 tests.

## No-Debt And No-Stub Evidence

- No public `IWorkflowEngine` compatibility alias was added.
- No TODO/FIXME, placeholder, fake adapter, or fake success path was added.
- No lint, type, test, docs, ARC, or hook rules were relaxed.
- No hooks were bypassed.
- No CodeRabbit workflow was used.
