---
title: Closeout - TF-A1-C19 plan-route policy catalog and envelope convergence
status: Review
owner: API / Docs
last_reviewed: 2026-04-20
planning_type: closeout
slice: TF-A1-C19-plan-route-policy-catalog-and-envelope-convergence
---

# Closeout: TF-A1-C19 plan-route policy catalog and envelope convergence

## Think-First Analysis

### Problem summary

The `plan-*` family is materially cleaner after `TF-A1-C15..TF-A1-C18`, but
two lower-order drift surfaces remain:

- compile still splits its route authorization metadata from its planner-input
  enrichment rules
- preview and compile still assemble the canonical planner envelope through
  separate service-layer seams
- coverage still emphasizes outcomes more than explicit policy posture

That leaves the branch improved but not yet as explicit as a mature controller
or service family where route policy and planner-ingress ownership are declared
and tested as first-class data.

### Root cause

The prior slices correctly attacked the largest seam problems first:

- preview observability ownership
- route authorization metadata
- declarative request-resolution workflow
- compile-boundary composition ownership

That sequence left one final maturity gap:

- authorization action metadata lives in one catalog
- compile planner-input enrichment still lives in compile-specific mapping code
- preview planner-input enrichment still relies on a separate application seam
- tests do not yet freeze the route-family policy matrix directly

The result is not broken behavior, but a residual architecture tax: the policy
story is still distributed across constants, service helpers, and behavioral
tests instead of being frozen in one declarative catalog plus one canonical
planner-input seam.

### Governing constraints

- `AGENTS.md`: inventory-first startup, docs-first for behavior and architecture
  changes, no hidden debt, no retro-compatibility shim by default, and
  validation-backed completion
- `docs/guides/ai-work-protocol.md`: think-first analysis, pre-implementation
  brief, and validation plus closeout before the slice can be treated as done
- `docs/architecture/reference-architecture.md`: explicit boundaries and
  replaceable infrastructure, not convenience rewiring
