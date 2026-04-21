---
title: API HTTP error translation route static error convergence closeout
status: Done
owner: api
last_reviewed: 2026-04-21
planning_type: closeout
---

# API HTTP error translation route static error convergence closeout

## Think-First Analysis

- Problem summary:
  The HTTP error translation component already owns parse, auth, start-run, and
  runtime-domain translation behind `httpErrorTranslation.ts`, but
  `adminRoutes.ts` and `workspaceGraphDraftRoutes.ts` still construct some
  static `HttpResponseModel` values locally with `createHttpErrorResponse(...)`.
  That leaves the component with a split ownership model.
- Root cause:
  Earlier iterations removed manual serialization and runtime classification
  drift first, but they stopped before converging route-local static envelopes
  into the public component seam.
- Constraints and invariants:
  - `HttpErrorEnvelope.v1` remains the only caller-visible contract.
  - `httpErrorContract.ts` continues owning canonical primitives and the
    transport serializer implementation.
  - Production consumers should depend on `httpErrorTranslation.ts`, not on
    contract factories for component-owned semantic envelopes.
  - No compatibility wrapper or alternate route path should be introduced.
- Options considered:
  - leave `createHttpErrorResponse(...)` in route consumers: rejected because
    ownership remains split and docs would stay qualified instead of clean
  - move all route-static error creation into a new helper file: rejected
    because it would add another seam rather than finish the existing one
  - expose named feature-level helpers from `httpErrorTranslation.ts` and
    migrate the remaining consumers: selected because it completes the public
    component API without moving primitive ownership out of the contract module

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `apps/api/src/entrypoints/http/httpErrorTranslation.ts`
  - `apps/api/src/entrypoints/http/adminRoutes.ts`
  - `apps/api/src/entrypoints/http/workspaceGraphDraftRoutes.ts`
  - focused behavior and architecture tests
  - local component guide, canonical API architecture doc, and this closeout
- Expected outcome:
  feature-level static envelopes for admin rebuild-snapshot and workspace graph
  draft flows are produced through named helpers on `httpErrorTranslation.ts`,
  leaving route consumers with one semantic import path.
- Risks and mitigations:
  - Risk: helper naming becomes too generic and widens the seam.
    Mitigation: group helpers by feature concern, not by generic HTTP status.
  - Risk: regression in current route payloads.
    Mitigation: add behavior tests for the new helpers and preserve existing
    route tests.
- Out-of-scope items:
  - generic plan route helpers such as `executePlanRouteFacade.ts`
  - changes to `HttpErrorEnvelope.v1`
  - non-component route response mappers outside this seam

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

- Added named feature-level helpers to `httpErrorTranslation.ts` for:
  - admin rebuild-snapshot internal failure envelopes
  - workspace graph draft read `not_found`
  - workspace graph draft write `unsupported_schema_version`
  - workspace graph draft write `idempotency_mismatch`
- Removed direct `createHttpErrorResponse(...)` imports from:
  - `apps/api/src/entrypoints/http/adminRoutes.ts`
  - `apps/api/src/entrypoints/http/workspaceGraphDraftRoutes.ts`
- Tightened the semantic architecture test so those consumers can no longer
  depend on `httpErrorContract.ts` directly for component-owned static
  envelopes.
- Added behavior tests for the new feature-level helpers.
- Updated the local component guide and canonical API architecture doc to match
  the new seam ownership.

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
  `pnpm exec vitest run --config vitest.config.ts test/entrypoints/http/adminRoutes.test.ts test/entrypoints/http/workspaceGraphDraftRoutes.test.ts`
  in `apps/api`
- Passed:
  `pnpm exec tsc -p tsconfig.json --noEmit`
  in `apps/api`
- Passed:
  `pnpm exec tsc -p test/tsconfig.json --noEmit`
  in `apps/api`
- Passed:
  `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/httpErrorTranslation.ts apps/api/src/entrypoints/http/adminRoutes.ts apps/api/src/entrypoints/http/workspaceGraphDraftRoutes.ts apps/api/test/entrypoints/http/httpErrorTranslation.test.ts apps/api/test/entrypoints/http/httpRuntimeErrorTranslation.architecture.test.ts apps/api/test/entrypoints/http/adminRoutes.test.ts apps/api/test/entrypoints/http/workspaceGraphDraftRoutes.test.ts`
- Passed:
  `pnpm docs:sync`
- Passed:
  `pnpm exec markdownlint-cli2 apps/api/docs/http-runtime-error-translation-component.md docs/architecture/components/api/api-current-to-target-architecture.md docs/planning/closeouts/20260421-api-http-error-translation-route-static-error-convergence-closeout.md --config .markdownlint-cli2.jsonc --ignore-path .markdownlintignore`
- Passed:
  `pnpm verify:prepush`

## No-Debt Evidence

- No rules were relaxed.
- No compatibility shim, alternate path, or dead alias was introduced.
- `executePlanRouteFacade.ts` remains explicitly out of scope instead of being
  blurred into this component.

## No-Stub Evidence

- No placeholder helper, fake serializer, or TODO marker was added.
- The new facade helpers delegate to the real contract primitives already owned
  by `httpErrorContract.ts`.
