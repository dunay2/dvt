---
title: AR-D plan pointer Fowler hard QA review
status: Final
owner: Architecture
last_reviewed: 2026-04-27
planning_type: review
---

# AR-D Plan Pointer Fowler Hard QA Review

**Plan-driven. Outcome-agnostic.**

## Scope

This review audits the current `AR-D-PLAN-POINTER` state after the 2026-04-24
Temporal plan-ref contract correction. The review is manual; CodeRabbit was not
used by explicit operator request.

The review asks whether the current code, docs, tests, and workflow rules
actually deliver the promised PlanRef-plus-cursor runtime shape, whether the
implementation respects SRP, DDD, and hexagonal boundaries, and which negative
tests or quality gates are still missing before the slice can be treated as
closed.

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/planning/state/agent-lane-d.yaml`
- `docs/planning/reviews/review-naming-policy.md`
- `docs/planning/reviews/review-status-board.md`
- `docs/architecture/reference-architecture.md`
- `docs/planning/execution-model/dvt-execution-model.md`
- `docs/adr/ADR-0001-temporal-integration-test-policy.md`
- `docs/adr/ADR-0003-execution-model.md`
- `docs/adr/ADR-0012-plan-integrity-ownership.md`
- `docs/adr/ADR-0014-run-driven-adapter-model.md`
- `docs/adr/ADR-0030-pre-dispatch-intent-log.md`
- `docs/adr/ADR-0036-execution-plan-planversion-registry-and-runtime-matrix.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/ar-d-plan-pointer-workflow-input-hardening-plan-20260420.md`
- `docs/planning/closeouts/20260420-temporal-fowler-architecture-drift-follow-up-closeout.md`
- `docs/planning/closeouts/20260420-ar-d-plan-pointer-follow-up-hardening-closeout.md`
- `docs/planning/closeouts/20260424-temporal-plan-ref-contract-closeout.md`
- `buzon/20260424-codex-fowler-temporal-plan-ref-contract-qa.md`

## Evidence Inspected

- `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts`
- `packages/@dvt/adapter-temporal/src/config.ts`
- `packages/@dvt/adapter-temporal/src/activities/activityFactory.ts`
- `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.types.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layers.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layerResults.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.state.ts`
- `packages/@dvt/adapter-temporal/src/workflows/workflowCursorHelpers.ts`
- `packages/@dvt/adapter-temporal/src/workflows/workflowGatewayHelpers.ts`
- `packages/@dvt/adapter-temporal/src/workflows/executionSegmentResolver.ts`
- `packages/@dvt/adapter-temporal/test/TemporalAdapter.startRun.test.ts`
- `packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts`
- `packages/@dvt/adapter-temporal/test/smoke.test.ts`
- `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
- `apps/api/src/plugins/env.ts`
- `apps/api/src/modules/providerAdapters/createTemporalProviderAdapterFactory.ts`
- `apps/temporal-worker/src/plugins/env.ts`
- `apps/temporal-worker/src/runtime/createTemporalWorkerRuntime.ts`
- `docs/architecture/components/engine/adapters/temporal/temporal-adapter-spec.md`
- `docs/architecture/components/engine/contracts/engine/IProviderAdapter.v1.md`
- `docs/architecture/components/engine/contracts/engine/StartRunProtocol.v1.md`

## Executive Verdict

The active implementation is much better than the older reviews describe:
Temporal starts with `PlanRef` plus resolved context, not with a durable
`ExecutionPlan` payload. `continueAsNew` input is compacted into cursor state
and guarded by a serialized-size check. Runtime segment resolution refetches the
plan through integrity validation before returning bounded layer work.

The slice is not cleanly closed. The strongest remaining risks are not in the
happy path of `TemporalAdapter.startRun`; they are in runtime threshold
governance, replay/cutover posture, segment-scale proof, and DBT adapter
separation. A follow-up fix pass added real Temporal `continueAsNew`
time-skipping proof and made missing gateway dependency facts fail closed.

## Findings

