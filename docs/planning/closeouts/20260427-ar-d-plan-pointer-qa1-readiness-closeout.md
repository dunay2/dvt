---
title: AR-D plan pointer QA1 readiness closeout
status: Accepted
owner: Runtime / Temporal / Delivery
last_reviewed: 2026-04-28
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
- Changed workflow control parsing so missing `continueAsNewAfterLayerCount`
  fails closed instead of silently disabling rollover.
- Added a deep-plan regression proving `resolveExecutionSegmentFromPlan` returns
  only the requested layer plus compact metadata, not the full plan.
- Added `docs/runbooks/temporal-planref-drained-cutover-20260427.md` to make
  the drained-deploy/no-retrocompatibility posture executable.
- Updated the Temporal adapter spec, worker runbook, Fowler QA review, Lane D,
  ARC evidence, and risk register to match the shipped behavior.
- Added a QA3 semantic-encapsulation pass for the Temporal PlanRef workflow
  boundary: exact module `@ownedConcern` docblocks, a local component guide with
  public API/invariants/transitions/consumers/diagrams, a mailbox Fowler
  analysis, and a semantic architecture fitness test.
- Added a DBT-core decoupling pass for the remaining Fowler hexagonal-boundary
  finding: Temporal core activity modules now declare plugin-free owned
  concerns, `ActivityDeps` no longer owns DBT runtime dependencies,
  `createDefaultStepActivityRegistry()` starts empty, and DBT step kinds are
  composed only through an explicit worker DBT profile registry.

## DBT Core Decoupling Addendum

The original QA1 closeout left DBT adapter decoupling out of scope. This
addendum records the follow-up pass requested from the same branch.

- moved `DbtStepActivity` and DBT plugin contracts from core activity modules
  into `src/plugins/dbt/`;
- exported `createDbtStepActivityRegistry(...)` as the explicit worker-profile
  composition API;
- removed `runExecutionContextReader` and `dbtPluginRunner` from generic
  `ActivityDeps`;
- changed the standalone worker so DBT registry wiring is present only when
  `DVT_TEMPORAL_DBT_ENABLED=true`;
- updated integration helpers so DBT tests pass `stepActivitiesByKind`
  explicitly instead of smuggling DBT through base activity deps;
- added a DBT worker plugin profile component guide with public API,
  invariants, transitions, consumers, diagrams, and drift guards;
- added a semantic architecture test that validates core ownership, the empty
  default registry posture, and the DBT worker profile guide.

## DBT Plugin Isolation Addendum

The follow-up review clarified the remaining semantic issue: DBT must behave
like a plugin profile, the same way a future SQL plugin would, instead of being
treated as a special core allowlist.

- introduced `TemporalStepPluginProfile` and
  `composeTemporalStepPluginRegistries(...)` as plugin-generic worker
  composition primitives;
- moved the Temporal-supported DBT subset into
  `src/plugins/dbt/dbtPluginManifest.ts`;
- changed DBT CLI command selection to resolve through the DBT plugin manifest;
- changed engine admission from DBT-specific binding to generic
  `pluginRequirements`;
- kept DBT artifact-store validation in the API infrastructure binding policy;
- changed engine tests to use an example plugin and added a SQL-shaped plugin
  proof;
- added a semantic architecture test that keeps `packages/@dvt/engine` source
  free of DBT vocabulary and keeps generic plugin composition DBT-free.

## TDD Evidence

Red result observed before implementation:

- `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/smoke.test.ts -t "loads config with defaults"`
  - Failed as expected because the runtime still returned
    `continueAsNewAfterLayerCount: 0` while the test required the governed
    default `100`.
- `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/workflow-continue-as-new.test.ts -t "rejects missing continue-as-new threshold"`
  - Failed as expected because workflow control parsing accepted missing
    `continueAsNewAfterLayerCount` and silently defaulted to `0`.
