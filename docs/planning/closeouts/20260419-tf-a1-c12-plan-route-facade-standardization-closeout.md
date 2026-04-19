---
title: Closeout - TF-A1-C12 plan-route facade standardization
status: Review
owner: API / Docs
last_reviewed: 2026-04-19
planning_type: closeout
slice: TF-A1-C12-plan-route-facade-standardization
---

# Closeout: TF-A1-C12 plan-route facade standardization

## Think-First Analysis

### Problem summary

`TF-A1-C10` and `TF-A1-C11` removed the biggest preview-route and grammar
ownership drift, but preview, import, and compile still hand-own the same
remote-facade choreography in separate route files:

1. parse or resolve the request body
2. authorize the scope
3. delegate to the route-specific use case
4. branch accepted versus rejected outcomes
5. map internal failure and send the final HTTP response

The architecture improved, but the execution recipe is still duplicated.

### Root cause

The earlier slices prioritized removing the god-route and fixing semantic
coupling first. That was correct, but it left each route with a local copy of
the same adapter workflow rather than standardizing the route-facade pattern
itself.

### Governing constraints

- `AGENTS.md`: inventory-first execution, no hidden debt, no stubs, and
  validation-backed closure.
- `docs/guides/ai-work-protocol.md`: Slim mode requires think-first analysis,
  pre-implementation brief, and closeout-backed validation evidence.
- `docs/architecture/reference-architecture.md`: HTTP routes remain thin
  adapters over explicit application services and mappers.
- `ADR-0003`: DVT-owned execution boundaries must stay explicit and not collapse
  back into convenience orchestration.
- `ADR-0005`: boundary parsing and validation remain deterministic and
  regression tested.
- `ADR-0012`: plan integrity and plan-boundary ownership remain explicit.
- `ADR-0034`: bounded-context and communication rules require explicit seam
  ownership instead of accidental reuse.
- `docs/planning/reviews/architecture-and-governance/20260419-plan-route-boundary-remediation-review.md`:
  this slice standardizes the shared plan-route remote-facade recipe without
  changing caller-visible behavior.

### Options considered

1. Keep the current route-local duplication and accept the repeated remote-facade workflow.
2. Introduce one shared plan-route execution recipe plus small route-specific
   request resolvers for import and compile so preview, import, and compile all
   compose the same boundary pattern.
3. Reuse `runCommandRouteExecutor` directly by bending preview, import, and
   compile into its accepted-status runtime shape.

### Selected option and rationale

Option 2. It standardizes the remote-facade workflow without forcing plan
routes into the runtime-command semantics of `runCommandRouteExecutor`. That
keeps route-specific parser and presenter ownership intact while removing the
repeated orchestration.

### Rejected alternatives

- Option 1 was rejected because the duplication is now structural drift, not a
  harmless local convenience.
- Option 3 was rejected because `runCommandRouteExecutor` owns runtime-command
  semantics such as `202 Accepted` and runtime-domain error mapping that do not
  fit preview, import, or compile.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - shared plan-route facade helper(s) under `apps/api/src/entrypoints/http/`
  - `previewPlanRoute.ts`
  - `importPlanRoute.ts`
  - `compilePlanRoute.ts`
  - new import and compile request-resolver seams under `apps/api/src/entrypoints/http/`
  - affected route tests under `apps/api/test/entrypoints/http/`
  - `docs/planning/state/agent-lane-a.yaml`
  - this closeout
- Expected outcome:
  - preview, import, and compile routes compose one shared route-facade
    execution pattern
  - import and compile gain explicit request-resolution seams to match preview's
    structure
  - route-specific parser, contract guard, use-case, and response-mapper
    ownership stays explicit
  - no caller-visible payload, status-code, or authorization-behavior changes
- Risks and mitigations:
  - Risk: response or rejection-precedence drift during seam extraction.
    Mitigation: preserve existing preview/import/compile route tests and add
    focused assertions only where the shared executor introduces an uncovered
    branch.
  - Risk: over-abstraction recreates a new convenience god-helper.
    Mitigation: keep the shared helper limited to orchestration, not parsing,
    contract policy, or response content ownership.
- Out of scope:
  - import ownership semantics (`TF-A1-C13`)
  - compile vocabulary or documentation alignment (`TF-A1-C14`)
  - contract changes under `packages/@dvt/contracts`
