---
title: Closeout - TF-A1-C6 preview route facade realignment
status: Review
owner: API / Docs
last_reviewed: 2026-04-19
planning_type: closeout
slice: TF-A1-C6-preview-route-facade-realignment
---

# Closeout: TF-A1-C6 preview route facade realignment

## Think-First Analysis

### Problem summary

`TF-A1-C5` split preview helpers out of `planRoutes.ts`, but the shipped
`previewPlanRoute` still behaves like an application service. It parses several
independent concerns, assembles the canonical planner envelope, persists the
plan, validates executability, and leaks contract-validation prose through the
HTTP boundary.

### Root cause

The helper split improved file-level decomposition, but the ownership line
stopped halfway. The route kept orchestration responsibility and still depended
on `startRun`-named parser helpers, so the HTTP entrypoint remained a
coordination hotspot instead of a Fowler-style remote facade over an
application service.

### Governing constraints

- `AGENTS.md`: inventory-first startup, no hidden debt, no stubs, and required
  validation evidence.
- `docs/guides/ai-work-protocol.md`: think-first, implementation brief, and
  closeout before declaring the slice complete.
- `docs/architecture/reference-architecture.md`: hexagonal ownership means the
  HTTP adapter must delegate domain/application work behind explicit ports or
  services.
- `docs/adr/ADR-0003-execution-model.md`: DVT owns semantics and adapter
  translation boundaries stay explicit.
- `docs/adr/ADR-0005-contract-formalization-tooling.md`: request validation
  stays contract-backed and deterministic at runtime boundaries.
- `docs/adr/ADR-0012-plan-integrity-ownership.md`: the application boundary
  must keep plan derivation, persistence, and verification ownership explicit
  and fail closed before downstream execution.
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a1-c-srp-and-extensibility-hardening-plan-20260414.md`:
  preview-route responsibilities must stay split into transport, policy,
  binding, and projection seams.

### Options considered

1. Keep `previewPlanRoute` as the orchestrator and only trim a few branches.
2. Move preview orchestration into a dedicated application service and add a
   route-specific parser seam.
3. Merge preview into the new compile-only application service family.

### Selected option and rationale

Option 2. It fixes the actual architectural drift without changing the public
preview contract. The route becomes a thin adapter again, and the preview
workflow gains a dedicated seam that matches the existing compile-only
direction.

### Rejected alternatives

- Option 1 was rejected because it only moves code around inside the route and
  keeps the ownership violation.
- Option 3 was rejected because compile-only and preview-persist have different
  lifecycle semantics; sharing the same use case would blur a boundary that
  `MW-D1` intentionally separated.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `apps/api/src/application/services/**`
  - `apps/api/src/entrypoints/http/**`
  - `apps/api/test/entrypoints/http/**`
  - `docs/planning/state/agent-lane-a.yaml`
  - this closeout
- Expected outcome:
  - preview route becomes transport/auth/delegation only
  - preview orchestration lives behind a dedicated application service
  - preview request parsing has a dedicated seam instead of route-local
    composition
  - preview contract failures stop depending on route-coupled prose strings
- Risks and mitigations:
  - Risk: refactor changes preview failure semantics.
    Mitigation: keep the same status/reason behavior and cover auth, input, and
    outcome tests.
  - Risk: helper extraction reintroduces drift with existing route parsers.
    Mitigation: keep one dedicated preview parser as the single entry seam and
    reuse only the lower-level validated primitives it needs.
- Out of scope:
  - import-route decomposition into its own application service
  - compile boundary changes
  - contract-schema message changes inside `@dvt/contracts`
- Validation plan:
  - `pnpm exec eslint --max-warnings 0` on touched API source/test/docs files
  - `pnpm --filter dvt-api test -- test/entrypoints/http/previewPlanRoute.auth.test.ts test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts test/entrypoints/http/previewPlanRoute.outcomes.test.ts`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - preserve auth failure behavior
  - preserve route parse failures
  - preserve valid preview and rejected-preview outcomes
  - add or update expectations for stable preview contract failure details
- Libraries evaluated:
  - None evaluated; this is a boundary refactor inside the existing stack.

## Implementation Summary

1. Added `PreviewPlanUseCase` so planner build, plan persistence, and
   executability validation no longer live in the HTTP adapter.
2. Added `previewPlanRouteParser` so preview transport parsing has its own seam
   instead of route-local composition of several helper calls.
3. Moved `previewPlanRoute` into its own entrypoint module and cut it over to
   transport/auth/delegation/response responsibilities only.
4. Reworked `planPreviewContractGuard` to return stable structured details
   (`cause`, `previewProfile`, `requiredArtifacts` or issue `path`/`code`)
   instead of route-coupled prose.
5. Consolidated preview-route test dependencies into
   `previewPlanRouteTestSupport.ts` so the split auth/input/outcome suites stop
   duplicating the same fixture wiring.

## DDD / Fowler / SRP outcome

What was corrected:

- the preview HTTP boundary is now a remote facade instead of an orchestration
  hotspot
- preview build/store/validate flow now sits in an application service with one
  reason to change
- route parsing has an explicit entry seam instead of being interleaved with
  auth and planner work
- contract-failure details are now stable and machine-oriented enough for tests
  and clients to depend on structure instead of prose

Residual drift that remains but is not left hidden:

- `importPlanRoute` still lives in `planRoutes.ts`; this slice only corrected
  the preview half because that was the active SRP/Fowler failure
- lower-level preview parsing still reuses a few generic helpers that are named
  after `startRun`; the route itself is no longer coupled to those names

## Validation Run

- `pnpm exec eslint --max-warnings 0 apps/api/src/application/services/PreviewPlanUseCase.ts apps/api/src/entrypoints/http/previewPlanRoute.ts apps/api/src/entrypoints/http/previewPlanRouteParser.ts apps/api/src/entrypoints/http/planPreviewContractGuard.ts apps/api/src/entrypoints/http/planRoutes.ts apps/api/src/app.ts apps/api/test/entrypoints/http/previewPlanRoute.auth.test.ts apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts apps/api/test/entrypoints/http/previewPlanRoute.outcomes.test.ts apps/api/test/entrypoints/http/previewPlanRouteTestSupport.ts` - PASS
- `pnpm --filter dvt-api typecheck` - PASS
- `pnpm --filter dvt-api test -- test/entrypoints/http/previewPlanRoute.auth.test.ts test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts test/entrypoints/http/previewPlanRoute.outcomes.test.ts` - PASS
- `pnpm --filter dvt-api test:arch` - PASS
- `pnpm docs:workboard:generate` - PASS
- `pnpm docs:sync` - PASS
- `pnpm docs:status:generate` - PASS
- `pnpm verify:prepush` - PASS

## No-Debt / No-Stub Evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No stub, placeholder, or fake success path was introduced.
- No public preview capability was backfilled through legacy compatibility
  aliases.