- `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/workflow-component-semantics.architecture.test.ts`
  - Failed as expected because workflow modules did not yet declare exact
    `@ownedConcern` values and the PlanRef workflow boundary guide did not yet
    exist.
- `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/dbt-core-decoupling.architecture.test.ts ./test/activities.test.ts -t "DBT|dbt|core activity"`
  - Failed as expected before implementation because core activity modules still
    imported DBT symbols, the default registry still contained DBT step kinds,
    and DBT kind overrides were blocked.
- `pnpm --filter dvt-temporal-worker test -- test/runtime/createTemporalWorkerRuntime.test.ts`
  - Failed as expected before implementation because DBT-disabled runtime still
    exposed DBT registry wiring through the default activity registry.
- `pnpm --filter @dvt/engine exec vitest run test/services/RunExecutionContextAdmissionPolicy.test.ts`
  - Failed as expected during the first attempted fix because the engine test
    still encoded DBT plugin step kinds as core vocabulary.

Green results after implementation:

- `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/workflow-component-semantics.architecture.test.ts`
  - Passed: 1 file, 4 tests.
- `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/smoke.test.ts -t "loads config with defaults|keeps explicit zero"`
  - Passed: 3 tests, 21 skipped by filter.
- `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/TemporalAdapter.startRun.test.ts`
  - Passed: 3 tests.
- `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/workflow-execution-segment.test.ts`
  - Passed: 5 tests.
- `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/workflow-continue-as-new.test.ts`
  - Passed: 17 tests.
- `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/dbt-core-decoupling.architecture.test.ts ./test/activities.test.ts -t "DBT|dbt|core activity"`
  - Passed: 2 files, 11 tests, with unrelated tests skipped by filter.
- `pnpm --filter dvt-temporal-worker test -- test/runtime/createTemporalWorkerRuntime.test.ts`
  - Passed: 1 file, 6 tests.
- `pnpm --filter @dvt/engine exec vitest run test/services/RunExecutionContextAdmissionPolicy.test.ts test/core/WorkflowEngine.test.ts`
  - Passed: 2 files, 53 tests.
- `pnpm --filter @dvt/adapter-temporal exec vitest run test/activities.test.ts test/DbtCliPluginRunner.test.ts test/dbt-core-decoupling.architecture.test.ts`
  - Passed: 3 files, 57 tests.
- `pnpm --filter dvt-api test -- test/integration/plannerEngineContract.test.ts`
  - Passed: 1 file, 7 tests.

Intermediate test corrections:

- The start-run payload budget test initially failed because the new default
  threshold made the artificial `512` byte budget too small for the intended
  PlanRef-only payload assertion. The budget was raised to keep the test focused
  on "does not serialize full plan".
- The deep-plan segment test initially rejected the current layer's immediate
  dependency. The assertion was corrected to allow needed dependency metadata
  while still rejecting unrelated step payloads.

## Validation Evidence

- `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/workflow-continue-as-new.test.ts ./test/TemporalAdapter.startRun.test.ts ./test/workflow-execution-segment.test.ts ./test/smoke.test.ts`
  - Passed: 4 files, 49 tests.
- `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/integration.time-skipping.test.ts -t "continues as new"`
  - Passed: 1 test, 8 skipped by filter.
- `pnpm --filter dvt-api test -- test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts test/plugins/env.test.ts`
  - Passed: 2 files, 6 tests.
- `pnpm --filter dvt-temporal-worker test -- test/plugins/env.test.ts test/runtime/createTemporalWorkerRuntime.test.ts`
  - Passed: 2 files, 13 tests.
- `pnpm --filter @dvt/engine exec vitest run test/services/RunExecutionContextAdmissionPolicy.test.ts test/core/WorkflowEngine.test.ts`
  - Passed: 2 files, 53 tests.
- `pnpm --filter @dvt/adapter-temporal exec vitest run test/activities.test.ts test/DbtCliPluginRunner.test.ts test/dbt-core-decoupling.architecture.test.ts`
  - Passed: 3 files, 57 tests.
