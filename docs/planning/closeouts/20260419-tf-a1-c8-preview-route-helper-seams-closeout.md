---
title: Closeout - TF-A1-C8 preview route helper seam split
status: Review
owner: API / Docs
last_reviewed: 2026-04-19
planning_type: closeout
slice: TF-A1-C8-preview-route-helper-seam-split
---

# Closeout: TF-A1-C8 preview route helper seam split

## Think-First Analysis

### Problem summary

`TF-A1-C6` and `TF-A1-C7` turned preview and import into thin remote facades,
but two helper seams still carried residual orchestration drift:

1. `previewPlanRouteParser` concentrated several unrelated stages inside
   `parsePreviewPlanBody`.
2. `planRouteScope` mixed raw-context validation, contract parsing, and scope
   mapping in one exported function.

### Root cause

The earlier split corrected route-level ownership first, which was the larger
drift. That left the helper layer with legitimate boundaries but overly broad
entrypoint functions. The result was local orchestration hotspots inside
modules that should only coordinate smaller parsing seams.

### Governing constraints

- `AGENTS.md`: inventory-first execution, no hidden debt, and concrete
  validation evidence.
- `docs/guides/ai-work-protocol.md`: slim-mode refactor still needs think-first,
  implementation brief, closeout, and validation.
- `docs/architecture/reference-architecture.md`: HTTP-adapter seams stay thin
  and explicit.
- `docs/adr/ADR-0003-execution-model.md`: DVT-owned translation semantics stay
  explicit at the boundary.
- `docs/adr/ADR-0005-contract-formalization-tooling.md`: parser behavior stays
  deterministic and contract-backed.
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a1-c-srp-and-extensibility-hardening-plan-20260414.md`:
  preview-route hardening is about structural ownership, not semantic change.

### Options considered

1. Keep `parsePreviewPlanBody` intact and ignore the complexity warning.
2. Split the existing helpers into dedicated stages for route policy,
   planner-backed source parsing, command assembly, raw context validation, and
   scope mapping while preserving the current exported seams.
3. Move preview and scope parsing into multiple new files immediately.

### Selected option and rationale

Option 2. It closes the local SRP drift without reopening boundary churn. The
routes still import one preview parser seam and one shared route-context seam,
but those helpers no longer accumulate every validation and assembly branch in
one function.

### Rejected alternatives

- Option 1 was rejected because the warning points at a real ownership smell,
  not just style.
- Option 3 was rejected because the current issue is function-level drift, not
  file-count scarcity; another file split would add churn without changing the
  dependency shape.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `apps/api/src/entrypoints/http/previewPlanRouteParser.ts`
  - `apps/api/src/entrypoints/http/planRouteScope.ts`
  - `docs/planning/state/agent-lane-a.yaml`
  - this closeout
- Expected outcome:
  - `parsePreviewPlanBody` becomes a thin parser entrypoint
  - `parsePlanRouteContextRecord` becomes a thin shared context seam
  - route policy parsing is isolated from planner-envelope parsing
  - raw context validation is isolated from scope derivation
  - command/request assembly is explicit and pure
  - preview route behavior stays unchanged
- Risks and mitigations:
  - Risk: helper extraction changes invalid-input behavior.
    Mitigation: keep existing lower-level parser helpers and validate through
    the current preview-route suites.
  - Risk: builder helpers mutate readonly command shapes.
    Mitigation: keep assembly immutable and return typed object literals.
- Out of scope:
  - preview route auth changes
  - preview use-case behavior changes
  - import or compile boundary changes
- Validation plan:
  - `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/previewPlanRouteParser.ts apps/api/src/entrypoints/http/planRouteScope.ts apps/api/src/entrypoints/http/previewPlanRoute.ts apps/api/test/entrypoints/http/importPlanRoute.test.ts apps/api/test/entrypoints/http/previewPlanRoute.auth.test.ts apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts apps/api/test/entrypoints/http/previewPlanRoute.outcomes.test.ts`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter dvt-api test -- test/entrypoints/http/importPlanRoute.test.ts test/entrypoints/http/previewPlanRoute.auth.test.ts test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts test/entrypoints/http/previewPlanRoute.outcomes.test.ts`
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - preserve invalid input failures
  - preserve preview contract failure details
  - preserve accepted and rejected preview outcomes
- Libraries evaluated:
  - None evaluated; this is a repo-local parser decomposition.

## Implementation Summary

1. Split route-policy parsing into `parsePreviewRoutePolicy`.
2. Split planner-backed selection, planner-envelope extraction, and provenance
   parsing into dedicated helpers behind `parsePreviewCommandInput`.
3. Split immutable request and command assembly into pure builder helpers so the
   exported preview parser no longer mixes validation and output construction in
   one branch-heavy function.
4. Split `planRouteScope` into raw context validation plus scope derivation so
   preview/import route helpers share a smaller context seam.

## DDD / Fowler / SRP outcome

What was corrected:

- the preview parser remains one boundary seam, but it no longer owns every
  stage internally
- the shared plan-route context parser remains one helper seam, but it no
  longer mixes raw context validation with scope mapping
- route policy, planner-backed input policy, and command assembly now have one
  reason to change each
- preview route behavior remains delegated through one parser entrypoint, so the
  HTTP facade shape stays stable

Residual drift intentionally left visible:

- lower-level preview parsing still reuses the existing `startRun`-named helper
  primitives; that naming cleanup is separate from the helper-seam SRP issue
  resolved here

## Validation Run

- Pending update after command execution.

## No-Debt / No-Stub Evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No stub, placeholder, or fake success path was introduced.
- No compatibility branch or fallback parser path was added.
