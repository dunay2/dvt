---
title: Closeout - TF-A1-C11 plan-route grammar ownership decoupling
status: Review
owner: API / Docs
last_reviewed: 2026-04-19
planning_type: closeout
slice: TF-A1-C11-plan-route-grammar-ownership-decoupling
---

# Closeout: TF-A1-C11 plan-route grammar ownership decoupling

## Think-First Analysis

### Problem summary

The preview HTTP boundary still imports parser and policy helpers named and
scoped as `startRun*` internals, specifically body-record parsing,
planner-envelope parsing, plan-source policy, node-selection parsing, and
scope parsing. That means preview grammar is implemented through
start-run-owned seams instead of a neutral plan-route grammar owner.

### Root cause

Earlier refactors optimized for reducing orchestration and route-size drift
first. They preserved primitive reuse by continuing to import `startRun*`
helpers from preview, import, compile, and recover route code paths. The logic
is generic, but the ownership signal in names, file boundaries, and scope types
remained tied to the start-run command.

### Governing constraints

- `AGENTS.md`: inventory-first execution, no hidden debt, no stubs, and
  concrete validation evidence.
- `docs/guides/ai-work-protocol.md`: Slim mode requires think-first,
  pre-implementation brief, and validation-backed closeout before closure.
- `docs/architecture/reference-architecture.md`: shared adapter logic should be
  owned by explicit seams rather than convenience imports across command
  boundaries.
