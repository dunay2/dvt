---
title: Closeout - TF-A1-C14 plan compile language alignment
status: Review
owner: API / Docs
last_reviewed: 2026-04-19
planning_type: closeout
slice: TF-A1-C14-plan-compile-language-alignment
---

# Closeout: TF-A1-C14 plan compile language alignment

## Think-First Analysis

### Problem summary

The compile-only boundary had two kinds of active drift:

- the public contract and route already spoke `plan compile`, while the API
  application layer, composition modules, and active guides still spoke
  `external compile`
- graph-source and selection normalization were rebuilt in both the HTTP parser
  and the application envelope mapper, which created two owners for one
  canonical command shape

That weakened the Fowler remote-facade posture because the route/application
boundary was no longer carrying one ubiquitous language or one clear ownership
line for boundary translation.

### Root cause

`MW-D1` started under an `external compile` label. Later slices moved the
public contract and route to `plan compile`, but the application/module names
and living guides were not converged in the same slice. At the same time, the
compile command shape was being normalized once for route parsing and again for
planner-envelope mapping.

### Governing constraints

- `AGENTS.md`: inventory-first execution, no hidden debt, validation-backed
  completion, and generated-doc updates after structural changes
- `docs/guides/ai-work-protocol.md`: think-first analysis before
  implementation and governed closeout after the slice
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`:
  one clear owner per boundary seam and no convenience cross-boundary leakage
- `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`: planner
  public boundary changes must keep one coherent contract vocabulary
- `docs/planning/reviews/architecture-and-governance/20260419-plan-route-boundary-remediation-review.md`:
  active plan-route review identified compile vocabulary drift and duplicate
  compile normalization as real remaining defects

### Selected correction

Use `plan compile` as the active ubiquitous language for the compile-only
boundary in living code and living docs. Keep the HTTP parser as the single
owner of contract-to-command normalization for graph source and selection, and
keep the application mapper focused on planner-envelope enrichment only.

Historical `MW-D1` proposals and reviews may still use `external compile`, but
that wording must remain historical rather than competing with active
documentation and active code names.

## Implementation Summary

- Renamed the API application service and composition-root surfaces from
  `externalCompile*` to `planCompile*`, including the compile planner builder,
  profile spec, catalog, runtime-module field, and compile use case.
- Removed duplicate graph-source and selection normalization from the
  application planner-envelope mapper so those shapes are now normalized only
  once at the route parser boundary.
- Renamed the active compile guides to `plan-compile-*`, updated their content
  to the active vocabulary, and aligned the API component page plus remediation
  review to the current plan-route and compile-boundary code truth.
- Renamed the remaining live planner step-type-config contract export from
  `ExternalCompileStepTypeConfigs` to `PlanCompileStepTypeConfigs` so the
  active contracts surface no longer reintroduces the retired vocabulary.

## Files Changed

- `apps/api/src/application/services/CompilePlanUseCase.ts`
- `apps/api/src/application/services/planCompilePlannerEnvelopeMapper.ts`
- `apps/api/src/entrypoints/http/planCompileRouteInputParser.ts`
- `apps/api/src/entrypoints/http/compilePlanRoute.ts`
- `apps/api/src/entrypoints/http/compilePlanRouteResponseMapper.ts`
- `apps/api/src/entrypoints/http/planCompileResponseMapper.ts`
- `apps/api/src/modules/planCompileCatalog.ts`
- `apps/api/src/modules/planCompileProfileSpec.ts`
- `apps/api/src/modules/planCompilePlannerProfile.ts`
- `apps/api/src/modules/buildProtectedRuntimeModule.ts`
- `apps/api/src/modules/types.ts`
- `apps/api/src/app.ts`
- `apps/api/test/application/services/CompilePlanUseCase.test.ts`
- `apps/api/test/modules.test.ts`
- `packages/@dvt/contracts/src/contracts/planner/PlanCompileStepTypeConfigs.v1.ts`
- `packages/@dvt/contracts/src/index.ts`
- `docs/architecture/components/api/index.md`
- `docs/guides/plan-compile-target-architecture-technical-manual-20260417.md`
- `docs/guides/plan-compile-catalog-extension-technical-manual-20260417.md`
- `docs/guides/how-to-add-step-kind-20260406.md`
- `docs/planning/reviews/architecture-and-governance/20260419-plan-route-boundary-remediation-review.md`
- `docs/planning/state/agent-lane-a.yaml`

## Validation

The validation baseline for this slice is:

- `pnpm exec eslint --max-warnings 0 apps/api/src/app.ts apps/api/src/application/services/CompilePlanUseCase.ts apps/api/src/application/services/planCompilePlannerEnvelopeMapper.ts apps/api/src/entrypoints/http/compilePlanRoute.ts apps/api/src/entrypoints/http/compilePlanRouteResponseMapper.ts apps/api/src/entrypoints/http/planCompileResponseMapper.ts apps/api/src/entrypoints/http/planCompileRouteInputParser.ts apps/api/src/modules/buildProtectedRuntimeModule.ts apps/api/src/modules/planCompileCatalog.ts apps/api/src/modules/planCompilePlannerProfile.ts apps/api/src/modules/planCompileProfileSpec.ts apps/api/src/modules/types.ts apps/api/test/application/services/CompilePlanUseCase.test.ts apps/api/test/modules.test.ts`
- `pnpm --filter dvt-api typecheck`
- `pnpm --filter dvt-api test -- test/application/services/CompilePlanUseCase.test.ts test/entrypoints/http/compilePlanRoute.test.ts test/modules.test.ts`
- `pnpm docs:workboard:generate`
- `pnpm docs:status:generate`
- `pnpm docs:sync`
- `pnpm exec markdownlint-cli2 docs/architecture/components/api/index.md docs/guides/plan-compile-target-architecture-technical-manual-20260417.md docs/guides/plan-compile-catalog-extension-technical-manual-20260417.md docs/guides/how-to-add-step-kind-20260406.md docs/planning/reviews/architecture-and-governance/20260419-plan-route-boundary-remediation-review.md docs/planning/closeouts/20260419-tf-a1-c14-plan-compile-language-alignment-closeout.md --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc`
- `pnpm verify:prepush`

## Outcome

`TF-A1-C14` is closed when:

- active code and active guides describe one compile-only vocabulary:
  `plan compile`
- historical `external compile` wording remains historical only
- graph-source and selection normalization have one owner
- the active API component index no longer drifts from the route facade and
  compile boundary now shipped in code
