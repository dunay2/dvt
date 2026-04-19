---
title: Closeout - TF-A1-C9 preview contract guard and scope QA residuals
status: Review
owner: API / Docs
last_reviewed: 2026-04-19
planning_type: closeout
slice: TF-A1-C9-preview-contract-guard-and-scope-qa
---

# Closeout: TF-A1-C9 preview contract guard and scope QA residuals

## Think-First Analysis

### Problem summary

The Fowler QA pass over `TF-A1-C6..C8` and the follow-up route review left
three small residuals visible:

1. `planPreviewContractGuard` still returned HTTP error payloads directly,
   which left transport shape embedded inside a validation seam.
2. `planRouteScope` was only covered transitively through preview/import route
   tests, not through its own focused regression test.
3. `previewPlanRoute` still owned parse/authz/contract-guard/result-mapping
   control flow in one route method, which kept the HTTP facade larger than the
   target Fowler remote-facade posture.

### Root cause

The first route split prioritized remote-facade ownership and eliminated the
largest orchestration hotspots. That left one adapter-local guard returning
transport payloads for convenience, one shared parsing helper covered only
through broader route suites, and one preview facade still carrying too many
edge-stage branches in a single method.

### Governing constraints

- `AGENTS.md`: inventory-first execution, no hidden debt, no stubs, and
  concrete closeout evidence.
- `docs/guides/ai-work-protocol.md`: Slim mode still requires think-first,
  pre-implementation brief, and validation evidence before closure.
- `docs/architecture/reference-architecture.md`: HTTP adapters remain thin and
  explicit; transport mapping stays at the edge.
- `docs/adr/ADR-0003-execution-model.md`: boundary translation semantics remain
  explicit and DVT-owned.
- `docs/adr/ADR-0005-contract-formalization-tooling.md`: validation behavior at
  the route boundary remains deterministic and regression tested.
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a1-c-srp-and-extensibility-hardening-plan-20260414.md`:
  the slice is structural hardening, not a public contract change.

### Options considered

1. Keep the residuals and rely on the existing route tests.
2. Return transport-neutral contract issues from the guard, split preview route
   request authorization and outcome mapping into dedicated helpers, and add a
   focused `planRouteScope` unit test while preserving route behavior.
3. Move preview contract validation into the application use case.

### Selected option and rationale

Option 2. It removes the remaining transport coupling without blurring the
HTTP/application ownership line, restores the preview route to a smaller facade
that delegates edge stages explicitly, and tightens regression coverage at the
shared helper seam that both preview and import rely on.

### Rejected alternatives

- Option 1 was rejected because the residuals are real and already identified;
  leaving them open would just normalize drift.
- Option 3 was rejected because the guard still validates transport-side
  request shape against the public preview contract, which belongs at the HTTP
  boundary, not inside the use case.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `apps/api/src/entrypoints/http/planPreviewContractGuard.ts`
  - `apps/api/src/entrypoints/http/planPreviewContractErrorMapper.ts`
  - `apps/api/src/entrypoints/http/previewPlanRoute.ts`
  - `apps/api/src/entrypoints/http/planRouteScope.ts`
  - `apps/api/test/entrypoints/http/planRouteScope.test.ts`
  - `apps/api/test/entrypoints/http/**`
  - `docs/planning/state/agent-lane-a.yaml`
  - this closeout
- Expected outcome:
  - preview contract validation reports neutral issues instead of HTTP payloads
  - preview route maps those issues into HTTP responses at the edge
  - preview route delegates request authorization and accepted/rejected outcome
    mapping through dedicated helpers
  - `planRouteScope` gains direct narrow regression coverage
  - no response payload changes for callers
- Risks and mitigations:
  - Risk: route error payloads drift while neutralizing the guard.
    Mitigation: preserve existing route expectations through preview route tests.
  - Risk: narrow unit tests diverge from real route fixtures.
    Mitigation: keep the unit tests centered on raw `planRouteScope` inputs and
    explicit expected parse issues.
- Out of scope:
  - import or compile route behavior changes
  - preview use-case behavior changes
  - shared contract/schema changes in `@dvt/contracts`
- Validation plan:
  - `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/planPreviewContractGuard.ts apps/api/src/entrypoints/http/planPreviewContractErrorMapper.ts apps/api/src/entrypoints/http/previewPlanRoute.ts apps/api/src/entrypoints/http/planRouteScope.ts apps/api/test/entrypoints/http/planRouteScope.test.ts apps/api/test/entrypoints/http/previewPlanRoute.auth.test.ts apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts apps/api/test/entrypoints/http/previewPlanRoute.outcomes.test.ts apps/api/test/entrypoints/http/importPlanRoute.test.ts`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter dvt-api test -- test/entrypoints/http/planRouteScope.test.ts test/entrypoints/http/importPlanRoute.test.ts test/entrypoints/http/previewPlanRoute.auth.test.ts test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts test/entrypoints/http/previewPlanRoute.outcomes.test.ts`
  - `pnpm --filter dvt-api test:arch`
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - preserve preview contract rejection payloads
  - preserve preview/internal error outcomes
  - add narrow missing-context and valid-context coverage for `planRouteScope`
  - add malformed-context coverage for `planRouteScope`
- Libraries evaluated:
  - None evaluated; this is a repo-local adapter-boundary correction.

## Validation Run

- `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/planPreviewContractGuard.ts apps/api/src/entrypoints/http/planPreviewContractErrorMapper.ts apps/api/src/entrypoints/http/previewPlanRoute.ts apps/api/src/entrypoints/http/planRouteScope.ts apps/api/test/entrypoints/http/planRouteScope.test.ts apps/api/test/entrypoints/http/importPlanRoute.test.ts apps/api/test/entrypoints/http/previewPlanRoute.auth.test.ts apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts apps/api/test/entrypoints/http/previewPlanRoute.outcomes.test.ts` - passed.
- `pnpm --filter dvt-api typecheck` - passed.
- `pnpm --filter dvt-api test -- test/entrypoints/http/planRouteScope.test.ts test/entrypoints/http/importPlanRoute.test.ts test/entrypoints/http/previewPlanRoute.auth.test.ts test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts test/entrypoints/http/previewPlanRoute.outcomes.test.ts` - passed.
- `pnpm --filter dvt-api test:arch` - passed.
- Initial lint run in this slice failed on import ordering after the new
  mapper seam was introduced; the import order was corrected in the same slice
  and the final lint baseline above passed.
- `pnpm docs:workboard:generate` - passed.
- `pnpm docs:sync` - passed.
- `pnpm docs:status:generate` - passed.
- `pnpm verify:prepush` - passed.

## No-Debt / No-Stub Evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No stub, placeholder, or fake success path was introduced.