- Validation plan:
  - `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/previewPlanRoute.ts apps/api/src/entrypoints/http/importPlanRoute.ts apps/api/src/entrypoints/http/compilePlanRoute.ts apps/api/src/entrypoints/http/previewPlanRouteRequestResolver.ts apps/api/src/entrypoints/http/previewPlanRouteResponseMapper.ts apps/api/src/entrypoints/http/importPlanRouteParser.ts apps/api/src/entrypoints/http/planCompileRouteInputParser.ts apps/api/src/entrypoints/http/planImportResponseMapper.ts apps/api/src/entrypoints/http/planCompileResponseMapper.ts apps/api/src/entrypoints/http/executePlanRouteFacade.ts apps/api/src/entrypoints/http/importPlanRouteRequestResolver.ts apps/api/src/entrypoints/http/compilePlanRouteRequestResolver.ts apps/api/test/entrypoints/http/previewPlanRoute.auth.test.ts apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts apps/api/test/entrypoints/http/previewPlanRoute.outcomes.test.ts apps/api/test/entrypoints/http/importPlanRoute.test.ts apps/api/test/entrypoints/http/compilePlanRoute.test.ts`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter dvt-api test -- test/entrypoints/http/previewPlanRoute.auth.test.ts test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts test/entrypoints/http/previewPlanRoute.outcomes.test.ts test/entrypoints/http/importPlanRoute.test.ts test/entrypoints/http/compilePlanRoute.test.ts`
  - `pnpm --filter dvt-api test:arch`
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - preserve preview auth and input-policy rejections
  - preserve preview accepted, rejected, provenance, and internal-error outcomes
  - preserve import invalid, accepted, and scope-mismatch behavior
  - preserve compile accepted and forbidden-ingress behavior
- Libraries evaluated:
  - None evaluated; this is a repo-local route-boundary standardization slice.

## Implementation Summary

- Added `planRouteRequestResolver` as the shared parse-or-auth resolution seam
  for plan routes. Preview now uses it, and import or compile gained dedicated
  request-resolver modules over the same authorization workflow.
- Added `executePlanRouteFacade` as the shared remote-facade execution recipe
  for resolved plan-route requests. The helper now owns the common orchestration
  pattern: early rejection send, use-case delegation, accepted versus rejected
  response branching, logging, and internal-error projection.
- Reduced `previewPlanRoute`, `importPlanRoute`, and `compilePlanRoute` to
  small wrappers over route-specific resolvers, use-case delegation, and result
  mappers instead of keeping three hand-written copies of the same facade flow.
- Introduced explicit import and compile response-mapper seams so result and
  internal-error projection remain route-owned instead of being pushed into the
  shared executor.
- Preserved all caller-visible status codes and payload shapes. This slice
  standardizes the adapter workflow only; it does not change preview contract
  guarding, import ownership semantics, or compile contract behavior.

## Validation Run

- `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/previewPlanRoute.ts apps/api/src/entrypoints/http/importPlanRoute.ts apps/api/src/entrypoints/http/compilePlanRoute.ts apps/api/src/entrypoints/http/previewPlanRouteRequestResolver.ts apps/api/src/entrypoints/http/previewPlanRouteResponseMapper.ts apps/api/src/entrypoints/http/importPlanRouteParser.ts apps/api/src/entrypoints/http/planCompileRouteInputParser.ts apps/api/src/entrypoints/http/planImportResponseMapper.ts apps/api/src/entrypoints/http/planCompileResponseMapper.ts apps/api/src/entrypoints/http/executePlanRouteFacade.ts apps/api/src/entrypoints/http/planRouteRequestResolver.ts apps/api/src/entrypoints/http/importPlanRouteRequestResolver.ts apps/api/src/entrypoints/http/importPlanRouteResponseMapper.ts apps/api/src/entrypoints/http/compilePlanRouteRequestResolver.ts apps/api/src/entrypoints/http/compilePlanRouteResponseMapper.ts apps/api/test/entrypoints/http/previewPlanRoute.auth.test.ts apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts apps/api/test/entrypoints/http/previewPlanRoute.outcomes.test.ts apps/api/test/entrypoints/http/importPlanRoute.test.ts apps/api/test/entrypoints/http/compilePlanRoute.test.ts`
  - Passed.
- `pnpm --filter dvt-api typecheck`
  - Passed.
- `pnpm --filter dvt-api test -- test/entrypoints/http/previewPlanRoute.auth.test.ts test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts test/entrypoints/http/previewPlanRoute.outcomes.test.ts test/entrypoints/http/importPlanRoute.test.ts test/entrypoints/http/compilePlanRoute.test.ts`
  - Passed.
- `pnpm --filter dvt-api test:arch`
  - Passed.
- `pnpm docs:workboard:generate`
  - Passed.
- `pnpm docs:sync`
  - Passed.
- `pnpm docs:status:generate`
  - Passed.
- `pnpm verify:prepush`
  - Passed.

## No-Debt / No-Stub Evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No stub, placeholder, or fake success path was introduced.