- `ADR-0003`: execution semantics stay explicit and DVT-owned at the boundary.
- `ADR-0005`: parser and boundary-validation behavior remain deterministic and
  regression tested.
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a1-c-srp-and-extensibility-hardening-plan-20260414.md`:
  this slice is architecture hardening and ownership clarification, not a
  public contract change.

### Options considered

1. Keep preview/import/compile depending on `startRun*` helpers and treat the
   coupling as harmless primitive reuse.
2. Extract a neutral `planRoute*` grammar layer, repoint non-start-run routes
   to it, and keep `startRun*` files only as start-run-specific adapters over
   the neutral owner.
3. Duplicate the current helper logic inside preview/import/compile-owned
   modules.

### Selected option and rationale

Option 2. It removes semantic cross-boundary coupling without creating parser
duplication, and it makes the ownership line explicit: generic plan-route
grammar lives in neutral plan-route seams, while start-run-specific parsing can
still compose those seams behind its own command boundary.

### Rejected alternatives

- Option 1 was rejected because naming and file ownership are part of the
  architecture, not cosmetic details.
- Option 3 was rejected because it would replace coupling with duplicated
  validation logic and higher drift risk.

## Implementation Summary

- Introduced neutral `planRoute*` grammar owners for body parsing, plan-ref
  parsing, plan-source policy, planner-envelope parsing, selection parsing,
  target-adapter parsing, run-execution-context-ref parsing, and route-scope
  parsing.
- Repointed preview, import, compile, and recover route parsing to those
  neutral owners so non-start-run boundaries no longer depend on
  `startRun*` grammar seams.
- Removed the generic `startRun*` grammar owners themselves; start-run now
  imports the neutral `planRoute*` owners directly for shared body, scope,
  source-policy, plan-ref, planner-envelope, selection, and
  run-execution-context parsing.
- Retained only `startRunRouteTargetAdapterParser` as a start-run-specific
  adapter because registry-backed adapter admission is command policy, not
  shared plan-route grammar.
- Closed the residual scope drift by moving tenant/project/environment parsing
  behind `planRouteScopeParser` and updating preview/compile helpers to depend
  on that neutral seam instead of `ParsedStartRunScope`.
- Reduced `recoverRunRouteParser` orchestration complexity by pushing
  per-field validation into dedicated recovery-body helpers, keeping the route
  parser closer to a small remote-facade-style boundary method.
- Reduced `parseRecoverRunBody` complexity further by splitting body-object
  validation, required-field parsing, optional-field parsing, and body binding
  into separate helpers inside the same module instead of leaving a mini
  validation workflow in one method.
- Removed the hardcoded recover target-adapter string chain by adding a
  parameterized neutral `planRouteTargetAdapterParser` seam. Start-run now
  passes its registry-backed support decision into that seam, while recover
  passes a canonical `SUPPORTED_RECOVER_RUN_TARGET_ADAPTERS` catalog from the
  runtime command surface.
- Simplified `planRoutePlannerEnvelopeParser` legacy-ingress rejection into a
  declarative forbidden-key catalog so the new neutral owner stays readable and
  below the complexity warning threshold.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - neutral parser/policy seams under `apps/api/src/entrypoints/http/`
  - preview/import/compile/recover route parsers that currently import
    `startRun*` helpers
  - start-run parser/builder wiring that should consume neutral owners
    directly for shared grammar
  - affected API route-parser tests
  - `docs/planning/state/agent-lane-a.yaml`
  - this closeout
- Expected outcome:
  - preview/import/compile/recover no longer import `startRun*` grammar helpers
  - generic grammar ownership moves to neutral `planRoute*` seams
  - start-run keeps behavior while importing the neutral helpers directly for
    shared grammar
  - only registry-backed target-adapter admission remains under a
    start-run-specific parser
  - no caller-visible payload or validation-order changes
- Risks and mitigations:
  - Risk: rejection-order drift while moving parser ownership.
    Mitigation: preserve existing route/parser helper tests and rerun the full
    affected API baseline.
  - Risk: leftover documentation or evidence keeps referring to deleted
    `startRun*` grammar files and recreates ownership drift.
    Mitigation: update the active closeout, lane registry, and status docs to
    the neutral `planRoute*` owners in the same slice.
- Out of scope:
  - application-service behavior changes
  - planner contract changes
  - public HTTP payload changes
- Validation plan:
  - `pnpm exec eslint --max-warnings 0 apps/api/src/application/ports/runtime.ts apps/api/src/entrypoints/http/planRouteBodyParser.ts apps/api/src/entrypoints/http/planRoutePlanRefParser.ts apps/api/src/entrypoints/http/planRoutePlanSourcePolicy.ts apps/api/src/entrypoints/http/planRoutePlannerEnvelopeParser.ts apps/api/src/entrypoints/http/planRouteRunExecutionContextRefParser.ts apps/api/src/entrypoints/http/planRouteScope.ts apps/api/src/entrypoints/http/planRouteScopeParser.ts apps/api/src/entrypoints/http/planRouteSelectionParser.ts apps/api/src/entrypoints/http/planRouteTargetAdapterParser.ts apps/api/src/entrypoints/http/planPreviewEnvelopeBinder.ts apps/api/src/entrypoints/http/previewPlanRouteCommandParser.ts apps/api/src/entrypoints/http/previewPlanRouteParser.ts apps/api/src/entrypoints/http/importPlanRouteParser.ts apps/api/src/entrypoints/http/planCompileRouteInputParser.ts apps/api/src/entrypoints/http/recoverRunRouteParser.ts apps/api/src/entrypoints/http/startRunRouteCommandBuilder.ts apps/api/src/entrypoints/http/startRunRouteParser.ts apps/api/src/entrypoints/http/startRunRouteTargetAdapterParser.ts apps/api/test/entrypoints/http/planRouteParserHelpers.test.ts apps/api/test/entrypoints/http/planRoutePlanSourcePolicy.test.ts apps/api/test/entrypoints/http/planRouteSelectionParser.test.ts apps/api/test/entrypoints/http/planRouteScope.test.ts apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts apps/api/test/entrypoints/http/importPlanRoute.test.ts apps/api/test/entrypoints/http/compilePlanRoute.test.ts apps/api/test/entrypoints/http/recoverRunRouteParser.test.ts apps/api/test/entrypoints/http/startRunRouteCommandBuilder.test.ts apps/api/test/entrypoints/http/startRunRouteTargetAdapterParser.test.ts`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter dvt-api test -- test/entrypoints/http/planRouteParserHelpers.test.ts test/entrypoints/http/planRoutePlanSourcePolicy.test.ts test/entrypoints/http/planRouteSelectionParser.test.ts test/entrypoints/http/planRouteScope.test.ts test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts test/entrypoints/http/importPlanRoute.test.ts test/entrypoints/http/compilePlanRoute.test.ts test/entrypoints/http/recoverRunRouteParser.test.ts test/entrypoints/http/startRunRouteCommandBuilder.test.ts test/entrypoints/http/startRunRouteTargetAdapterParser.test.ts`
  - `pnpm --filter dvt-api test:arch`
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - preserve parser-helper negative paths
  - preserve preview input-policy rejections
  - preserve import route behavior
  - preserve start-run helper behavior while ownership changes underneath
- Libraries evaluated:
  - None evaluated; this is a repo-local ownership correction.

## Validation Run

