---
title: Temporal PlanRef QA1 readiness hardening
status: Accepted
date: 2026-04-27
owners:
  - packages/@dvt/adapter-temporal
  - apps/api
  - apps/temporal-worker
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/config.ts
  - packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts
  - packages/@dvt/adapter-temporal/src/activities/activityFactory.ts
  - packages/@dvt/adapter-temporal/src/activities/activityTypes.ts
  - packages/@dvt/adapter-temporal/src/activities/stepActivities.ts
  - packages/@dvt/adapter-temporal/src/activities/stepActivityDispatcher.ts
  - packages/@dvt/adapter-temporal/src/index.ts
  - packages/@dvt/adapter-temporal/src/plugins/dbt/DbtCliPluginRunner.ts
  - packages/@dvt/adapter-temporal/src/plugins/dbt/DbtStepActivity.ts
  - packages/@dvt/adapter-temporal/src/plugins/dbt/dbtPluginTypes.ts
  - apps/temporal-worker/src/runtime/createTemporalWorkerRuntime.ts
  - apps/temporal-worker/src/runtime/temporalWorkerDbtProfile.ts
  - apps/temporal-worker/src/runtime/temporalWorkerRuntimeResources.ts
  - apps/api/src/infrastructure/startRun/ArtifactStoreDbtProjectBundleBindingPolicy.ts
  - packages/@dvt/engine/src/ports/IRunExecutionContextBindingPolicy.ts
  - packages/@dvt/engine/src/services/startRun/RunExecutionContextAdmissionPolicy.ts
  - packages/@dvt/engine/src/ports/IRunStateStore.ts
  - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
  - packages/@dvt/adapter-temporal/src/workflows/executionSegmentResolver.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.activities.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.cancellation.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layerHelpers.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layerResults.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layers.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.lifecycle.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.signals.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.state.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.stepExecution.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.types.ts
  - packages/@dvt/adapter-temporal/src/workflows/workflowArtifactHelpers.ts
  - packages/@dvt/adapter-temporal/src/workflows/workflowCursorHelpers.ts
  - packages/@dvt/adapter-temporal/src/workflows/workflowErrorHelpers.ts
  - packages/@dvt/adapter-temporal/src/workflows/workflowGatewayHelpers.ts
  - packages/@dvt/adapter-temporal/src/workflows/workflowInputParsingHelpers.ts
  - packages/@dvt/adapter-temporal/src/workflows/workflowRuntimePayloadHelpers.ts
  - packages/@dvt/adapter-temporal/src/plugins/TemporalStepPluginProfile.ts
  - packages/@dvt/adapter-temporal/src/plugins/dbt/dbtPluginManifest.ts
  - packages/@dvt/adapter-temporal/test/smoke.test.ts
  - packages/@dvt/adapter-temporal/test/TemporalAdapter.startRun.test.ts
  - packages/@dvt/adapter-temporal/test/helpers/contractFixtures.ts
  - packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
  - packages/@dvt/adapter-temporal/test/dbt-core-decoupling.architecture.test.ts
  - packages/@dvt/adapter-temporal/test/activities.test.ts
  - packages/@dvt/adapter-temporal/test/DbtCliPluginRunner.test.ts
  - packages/@dvt/engine/test/services/RunExecutionContextAdmissionPolicy.test.ts
  - packages/@dvt/engine/test/core/WorkflowEngine.test.ts
  - apps/api/test/integration/plannerEngineContract.test.ts
  - apps/temporal-worker/test/runtime/createTemporalWorkerRuntime.test.ts
  - packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts
  - packages/@dvt/adapter-temporal/test/workflow-execution-segment.test.ts
  - docs/architecture/components/engine/adapters/temporal/temporal-adapter-spec.md
  - docs/architecture/components/engine/adapters/temporal/temporal-dbt-worker-plugin-profile.md
  - docs/architecture/components/engine/adapters/temporal/temporal-planref-workflow-boundary.md
  - buzon/20260428-codex-fowler-temporal-dbt-core-decoupling-analysis-and-remediation.md
  - buzon/20260428-codex-fowler-temporal-planref-workflow-boundary-analysis-and-remediation.md
  - docs/runbooks/temporal-planref-drained-cutover-20260427.md
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal exec vitest run ./test/workflow-component-semantics.architecture.test.ts
    - pnpm --filter @dvt/adapter-temporal exec vitest run ./test/dbt-core-decoupling.architecture.test.ts ./test/activities.test.ts -t "DBT|dbt|core activity"
    - pnpm --filter @dvt/engine exec vitest run test/services/RunExecutionContextAdmissionPolicy.test.ts test/core/WorkflowEngine.test.ts
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/activities.test.ts test/DbtCliPluginRunner.test.ts test/dbt-core-decoupling.architecture.test.ts
    - pnpm --filter dvt-api test -- test/integration/plannerEngineContract.test.ts
    - pnpm --filter dvt-temporal-worker test -- test/runtime/createTemporalWorkerRuntime.test.ts
    - pnpm --filter @dvt/adapter-temporal exec vitest run ./test/smoke.test.ts -t "loads config with defaults|keeps explicit zero"
    - pnpm --filter @dvt/adapter-temporal exec vitest run ./test/TemporalAdapter.startRun.test.ts
    - pnpm --filter @dvt/adapter-temporal exec vitest run ./test/workflow-continue-as-new.test.ts
    - pnpm --filter @dvt/adapter-temporal exec vitest run ./test/workflow-execution-segment.test.ts
    - pnpm --filter @dvt/adapter-temporal exec vitest run ./test/integration.time-skipping.test.ts -t "continues as new"
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter dvt-temporal-worker typecheck
    - pnpm docs:workboard:generate
    - pnpm docs:sync
    - pnpm verify:prepush
