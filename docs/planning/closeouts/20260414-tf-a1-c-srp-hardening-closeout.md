---
slice: TF-A1-C-srp-hardening
date: 2026-04-14
lane: A
author: AI (Codex)
last_reviewed: 2026-04-14
---

# Closeout: TF-A1-C SRP hardening

## Think-First Analysis

### Problem summary

`TF-A1-A` and `TF-A1-B` froze the first SQL-first transformation pack, but the
shipped implementation still concentrated unrelated responsibilities in a small
set of high-churn modules:

1. `StepTypeRegistry.ts` mixed generic registry behavior with DBT and
   transformation-family defaults.
2. `TransformationFlowCompiler.v1.ts` mixed compiler graph contract, cross-node
   validation, and persisted-plan summary derivation.
3. `previewGraphSource.ts` mixed compiler mapping, stale-signature generation,
   design-graph artifact construction, and serialization.
4. `useCanvasExecutionActions.ts` mixed provenance, readiness rules, preview
   orchestration, run-start orchestration, and UI shell behavior.
5. `planRoutes.ts` mixed transport, scope policy, planner-envelope binding,
   persisted-preview response projection, and ownership checks.

The contract freeze stopped semantic drift, but it did not yet establish
responsibility ownership cleanly enough for future profiles or callers.

### Root cause

The first transformation vertical deliberately prioritized freezing the shared
semantics across `@dvt/contracts`, `apps/api`, and `apps/web`.

That shortened the path to a truthful SQL-first baseline, but it also let a
few convenience modules become local convergence points for contract shape,
policy, orchestration, and projection. The result was semantically stable but
structurally brittle.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, doc-driven execution, no debt, no
  stubs, and full validation including `pnpm verify:prepush`.
- `ADR-0005`: public contract evolution must remain explicit and machine
  validated.
- `ADR-0018`: the shared kernel must stay narrow; serializable shape belongs in
  `@dvt/contracts`, not consumer-local orchestration logic.
- `ADR-0035`: this slice must not redefine the public SQL-first semantics under
  a refactor label.
- `TF-A1-A` and `TF-A1-B`: the frozen SQL-first semantics remain unchanged:
  `source -> sql_transform -> sink`, explicit preview profile, persisted
  immutable plan, and deterministic compiler output.

### Selected option and rationale

Use the contracts-first hardening sequence defined in the governing proposal:

1. single-source step-kind authority and narrow the default registry seam;
2. split compiler graph/config/summary seams inside `@dvt/contracts`;
3. decompose Canvas preview generation into dedicated helpers;
4. decompose Canvas execution actions into provenance, readiness, preview, and
   run-start seams;
5. compose preview-route responsibilities through smaller HTTP-boundary helpers.

This preserves the frozen semantics while reducing the number of reasons each
module can change.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - `packages/@dvt/contracts/src/contracts/planner/**`
  - `packages/@dvt/contracts/src/step-registry/**`
  - `packages/@dvt/contracts/src/schema-packs/plan-preview.ts`
  - `packages/@dvt/contracts/src/schema-packs/plan-preview-profile.ts`
  - `packages/@dvt/contracts/src/schema-packs/plan-preview-request.ts`
  - `packages/@dvt/contracts/src/schema-packs/plan-preview-response.ts`
  - `packages/@dvt/contracts/test/validation.test.ts`
  - `packages/@dvt/contracts/test/validation/**`
  - `apps/web/src/app/views/canvas/**`
  - `apps/api/src/entrypoints/http/**`
  - `docs/contracts/planner/**`
  - `docs/planning/state/agent-lane-a.yaml`
  - `docs/planning/state/domain-status-board.md`
  - `docs/planning/roadmap/roadmap-by-domain.md`
  - `docs/architecture/system-delivery-status.md`
- Expected outcome:
  - canonical step-kind authority is single-sourced
  - the shared planner contracts expose smaller seams with the same frozen
    semantics
  - Canvas preview and execution helpers no longer mix unrelated concerns
  - the preview route composes policy and projection through explicit helpers
- Risks and mitigations:
  - Risk: export churn breaks consumers
  - Mitigation: keep the façade exports stable and validate `contracts`, `api`,
    and `web` together
  - Risk: refactor silently changes preview/run UX
  - Mitigation: preserve hook and route tests as behavior guards
  - Risk: future work reintroduces local authority drift
  - Mitigation: publish ARC evidence and a risk record tied to the narrowed
    seams
- Out of scope:
  - new transformation profiles
  - dbt phase-2 executor mode (`TF-C3`)
  - changes to frozen SQL-first node vocabulary or persisted-plan semantics

## Implementation Summary

- Extracted planner shared-kernel seams:
  - `TransformationFlowStepKinds.v1.ts`
  - `TransformationFlowStepTypeConfigs.v1.ts`
  - `TransformationFlowCompilerSummary.v1.ts`
- Narrowed `TransformationFlowCompiler.v1.ts` to the compiler graph contract,
  cross-node validation, and stable façade re-exports.
- Extracted registry-specific seams:
  - `DbtStepTypeConfig.ts`
  - `BuiltInStepTypeEntries.ts`
    so `StepTypeRegistry.ts` no longer acts as a family bag.