- `pnpm exec eslint --max-warnings 0 apps/api/src/application/ports/runtime.ts apps/api/src/entrypoints/http/planRouteBodyParser.ts apps/api/src/entrypoints/http/planRoutePlanRefParser.ts apps/api/src/entrypoints/http/planRoutePlanSourcePolicy.ts apps/api/src/entrypoints/http/planRoutePlannerEnvelopeParser.ts apps/api/src/entrypoints/http/planRouteRunExecutionContextRefParser.ts apps/api/src/entrypoints/http/planRouteScope.ts apps/api/src/entrypoints/http/planRouteScopeParser.ts apps/api/src/entrypoints/http/planRouteSelectionParser.ts apps/api/src/entrypoints/http/planRouteTargetAdapterParser.ts apps/api/src/entrypoints/http/planPreviewEnvelopeBinder.ts apps/api/src/entrypoints/http/previewPlanRouteCommandParser.ts apps/api/src/entrypoints/http/previewPlanRouteParser.ts apps/api/src/entrypoints/http/importPlanRouteParser.ts apps/api/src/entrypoints/http/planCompileRouteInputParser.ts apps/api/src/entrypoints/http/recoverRunRouteParser.ts apps/api/src/entrypoints/http/startRunRouteCommandBuilder.ts apps/api/src/entrypoints/http/startRunRouteParser.ts apps/api/src/entrypoints/http/startRunRouteTargetAdapterParser.ts apps/api/test/entrypoints/http/planRouteParserHelpers.test.ts apps/api/test/entrypoints/http/planRoutePlanSourcePolicy.test.ts apps/api/test/entrypoints/http/planRouteSelectionParser.test.ts apps/api/test/entrypoints/http/planRouteScope.test.ts apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts apps/api/test/entrypoints/http/importPlanRoute.test.ts apps/api/test/entrypoints/http/compilePlanRoute.test.ts apps/api/test/entrypoints/http/recoverRunRouteParser.test.ts apps/api/test/entrypoints/http/startRunRouteCommandBuilder.test.ts apps/api/test/entrypoints/http/startRunRouteTargetAdapterParser.test.ts`
  - Passed.
- `pnpm --filter dvt-api typecheck`
  - Passed.
- `pnpm --filter dvt-api test -- test/entrypoints/http/planRouteParserHelpers.test.ts test/entrypoints/http/planRoutePlanSourcePolicy.test.ts test/entrypoints/http/planRouteSelectionParser.test.ts test/entrypoints/http/planRouteScope.test.ts test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts test/entrypoints/http/importPlanRoute.test.ts test/entrypoints/http/compilePlanRoute.test.ts test/entrypoints/http/recoverRunRouteParser.test.ts test/entrypoints/http/startRunRouteCommandBuilder.test.ts test/entrypoints/http/startRunRouteTargetAdapterParser.test.ts`
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
- Supplemental validation after closing recover-route `runExecutionContextRef`
  ownership:
  - `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/planRouteRunExecutionContextRefParser.ts apps/api/src/entrypoints/http/recoverRunRouteParser.ts apps/api/test/entrypoints/http/recoverRunRouteParser.test.ts apps/api/test/entrypoints/http/planRouteParserHelpers.test.ts`
    - Passed.
  - `pnpm --filter dvt-api typecheck`
    - Passed.
  - `pnpm --filter dvt-api test -- test/entrypoints/http/planRouteParserHelpers.test.ts test/entrypoints/http/recoverRunRouteParser.test.ts`
    - Passed.
- Supplemental validation after reducing `recoverRunRouteParser` method
  complexity:
  - `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/recoverRunRouteParser.ts apps/api/test/entrypoints/http/recoverRunRouteParser.test.ts`
    - Passed.
  - `pnpm --filter dvt-api typecheck`
    - Passed.
  - `pnpm --filter dvt-api test -- test/entrypoints/http/recoverRunRouteParser.test.ts`
    - Passed.
  - `pnpm --filter dvt-api test:arch`
    - Passed.
- Supplemental validation after splitting `parseRecoverRunBody` into smaller
  helpers:
  - `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/recoverRunRouteParser.ts apps/api/test/entrypoints/http/recoverRunRouteParser.test.ts`
    - Passed.
  - `pnpm --filter dvt-api typecheck`
    - Passed.
  - `pnpm --filter dvt-api test -- test/entrypoints/http/recoverRunRouteParser.test.ts`
    - Passed.
  - `pnpm --filter dvt-api test:arch`
    - Passed.
- Supplemental validation after parameterizing target-adapter parsing:
  - `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/planRouteTargetAdapterParser.ts apps/api/src/entrypoints/http/startRunRouteTargetAdapterParser.ts apps/api/src/entrypoints/http/recoverRunRouteParser.ts apps/api/src/application/ports/runtime.ts apps/api/test/entrypoints/http/startRunRouteTargetAdapterParser.test.ts apps/api/test/entrypoints/http/recoverRunRouteParser.test.ts`
    - Passed.
  - `pnpm --filter dvt-api typecheck`
    - Passed.
  - `pnpm --filter dvt-api test -- test/entrypoints/http/startRunRouteTargetAdapterParser.test.ts test/entrypoints/http/recoverRunRouteParser.test.ts`
    - Passed.
  - `pnpm --filter dvt-api test:arch`
    - Passed.

## No-Debt / No-Stub Evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No stub, placeholder, or fake success path was introduced.
