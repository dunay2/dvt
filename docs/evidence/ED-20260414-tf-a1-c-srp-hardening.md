---
title: Harden the frozen SQL-first transformation pack into SRP-correct seams
status: Accepted
date: 2026-04-14
owners:
  - '@dvt/contracts'
  - dvt-api
  - '@dvt/web'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/TransformationFlowCompiler.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/TransformationFlowCompilerSummary.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/StepKindRegistry.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/TransformationFlowStepKinds.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/TransformationFlowStepTypeConfigs.v1.ts
  - packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts
  - packages/@dvt/contracts/src/step-registry/BuiltInStepTypeEntries.ts
  - packages/@dvt/contracts/src/step-registry/DbtStepTypeConfig.ts
  - packages/@dvt/contracts/src/schema-packs/plan-preview.ts
  - packages/@dvt/contracts/src/schema-packs/plan-preview-profile.ts
  - packages/@dvt/contracts/src/schema-packs/plan-preview-request.ts
  - packages/@dvt/contracts/src/schema-packs/plan-preview-response.ts
  - packages/@dvt/contracts/test/validation.test.ts
  - packages/@dvt/contracts/test/validation/signal-and-error.ts
  - packages/@dvt/contracts/test/validation/run-lifecycle.ts
  - packages/@dvt/contracts/test/validation/execution-plan.ts
  - packages/@dvt/contracts/test/validation/execution-context.ts
  - packages/@dvt/contracts/test/validation/planner-graph.ts
  - packages/@dvt/contracts/test/validation/plan-records.ts
  - packages/@dvt/contracts/test/validation/preview.ts
  - packages/@dvt/contracts/test/step-registry.test.ts
  - packages/@dvt/planner/src/domain/Planner.ts
  - packages/@dvt/planner/test/unit/step-registry-integration.test.ts
  - apps/web/src/app/services/plans/plansService.api.ts
  - apps/web/src/app/services/plans/plansService.test.ts
  - apps/web/src/app/views/canvas/previewGraphSource.ts
  - apps/web/src/app/views/canvas/useCanvasExecutionActions.ts
  - apps/api/src/entrypoints/http/planRoutes.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test -- step-registry.test.ts validation.test.ts
    - pnpm --filter @dvt/planner test -- step-registry-integration.test.ts
    - pnpm exec eslint --max-warnings 0 packages/@dvt/contracts/src/contracts/planner/TransformationFlowCompiler.v1.ts packages/@dvt/contracts/src/contracts/planner/TransformationFlowCompilerSummary.v1.ts packages/@dvt/contracts/src/contracts/planner/TransformationFlowStepKinds.v1.ts packages/@dvt/contracts/src/contracts/planner/TransformationFlowStepTypeConfigs.v1.ts packages/@dvt/contracts/src/schema-packs/plan-preview.ts packages/@dvt/contracts/src/schema-packs/plan-preview-profile.ts packages/@dvt/contracts/src/schema-packs/plan-preview-request.ts packages/@dvt/contracts/src/schema-packs/plan-preview-response.ts packages/@dvt/contracts/src/step-registry/BuiltInStepTypeEntries.ts packages/@dvt/contracts/src/step-registry/DbtStepTypeConfig.ts packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts apps/api/src/entrypoints/http/planRoutes.ts apps/api/src/entrypoints/http/planPreviewContractGuard.ts apps/api/src/entrypoints/http/planPreviewEnvelopeBinder.ts apps/api/src/entrypoints/http/planPreviewResponseMapper.ts apps/api/src/entrypoints/http/planRouteScope.ts apps/web/src/app/views/canvas/previewGraphSource.ts apps/web/src/app/views/canvas/previewCompilerGraphSource.ts apps/web/src/app/views/canvas/previewGraphNodePayloads.ts apps/web/src/app/views/canvas/previewGraphSignature.ts apps/web/src/app/views/canvas/previewDesignGraphArtifact.ts apps/web/src/app/views/canvas/canvasPreviewProvenance.ts apps/web/src/app/views/canvas/canvasPlanReadiness.ts apps/web/src/app/views/canvas/canvasPlanAction.ts apps/web/src/app/views/canvas/canvasRunStartAction.ts apps/web/src/app/views/canvas/useCanvasExecutionActions.ts
    - pnpm exec eslint --max-warnings 0 packages/@dvt/contracts/test/validation.test.ts packages/@dvt/contracts/test/validation/signal-and-error.ts packages/@dvt/contracts/test/validation/run-lifecycle.ts packages/@dvt/contracts/test/validation/execution-plan.ts packages/@dvt/contracts/test/validation/execution-context.ts packages/@dvt/contracts/test/validation/planner-graph.ts packages/@dvt/contracts/test/validation/plan-records.ts packages/@dvt/contracts/test/validation/preview.ts
    - pnpm exec eslint --max-warnings 0 packages/@dvt/contracts/src/contracts/planner/StepKindRegistry.v1.ts packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts packages/@dvt/contracts/test/step-registry.test.ts packages/@dvt/planner/src/domain/Planner.ts packages/@dvt/planner/test/unit/step-registry-integration.test.ts apps/web/src/app/services/plans/plansService.api.ts apps/web/src/app/services/plans/plansService.test.ts
    - pnpm --filter dvt-api build
    - pnpm --filter dvt-api test -- planRoutes.test.ts
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web test -- plansService.test.ts useCanvasExecutionActions.test.tsx
    - pnpm docs:sync
    - pnpm docs:workboard:generate
    - pnpm docs:status:generate
---

## Summary

`TF-A1-C` closes the structural hardening follow-up for the frozen SQL-first
transformation pack without redefining the shipped semantics from `TF-A1-A`
and `TF-A1-B`.

The accepted claim is narrow:

1. canonical step-kind authority now flows from one governed source;
2. compiler graph/config/summary responsibilities no longer change together in
   one shared-kernel module;
3. Canvas preview and execution seams no longer depend on large convenience
   modules for provenance, readiness, and action orchestration; and
4. the preview route composes transport-adjacent helpers instead of keeping
   scope, policy, binding, and response projection in one file.

The validation-suite hardening in the same slice now closes the remaining test
SRP gap as well:

1. runtime validation coverage is split into signal/error, run lifecycle,
   execution plan, and execution context suites instead of one broad
   `core-runtime` file; and
2. preview and plan-record fixtures no longer share a generic cross-domain
   helper module.

The follow-up hardening after QA closes the remaining authority drift that the
first refactor left behind:

1. `KnownStepKind` membership is now value-based instead of prototype-based;
2. the canonical step-type registry now rejects unknown kinds instead of
   silently passing them through; and
3. the web plans adapter now projects `target` from the scoped observability
   tag written by the preview/import routes.

The change intentionally preserves the frozen SQL-first vocabulary, preview
profile, persisted immutable plan model, and deterministic compiler output.