| Severity | Area               | Finding                                                                                                                                                                                                                                                                                                                                                       | Evidence                                                                                                                                                                                                                                                           | Required action                                                                                                                                               |
| -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | Runtime readiness  | The runtime threshold for `continueAsNew` defaults to `0`, which disables rollover. That is acceptable only if `AR-D2` remains an explicit dependency and deployments are required to configure the threshold before large-DAG readiness is claimed.                                                                                                          | `packages/@dvt/adapter-temporal/src/config.ts`; `docs/planning/state/agent-lane-d.yaml`; `docs/planning/proposals/mandatory/runtime-and-contracts/ar-d-plan-pointer-workflow-input-hardening-plan-20260420.md`                                                     | Do not close `AR-D-PLAN-POINTER` until the `AR-D2` threshold/SLA contract is either implemented or the task explicitly scopes runtime rollover readiness out. |
| Medium   | Replay and cutover | The plan allows the current branch as a drained-deploy/no-retrocompatibility cut, but the active workflow code does not use Temporal workflow versioning markers for the input-shape change. The docs mention drained deployment, but there is no closeout evidence that an operator-facing drain runbook or CI guard prevents mixed old/new workflow replay. | `docs/planning/proposals/mandatory/runtime-and-contracts/ar-d-plan-pointer-workflow-input-hardening-plan-20260420.md`; `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`; `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layers.ts` | Add a replay/cutover runbook or a versioned workflow path. The acceptable posture must be explicit before the slice is marked complete.                       |
| Closed   | Negative tests     | Follow-up fix pass added a time-skipping integration test that configures `TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS=2` and verifies the completed workflow result reports `continuedAsNewCount: 1`.                                                                                                                                                              | `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`; `packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts`; `docs/adr/ADR-0001-temporal-integration-test-policy.md`                                                        | Covered by `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/integration.time-skipping.test.ts -t "continues as new"`.                              |
| Closed   | Gateway facts      | Follow-up fix pass changed missing dependency facts from synthesized `{ status: 'COMPLETED' }` to fail-closed `INVALID_WORKFLOW_STATE`, with a negative unit test.                                                                                                                                                                                            | `packages/@dvt/adapter-temporal/src/workflows/workflowGatewayHelpers.ts`; `packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts`                                                                                                                   | Covered by `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/workflow-continue-as-new.test.ts`.                                                     |
| Medium   | Hexagonal boundary | DBT remains part of the default Temporal adapter registry, and overrides are not allowed to replace DBT-supported step kinds. This is an explicit open risk, not a regression, but it still violates full provider/plugin separation.                                                                                                                         | `packages/@dvt/adapter-temporal/src/activities/activityFactory.ts`; `docs/risk-register/quality/R-20260420-TEMPORAL-DBT-BUILTIN-COUPLING.yaml`                                                                                                                     | Keep the risk open. Move DBT kind ownership into worker composition or an explicit adapter profile before claiming full hexagonal adapter maturity.           |
| Medium   | Scale mechanics    | Segment resolution avoids durable whole-plan carriage, but each layer resolution fetches and validates the whole plan and recomputes execution layers. This is a correct first cut for bounded workflow input, not yet a mature scale design for very deep DAGs.                                                                                              | `packages/@dvt/adapter-temporal/src/activities/activityFactory.ts`; `packages/@dvt/adapter-temporal/src/workflows/executionSegmentResolver.ts`                                                                                                                     | Consider an immutable segment manifest or indexed plan graph artifact for large plans, with tests for deep/wide DAGs and bounded per-layer CPU/fetch cost.    |

## What Is Working

- `TemporalAdapter.startRun()` now validates `PlanRef` and context, then starts
  the workflow with `{ planRef, ctx, maxContinueAsNewPayloadBytes,
continueAsNewAfterLayerCount }`.
- Workflow segment resolution is activity-owned and uses plan integrity
  validation before deriving a bounded execution segment.
- `workflowCursorHelpers` builds explicit continue-as-new cursor input and
  throws `TEMPORAL_CONTINUE_AS_NEW_PAYLOAD_TOO_LARGE` if the serialized input
  exceeds the configured budget.
