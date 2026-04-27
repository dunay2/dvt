---
title: AR-D plan pointer QA1 readiness closeout
status: Accepted
owner: Runtime / Temporal / Delivery
last_reviewed: 2026-04-27
planning_type: closeout
---

# AR-D Plan Pointer QA1 Readiness Closeout

**Plan-driven. Outcome-agnostic.**

## Think-First Analysis

### Problem Summary

The `AR-D-PLAN-POINTER` implementation already removed the full
`ExecutionPlan` from Temporal workflow start and continue-as-new payloads, but
the Fowler QA review left three runtime-readiness gaps open:

- the default `continueAsNew` threshold is `0`, so rollover is disabled unless
  every deployment remembers to configure it;
- the input-shape cutover relies on a drained-deploy posture, but operators do
  not have a runbook that makes the no-retrocompatibility rule executable;
- segment resolution is bounded in shape, but the current regression suite does
  not prove that deep plans return only the requested segment plus compact
  metadata.

### Root Cause

The first PlanRef slice corrected provider payload shape before closing the
operational readiness layer. That produced a technically correct start payload,
but it left scale posture dependent on optional configuration and implicit
deployment discipline.

### Constraints And Invariants

- ADR-0001: Temporal integration tests must follow explicit build and lifecycle
  discipline.
- ADR-0003: DVT owns the execution model; provider mechanics do not redefine
  run semantics.
- ADR-0012: plan integrity authority stays outside the provider workflow.
- ADR-0014: adapters are run-driven and receive immutable run inputs rather
  than owning plan semantics.
- `AR-D-PLAN-POINTER`: workflow start and rollover input must remain
  PlanRef-plus-cursor bounded.
- ARC-2 applies because `packages/@dvt/adapter-temporal/**` will change.
- No hidden debt, stubs, fake compatibility paths, or skipped validation may be
  introduced.

### Options Considered

| Option                                       | Result   | Rationale                                                                                                          |
| -------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| Set a governed non-zero default threshold    | Selected | Makes rollover readiness the default posture while still allowing explicit incident disablement.                   |
| Leave default `0` and document configuration | Rejected | Keeps large-DAG readiness dependent on operator memory.                                                            |
| Add workflow versioning for the cutover      | Rejected | Better for mixed replay, but this branch chose a drained-deploy cut; adding a parallel line now would widen scope. |
| Add a drained-deploy runbook and guard tests | Selected | Matches the accepted no-retrocompatibility strategy without pretending replay compatibility exists.                |

### Selected Option

Implement a focused QA1 readiness pass: change the default Temporal
continue-as-new layer threshold from disabled to governed enabled, add
regression coverage for deep segment boundedness, document the drained-deploy
cutover procedure, and update ARC/planning evidence so the remaining open risk
is explicit.

## Pre-Implementation Brief

- mode: `Full`
- scope:
  - `packages/@dvt/adapter-temporal/src/config.ts`
  - `packages/@dvt/adapter-temporal/test/smoke.test.ts`
  - `packages/@dvt/adapter-temporal/test/TemporalAdapter.startRun.test.ts`
  - `packages/@dvt/adapter-temporal/test/helpers/contractFixtures.ts`
  - `packages/@dvt/adapter-temporal/test/workflow-execution-segment.test.ts`
  - Temporal adapter spec and worker/cutover runbooks
  - Lane D, closeout, evidence, and risk surfaces
- expected outcome: large-DAG rollover is enabled by default, the drained
  cutover posture is executable, and segment boundedness has explicit regression
  proof.
- risks and mitigations:
  - risk: default rollover could surprise small local workflows; mitigation:
    allow explicit `TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS=0` only as a documented
    local/incident override.
  - risk: drained deploy could be mistaken for replay compatibility; mitigation:
    runbook states that mixed old/new workflow replay is unsupported.
  - risk: segment tests could overclaim CPU-scale maturity; mitigation: test
    payload shape and metadata bounds only, while leaving immutable segment
    manifest optimization as future scale hardening.
- out-of-scope items:
  - DBT adapter decoupling.
  - Parallel versioned workflow implementation.
  - Immutable segment-manifest artifact design.
- validation plan:
  - targeted adapter Temporal tests for config, start payload, and segment
    resolution.
  - package-level adapter Temporal tests, lint, typecheck.
  - docs sync/workboard generation and ARC evidence checks.
  - `pnpm verify:prepush`.
- test coverage plan:
  - red test for default governed continue-as-new threshold.
  - regression test proving explicit `0` still disables rollover.
  - deep-plan segment-resolution boundedness test.
  - docs/runbook checks through repository docs gates.
- libraries evaluated: none; this is runtime-policy hardening over existing
  Temporal SDK integration.

## Implementation Summary

- Changed the Temporal adapter default
  `continueAsNewAfterLayerCount` from disabled (`0`) to the governed threshold
  `100`.
- Preserved explicit `TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS=0` as a documented
  local diagnostic or incident rollback override.
- Updated Temporal adapter start-run fixtures and API factory test stubs so
  composition tests reflect the governed default.
