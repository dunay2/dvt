---
title: API start-run execution capacity admission closeout
status: Done
owner: api
last_reviewed: 2026-04-22
planning_type: closeout
---

# API start-run execution capacity admission closeout

## Think-First Analysis

- Problem summary:
  `AR-C3` was framed around Temporal saturation, but the API start-run
  admission path had no abstract execution-capacity seam and could still accept
  work without a governed application-level capacity decision.
- Root cause:
  The admission path already owned duplicate detection and delivery
  backpressure, but no start-run-scoped port existed for execution capacity.
  That left the architecture with a false choice between doing nothing or
  leaking provider-specific queue semantics into `apps/api`.
- Constraints and invariants:
  - the API admission boundary must remain adapter-agnostic
  - caller-visible results must keep using the canonical shared
    `StartRunBoundary.v1` contract
  - composition, not routes or application services, owns default and concrete
    bindings
  - missing capacity signals must fail closed in this first slice
- Selected option:
  Introduce `IStartRunExecutionCapacityPort`, wire it into
  `BackpressureAwareStartRunUseCase`, add a fail-closed default binding,
  extend the shared contract with explicit execution-capacity system
  backpressure codes, and document the component locally plus in the canonical
  API walkthrough.

## Real Work Performed

- Added the abstract application seam:
  `apps/api/src/application/ports/IStartRunExecutionCapacityPort.ts`
- Added the fail-closed default binding:
  `apps/api/src/application/services/defaultStartRunExecutionCapacityPort.ts`
- Added `startRunAdmissionDecisions.ts` so
  `BackpressureAwareStartRunUseCase.ts` stays focused on orchestration instead
  of inlined translation and telemetry bookkeeping
- Wired execution-capacity admission into
  `BackpressureAwareStartRunUseCase.ts` after duplicate probe and delivery
  admission, before delegate dispatch
- Bound the default implementation in
  `apps/api/src/modules/buildProtectedRuntimeModule.ts`
- Extended the shared start-run contract and schema pack with execution-
  capacity-specific `system_backpressure` codes
- Added semantic tests for:
  - execution-capacity admission ordering
  - observe/enforce behavior
  - fail-closed default binding
  - AST-level component ownership and composition binding
  - HTTP translation of the new canonical reason
- Hardened the shared contract side so schema packs and fixtures derive from
  canonical start-run boundary sets instead of re-spelling backpressure and
  adapter literals
- Added the local component guide:
  `apps/api/docs/start-run-execution-capacity-admission-component.md`
- Added the contract-local component guide:
  `docs/architecture/components/engine/contracts/engine/start-run-boundary-component.md`
- Updated:
  - `docs/architecture/components/api/index.md`
  - `docs/architecture/components/api/api-current-to-target-architecture.md`
  - `docs/architecture/components/engine/contracts/engine/StartRunBoundary.v1.md`
  - `apps/api/README.md`

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/ar-c3-start-run-execution-capacity-admission-plan-20260422.md`
- `docs/architecture/components/api/api-current-to-target-architecture.md`
- `docs/architecture/components/engine/contracts/engine/StartRunBoundary.v1.md`

## Validation Evidence

- Passed:
  `pnpm --filter @dvt/contracts test -- test/start-run-boundary.contract.test.ts`
- Passed:
  `pnpm --filter @dvt/contracts test -- test/start-run-boundary.architecture.test.ts`
- Passed:
  `pnpm --filter dvt-api test -- test/application/services/BackpressureAwareStartRunUseCase.test.ts test/application/services/BackpressureAwareStartRunUseCase.executionCapacity.test.ts test/application/services/defaultStartRunExecutionCapacityPort.test.ts test/application/services/startRunExecutionCapacityAdmission.architecture.test.ts test/entrypoints/http/httpErrorTranslation.test.ts`
- Passed:
  `pnpm docs:workboard:generate`
- Passed:
  `pnpm docs:sync`
- Passed:
  `pnpm docs:status:generate`
- Passed:
  `pnpm --filter @dvt/contracts build`
- Passed:
  `pnpm --filter dvt-api typecheck`
- Passed:
  `pnpm --filter dvt-api test:arch`
- Passed:
  `pnpm exec eslint --max-warnings 0 apps/api/src/application/ports/AdmissionTelemetry.ts apps/api/src/application/ports/IStartRunExecutionCapacityPort.ts apps/api/src/application/services/BackpressureAwareStartRunUseCase.ts apps/api/src/application/services/defaultStartRunExecutionCapacityPort.ts apps/api/src/application/services/startRunAdmissionDecisions.ts apps/api/src/modules/buildProtectedRuntimeModule.ts apps/api/test/application/services/BackpressureAwareStartRunUseCase.test.ts apps/api/test/application/services/BackpressureAwareStartRunUseCase.executionCapacity.test.ts apps/api/test/application/services/defaultStartRunExecutionCapacityPort.test.ts apps/api/test/application/services/startRunExecutionCapacityAdmission.architecture.test.ts apps/api/test/entrypoints/http/httpErrorTranslation.test.ts packages/@dvt/contracts/src/contracts/engine/StartRunBoundary.v1.ts packages/@dvt/contracts/src/schema-packs/start-run.ts packages/@dvt/contracts/test/fixtures/start-run-boundary.fixtures.ts packages/@dvt/contracts/test/start-run-boundary.contract.test.ts`
- Passed:
  `pnpm exec prettier --check apps/api/src/application/ports/IStartRunExecutionCapacityPort.ts apps/api/src/application/services/startRunAdmissionDecisions.ts docs/planning/proposals/mandatory/runtime-and-contracts/ar-c3-start-run-execution-capacity-admission-plan-20260422.md packages/@dvt/contracts/src/contracts/engine/StartRunBoundary.v1.ts packages/@dvt/contracts/src/schema-packs/start-run.ts`
- Passed:
  `pnpm exec markdownlint-cli2 apps/api/README.md apps/api/docs/start-run-execution-capacity-admission-component.md docs/architecture/components/api/index.md docs/architecture/components/api/api-current-to-target-architecture.md docs/architecture/components/engine/contracts/engine/StartRunBoundary.v1.md docs/planning/proposals/mandatory/runtime-and-contracts/ar-c3-start-run-execution-capacity-admission-plan-20260422.md docs/planning/closeouts/20260422-api-start-run-execution-capacity-admission-closeout.md --config .markdownlint-cli2.jsonc --ignore-path .markdownlintignore`
- Passed:
  `pnpm verify:prepush`
  Note:
  local `--changed-only` checks skipped untracked files in this worktree, so
  the scoped test, build, lint, markdown, and prettier commands above are the
  primary validation evidence for the slice in its current uncommitted state.

## No-Debt Evidence

- No compatibility shim or alternate public seam was added for the same
  concern.
- The new seam is abstract and fail-closed by default rather than permissive by
  omission.

## No-Stub Evidence

- The default binding is real production behavior, not a placeholder success
  path.
- The architecture test validates ownership and composition semantics instead of
  asserting a thin barrel only.