- Split `plan-preview` into profile, request, and response seams while keeping
  the public schema-pack façade stable and preserving the canonical persisted-
  plan summary derivation.
- Split `validation.test.ts` into domain-focused helper suites while keeping
  the top-level validation façade path stable for evidence and review
  traceability:
  - `signal-and-error.ts`
  - `run-lifecycle.ts`
  - `execution-plan.ts`
  - `execution-context.ts`
  - `planner-graph.ts`
  - `plan-records.ts`
  - `preview.ts`
    and removed the residual cross-domain `shared.ts` fixture bag and broad
    `core-runtime.ts` suite.
- Split Canvas preview responsibilities into:
  - `previewCompilerGraphSource.ts`
  - `previewGraphNodePayloads.ts`
  - `previewGraphSignature.ts`
  - `previewDesignGraphArtifact.ts`
    while keeping `previewGraphSource.ts` as a narrow façade.
- Split Canvas execution responsibilities into:
  - `canvasPreviewProvenance.ts`
  - `canvasPlanReadiness.ts`
  - `canvasPlanAction.ts`
  - `canvasRunStartAction.ts`
    leaving `useCanvasExecutionActions.ts` as a composition/UI façade.
- Split preview-route helper concerns into:
  - `planRouteScope.ts`
  - `planPreviewContractGuard.ts`
  - `planPreviewEnvelopeBinder.ts`
  - `planPreviewResponseMapper.ts`
    and cut `planRoutes.ts` over to those helpers.
- Updated planning/status surfaces so `TF-A1-C` closes as the structural
  hardening follow-up to the frozen SQL-first contract pack.

## Validation Run

- `pnpm --filter @dvt/contracts build` - PASS
- `pnpm --filter @dvt/contracts test -- step-registry.test.ts validation.test.ts` - PASS
- `pnpm exec eslint --max-warnings 0 packages/@dvt/contracts/src/contracts/planner/TransformationFlowCompiler.v1.ts packages/@dvt/contracts/src/contracts/planner/TransformationFlowCompilerSummary.v1.ts packages/@dvt/contracts/src/contracts/planner/TransformationFlowStepKinds.v1.ts packages/@dvt/contracts/src/contracts/planner/TransformationFlowStepTypeConfigs.v1.ts packages/@dvt/contracts/src/schema-packs/plan-preview.ts packages/@dvt/contracts/src/schema-packs/plan-preview-profile.ts packages/@dvt/contracts/src/schema-packs/plan-preview-request.ts packages/@dvt/contracts/src/schema-packs/plan-preview-response.ts packages/@dvt/contracts/src/step-registry/BuiltInStepTypeEntries.ts packages/@dvt/contracts/src/step-registry/DbtStepTypeConfig.ts packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts apps/api/src/entrypoints/http/planRoutes.ts apps/api/src/entrypoints/http/planPreviewContractGuard.ts apps/api/src/entrypoints/http/planPreviewEnvelopeBinder.ts apps/api/src/entrypoints/http/planPreviewResponseMapper.ts apps/api/src/entrypoints/http/planRouteScope.ts apps/web/src/app/views/canvas/previewGraphSource.ts apps/web/src/app/views/canvas/previewCompilerGraphSource.ts apps/web/src/app/views/canvas/previewGraphNodePayloads.ts apps/web/src/app/views/canvas/previewGraphSignature.ts apps/web/src/app/views/canvas/previewDesignGraphArtifact.ts apps/web/src/app/views/canvas/canvasPreviewProvenance.ts apps/web/src/app/views/canvas/canvasPlanReadiness.ts apps/web/src/app/views/canvas/canvasPlanAction.ts apps/web/src/app/views/canvas/canvasRunStartAction.ts apps/web/src/app/views/canvas/useCanvasExecutionActions.ts` - PASS
- `pnpm exec eslint --max-warnings 0 packages/@dvt/contracts/test/validation.test.ts packages/@dvt/contracts/test/validation/signal-and-error.ts packages/@dvt/contracts/test/validation/run-lifecycle.ts packages/@dvt/contracts/test/validation/execution-plan.ts packages/@dvt/contracts/test/validation/execution-context.ts packages/@dvt/contracts/test/validation/planner-graph.ts packages/@dvt/contracts/test/validation/plan-records.ts packages/@dvt/contracts/test/validation/preview.ts` - PASS
- `pnpm --filter dvt-api build` - PASS
- `pnpm --filter dvt-api test -- planRoutes.test.ts` - PASS
- `pnpm --filter @dvt/web typecheck` - PASS
- `pnpm --filter @dvt/web test -- plansService.test.ts useCanvasExecutionActions.test.tsx` - PASS
- `pnpm docs:sync` - PASS
- `pnpm docs:workboard:generate` - PASS
- `pnpm docs:status:generate` - PASS

## Residuals

- `StepTypeRegistry.validate()` still preserves the preexisting fail-open
  behavior for unknown kinds; `TF-A1-C` narrowed authority and composition but
  did not yet execute the policy change to a strict fail-closed runtime gate.
- ARC diff-gated commands such as `arc-check.mjs` against `origin/main...HEAD`
  do not yet see this slice because the work remains uncommitted in the current
  worktree.
