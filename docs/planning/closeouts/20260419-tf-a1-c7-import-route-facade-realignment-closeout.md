---
title: Closeout - TF-A1-C7 import route facade realignment
status: Review
owner: API / Docs
last_reviewed: 2026-04-19
planning_type: closeout
slice: TF-A1-C7-import-route-facade-realignment
---

# Closeout: TF-A1-C7 import route facade realignment

## Think-First Analysis

### Problem summary

After `TF-A1-C6`, the preview half of the plan boundary became a proper remote
facade, but import still lagged behind. `importPlanRoute` remained inside
`planRoutes.ts`, still owned request parsing and plan-ownership checks in the
HTTP adapter, and imported generic plan-ref helpers from a preview-specific
response mapper.

### Root cause

The earlier helper split and preview follow-up corrected the most acute route,
but they left the import half as a residual “good enough” slice. That created
two forms of drift:

1. ownership drift: import still mixed transport and application work;
2. semantic drift: preview-specific modules exported generic plan-ref behavior
   that import consumed.

### Governing constraints

- `AGENTS.md`: inventory-first startup, no hidden debt, no stubs, and required
  validation evidence.
- `docs/guides/ai-work-protocol.md`: think-first, implementation brief, and
  closeout requirements.
- `docs/architecture/reference-architecture.md`: the HTTP adapter stays thin;
  application behavior belongs behind explicit seams.
- `docs/adr/ADR-0003-execution-model.md`: DVT owns boundary semantics and keeps
  translation layers explicit.
- `docs/adr/ADR-0005-contract-formalization-tooling.md`: route validation
  remains deterministic and contract-backed.
- `docs/adr/ADR-0012-plan-integrity-ownership.md`: plan materialization and
  admission-related ownership must remain explicit and auditable.
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a1-c-srp-and-extensibility-hardening-plan-20260414.md`:
  preview/import routes should not retain mixed transport, policy, binding,
  ownership, and projection concerns.

### Options considered

1. Keep `importPlanRoute` in `planRoutes.ts` and only rename a few helpers.
2. Extract import into dedicated parser/use-case/response seams and move
   generic plan-ref mapping into a neutral module.
3. Merge import behavior into preview or compile seams to reduce file count.

### Selected option and rationale

Option 2. It removes the actual ownership drift and also closes the semantic
coupling between import and preview. The file count increases slightly, but the
boundary becomes coherent and easier to extend.

### Rejected alternatives

- Option 1 was rejected because it preserves the ownership violation and only
  repaints the naming.
- Option 3 was rejected because preview, import, and compile have different
  lifecycle meanings; collapsing them would reintroduce the same boundary blur
  we just removed.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `apps/api/src/application/services/**`
  - `apps/api/src/entrypoints/http/**`
  - `apps/api/test/entrypoints/http/**`
  - `docs/planning/state/agent-lane-a.yaml`
  - this closeout
- Expected outcome:
  - import route becomes transport/auth/delegation only
  - import ownership check moves behind a dedicated application service
  - generic plan-ref helpers move to a neutral seam
  - the residual `planRoutes.ts` module disappears
- Risks and mitigations:
  - Risk: import error behavior changes while extracting seams.
    Mitigation: preserve current status/reason/cause payloads and cover import
    auth, invalid-input, success, and scope-mismatch tests.
  - Risk: file moves create stale docs/status artifacts.
    Mitigation: regenerate planning and generated-code surfaces before closeout.
- Out of scope:
  - compile boundary changes
  - preview contract changes
  - historical doc rewrites for already-closed slices
- Validation plan:
  - `pnpm exec eslint --max-warnings 0` on touched API source/test files
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter dvt-api test -- test/entrypoints/http/importPlanRoute.test.ts test/entrypoints/http/previewPlanRoute.auth.test.ts test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts test/entrypoints/http/previewPlanRoute.outcomes.test.ts`
  - `pnpm --filter dvt-api test:arch`
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - preserve invalid planRef failure
  - preserve authorized success path
  - preserve scope mismatch failure
  - ensure preview tests still pass after neutralizing shared plan-ref helpers
- Libraries evaluated:
  - None evaluated; this is a repo-internal boundary correction.

## Implementation Summary

1. Added `ImportPlanUseCase` so plan fetch plus scope-ownership verification no
   longer live in the HTTP adapter.
2. Added `importPlanRouteParser` so import request parsing has a single
   dedicated seam.
3. Added `importPlanRoute` and `planImportResponseMapper`, and removed the
   leftover `planRoutes.ts` module entirely.
4. Moved `normalizePlanRef` and `toContractPlanRef` into the neutral
   `planRefHttpMapper` seam so import no longer depends on a preview-specific
   module for generic behavior.
5. Tightened `importPlanRoute.test.ts` so its test wiring only carries the
   dependencies import actually owns.

## DDD / Fowler / SRP outcome

Drift identified and closed:

- ownership drift: `importPlanRoute` no longer mixes transport and application
  behavior
- semantic drift: import no longer imports generic `PlanRef` behavior from a
  preview mapper
- naming drift: the residual `planRoutes.ts` multi-route module no longer
  exists after preview and import were both split out
- test drift: import-route tests no longer carry preview/compile-era
  dependencies they do not use

Residual drift after this slice:

- lower-level preview/import parser seams still reuse a few generic helpers
  whose names originated in `startRun`; the route-level ownership drift is
  closed, but helper naming cleanup remains optional follow-up rather than an
  architectural blocker

## Validation Run

- `pnpm exec eslint --max-warnings 0 apps/api/src/application/services/ImportPlanUseCase.ts apps/api/src/application/services/PreviewPlanUseCase.ts apps/api/src/entrypoints/http/importPlanRoute.ts apps/api/src/entrypoints/http/importPlanRouteParser.ts apps/api/src/entrypoints/http/planImportResponseMapper.ts apps/api/src/entrypoints/http/planRefHttpMapper.ts apps/api/src/entrypoints/http/planPreviewResponseMapper.ts apps/api/src/entrypoints/http/previewPlanRoute.ts apps/api/src/entrypoints/http/planRouteScope.ts apps/api/src/app.ts apps/api/test/entrypoints/http/importPlanRoute.test.ts apps/api/test/entrypoints/http/previewPlanRoute.auth.test.ts apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts apps/api/test/entrypoints/http/previewPlanRoute.outcomes.test.ts apps/api/test/entrypoints/http/previewPlanRouteTestSupport.ts` - PASS
- `pnpm --filter dvt-api typecheck` - PASS
- `pnpm --filter dvt-api test -- test/entrypoints/http/importPlanRoute.test.ts test/entrypoints/http/previewPlanRoute.auth.test.ts test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts test/entrypoints/http/previewPlanRoute.outcomes.test.ts` - PASS
- `pnpm --filter dvt-api test:arch` - PASS
- `pnpm docs:workboard:generate` - PASS
- `pnpm docs:sync` - PASS
- `pnpm docs:status:generate` - PASS
- `pnpm verify:prepush` - PASS

## No-Debt / No-Stub Evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No stub, placeholder, or fake success path was introduced.
- No legacy multi-route compatibility module was preserved for convenience.