- `pnpm --filter dvt-temporal-worker test -- test/runtime/createTemporalWorkerRuntime.test.ts`
  - Passed: 1 file, 8 tests.
- `pnpm --filter dvt-api test -- test/integration/plannerEngineContract.test.ts`
  - Passed: 1 file, 7 tests.
- `pnpm --filter @dvt/adapter-temporal exec vitest run ./test/workflow-component-semantics.architecture.test.ts`
  - Passed: 1 file, 4 tests.
- `pnpm --filter @dvt/adapter-temporal test`
  - Passed: 24 files, 191 tests.
- `pnpm --filter @dvt/adapter-temporal typecheck`
  - Passed.
- `pnpm --filter dvt-temporal-worker typecheck`
  - Passed.
- `pnpm docs:status:generate`
  - Passed; updated generated code state after adding the adapter Temporal
    architecture test.
- `pnpm docs:workboard:generate`
  - Passed; regenerated planning workboard views after Lane D changed.
- `pnpm docs:sync`
  - Passed; regenerated evidence and runbook indexes plus Lane D rendered view.
- `pnpm docs:workboard:check`
  - Passed.
- `pnpm docs:sync:check`
  - Passed.
- `pnpm docs:arc:evidence:check`
  - Passed.
- `pnpm docs:gov:links`
  - Passed with 0 errors and 0 warnings.
- `pnpm lint:md:changed`
  - Passed with 0 errors.
- `pnpm lint`
  - Failed once because the new test referenced `TextEncoder` directly.
  - Passed after switching the test to `globalThis.TextEncoder`.
  - Failed once in QA2 because the new workflow parser test import order was
    wrong.
  - Passed after sorting the import.
- `pnpm verify:prepush`
  - Passed.

## Files Changed