- `docs/adr/ADR-0012-plan-integrity-ownership.md`: canonical plan ownership
  must remain explicit and not drift into telemetry
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`:
  one clear owner per boundary responsibility
- `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`: planner
  ingress must stay typed, fail-closed, and traceable
- `docs/guides/plan-compile-target-architecture-technical-manual-20260417.md`:
  compile uses one planner model and one governed ingress envelope seam
- `docs/planning/reviews/architecture-and-governance/20260419-plan-route-boundary-remediation-review.md`:
  the remaining maturity work after `TF-A1-C18` is lower-order hardening, not
  reopening the already-closed major seams

### Options considered

1. Keep the current split and add more outcome tests.

Rejected because it would validate behavior while leaving route policy and
planner-input ownership implicit.

1. Move compile-specific metadata into `planCompileBoundary.ts`.

Rejected because route authorization policy belongs to the plan-route family
seam, not to the composition-root compile planner boundary.

1. Introduce one route-family policy catalog plus one canonical
   planner-input helper shared by preview and compile.

Selected because it keeps route policy declarative, keeps application-layer
planner ingress in one seam, and adds a natural place for matrix-style
regression coverage.

### Selected correction

Create one declarative plan-route policy catalog that records:

- route authorization action metadata
- whether the route builds planner input
- how planner-input ownership and request metadata are enriched

Then converge preview and compile onto one application helper that assembles
the canonical planner envelope from:

- planner-bound request data
- the authorized execution context
- the selected route policy

Finally, add policy-matrix tests that freeze the route-family posture directly,
not only through route outcomes.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - `apps/api/src/application/services/`
  - `apps/api/src/entrypoints/http/`
  - `apps/api/test/application/services/`
  - `apps/api/test/entrypoints/http/`
  - `docs/architecture/components/api/index.md`
  - `docs/guides/plan-compile-target-architecture-technical-manual-20260417.md`
  - `docs/planning/state/agent-lane-a.yaml`
  - `docs/planning/reviews/review-status-board.md`
  - `docs/planning/reviews/architecture-and-governance/20260419-plan-route-boundary-remediation-review.md`
  - this closeout
- Expected outcome:
  - plan-route authorization and planner-input policy are declared in one
    catalog
  - preview and compile use one canonical planner-input assembly seam
  - import uses one canonical ownership value rather than split route fields
  - tests freeze route-family policy posture explicitly
- Risks and mitigations:
  - Risk: the new catalog becomes another indirection layer without real
    ownership value.
    Mitigation: use it directly from both request resolvers and planner-input
    assembly, not only from docs or tests.
  - Risk: preview behavior drifts while removing route-local ownership fields.
    Mitigation: preserve the existing route outcomes and add helper-level matrix
    coverage around authorized planner-input assembly.
  - Risk: compile still hides policy in ad hoc helper code.
    Mitigation: delete the compile-specific mapper once the shared helper is in
    place.
  - Risk: planning/docs remain one slice behind the code.
    Mitigation: update the active review, API component page, and target manual
    in the same task.
- Out of scope:
  - changing public compile, preview, or import payloads
  - adding plugin runtime loading to the compile boundary
  - changing planner or executability semantics
  - broad start-run planner-input convergence outside the `plan-*` family
- Validation plan:
  - `pnpm exec eslint --max-warnings 0 <touched api source and test files>`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter dvt-api test -- <targeted suites>`
  - `pnpm docs:status:generate`
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm exec markdownlint-cli2 <touched docs>`
  - `pnpm verify:prepush`
- Test coverage plan:
  - matrix coverage for preview/import/compile route policy declarations
  - helper coverage proving preview and compile derive ownership from the
    authorized scope and preserve observability payloads
  - route and use-case regression coverage proving caller-visible behavior does
    not change
- Libraries evaluated:
  - None evaluated. This is a local architecture-hardening slice over existing
    governed seams.

## Implementation Summary

- Added `apps/api/src/application/services/planRoutePolicyCatalog.ts` as the
  declarative owner of route-family authorization and planner-input policy for
  preview, import, and compile.
- Added `apps/api/src/application/services/resolveAuthorizedPlannerInputEnvelope.ts`
  and rewired `PreviewPlanUseCase` plus `CompilePlanUseCase` to assemble
  canonical planner input through one shared authorized seam.
- Simplified `PreviewPlanCommand` and `ImportPlanCommand` so preview no longer
  carries redundant route-scope ownership fields and import now compares one
  canonical ownership value.
- Deleted `planCompilePlannerEnvelopeMapper.ts` and
  `planRouteAuthorization.constants.ts` instead of leaving compatibility
  wrappers behind.
- Updated the plan-route HTTP test harness so authorized route tests provide
  the real scope shape consumed by the new planner-input seam.
- Updated the active API component page, the plan-compile target manual, the
  plan-route remediation review, the review board, and Lane A so living docs
  describe the shipped ownership model.

## Validation Run

- `pnpm exec eslint --max-warnings 0 apps/api/src/application/services/planRoutePolicyCatalog.ts apps/api/src/application/services/resolveAuthorizedPlannerInputEnvelope.ts apps/api/src/application/services/PreviewPlanUseCase.ts apps/api/src/application/services/CompilePlanUseCase.ts apps/api/src/application/services/ImportPlanUseCase.ts apps/api/src/entrypoints/http/previewPlanRouteRequestResolver.ts apps/api/src/entrypoints/http/importPlanRouteRequestResolver.ts apps/api/src/entrypoints/http/compilePlanRouteRequestResolver.ts apps/api/src/entrypoints/http/previewPlanRouteRequestBinder.ts apps/api/src/entrypoints/http/importPlanRouteParser.ts apps/api/test/application/services/planRoutePolicyCatalog.test.ts apps/api/test/application/services/CompilePlanUseCase.test.ts apps/api/test/entrypoints/http/previewPlanRoute.outcomes.test.ts apps/api/test/entrypoints/http/importPlanRoute.test.ts apps/api/test/entrypoints/http/planRouteRequestResolver.test.ts apps/api/test/entrypoints/http/planRouteHttpTestSupport.ts`
  - Passed.
- `pnpm --filter dvt-api typecheck`
  - Passed.
- `pnpm --filter dvt-api test -- test/application/services/planRoutePolicyCatalog.test.ts test/application/services/CompilePlanUseCase.test.ts test/entrypoints/http/previewPlanRoute.outcomes.test.ts test/entrypoints/http/importPlanRoute.test.ts test/entrypoints/http/planRouteRequestResolver.test.ts`
  - Failed on the first run because `okAuthDeps()` in
    `apps/api/test/entrypoints/http/planRouteHttpTestSupport.ts` did not
    provide authorized `scope`; preview route tests returned `500`.
  - Passed after updating the shared auth test support to return the real scope
    shape.
- `pnpm --filter dvt-api test`
  - Passed.
- `pnpm docs:status:generate`
  - Passed.
- `pnpm docs:workboard:generate`
  - Passed.
- `pnpm docs:sync`
  - Passed.
- `pnpm exec markdownlint-cli2 docs/architecture/components/api/index.md docs/guides/plan-compile-target-architecture-technical-manual-20260417.md docs/planning/reviews/architecture-and-governance/20260419-plan-route-boundary-remediation-review.md docs/planning/reviews/review-status-board.md docs/planning/closeouts/20260420-tf-a1-c19-plan-route-policy-catalog-and-envelope-convergence-closeout.md docs/planning/state/agent-lane-a.md docs/planning/state/open-task-route.md docs/planning/state/execution-workboard.md docs/planning/status/generated-code-state.md --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc`
  - Passed.
- `pnpm verify:prepush`
  - Passed.

## No-Debt / No-Stub Evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No compatibility shim or alias wrapper was left behind for the removed
  compile mapper or the old plan-route authorization constant file.
- No stub, placeholder, fake implementation, or unfinished branch was
  introduced.