- Added a deep-plan regression proving `resolveExecutionSegmentFromPlan` returns
  only the requested layer plus compact metadata, not the full plan.
- Added `docs/runbooks/temporal-planref-drained-cutover-20260427.md` to make
  the drained-deploy/no-retrocompatibility posture executable.
- Updated the Temporal adapter spec, worker runbook, Fowler QA review, Lane D,
  ARC evidence, and risk register to match the shipped behavior.

## TDD Evidence

Red result observed before implementation:

- `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/smoke.test.ts -t "loads config with defaults"`
  - Failed as expected because the runtime still returned
    `continueAsNewAfterLayerCount: 0` while the test required the governed
    default `100`.

Green results after implementation:

- `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/smoke.test.ts -t "loads config with defaults|keeps explicit zero"`
  - Passed: 3 tests, 21 skipped by filter.
- `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/TemporalAdapter.startRun.test.ts`
  - Passed: 3 tests.
- `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/workflow-execution-segment.test.ts`
  - Passed: 5 tests.

Intermediate test corrections:

- The start-run payload budget test initially failed because the new default
  threshold made the artificial `512` byte budget too small for the intended
  PlanRef-only payload assertion. The budget was raised to keep the test focused
  on "does not serialize full plan".
- The deep-plan segment test initially rejected the current layer's immediate
  dependency. The assertion was corrected to allow needed dependency metadata
  while still rejecting unrelated step payloads.

## Validation Evidence

- `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/smoke.test.ts ./test/TemporalAdapter.startRun.test.ts ./test/workflow-execution-segment.test.ts`
  - Passed: 3 files, 32 tests.
- `pnpm --filter dvt-api test -- test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts test/plugins/env.test.ts`
  - Passed: 2 files, 6 tests.
- `pnpm --filter dvt-temporal-worker test -- test/plugins/env.test.ts test/runtime/createTemporalWorkerRuntime.test.ts`
  - Passed: 2 files, 13 tests.
- `pnpm --filter @dvt/adapter-temporal test`
  - Passed: 22 files, 182 tests.
- `pnpm --filter @dvt/adapter-temporal typecheck`
  - Passed.
- `pnpm docs:workboard:generate`
  - Passed; regenerated planning workboard views after Lane D changed.
- `pnpm docs:sync`
  - Passed; regenerated evidence and runbook indexes plus Lane D rendered view.
- `pnpm docs:workboard:check`
  - Passed.
- `pnpm docs:arc:evidence:check`
  - Passed.
- `pnpm docs:gov:links`
  - Passed with 0 errors and 0 warnings.
- `pnpm lint`
  - Failed once because the new test referenced `TextEncoder` directly.
  - Passed after switching the test to `globalThis.TextEncoder`.
- `pnpm verify:prepush`
  - Passed.

Known validation note:

- `pnpm docs:sync:check` was run before commit and failed because the newly
  generated evidence/runbook index diffs were intentionally still uncommitted.
  `pnpm docs:sync` had already generated those indexes, and the prepush gate
  passed.

## Files Changed

- `apps/api/test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts`
- `docs/architecture/components/engine/adapters/temporal/temporal-adapter-spec.md`
- `docs/evidence/ed-20260427-temporal-planref-qa1-readiness.md`
- `docs/evidence/index.md`
- `docs/planning/closeouts/20260427-ar-d-plan-pointer-qa1-readiness-closeout.md`
- `docs/planning/reviews/architecture-and-governance/20260427-ar-d-plan-pointer-fowler-hard-qa-review.md`
- `docs/planning/state/agent-lane-d.yaml`
- `docs/risk-register/quality/R-20260427-TEMPORAL-PLANREF-CONFIG-HARDENING.yaml`
- `docs/runbooks/index.md`
- `docs/runbooks/temporal-planref-drained-cutover-20260427.md`
- `docs/runbooks/temporal-worker-dbt-plugin-runtime-20260414.md`
- `packages/@dvt/adapter-temporal/src/config.ts`
- `packages/@dvt/adapter-temporal/test/TemporalAdapter.startRun.test.ts`
- `packages/@dvt/adapter-temporal/test/helpers/contractFixtures.ts`
- `packages/@dvt/adapter-temporal/test/smoke.test.ts`
- `packages/@dvt/adapter-temporal/test/workflow-execution-segment.test.ts`

## Residual Scope

`AR-D-PLAN-POINTER` remains open for:

- full AR-D2 production SLA wording for maximum workflow history size and
  segment count policy;
- segment-scale maturity beyond bounded returned shape, likely through an
  indexed segment manifest or equivalent artifact;
- DBT built-in adapter coupling extraction, which remains tracked separately.

## No-Debt And No-Stub Evidence

- No stubs, placeholders, fake adapters, fake success paths, or TODO markers
  were added.
- No hooks, lint, type, test, ARC, or prepush rules were disabled.
- No CodeRabbit workflow was used.
- No full-plan workflow input compatibility branch was faked; the cutover is
  explicitly documented as drained deploy only.
- Explicit rollover disablement remains possible but is documented as local or
  incident posture, not large-DAG readiness.