- `apps/api/test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts`
- `apps/api/src/infrastructure/startRun/ArtifactStoreDbtProjectBundleBindingPolicy.ts`
- `apps/api/test/integration/plannerEngineContract.test.ts`
- `apps/temporal-worker/src/runtime/temporalWorkerDbtProfile.ts`
- `apps/temporal-worker/src/runtime/temporalWorkerRuntimeResources.ts`
- `docs/architecture/components/engine/adapters/temporal/temporal-adapter-spec.md`
- `docs/architecture/components/engine/adapters/temporal/temporal-dbt-worker-plugin-profile.md`
- `docs/architecture/components/engine/adapters/temporal/temporal-planref-workflow-boundary.md`
- `buzon/20260428-codex-fowler-temporal-planref-workflow-boundary-analysis-and-remediation.md`
- `buzon/20260428-codex-fowler-temporal-dbt-core-decoupling-analysis-and-remediation.md`
- `docs/evidence/ed-20260427-temporal-planref-qa1-readiness.md`
- `docs/evidence/index.md`
- `docs/planning/closeouts/20260427-ar-d-plan-pointer-qa1-readiness-closeout.md`
- `docs/planning/reviews/architecture-and-governance/20260427-ar-d-plan-pointer-fowler-hard-qa-review.md`
- `docs/planning/state/agent-lane-d.yaml`
- `docs/risk-register/quality/R-20260427-TEMPORAL-PLANREF-CONFIG-HARDENING.yaml`
- `docs/risk-register/quality/R-20260420-TEMPORAL-DBT-BUILTIN-COUPLING.yaml`
- `docs/runbooks/index.md`
- `docs/runbooks/temporal-planref-drained-cutover-20260427.md`
- `docs/runbooks/temporal-worker-dbt-plugin-runtime-20260414.md`
- `packages/@dvt/adapter-temporal/src/config.ts`
- `packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts`
- `packages/@dvt/adapter-temporal/src/activities/activityFactory.ts`
- `packages/@dvt/adapter-temporal/src/activities/activityTypes.ts`
- `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
- `packages/@dvt/adapter-temporal/src/activities/stepActivityDispatcher.ts`
- `packages/@dvt/adapter-temporal/src/index.ts`
- `packages/@dvt/adapter-temporal/src/plugins/TemporalStepPluginProfile.ts`
- `packages/@dvt/adapter-temporal/src/plugins/dbt/DbtCliPluginRunner.ts`
- `packages/@dvt/adapter-temporal/src/plugins/dbt/DbtStepActivity.ts`
- `packages/@dvt/adapter-temporal/src/plugins/dbt/dbtPluginManifest.ts`
- `packages/@dvt/adapter-temporal/src/plugins/dbt/dbtPluginTypes.ts`
- `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- `packages/@dvt/adapter-temporal/src/workflows/executionSegmentResolver.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.activities.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.cancellation.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layerHelpers.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layerResults.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layers.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.lifecycle.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.signals.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.state.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.stepExecution.ts`
- `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.types.ts`
- `packages/@dvt/adapter-temporal/src/workflows/workflowArtifactHelpers.ts`
- `packages/@dvt/adapter-temporal/src/workflows/workflowCursorHelpers.ts`
- `packages/@dvt/adapter-temporal/src/workflows/workflowErrorHelpers.ts`
- `packages/@dvt/adapter-temporal/src/workflows/workflowGatewayHelpers.ts`
- `packages/@dvt/adapter-temporal/src/workflows/workflowInputParsingHelpers.ts`
- `packages/@dvt/adapter-temporal/src/workflows/workflowRuntimePayloadHelpers.ts`
- `packages/@dvt/adapter-temporal/test/TemporalAdapter.startRun.test.ts`
- `packages/@dvt/adapter-temporal/test/helpers/contractFixtures.ts`
- `packages/@dvt/adapter-temporal/test/smoke.test.ts`
- `packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts`
- `packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts`
- `packages/@dvt/adapter-temporal/test/workflow-execution-segment.test.ts`
- `packages/@dvt/adapter-temporal/test/activities.test.ts`
- `packages/@dvt/adapter-temporal/test/DbtCliPluginRunner.test.ts`
- `packages/@dvt/adapter-temporal/test/dbt-core-decoupling.architecture.test.ts`
- `packages/@dvt/adapter-temporal/test/helpers/integration/dbtRuntimeFixtures.ts`
- `packages/@dvt/adapter-temporal/test/helpers/integration/testActivities.ts`
- `packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts`
- `packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts`
- `apps/temporal-worker/src/runtime/createTemporalWorkerRuntime.ts`
- `apps/temporal-worker/test/runtime/createTemporalWorkerRuntime.test.ts`
- `packages/@dvt/engine/src/ports/IRunExecutionContextBindingPolicy.ts`
- `packages/@dvt/engine/src/ports/IRunStateStore.ts`
- `packages/@dvt/engine/src/services/startRun/RunExecutionContextAdmissionPolicy.ts`
- `packages/@dvt/engine/test/core/WorkflowEngine.test.ts`
- `packages/@dvt/engine/test/services/RunExecutionContextAdmissionPolicy.test.ts`

## Residual Scope

`AR-D-PLAN-POINTER` remains open for:

- full AR-D2 production SLA wording for maximum workflow history size and
  segment count policy;
- segment-scale maturity beyond bounded returned shape, likely through an
  indexed segment manifest or equivalent artifact;
- package-level DBT plugin extraction, which remains tracked separately after
  the core activity registry and worker-composition coupling were corrected.

## No-Debt And No-Stub Evidence

- No stubs, placeholders, fake adapters, fake success paths, or TODO markers
  were added.
- No hooks, lint, type, test, ARC, or prepush rules were disabled.
- No CodeRabbit workflow was used.
- No full-plan workflow input compatibility branch was faked; the cutover is
  explicitly documented as drained deploy only.
- Explicit rollover disablement remains possible but is documented as local or
  incident posture, not large-DAG readiness.
