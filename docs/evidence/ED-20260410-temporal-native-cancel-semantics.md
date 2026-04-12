---
title: Correct Temporal native cancellation semantics and terminal event ownership
status: Accepted
date: 2026-04-10
owners:
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
  - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
  - packages/@dvt/adapter-temporal/test/TemporalAdapter.startRun.test.ts
  - packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
  - packages/@dvt/adapter-temporal/test/workflow-literals.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal build
    - pnpm test:ci-tools
    - pnpm test:adapter-temporal
    - pnpm test:adapter-temporal:integration
    - pnpm test:adapter-temporal:integration:transformation
    - pnpm test:adapter-temporal:integration:postgres:docker
    - pnpm exec eslint packages/@dvt/adapter-temporal/src/TemporalAdapter.ts packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts packages/@dvt/adapter-temporal/test/TemporalAdapter.startRun.test.ts packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts packages/@dvt/adapter-temporal/test/workflow-literals.test.ts --max-warnings 0
    - pnpm exec markdownlint-cli2 "docs/architecture/components/engine/adapters/temporal/EnginePolicies.md" "docs/architecture/diagrams/implementation-architecture-diagrams.md" "docs/planning/proposals/portfolio-map-20260403.md" "docs/planning/proposals/mandatory/runtime-and-contracts/ar-c6-temporal-cancel-semantics-plan-20260410.md"
    - pnpm verify:prepush
---

## Summary

This slice corrects `T-01` by making `TemporalAdapter.cancelRun()` use
provider-native workflow cancellation instead of forwarding the canonical
cancel signal.

The Temporal workflow now treats native cancellation as a runtime-owned
realized lifecycle path when cancellation reaches workflow execution before the
final terminal command:

1. in-flight step activities are requested to cancel
2. ordinary event emission stays on normal remote activities
3. terminal `RunCancelRequested` and `RunCancelled` emission is finalized
   through non-cancellable local activities from workflow context
4. provider-live `describe()` status remains diagnostic only and may still lag
   or settle on a provider-native terminal token that differs from the
   canonical event-log-backed status

## Scope

1. `TemporalAdapter.cancelRun()` now calls `handle.cancel()`.
2. `RunPlanWorkflow` splits step execution, ordinary event emission, and
   terminal cancellation emission into explicit activity proxies with distinct
   cancellation behaviour.
3. Temporal tests now cover:
   - adapter-native cancel invocation
   - ordered runtime-owned cancellation lifecycle for both cooperative and
     provider-native cancellation requests
   - finalization race cases where canonical cancellation events are persisted
     without treating provider-live status as the source of truth
4. Documentation and architecture diagrams now record the corrected target
   behaviour for AR-C6 / `T-01`.

## Residual considerations

The workflow still depends on Temporal local-activity completion semantics to
persist terminal cancellation events after provider-native cancellation has
been requested. Late native cancellation requests can also race with provider
live status observation, leaving `describe()` temporarily on `RUNNING` or
eventually on `COMPLETED` even after the canonical event log reaches
`RunCancelled`. Those residuals are tracked in
[R-20260410-TEMPORAL-NATIVE-CANCEL-TERMINAL-CLEANUP](../risk-register/quality/R-20260410-TEMPORAL-NATIVE-CANCEL-TERMINAL-CLEANUP.yaml).
