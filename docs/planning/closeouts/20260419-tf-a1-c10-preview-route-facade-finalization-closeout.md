---
title: Closeout - TF-A1-C10 preview route facade finalization
status: Review
owner: API / Docs
last_reviewed: 2026-04-19
planning_type: closeout
slice: TF-A1-C10-preview-route-facade-finalization
---

# Closeout: TF-A1-C10 preview route facade finalization

## Think-First Analysis

### Problem summary

`TF-A1-C6..C9` removed the largest preview-route orchestration drift, but the
preview HTTP adapter still has two residual concentrations:

1. `previewPlanRoute` still coordinates parsing failure mapping, scope
   authorization, preview-contract guarding, use-case result branching, and
   reply shaping inside one facade-local module.
2. `previewPlanRouteParser` still owns multiple edge-policy and command-binding
   stages even after the prior helper split.

### Root cause

The previous slices optimized for fast removal of the route-local application
service behavior first. That left one last remote-facade helper performing
multiple edge-stage decisions and one parser file still aggregating policy,
command-input parsing, and request binding for convenience.

### Governing constraints

- `AGENTS.md`: inventory-first execution, no hidden debt, no stubs, and
  concrete validation evidence.
- `docs/guides/ai-work-protocol.md`: Slim mode requires think-first,
  pre-implementation brief, and validation-backed closeout before closure.
- `docs/architecture/reference-architecture.md`: HTTP entrypoints remain thin
  adapters over explicit application services and mappers.
- `ADR-0003`: DVT keeps execution semantics explicit at the owned boundary.
- `ADR-0005`: route validation and boundary translation remain deterministic and
  regression tested.
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a1-c-srp-and-extensibility-hardening-plan-20260414.md`:
  this is structural SRP/Fowler hardening, not a public API change.

### Options considered

1. Keep the current split and accept the residual facade/parser concentration.
2. Extract dedicated request-resolution and response-mapping seams from the
   route, and reduce the parser to orchestration over smaller policy and
   command-binding helpers.
3. Push more HTTP-boundary logic into `PreviewPlanUseCase`.

### Selected option and rationale

Option 2. It moves the remaining adapter concerns into explicit seams without
smearing transport policy into the application service. That keeps the route
closer to a Fowler remote facade and keeps DDD ownership lines intact.

### Rejected alternatives

- Option 1 was rejected because the residual concentration is real and already
  called out in review.
- Option 3 was rejected because auth/authz, transport parsing, and preview
  contract guarding still belong to the HTTP adapter boundary, not the use case.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `apps/api/src/entrypoints/http/previewPlanRoute.ts`
  - `apps/api/src/entrypoints/http/previewPlanRouteParser.ts`
  - new preview-route request/response seam files under
    `apps/api/src/entrypoints/http/`
  - `apps/api/test/entrypoints/http/previewPlanRoute*.test.ts`
  - `docs/planning/state/agent-lane-a.yaml`
  - this closeout
- Expected outcome:
  - `previewPlanRoute` becomes a smaller facade over request resolution, use
    case delegation, and final send operations
  - preview request resolution moves into an explicit helper seam
  - preview result and internal-error mapping move into an explicit response
    mapper seam
  - `previewPlanRouteParser` delegates route-policy parsing, command-input
    parsing, and request binding through dedicated helpers
  - no caller-visible payload changes
- Risks and mitigations:
  - Risk: response payload drift while moving route presentation logic.
    Mitigation: keep the existing preview route auth, input-policy, and outcome
    tests green.
  - Risk: parser split changes rejection precedence.
    Mitigation: preserve current negative-path expectations through existing
    input-policy tests and focused helper boundaries.
- Out of scope:
  - `PreviewPlanUseCase` behavior changes
  - import-route changes
  - shared contract changes in `@dvt/contracts`
- Validation plan:
  - `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/previewPlanRoute.ts apps/api/src/entrypoints/http/previewPlanRouteParser.ts apps/api/src/entrypoints/http/previewPlanRouteRequestResolver.ts apps/api/src/entrypoints/http/previewPlanRouteResponseMapper.ts apps/api/src/entrypoints/http/previewPlanRoutePolicyParser.ts apps/api/src/entrypoints/http/previewPlanRouteCommandParser.ts apps/api/src/entrypoints/http/previewPlanRouteRequestBinder.ts apps/api/test/entrypoints/http/previewPlanRoute.auth.test.ts apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts apps/api/test/entrypoints/http/previewPlanRoute.outcomes.test.ts`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter dvt-api test -- test/entrypoints/http/previewPlanRoute.auth.test.ts test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts test/entrypoints/http/previewPlanRoute.outcomes.test.ts`
  - `pnpm --filter dvt-api test:arch`
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - preserve auth rejection behavior
  - preserve input-policy rejection behavior and payloads
  - preserve accepted, rejected, provenance, and internal-error outcomes
  - add focused tests only if the seam extraction creates an uncovered branch
- Libraries evaluated:
  - None evaluated; this is a repo-local adapter decomposition slice.

## Implementation Summary

- `previewPlanRoute` now delegates request resolution to
  `previewPlanRouteRequestResolver` and result/internal-error projection to
  `previewPlanRouteResponseMapper`, leaving the facade responsible only for
  delegation, logging, and the final send operation.
- `previewPlanRouteParser` now acts as a thin orchestrator over
  `previewPlanRoutePolicyParser`, `previewPlanRouteCommandParser`, and
  `previewPlanRouteRequestBinder`.
- Caller-visible preview payloads and rejection semantics remain unchanged; the
  existing auth, input-policy, and outcomes route tests stayed green.

## Validation Run

- `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/previewPlanRoute.ts apps/api/src/entrypoints/http/previewPlanRouteParser.ts apps/api/src/entrypoints/http/previewPlanRouteRequestResolver.ts apps/api/src/entrypoints/http/previewPlanRouteResponseMapper.ts apps/api/src/entrypoints/http/previewPlanRoutePolicyParser.ts apps/api/src/entrypoints/http/previewPlanRouteCommandParser.ts apps/api/src/entrypoints/http/previewPlanRouteRequestBinder.ts apps/api/test/entrypoints/http/previewPlanRoute.auth.test.ts apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts apps/api/test/entrypoints/http/previewPlanRoute.outcomes.test.ts` - passed.
- `pnpm --filter dvt-api typecheck` - passed.
- `pnpm --filter dvt-api test -- test/entrypoints/http/previewPlanRoute.auth.test.ts test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts test/entrypoints/http/previewPlanRoute.outcomes.test.ts` - passed.
- `pnpm --filter dvt-api test:arch` - passed.
- Initial lint run in this slice failed on import ordering and stale unused type
  imports after the seam extraction; those mechanical issues were corrected in
  the same slice and the final lint baseline above passed.
- `pnpm docs:workboard:generate` - passed.
- `pnpm docs:sync` - passed.
- `pnpm docs:status:generate` - passed.
- `pnpm verify:prepush` - passed.

## No-Debt / No-Stub Evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No stub, placeholder, or fake success path was introduced.
