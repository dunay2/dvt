---
slice: 20260420-api-http-error-mapper-srp-decomposition
date: 2026-04-20
last_reviewed: 2026-04-21
work_item: refactor(api)
status: Done
author: AI (GPT-5)
---

# Closeout: API HTTP error mapper SRP decomposition

## Think-First Analysis

### Problem summary

`apps/api/src/entrypoints/http/httpErrorMapper.ts` had accumulated two different
responsibilities:

1. HTTP response construction for parse, auth, facade, and engine outcomes.
2. Runtime-domain error classification for engine exceptions raised after route
   parsing and authorization.

That kept unrelated reasons to change in one file and obscured the real seam:
`mapRuntimeDomainError` is not part of the facade/parse mapper family.

### Root cause

The runtime-domain branches were added incrementally as new engine exceptions
appeared. Because the file already hosted several HTTP mapper helpers, the
runtime classifier logic accreted there instead of being extracted into its own
entrypoint-boundary module.

### Constraints and invariants

- `AGENTS.md`: no behavior regression, no hidden debt, real validation.
- `docs/guides/ai-work-protocol.md`: Slim mode is valid because this is an
  internal refactor with no external contract change.
- `apps/api` HTTP entrypoints are function-oriented; no class wrapper should be
  introduced just to group stateless mapping logic.
- Existing route behavior and existing assertions for runtime-domain errors must
  remain stable.

### Options considered

1. Keep the monolith.
   - Rejected: preserves mixed responsibilities and an unnecessarily broad file.

2. Extract the classifier but preserve a compatibility re-export from
   `httpErrorMapper.ts`.
   - Rejected: all current consumers are in-package, so the re-export would be a
     local legacy path with no real compatibility need.

3. Extract the classifier and hard-cut all consumers to the new module.
   - Selected: this keeps the seam explicit and prevents the old mixed surface
     from being reused mechanically.

### Selected option and rationale

Create `httpDomainErrorClassifier.ts` as the single home for
`mapRuntimeDomainError` and its private helper predicates, then move every
current route/test consumer to import that symbol directly from the new module.

`httpErrorMapper.ts` remains focused on parse/auth/facade/engine response
construction and no longer exposes runtime-domain classification.

### Rejected alternatives

- `HttpErrorMapper` class: unnecessary object wrapper for stateless functions.
- Compatibility barrel in `httpErrorMapper.ts`: keeps a stale alternate path
  alive inside the same package.

## Pre-Implementation Brief

- **Mode**: Slim
- **Scope**:
  - NEW: `apps/api/src/entrypoints/http/httpDomainErrorClassifier.ts`
  - MODIFIED: `apps/api/src/entrypoints/http/httpErrorMapper.ts`
  - MODIFIED: `apps/api/src/entrypoints/http/adminRoutes.ts`
  - MODIFIED: `apps/api/src/entrypoints/http/getRunRoute.ts`
  - MODIFIED: `apps/api/src/entrypoints/http/getRunEventsRoute.ts`
  - MODIFIED: `apps/api/src/entrypoints/http/listRunsRoute.ts`
  - MODIFIED: `apps/api/src/entrypoints/http/runCommandRouteExecutor.ts`
  - MODIFIED: `apps/api/test/entrypoints/http/authErrorMapper.test.ts`
  - NEW: this closeout file
- **Expected outcome**:
  - runtime-domain classification lives only in `httpDomainErrorClassifier.ts`
  - route/test consumers import from the classifier directly
  - `httpErrorMapper.ts` keeps only parse/auth/facade/engine mapping concerns
- **Risks and mitigations**:
  - Risk: a route still imports the old path.
    Mitigation: grep all `mapRuntimeDomainError` consumers and update them.
  - Risk: branch coverage drops during the move.
    Mitigation: keep existing assertions and add a direct `AuthorizationError`
    case.
- **Out-of-scope items**:
  - response shape changes
  - contract changes
  - unrelated HTTP route refactors
- **Validation plan**:
  - targeted Vitest for `authErrorMapper.test.ts`
  - package TypeScript checks for app and tests
  - repo `docs:sync`, `docs:status:generate`, and `verify:prepush`
- **Test coverage plan**:
  - preserve all existing runtime-domain assertions
  - add the missing forbidden-path assertion for `AuthorizationError`
- **Libraries evaluated**:
  - None evaluated; pure structural refactor

## Traceability

- Governing sources:
  - `AGENTS.md`
  - `docs/planning/status/governance-document-rule-inventory.md`
  - `docs/guides/ai-work-protocol.md`
  - `docs/guides/testing-and-ci-capabilities.md`

## Real Work Performed

- Created `apps/api/src/entrypoints/http/httpDomainErrorClassifier.ts` with:
  - `mapRuntimeDomainError`
  - private runtime-domain predicates and helpers
- Removed the runtime-domain re-export from
  `apps/api/src/entrypoints/http/httpErrorMapper.ts`
- Updated in-package consumers to import the classifier directly:
  - `adminRoutes.ts`
  - `getRunRoute.ts`
  - `getRunEventsRoute.ts`
  - `listRunsRoute.ts`
  - `runCommandRouteExecutor.ts`
  - `authErrorMapper.test.ts`
- Added direct test coverage for `AuthorizationError -> 403 tenant_access_denied`

## Governing sources used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/guides/testing-and-ci-capabilities.md`

## Validation evidence

- `pnpm exec vitest run --config vitest.config.ts test/entrypoints/http/authErrorMapper.test.ts`
  in `apps/api`
- `pnpm exec tsc -p tsconfig.json --noEmit` in `apps/api`
- `pnpm exec tsc -p test/tsconfig.json --noEmit` in `apps/api`
- `pnpm docs:sync`
- `pnpm docs:status:generate`
- `pnpm verify:prepush`

## No-debt evidence

- No rules were relaxed.
- No hooks were bypassed.
- No compatibility shim or alternate legacy import path remains for
  `mapRuntimeDomainError` inside `apps/api`.

## No-stub evidence

- No stub or fake implementation was introduced.
- The classifier still uses the same real engine error types and
  `createHttpErrorResponse`.
