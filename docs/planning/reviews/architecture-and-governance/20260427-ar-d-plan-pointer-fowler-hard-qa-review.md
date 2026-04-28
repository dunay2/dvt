---
title: AR-D plan pointer Fowler hard QA review
status: Final
owner: Architecture
last_reviewed: 2026-04-28
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
- `packages/@dvt/adapter-temporal/src/activities/activityTypes.ts`
- `packages/@dvt/adapter-temporal/src/activities/stepActivityDispatcher.ts`
- `packages/@dvt/adapter-temporal/src/plugins/dbt/DbtStepActivity.ts`
- `packages/@dvt/adapter-temporal/src/plugins/dbt/dbtPluginTypes.ts`
- `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.types.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layers.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layerResults.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.state.ts`
- `packages/@dvt/adapter-temporal/src/workflows/workflowCursorHelpers.ts`
- `packages/@dvt/adapter-temporal/src/workflows/workflowGatewayHelpers.ts`
- `packages/@dvt/adapter-temporal/src/workflows/executionSegmentResolver.ts`
- `packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts`
- `packages/@dvt/adapter-temporal/test/TemporalAdapter.startRun.test.ts`
- `packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts`
- `packages/@dvt/adapter-temporal/test/smoke.test.ts`
- `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
- `apps/api/src/plugins/env.ts`
- `apps/api/src/modules/providerAdapters/createTemporalProviderAdapterFactory.ts`
- `apps/temporal-worker/src/plugins/env.ts`
- `apps/temporal-worker/src/runtime/createTemporalWorkerRuntime.ts`
- `docs/architecture/components/engine/adapters/temporal/temporal-adapter-spec.md`
- `docs/architecture/components/engine/adapters/temporal/temporal-planref-workflow-boundary.md`
- `docs/architecture/components/engine/adapters/temporal/temporal-dbt-worker-plugin-profile.md`
- `docs/architecture/components/engine/contracts/engine/IProviderAdapter.v1.md`
- `docs/architecture/components/engine/contracts/engine/StartRunProtocol.v1.md`
- `buzon/20260428-codex-fowler-temporal-planref-workflow-boundary-analysis-and-remediation.md`

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
time-skipping proof and made missing gateway dependency facts fail closed. QA1
then added a governed non-zero rollover default, an explicit drained-deploy
cutover runbook, and a deep-plan bounded segment regression.
The follow-up QA2 pass also makes missing workflow rollover threshold input fail
closed instead of silently defaulting to disabled rollover, and records the
time-skipping rollover proof in the ARC evidence and closeout.
A QA3 semantic-encapsulation pass closes the remaining component-documentation
drift: workflow modules now declare exact owned concerns, a PlanRef workflow
boundary guide documents API/invariants/transitions/consumers/diagrams, and an
architecture test validates those semantics.
A DBT-core decoupling pass then closes the medium hexagonal-boundary finding:
the Temporal core registry now starts empty, `ActivityDeps` no longer owns DBT
runtime dependencies, and DBT step kinds are composed only through the
standalone worker DBT plugin profile when enabled.

## Findings

Closed - Semantic encapsulation: the Temporal PlanRef workflow modules now have
exact top-level `@ownedConcern` docblocks, and
`workflow-component-semantics.architecture.test.ts` verifies those concerns plus
the local component guide. This closes the previous reliance on broad ADR prose
to imply file ownership.

Closed - Runtime readiness: QA1 sets a governed non-zero default. QA2 rejects
missing `continueAsNewAfterLayerCount`, so malformed workflow input cannot
silently disable rollover. Evidence:
`packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.state.ts` and
`packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts`. Full
production SLA wording for maximum workflow history and segment count remains
under `AR-D2`.

Closed - Replay and cutover: QA1 documents the drained-deploy and
no-retrocompatibility cutover as an operator runbook, and makes clear that mixed
old/new replay compatibility is not claimed. If mixed replay becomes required,
implement a versioned workflow path instead of using the runbook as
compatibility evidence.

Closed - Negative tests: the follow-up fix pass added a time-skipping
integration test that configures `TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS=2` and
verifies the completed workflow result reports `continuedAsNewCount: 1`. Covered
by `pnpm --filter @dvt/adapter-temporal exec vitest run
./test/integration.time-skipping.test.ts -t "continues as new"`.

Closed - Gateway facts: the follow-up fix pass changed missing dependency facts
from synthesized `{ status: 'COMPLETED' }` to fail-closed
`INVALID_WORKFLOW_STATE`, with a negative unit test. Covered by
`pnpm --filter @dvt/adapter-temporal exec vitest run
./test/workflow-continue-as-new.test.ts`.

Closed - Hexagonal DBT core boundary: DBT is no longer part of the default
Temporal core activity registry, `ActivityDeps` no longer carries
`runExecutionContextReader` or `dbtPluginRunner`, and composition can replace
DBT step-kind activities through an explicit registry. The remaining risk is
narrower package-level plugin/CLI extraction, not DBT ownership inside the core
dispatcher.

Partial - Scale mechanics: QA1 adds a deep-plan regression proving the returned
segment is bounded to the requested layer plus compact metadata. The runtime
still fetches and validates the whole immutable plan artifact and recomputes
layers, so CPU/fetch maturity is still first-cut. Consider an immutable segment
manifest or indexed plan graph artifact for large plans, with tests for
deep/wide DAGs and bounded per-layer CPU/fetch cost.

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
- The workflow component now has a local architecture guide with public API,
  invariants, transitions, consumers, module map, and diagrams.
- The architecture fitness tests validate semantic ownership and component
  documentation substance, not only file shape. This now covers both the
  PlanRef workflow boundary and the DBT worker plugin profile.

## Fowler, DDD, And Hexagonal Reading

SRP: workflow responsibilities are split into focused helpers and the adapter
start boundary is thin. Mostly good; the remaining pressure is DBT default
ownership and repeated plan graph recomputation.

DDD: `PlanRef` is the immutable identity handle and runtime facts are explicit
cursor facts. Missing threshold and missing gateway facts now fail closed.

Hexagonal: engine and adapter contracts now use a narrower published interface.
Plan fetch and integrity are behind activity ports. The PlanRef boundary is
good; DBT step-kind ownership is now in worker composition instead of the core
activity dispatcher. Remaining DBT work is package/plugin extraction, not core
registry behavior.

Tell, Don't Ask: engine tells the provider which immutable `PlanRef` was
approved; Temporal does not need the full plan at start. Corrected, and the
normative adapter spec now matches.

Fail fast: start payload and continue-as-new payload have guards, and integrity
fetch validates plan bytes. Missing threshold and missing gateway facts now
reject invalid state.

## Negative Test Assessment

Already covered:

- PlanRef-only workflow start payload.
- Large plan artifact does not inflate workflow start args.
- Actual Temporal time-skipping `continueAsNew` execution with configured layer
  threshold and final `continuedAsNewCount` proof.
- Governed default continue-as-new threshold plus explicit zero override.
- Missing workflow continue-as-new threshold fails closed instead of silently
  disabling rollover.
- Semantic workflow component guide and exact module owned-concern docblocks.
- Drained-deploy cutover runbook for the no-retrocompatibility workflow input
  shape.
- Deep-plan segment boundedness regression for requested-layer metadata.
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
- DBT worker profile guide and exact module owned-concern docblocks for the
  Temporal core activity dispatch boundary.
- Core registry rejects DBT step kinds unless the worker composes the DBT
  registry explicitly.
- Worker runtime composes the DBT registry only when DBT mode is enabled and
  omits it when disabled.

Still needed:

- Full AR-D2 production SLA for maximum workflow history size and segment count
  policy.
- Deep/wide DAG segment-resolution CPU/fetch cost maturity beyond bounded
  return shape.

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

Implement the remaining AR-D2 production SLA follow-up:

1. Define maximum workflow history size and layer segment targets by deployment
   profile.
2. Decide when an indexed segment manifest becomes mandatory for large plans.
3. Keep package-level DBT plugin extraction routed as separate runtime
   hardening rather than mixing it into PlanRef payload closure.

## Follow-Up Status

- `TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES` composition-root propagation was
  remediated by
  `docs/planning/closeouts/20260427-temporal-continue-payload-env-propagation-closeout.md`.
- `temporal-adapter-spec.md` was rewritten to the ADR-0012/ADR-0014
  PlanRef-plus-cursor contract, so it no longer describes full-plan workflow
  input as active normative truth.
- Invalid numeric Temporal env overrides now fail closed instead of falling
  back to defaults.
- QA1 added a governed non-zero continue-as-new default, an explicit
  drained-deploy cutover runbook, and deep-plan segment boundedness regression
  coverage.
- QA2 rejects missing workflow rollover threshold input and records the
  time-skipping `continueAsNew` proof in closeout/evidence.
- QA3 adds the Temporal PlanRef workflow boundary guide, mailbox Fowler
  analysis, module owned-concern docblocks, and semantic architecture fitness
  test.
- The DBT-core decoupling pass moves DBT step-kind ownership out of the
  Temporal core activity registry and into explicit worker profile composition.
- The remaining recommended follow-up scope is full AR-D2 SLA readiness,
  segment-scale maturity beyond bounded return shape, and package-level DBT
  plugin extraction.

## Closeout Posture

`AR-D-PLAN-POINTER` should remain `in_progress`. The implementation corrected
the dangerous full-plan workflow payload, the active spec now matches that
contract, QA1 closes the immediate cutover/default-threshold/segment-shape proof
gaps, QA3 closes semantic workflow encapsulation, and the DBT-core pass closes
the previously open core registry coupling. The system still needs full AR-D2
SLA posture, segment-scale maturity beyond bounded return shape, and
package-level DBT plugin extraction. No new debt is accepted by this review; the
residual work remains visible and routed.
