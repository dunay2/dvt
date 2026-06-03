---
title: AR-C3-C execution-capacity operational closure closeout
status: Done
owner: api
last_reviewed: 2026-04-23
planning_type: closeout
---

# AR-C3-C execution-capacity operational closure closeout

## Think-First Analysis

- Problem summary:
  `AR-C3-B` added a real worker-backed execution-capacity signal, but operators
  still needed explicit telemetry and runbook truth to distinguish execution
  capacity denial from older outbox or snapshot backpressure.
- Root cause:
  The runtime contract and HTTP mapping already exposed canonical rejection
  codes, but the operational layer had not yet documented how those codes
  appear in metrics or how to triage them against the Temporal worker
  `GET /readyz` signal.
- Constraints and invariants:
  - keep execution-capacity denial inside canonical `system_backpressure`
  - distinguish the new denial reasons through telemetry `code` labels, not a
    second decision family
  - preserve fail-closed behavior for `CAPACITY_SIGNAL_UNAVAILABLE`
  - keep operator truth aligned with the protected-runtime composition owner
- Selected option:
  Close the route with explicit telemetry tests, a direct translation test for
  canonical rejection codes, and runbook truth that explains how
  `EXECUTION_CAPACITY_EXHAUSTED`, `EXECUTOR_UNAVAILABLE`, and
  `CAPACITY_SIGNAL_UNAVAILABLE` are diagnosed.

## Real Work Performed

- Added direct semantic coverage for execution-capacity translation in:
  `apps/api/test/application/services/startRunAdmissionDecisions.test.ts`
- Extended telemetry coverage in:
  `apps/api/test/infrastructure/admissionTelemetry/ObservabilityAdmissionTelemetry.test.ts`
- Updated the canonical operator runbook:
  `docs/runbooks/admission-control-runbook.md`
- Truth-synced the local component guide and target architecture:
  - `apps/api/docs/start-run-execution-capacity-admission-component.md`
  - `docs/architecture/components/api/api-current-to-target-architecture.md`
- Updated planning posture in:
  `docs/planning/state/agent-lane-c.yaml`

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/agent-lane-c.yaml`
- `docs/planning/proposals/mandatory/runtime-and-contracts/ar-c3-start-run-execution-capacity-admission-plan-20260422.md`
- `apps/api/docs/start-run-execution-capacity-admission-component.md`
- `docs/runbooks/admission-control-runbook.md`
- `docs/architecture/components/api/api-current-to-target-architecture.md`
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`

## Validation Evidence

- Passed:
  `pnpm --filter dvt-api test -- test/application/services/startRunAdmissionDecisions.test.ts test/infrastructure/admissionTelemetry/ObservabilityAdmissionTelemetry.test.ts test/application/services/startRunExecutionCapacityAdmission.architecture.test.ts`
- Passed:
  `pnpm --filter dvt-api build`
- Passed:
  `pnpm --filter dvt-api typecheck`
- Passed:
  `pnpm --filter dvt-api test`
- Passed:
  `pnpm docs:workboard:generate`
- Passed:
  `pnpm docs:status:generate`
- Passed:
  `pnpm docs:sync`
- Passed:
  `pnpm verify:prepush`

## No-Debt Evidence

- No telemetry rule was relaxed or downgraded to make the route look green.
- No fail-open behavior was added for missing capacity signals.
- No hooks or validation gates were bypassed.

## No-Stub Evidence

- Operator diagnosis now points at the real Temporal worker `GET /readyz`
  signal and the real metric labels emitted by `ObservabilityAdmissionTelemetry`.
- The new tests validate concrete canonical codes, not placeholder strings or
  synthetic future APIs.
