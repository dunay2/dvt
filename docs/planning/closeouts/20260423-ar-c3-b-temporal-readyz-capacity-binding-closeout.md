---
title: AR-C3-B Temporal readyz execution-capacity binding closeout
status: Done
owner: api
last_reviewed: 2026-04-23
planning_type: closeout
---

# AR-C3-B Temporal readyz execution-capacity binding closeout

## Think-First Analysis

- Problem summary:
  `AR-C3-A` left `apps/api` with an abstract execution-capacity seam, but the
  protected runtime still had no real adapter-backed signal behind that port.
- Root cause:
  The standalone Temporal worker already exposed a governed readiness surface
  through `GET /readyz`, but `apps/api` had no composition-owned adapter that
  translated that runtime signal into canonical start-run admission semantics.
- Constraints and invariants:
  - keep the `apps/api` application contract adapter-agnostic
  - bind the concrete signal only in protected runtime composition
  - fail closed when the readiness signal is unreachable or malformed
  - preserve canonical caller-visible `system_backpressure` codes
- Selected option:
  Add a Temporal-worker `readyz` infrastructure adapter plus a protected
  composition builder that routes only the `temporal` provider through that
  signal and keeps the default fail-closed posture for anything unbound.

## Real Work Performed

- Added the concrete worker-backed adapter:
  `apps/api/src/infrastructure/executionCapacity/TemporalWorkerReadyzExecutionCapacityPort.ts`
- Added the protected composition builder:
  `apps/api/src/modules/protectedRuntime/buildProtectedExecutionCapacityPort.ts`
- Wired the concrete binding through:
  `apps/api/src/modules/buildProtectedRuntimeModule.ts`
- Added the protected-runtime env surface:
  `apps/api/src/plugins/env.ts` with `DVT_TEMPORAL_WORKER_READYZ_URL`
- Added focused tests for:
  - the `readyz` projection adapter
  - the protected composition builder
  - caller-visible admission behavior through `BackpressureAwareStartRunUseCase`
  - updated semantic architecture coverage for the concrete binding
- Truth-synced local and canonical docs:
  - `apps/api/docs/start-run-execution-capacity-admission-component.md`
  - `apps/api/docs/start-run-runtime-composition-component.md`
  - `docs/architecture/components/api/api-current-to-target-architecture.md`

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/agent-lane-c.yaml`
- `docs/planning/proposals/mandatory/runtime-and-contracts/ar-c3-start-run-execution-capacity-admission-plan-20260422.md`
- `apps/api/docs/start-run-execution-capacity-admission-component.md`
- `docs/architecture/components/api/api-current-to-target-architecture.md`
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`

## Validation Evidence

- Passed:
  `pnpm --filter dvt-api test -- test/infrastructure/executionCapacity/TemporalWorkerReadyzExecutionCapacityPort.test.ts test/modules/buildProtectedExecutionCapacityPort.test.ts test/application/services/BackpressureAwareStartRunUseCase.executionCapacityReadyzBinding.test.ts`
- Passed:
  `pnpm --filter dvt-api test -- test/infrastructure/executionCapacity/TemporalWorkerReadyzExecutionCapacityPort.test.ts test/application/services/BackpressureAwareStartRunUseCase.executionCapacity.test.ts test/application/services/BackpressureAwareStartRunUseCase.executionCapacityReadyzBinding.test.ts test/application/services/startRunExecutionCapacityAdmission.architecture.test.ts test/modules.test.ts test/plugins/env.test.ts`

## No-Debt Evidence

- No provider-native queue metrics or adapter vocabulary leaked into the
  application port.
- No fail-open fallback was introduced for missing or malformed worker signals.

## No-Stub Evidence

- The new binding queries a real governed runtime surface (`GET /readyz`),
  rather than returning a placeholder success path.
- The composition builder routes through a concrete adapter implementation, not
  an unused future hook.