- Pre-layer lifecycle gating happens before skipped-step side effects.
- CANCEL signal transport includes a signal id and reason.
- The workflow modules are materially more SRP-aligned than the older
  monolithic interpreter shape: orchestration, lifecycle, cursor construction,
  gateway helpers, payload helpers, and segment resolution are split.

## Fowler, DDD, And Hexagonal Reading

| Lens            | Current state                                                                                                       | Verdict                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| SRP             | Workflow responsibilities are split into focused helpers and the adapter start boundary is thin.                    | Mostly good. The remaining pressure is DBT default ownership and repeated plan graph recomputation. |
| DDD             | `PlanRef` is the immutable identity handle and runtime facts are explicit cursor facts.                             | Good direction. Missing-fact fallback needs a sharper domain rule.                                  |
| Hexagonal       | Engine and adapter contracts now use a narrower published interface. Plan fetch/integrity is behind activity ports. | Good boundary for PlanRef. Incomplete provider/plugin separation remains for DBT.                   |
| Tell, Don't Ask | Engine tells the provider which immutable PlanRef was approved; Temporal does not need the full plan at start.      | Corrected, and the normative adapter spec now matches.                                              |
| Fail fast       | Start payload and continue-as-new payload have guards; integrity fetch validates plan bytes.                        | Good for code paths covered. Gateway missing-fact fallback remains weaker.                          |

## Negative Test Assessment

Already covered:

- PlanRef-only workflow start payload.
- Large plan artifact does not inflate workflow start args.
- Actual Temporal time-skipping `continueAsNew` execution with configured layer
  threshold and final `continuedAsNewCount` proof.
- Continue-as-new trigger threshold helper behavior.
- Compact cursor transport for gateway decisions, dependency facts, and
  processed control signal ids.
- Oversized continue-as-new cursor failure.
- Gateway dependency cardinality validation.
- Missing gateway dependency facts fail closed with `INVALID_WORKFLOW_STATE`.
- Adapter config rejects continue-as-new payload budget larger than start
  payload budget when structured config validation runs.
- API and temporal-worker env propagation for
  `TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES`.
- Invalid numeric env strings for governed Temporal budget values.

Still needed:

- Replay/cutover posture proof for the input-shape change.
- Deep/wide DAG segment resolution cost and payload boundedness tests.

## Comparison With Mature Runtime Systems

Mature workflow systems avoid durable workflow inputs that scale with full DAG
size. The current PlanRef-plus-segment design is aligned with that pattern:
stable identity crosses the workflow boundary, bounded work is resolved inside
activities, and integrity is rechecked at the runtime fetch point.

The gaps are the usual maturity gaps after the first correct design cut:
operator configuration is now exposed at the real composition roots, but
workflow schema changes still need replay/cutover discipline, and scale claims
need tests that exercise the actual runtime, not only helper functions.

## Recommended Next Slice

Implement a focused `AR-D-PLAN-POINTER-QA1` follow-up:

1. Define the drained-deploy versus versioned-workflow replay posture in a
   runbook or implementation guard.
2. Add deep/wide DAG segment-resolution cost and payload boundedness tests.
3. Define the governed `continueAsNew` threshold/SLA readiness contract.

## Follow-Up Status

- `TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES` composition-root propagation was
  remediated by
  `docs/planning/closeouts/20260427-temporal-continue-payload-env-propagation-closeout.md`.
- `temporal-adapter-spec.md` was rewritten to the ADR-0012/ADR-0014
  PlanRef-plus-cursor contract, so it no longer describes full-plan workflow
  input as active normative truth.
- Invalid numeric Temporal env overrides now fail closed instead of falling
  back to defaults.
- The remaining recommended follow-up scope is replay/cutover posture,
  segment-scale maturity, governed threshold/SLA readiness, and DBT adapter
  decoupling.

## Closeout Posture

`AR-D-PLAN-POINTER` should remain `in_progress`. The implementation corrected
the dangerous full-plan workflow payload and the active spec now matches that
contract, but the system still has unproven runtime paths. No new debt is
accepted by this review; the debt already identified remains visible and must
stay routed.
