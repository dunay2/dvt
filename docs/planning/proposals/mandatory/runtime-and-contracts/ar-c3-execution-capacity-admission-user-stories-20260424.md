---
title: AR-C3 execution-capacity admission user stories
status: Review
date: 2026-04-24
owner: Architecture / API / Runtime
planning_type: proposal
---

# AR-C3 execution-capacity admission user stories

## Purpose

These stories freeze the caller, operator, and composition scenarios that the
`AR-C3` route now owns after the abstract seam, Temporal `readyz` binding, and
operational closure slices.

They are intentionally written in DVT language, not Temporal-native language,
so future adapter bindings can reuse the same acceptance stories.

## Governing sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/agent-lane-c.yaml`
- `docs/planning/proposals/mandatory/runtime-and-contracts/ar-c3-start-run-execution-capacity-admission-plan-20260422.md`
- `apps/api/docs/start-run-execution-capacity-admission-component.md`
- `docs/runbooks/admission-control-runbook.md`
- `docs/architecture/components/api/api-current-to-target-architecture.md`

## Story catalog

### US-AR-C3-01: duplicate requests beat capacity checks

As the protected start-run application path, I want duplicate detection to run
before delivery admission or execution-capacity checks so idempotent retries do
not burn executor-signal budget.

Acceptance notes:

- a found duplicate returns canonical `duplicate`
- the execution-capacity port is not queried
- duplicate telemetry remains `decision=duplicate`

### US-AR-C3-02: delivery admission beats execution-capacity admission

As the protected start-run application path, I want tenant and system
backpressure to be evaluated before execution-capacity checks so existing
delivery pressure stays the first rejection boundary.

Acceptance notes:

- typed delivery-admission rejection returns before capacity evaluation
- execution-capacity telemetry is not emitted when delivery admission rejects

### US-AR-C3-03: admissible capacity delegates execution

As the start-run use case, I want an admissible execution-capacity decision to
delegate to the planner or engine path so the seam stays admission-only.

Acceptance notes:

- `admissible` never changes the caller-visible result kind
- the delegate still owns accepted or duplicate outcomes

### US-AR-C3-04: saturated executor returns canonical system backpressure

As an API caller, I want executor saturation to return the existing canonical
`system_backpressure` shape so the public contract stays stable.

Acceptance notes:

- execution-capacity rejection never creates a second top-level result kind
- executor-specific meanings are carried by canonical `code`

### US-AR-C3-05: readyz false maps to executor unavailable

As an operator, I want a reachable worker `GET /readyz` response with
`ready=false` to map to `EXECUTOR_UNAVAILABLE` so I can distinguish worker
lifecycle failure from backlog pressure.

Acceptance notes:

- the decision is still `reject_system` or `would_reject_system`
- the rejection `code` is `EXECUTOR_UNAVAILABLE`
- the runbook points first to the worker probe and worker lifecycle state

### US-AR-C3-06: signal loss fails closed

As a runtime owner, I want missing, timed-out, malformed, or unreachable
capacity signals to fail closed so the API does not keep accepting work when
executor truth is unavailable.

Acceptance notes:

- the rejection `code` is `CAPACITY_SIGNAL_UNAVAILABLE`
- the default binding remains saturated when no concrete signal is bound
- there is no fail-open fallback path

### US-AR-C3-07: observe mode preserves diagnosis without blocking callers

As an operator, I want observe mode to emit the same diagnosis as enforce mode
without rejecting callers so threshold calibration can happen on live traffic.

Acceptance notes:

- observe mode emits `would_reject_tenant` or `would_reject_system`
- execution-capacity rejection codes still appear on telemetry labels
- callers are admitted in observe mode

### US-AR-C3-08: telemetry labels stay bounded

As an observability owner, I want admission telemetry counters to use bounded
labels only so metrics stay aggregable and do not leak tenant or run identity.

Acceptance notes:

- `dvt.admission.decision_total` labels are `mode`, `decision`
- `dvt.admission.rejection_total` labels are `mode`, `decision`, `code`
- `tenantId`, `runId`, and `requestId` stay out of metric labels
- those identifiers may still appear in logs

### US-AR-C3-09: composition owns provider binding

As an architecture maintainer, I want provider-specific capacity binding to
live in protected-runtime composition so the application seam stays
adapter-agnostic.

Acceptance notes:

- `startRun` runtime composition consumes only `IStartRunExecutionCapacityPort`
- protected-runtime dependency builders own the Temporal `readyz` binding
- route and application files do not import Temporal capacity adapters

### US-AR-C3-10: future adapters reuse the same contract

As a future adapter integrator, I want new providers to bind behind the same
execution-capacity contract so no new caller-visible dialect appears for each
provider.

Acceptance notes:

- new adapters extend composition, not caller-visible result kinds
- new denial reasons require canonical governance before exposure

## Scenario matrix

| Scenario                    | Expected caller result           | Expected telemetry decision              | Expected code                       |
| --------------------------- | -------------------------------- | ---------------------------------------- | ----------------------------------- |
| duplicate found             | `duplicate`                      | `duplicate`                              | n/a                                 |
| tenant backpressure         | `tenant_backpressure` in enforce | `reject_tenant` or `would_reject_tenant` | `TENANT_BACKPRESSURE`               |
| system backpressure         | `system_backpressure` in enforce | `reject_system` or `would_reject_system` | `SYSTEM_BACKPRESSURE`               |
| snapshot unavailable        | `system_backpressure` in enforce | `reject_system` or `would_reject_system` | `BACKPRESSURE_SNAPSHOT_UNAVAILABLE` |
| capacity admissible         | delegate-owned result            | `accept` or `duplicate`                  | n/a                                 |
| capacity exhausted          | `system_backpressure` in enforce | `reject_system` or `would_reject_system` | `EXECUTION_CAPACITY_EXHAUSTED`      |
| worker readyz false         | `system_backpressure` in enforce | `reject_system` or `would_reject_system` | `EXECUTOR_UNAVAILABLE`              |
| capacity signal unavailable | `system_backpressure` in enforce | `reject_system` or `would_reject_system` | `CAPACITY_SIGNAL_UNAVAILABLE`       |

## Fitness hooks

These stories are frozen by:

- `apps/api/test/application/services/startRunExecutionCapacityAdmission.architecture.test.ts`
- `apps/api/test/application/services/startRunAdmissionTelemetry.architecture.test.ts`
- `apps/api/test/application/services/BackpressureAwareStartRunUseCase.executionCapacity.test.ts`
- `apps/api/test/application/services/BackpressureAwareStartRunUseCase.executionCapacityReadyzBinding.test.ts`
- `apps/api/test/infrastructure/admissionTelemetry/ObservabilityAdmissionTelemetry.test.ts`
- `apps/api/test/modules/buildProtectedExecutionCapacityPort.test.ts`