---

## Summary

This evidence records the `AR-D-PLAN-POINTER` QA1 readiness hardening pass.

The pass closes the immediate Fowler findings without pretending full runtime
maturity is complete:

- Temporal continue-as-new rollover now has a governed non-zero default.
- Explicit `TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS=0` remains available only as
  a local diagnostic or incident rollback override.
- Workflow input now rejects a missing continue-as-new threshold instead of
  silently defaulting to disabled rollover.
- The drained-deploy cutover posture is documented as the active
  no-retrocompatibility procedure.
- Deep-plan segment resolution has regression coverage proving the returned
  segment carries only the requested layer plus compact metadata.
- The Temporal PlanRef workflow boundary now has semantic module ownership
  docblocks, a local component guide, diagrams, and an architecture fitness test
  that validates public API, invariants, transitions, and consumers.
- DBT step-kind ownership moved out of the Temporal core activity registry and
  into explicit worker DBT profile composition.
- DBT runtime support is now described and wired as a plugin profile, not as a
  core engine concept: engine admission receives generic plugin requirements,
  DBT-specific admission lives in API infrastructure, and the DBT Temporal
  manifest declares only the step-kind subset this plugin profile currently
  supports.
- A SQL-shaped plugin proof demonstrates that the same composition/admission
  seam accepts another executor plugin without DBT-specific branches.
- Generic `ActivityDeps` no longer carries DBT runtime dependencies.
- The worker omits DBT activity registry wiring when DBT mode is disabled and
  composes it only when DBT mode is enabled.

## Plugin Isolation Addendum

The follow-up review clarified that DBT is one executor plugin profile, not a
special core vocabulary and not the complete set of DBT CLI capabilities.

- Introduced `TemporalStepPluginProfile` and
  `composeTemporalStepPluginRegistries(...)` as generic worker composition
  primitives.
- Moved DBT-supported Temporal step-kind ownership into
  `dbtPluginManifest.ts` and named the public list
  `TEMPORAL_DBT_PLUGIN_EXECUTABLE_STEP_KINDS` to make the supported subset explicit.
- Changed DBT CLI command resolution to use the DBT plugin manifest instead of
  a scattered switch/allowlist.
- Changed engine admission from DBT-specific binding to generic
  `pluginRequirements`.
- Kept DBT bundle validation in the API infrastructure binding policy.
- Changed engine tests to use an example plugin plus a SQL-shaped plugin proof,
  keeping `packages/@dvt/engine` free of DBT vocabulary.

## Residual Risk

`AR-D-PLAN-POINTER` remains open for the full AR-D2 SLA statement and deeper
segment-scale maturity. The old core-registry DBT coupling is remediated; the
remaining DBT risk is package-level plugin/CLI extraction tracked in
`R-20260420-TEMPORAL-DBT-BUILTIN-COUPLING`.
