---
title: Temporal PlanRef drained cutover runbook
status: Active
owner: Runtime / SRE / Delivery
last_reviewed: 2026-04-27
---

# Temporal PlanRef Drained Cutover Runbook

## Purpose

This runbook makes the `AR-D-PLAN-POINTER` no-retrocompatibility decision
operational.

The active Temporal workflow input shape is `PlanRef` plus resolved run context,
budget controls, and compact cursor state. It does not preserve a parallel
legacy workflow line for old full-plan workflow input replay. Therefore a
deployment that changes the workflow input or replay shape must use a drained
cutover unless a separate versioned workflow line is introduced.

## Governing Sources

- `docs/adr/ADR-0001-temporal-integration-test-policy.md`
- `docs/adr/ADR-0003-execution-model.md`
- `docs/adr/ADR-0012-plan-integrity-ownership.md`
- `docs/adr/ADR-0014-run-driven-adapter-model.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/ar-d-plan-pointer-workflow-input-hardening-plan-20260420.md`
- `docs/architecture/components/engine/adapters/temporal/temporal-adapter-spec.md`
- `docs/architecture/components/engine/adapters/temporal/temporal-planref-capacity-sla.md`

## Applicability

Use this runbook when changing any of these runtime facts:

- `runPlanWorkflow` input shape
- compact cursor schema
- continue-as-new handoff shape
- activity scheduling order
- lifecycle event ordering
- signal processing semantics

Do not use this runbook to claim mixed replay compatibility. If old and new
workflow code must poll the same active task queue concurrently, implement a
versioned workflow path instead.

## Preconditions

Before deploying the new worker or adapter line:

1. Block new protected-runtime starts for the affected Temporal task queues.
2. Keep existing workers on the old binary until active old-shape workflows are
   terminal.
3. Confirm the new binary uses the same `RUN_PLAN_WORKFLOW` entrypoint only for
   new `PlanRef` input.
4. Confirm `TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS` is either unset, which uses
   the governed default, or explicitly set to the approved environment value.
5. Confirm `TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES` is less than or equal to
   `TEMPORAL_MAX_START_PAYLOAD_BYTES`.
6. Confirm the deployment profile evaluates as `production_ready` under
   `evaluateTemporalPlanRefCapacitySla` before declaring large-DAG readiness.

## Drain Procedure

1. Stop admitting new starts for the affected tenants, environments, or task
   queue family.
2. Query Temporal visibility for non-terminal `runPlanWorkflow` executions on
   the affected task queues.
3. Wait until those workflows reach `COMPLETED`, `FAILED`, or `CANCELLED`.
4. If a workflow cannot drain, cancel it through the governed run-cancel path or
   leave the old worker line deployed until the workflow completes.
5. Deploy the new worker binary only after the old-shape workflow set is empty.
6. Re-enable protected-runtime starts for the affected scope.
7. Start a canary run with a plan that crosses at least one continue-as-new
   threshold.
8. Verify the canary result reports a positive `continuedAsNewCount` when the
   threshold is reached.

## Verification Commands

Run these repository checks before calling the cutover implementation ready:

```text
pnpm --filter @dvt/adapter-temporal exec vitest run ./test/TemporalAdapter.startRun.test.ts
pnpm --filter @dvt/adapter-temporal exec vitest run ./test/workflow-execution-segment.test.ts
pnpm --filter @dvt/adapter-temporal exec vitest run ./test/temporalPlanRefCapacitySlaPolicy.test.ts
pnpm --filter @dvt/adapter-temporal exec vitest run ./test/integration.time-skipping.test.ts -t "continues as new"
```

The first command proves workflow start payload shape. The second proves bounded
segment shape for deep plans. The third proves real Temporal rollover behavior.

## Rollback

If the new worker line fails before any new workflows start, stop the new
workers and redeploy the previous worker line.

If any new `PlanRef`-shape workflows have started, do not roll back by placing
the old full-plan worker line on the same task queue. Drain or cancel the new
workflow set first, then redeploy the previous worker line only if no new-shape
workflow remains active.

## Operator Notes

- `TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS=0` is an explicit local diagnostic or
  incident rollback override. It disables rollover and is not large-DAG ready.
- The governed default keeps rollover enabled for large-DAG readiness.
- The current implementation still resolves segments from the immutable plan
  artifact. It does not yet use an indexed segment-manifest artifact.
