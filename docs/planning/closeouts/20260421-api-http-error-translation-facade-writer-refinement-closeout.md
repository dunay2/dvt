---
title: API HTTP error translation facade writer refinement closeout
status: Done
owner: api
last_reviewed: 2026-04-21
planning_type: closeout
---

# API HTTP error translation facade writer refinement closeout

## Think-First Analysis

- Problem summary:
  The HTTP error translation component already had a public semantic API, but
  route consumers still imported the lower-level transport serializer
  `sendHttpResponse` directly. The facade stopped one hop short of the real
  boundary handoff.
- Root cause:
  Previous iterations split classification, introduced a public component API,
  and unified translated response writing, but they still left serializer
  emission visible at the contract layer instead of routing it through the
  component facade.
- Constraints and invariants:
  - `AGENTS.md` requires doc-driven work, no hidden debt, and full validation.
  - `docs/guides/ai-work-protocol.md` permits Slim mode because this slice is a
    local refactor without caller-visible contract changes.
  - `docs/contracts/shared/HttpErrorEnvelope.v1.md` remains the canonical
    caller-visible error envelope.
  - `httpErrorTranslation.ts` is the public production seam of the component.
  - `httpErrorContract.ts` still owns transport primitives and the underlying
    serializer implementation.
- Options considered:
  - keep direct `sendHttpResponse` imports in consumers: rejected because
    semantic encapsulation stayed incomplete
  - move serializer ownership out of `httpErrorContract.ts`: rejected because
    the contract module should continue owning transport primitives
  - expose `httpErrorTranslation.respond(reply, response)`: selected because it
    completes the public seam without collapsing internal ownership
- Selected option and rationale:
  Add `httpErrorTranslation.respond(reply, response)` and migrate production
  consumers that already depend on the component to use it instead of importing
  `sendHttpResponse` directly.
- Rejected alternatives:
  - introducing a second route helper unrelated to the component facade
  - leaving response emission split across two public surfaces indefinitely

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `apps/api/src/entrypoints/http/httpErrorTranslation.ts`
  - route consumers already depending on `httpErrorTranslation`
  - focused component tests
  - local component docs, canonical API architecture doc, and this closeout
- Expected outcome:
  production consumers use a complete facade API for translation and response
  emission, while `httpErrorContract.ts` remains the internal implementation
  dependency that owns the underlying serializer.
- Risks and mitigations:
  - Risk: architecture assertions become too broad.
    Mitigation: scope the assertions to files that already depend on the
    component.
  - Risk: header emission behavior regresses.
    Mitigation: add a behavior test for facade-level `respond(...)`.
- Out-of-scope items:
  - success-payload response helpers
  - changes to `HttpErrorEnvelope.v1`
  - generic route helpers outside this component

## Traceability

- Canonical contract:
  `docs/contracts/shared/HttpErrorEnvelope.v1.md`
- Local component guide:
  `apps/api/docs/http-runtime-error-translation-component.md`
- Canonical architecture walkthrough:
  `docs/architecture/components/api/api-current-to-target-architecture.md`
- Semantic architecture test:
  `apps/api/test/entrypoints/http/httpRuntimeErrorTranslation.architecture.test.ts`

## Real Work Performed

- Added `httpErrorTranslation.respond(reply, response)` to the public component
  facade in `apps/api/src/entrypoints/http/httpErrorTranslation.ts`.
- Migrated production consumers away from direct `sendHttpResponse` imports in:
  - `apps/api/src/entrypoints/http/adminRoutes.ts`
  - `apps/api/src/entrypoints/http/getRunRoute.ts`
  - `apps/api/src/entrypoints/http/getRunEventsRoute.ts`
  - `apps/api/src/entrypoints/http/listRunsRoute.ts`
  - `apps/api/src/entrypoints/http/runCommandRouteExecutor.ts`
  - `apps/api/src/entrypoints/http/startRunRoute.ts`
  - `apps/api/src/entrypoints/http/workspaceGraphDraftRoutes.ts`
- Added a behavior regression test for facade-level response emission in
  `apps/api/test/entrypoints/http/httpErrorTranslation.test.ts`.
- Tightened the semantic architecture test so production consumers use the
  facade writer rather than importing `sendHttpResponse` directly.
- Updated the local component guide and canonical API architecture walkthrough
  to describe the facade writer as part of the public seam.

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/contracts/shared/HttpErrorEnvelope.v1.md`
- `apps/api/docs/http-runtime-error-translation-component.md`
- `docs/architecture/components/api/api-current-to-target-architecture.md`

## Validation Evidence

- Passed:
  `pnpm exec vitest run --config vitest.config.ts test/entrypoints/http/httpErrorTranslation.test.ts test/entrypoints/http/httpRuntimeErrorTranslation.architecture.test.ts`
  in `apps/api`
- Passed:
  `pnpm exec tsc -p tsconfig.json --noEmit`
  in `apps/api`
- Passed:
  `pnpm exec tsc -p test/tsconfig.json --noEmit`
  in `apps/api`
- Passed:
  `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/httpErrorTranslation.ts apps/api/src/entrypoints/http/getRunRoute.ts apps/api/src/entrypoints/http/getRunEventsRoute.ts apps/api/src/entrypoints/http/listRunsRoute.ts apps/api/src/entrypoints/http/runCommandRouteExecutor.ts apps/api/src/entrypoints/http/startRunRoute.ts apps/api/src/entrypoints/http/adminRoutes.ts apps/api/src/entrypoints/http/workspaceGraphDraftRoutes.ts apps/api/test/entrypoints/http/httpErrorTranslation.test.ts apps/api/test/entrypoints/http/httpRuntimeErrorTranslation.architecture.test.ts`
- Passed:
  `pnpm docs:sync`
- Passed:
  `pnpm exec markdownlint-cli2 apps/api/docs/http-runtime-error-translation-component.md docs/architecture/components/api/api-current-to-target-architecture.md docs/planning/closeouts/20260421-api-http-error-translation-facade-writer-refinement-closeout.md --config .markdownlint-cli2.jsonc --ignore-path .markdownlintignore`
- Passed:
  `pnpm verify:prepush`

## No-Debt Evidence

- No governance rules were relaxed.
- No hooks were bypassed.
- No new debt register entry was created or required for this local
  encapsulation refinement.

## No-Stub Evidence

- No placeholder implementation, fake response path, or TODO/FIXME marker was
  introduced.
- The facade writer delegates to the real serializer already owned by
  `httpErrorContract.ts`.
