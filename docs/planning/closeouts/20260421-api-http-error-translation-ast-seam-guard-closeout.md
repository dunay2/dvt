---
title: API HTTP error translation AST seam guard closeout
status: Done
owner: api
last_reviewed: 2026-04-21
planning_type: closeout
---

# API HTTP error translation AST seam guard closeout

## Think-First Analysis

- Problem summary:
  The branch had already converged the main HTTP error translation seam, but
  `executePlanRouteFacade.ts` still called `sendHttpResponse(...)` directly and
  the architecture guard still relied partly on string matching.
- Root cause:
  Earlier iterations focused on component consumers first and left the generic
  plan route helper outside the seam policy. The architecture test captured the
  policy textually rather than semantically.
- Constraints and invariants:
  - `httpErrorContract.ts` still owns the primitive serializer implementation.
  - Production code should consume that writer only through
    `httpErrorTranslation.respond(...)`.
  - The architecture guard should validate import/call semantics through AST,
    not substring coincidence.
- Selected option:
  Route `executePlanRouteFacade.ts` through `httpErrorTranslation.respond(...)`
  and rewrite the architecture assertions with the TypeScript AST.

## Real Work Performed

- Removed the direct `sendHttpResponse(...)` import from
  `apps/api/src/entrypoints/http/executePlanRouteFacade.ts`.
- Routed rejected/internal `HttpResponseModel` emission through
  `httpErrorTranslation.respond(...)`.
- Reworked
  `apps/api/test/entrypoints/http/httpRuntimeErrorTranslation.architecture.test.ts`
  to parse imports, exported functions, object-literal API shape, and call
  expressions with the TypeScript AST.
- Updated the local component guide and canonical API architecture walkthrough
  to state the stricter seam rule explicitly.

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/contracts/shared/HttpErrorEnvelope.v1.md`
- `apps/api/docs/http-runtime-error-translation-component.md`
- `docs/architecture/components/api/api-current-to-target-architecture.md`

## Validation Evidence

- Passed:
  `pnpm exec vitest run --config vitest.config.ts test/entrypoints/http/httpRuntimeErrorTranslation.architecture.test.ts test/entrypoints/http/executePlanRouteFacade.test.ts`
  in `apps/api`
- Passed:
  `pnpm exec eslint --max-warnings 0 apps/api/src/entrypoints/http/executePlanRouteFacade.ts apps/api/test/entrypoints/http/httpRuntimeErrorTranslation.architecture.test.ts apps/api/test/entrypoints/http/executePlanRouteFacade.test.ts`
- Passed:
  `pnpm exec markdownlint-cli2 apps/api/docs/http-runtime-error-translation-component.md docs/architecture/components/api/api-current-to-target-architecture.md docs/planning/closeouts/20260421-api-http-error-translation-ast-seam-guard-closeout.md --config .markdownlint-cli2.jsonc --ignore-path .markdownlintignore`
- Passed:
  `pnpm verify:prepush`

## No-Debt Evidence

- No compatibility path or secondary writer abstraction was introduced.
- The test became stricter without relaxing any rule.

## No-Stub Evidence

- No fake helper or placeholder guard was added.
- The AST test inspects real imports and real call expressions in the tracked
  source files.
