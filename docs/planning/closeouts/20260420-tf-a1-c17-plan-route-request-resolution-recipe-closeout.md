---
title: Closeout - TF-A1-C17 plan-route request-resolution recipe
status: Review
owner: API / Docs
last_reviewed: 2026-04-20
planning_type: closeout
slice: TF-A1-C17-plan-route-request-resolution-recipe
---

# Closeout: TF-A1-C17 plan-route request-resolution recipe

## Think-First Analysis

### Problem summary

The `plan-*` route family already shares the same lifecycle:

- parse request
- authorize scope
- apply route-local guard if needed
- hand over to the route facade

But preview, import, and compile still express that recipe through three
wrapper modules that manually stitch together the same workflow with small
parameter differences.

That is not a functional defect, but it is the next maturity gap between the
current code and a more disciplined controller architecture.

### Root cause

The branch first standardized the shared executor and then fixed the two higher
risk ownership problems: preview enrichment and authorization metadata.

After those fixes, the remaining duplication is mostly recipe glue:

- parser function
- scope selector
- action metadata
- optional post-authorization contract guard

Those concerns are already declarative in practice, but not yet encoded as one
shared route-family builder.

### Governing constraints

- `AGENTS.md`: inventory-first execution, no hidden debt, no stub policy, and
  validation-backed completion
- `docs/guides/ai-work-protocol.md`: think-first analysis, pre-implementation
  brief, and governed closeout for architectural slices
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`:
  reusable seams should keep workflow centralized and route-local policy
  explicit
- `docs/adr/ADR-0012-plan-integrity-ownership.md`: request-boundary authority
  and route-family policy must stay explicit and auditable
- `docs/planning/reviews/architecture-and-governance/20260419-plan-route-boundary-remediation-review.md`:
  the family should keep converging toward a mature remote-facade recipe

### Selected correction

Create one shared request-resolution builder for the protected `plan-*` family.
That builder should accept:

- the route parser
- the authorization action metadata
- the scope selector
- an optional post-authorization guard

Preview, import, and compile should then become route-local declarations over
that builder instead of bespoke wrappers.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - `apps/api/src/entrypoints/http/planRouteRequestResolver.ts`
  - `apps/api/src/entrypoints/http/previewPlanRouteRequestResolver.ts`
  - `apps/api/src/entrypoints/http/importPlanRouteRequestResolver.ts`
  - `apps/api/src/entrypoints/http/compilePlanRouteRequestResolver.ts`
  - `apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts`
  - `docs/planning/state/agent-lane-a.yaml`
  - `docs/planning/reviews/review-status-board.md`
  - `docs/planning/reviews/architecture-and-governance/20260419-plan-route-boundary-remediation-review.md`
  - this closeout
- Expected outcome:
  - one shared builder owns the request-resolution recipe for `plan-*`
  - preview/import/compile wrappers become declarative route-family
    definitions
  - preview still supports its extra contract guard without forking the recipe
- Risks and mitigations:
  - Risk: generic resolver abstraction hides route-local semantics again.
    Mitigation: keep action metadata and optional guard declared at the route
    wrapper seam.
  - Risk: the preview guard is forced into an awkward generic contract.
    Mitigation: model the guard as an explicit optional hook over an already
    authorized request.
  - Risk: type complexity outweighs the architectural gain.
    Mitigation: keep the abstraction local to the `plan-*` family and avoid
    introducing new cross-domain framework layers.
- Out of scope:
  - changing route HTTP result mapping
  - changing the shared facade executor
  - broader compile catalog or planner-boundary refactors
- Validation plan:
  - `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/planRouteRequestResolver.ts apps/api/src/entrypoints/http/previewPlanRouteRequestResolver.ts apps/api/src/entrypoints/http/importPlanRouteRequestResolver.ts apps/api/src/entrypoints/http/compilePlanRouteRequestResolver.ts apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter dvt-api test -- test/entrypoints/http/planRouteRequestResolver.test.ts test/entrypoints/http/previewPlanRoute.auth.test.ts test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts test/entrypoints/http/previewPlanRoute.outcomes.test.ts test/entrypoints/http/importPlanRoute.test.ts test/entrypoints/http/compilePlanRoute.test.ts`
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm exec markdownlint-cli2 docs/planning/reviews/architecture-and-governance/20260419-plan-route-boundary-remediation-review.md docs/planning/reviews/review-status-board.md docs/planning/closeouts/20260420-tf-a1-c17-plan-route-request-resolution-recipe-closeout.md --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc`
  - `pnpm verify:prepush`
- Test coverage plan:
  - parse failures still short-circuit before auth
  - route wrappers still authorize the action they declare
  - the declarative builder supports an optional post-authorization guard and
    returns its HTTP response unchanged
- Libraries evaluated:
  - None evaluated. This is a local route-family abstraction, not a new
    external dependency decision.

## Implementation Summary

- Added a shared `createAuthorizedPlanRouteRequestResolver` builder in
  `planRouteRequestResolver.ts` so the route-family request-resolution workflow
  has one owner.
- Reworked preview/import/compile request resolvers into route-local
  declarations over that builder. Each resolver now supplies only the parser,
  authorization action metadata, requested-scope selector, and optional guard.
- Kept the preview-only contract validation as an explicit post-authorization
  guard hook so the abstraction centralizes workflow without hiding route-local
  policy.
- Extended resolver tests to prove the declarative builder supports an
  optional guard and preserves its HTTP response unchanged.
- Updated the active architecture review, API component page, review board, and
  lane state so the maturity improvement is reflected in living docs.

## Validation Run

- `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/planRouteRequestResolver.ts apps/api/src/entrypoints/http/previewPlanRouteRequestResolver.ts apps/api/src/entrypoints/http/importPlanRouteRequestResolver.ts apps/api/src/entrypoints/http/compilePlanRouteRequestResolver.ts apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts`
  - Passed.
- `pnpm --filter dvt-api typecheck`
  - Passed.
- `pnpm --filter dvt-api test -- test/entrypoints/http/planRouteRequestResolver.test.ts test/entrypoints/http/previewPlanRoute.auth.test.ts test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts test/entrypoints/http/previewPlanRoute.outcomes.test.ts test/entrypoints/http/importPlanRoute.test.ts test/entrypoints/http/compilePlanRoute.test.ts`
  - Passed.
- `pnpm docs:workboard:generate`
  - Passed.
- `pnpm docs:sync`
  - Passed.
- `pnpm exec markdownlint-cli2 docs/architecture/components/api/index.md docs/planning/reviews/architecture-and-governance/20260419-plan-route-boundary-remediation-review.md docs/planning/reviews/review-status-board.md docs/planning/closeouts/20260420-tf-a1-c15-c16-plan-route-seam-hardening-closeout.md docs/planning/closeouts/20260420-tf-a1-c17-plan-route-request-resolution-recipe-closeout.md docs/planning/state/open-task-route.md docs/planning/state/execution-workboard.md docs/planning/state/agent-lane-a.md --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc`
  - Passed.
- `pnpm verify:prepush`
  - Passed.

## No-Debt / No-Stub Evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No stub, placeholder, or fake success path was introduced.
- The new builder stays local to the `plan-*` family and centralizes workflow
  only; route-local policy remains declared at the wrapper seam.
