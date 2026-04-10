---
slice: api-start-run-adapter-config
date: 2026-03-16
last_reviewed: 2026-03-16
gap: api-start-run-surface
author: AI (GPT-5)
---

# Closeout: Map missing adapter startRun failures to a stable API response

## Think-First Analysis

### Problem summary

`StartRunAuthorizedFacade` currently lets `AdapterNotRegisteredError` escape from
the engine use case. At the HTTP boundary that becomes an untyped internal error
instead of a deterministic client response for a misconfigured `targetAdapter`.

### Root cause

The API authorization facade models authentication and authorization outcomes,
but not the configuration error that can happen after authorization and before a
run is accepted. The HTTP mapper therefore has no typed branch for this engine
failure and the route cannot express it as a stable contract.

### Constraints and invariants

- `ADR-0003`: execution semantics are DVT-owned; adapter registration failure
  must be surfaced from DVT semantics, not leaked as provider-specific behavior.
- `ADR-0014`: adapters are selected through the run-driven boundary, so a
  missing adapter is a boundary/configuration failure of `startRun`.
- `IWorkflowEngine.v1`: the engine boundary owns `startRun(planRef, context)`
  behavior and callers need deterministic failure handling.
- `AGENTS.md`: think-first before edits, no hidden debt, no stubs, closeout
  required.

### Options considered

- Leave the error uncaught and let the route fail as a generic 500.
  Rejected: hides a deterministic configuration problem behind an internal
  server error.
- Catch `AdapterNotRegisteredError` inside the facade and map it to a typed
  result consumed by the HTTP mapper.
  Selected: smallest change that keeps application branching explicit and adds a
  stable response contract.
- Add a general-purpose HTTP exception library or framework-specific error
  mapper.
  Rejected: unnecessary abstraction for one well-defined engine error.

### Selected option and rationale

Extend `StartRunFacadeResult` with `adapter_not_configured`, catch
`AdapterNotRegisteredError` in `StartRunAuthorizedFacade`, map it to HTTP `422`,
and add focused tests at facade, mapper, and route level. Keep the slice narrow:
no auth model redesign, no route parsing changes, no environment flag work.

### Rejected alternatives

- Matching arbitrary error messages instead of the typed engine error class.
- Bundling unrelated `env.ts` boolean parsing changes into the same PR.

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  - type a missing-adapter result in the API auth port
  - map engine `AdapterNotRegisteredError` to that result in the facade
  - return a stable HTTP `422` payload from the route layer
  - add focused negative-path tests
- Touched files or paths:
  - `apps/api/src/application/ports/auth.ts`
  - `apps/api/src/application/services/startRunAuthorizedFacade.ts`
  - `apps/api/src/entrypoints/http/authErrorMapper.ts`
  - `apps/api/test/application/services/startRunAuthorizedFacade.test.ts`
  - `apps/api/test/entrypoints/http/authErrorMapper.test.ts`
  - `apps/api/test/entrypoints/http/startRunRoute.test.ts`
  - `docs/planning/closeouts/20260316-api-start-run-adapter-config-closeout.md`
- Expected outcome:
  - missing adapter configuration is exposed as deterministic `422
ADAPTER_NOT_CONFIGURED`
  - unrelated engine errors still propagate
- Risks and mitigations:
  - risk: over-catching unrelated failures
  - mitigation: catch only `AdapterNotRegisteredError` and add a rethrow test
- Out-of-scope items:
  - auth policy redesign
  - environment flag parsing
  - engine/provider contract refactor
- Validation plan:
  - `pnpm --filter dvt-api build`
  - `pnpm --dir apps/api exec node --import tsx --test test/application/services/startRunAuthorizedFacade.test.ts test/entrypoints/http/authErrorMapper.test.ts test/entrypoints/http/startRunRoute.test.ts`
  - `pnpm --filter dvt-api test:arch`
  - docs markdown and canonical checks needed for the closeout
- Test coverage plan:
  - negative path: facade maps missing adapter to typed result
  - negative path: facade rethrows unrelated errors
  - route path: HTTP layer returns `422` payload for the new result
  - existing auth failure mappings remain unchanged
- Libraries evaluated:
  - None adopted; the change is a typed mapping over an existing engine error.

## Changes made

| File                                                                        | Change                                                                | Why                                                                                          |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `apps/api/src/application/ports/auth.ts`                                    | Added `adapter_not_configured` to `StartRunFacadeResult`              | Keep the application boundary typed when `startRun` cannot resolve the requested adapter     |
| `apps/api/src/application/services/startRunAuthorizedFacade.ts`             | Catch `AdapterNotRegisteredError` and map it to the new facade result | Prevent a deterministic adapter configuration failure from leaking as a generic server error |
| `apps/api/src/entrypoints/http/authErrorMapper.ts`                          | Map `adapter_not_configured` to HTTP `422 ADAPTER_NOT_CONFIGURED`     | Expose a stable client-visible response for a bad `targetAdapter` configuration              |
| `apps/api/test/application/services/startRunAuthorizedFacade.test.ts`       | Added accepted, adapter-missing, and rethrow coverage                 | Prove the facade catches only the intended engine error                                      |
| `apps/api/test/entrypoints/http/authErrorMapper.test.ts`                    | Added `422` mapping coverage                                          | Lock the public response payload and status code                                             |
| `apps/api/test/entrypoints/http/startRunRoute.test.ts`                      | Added route-level `422` test                                          | Prove the route returns the mapped result end-to-end                                         |
| `docs/planning/closeouts/20260316-api-start-run-adapter-config-closeout.md` | Recorded think-first, scope, validation, and debt evidence            | Keep the slice traceable under repo governance                                               |

## Libraries evaluated

None adopted. No library is warranted for a single typed error translation.

## Docs synced

- [x] `docs/planning/closeouts/20260316-api-start-run-adapter-config-closeout.md` - slice closeout created and completed
- [x] `docs/planning/index.md` - checked via `docs:sync`; no index diff required for this slice

## Test evidence

| Command                                                                                                                                                                                                                                                                                                                                                                                                                                      | Result                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                                                                                                                                                                                                                                                                                                                                                                             | Passed                                                           |
| `pnpm exec prettier --write apps/api/src/application/ports/auth.ts apps/api/src/application/services/startRunAuthorizedFacade.ts apps/api/src/entrypoints/http/authErrorMapper.ts apps/api/test/application/services/startRunAuthorizedFacade.test.ts apps/api/test/entrypoints/http/authErrorMapper.test.ts apps/api/test/entrypoints/http/startRunRoute.test.ts docs/planning/closeouts/20260316-api-start-run-adapter-config-closeout.md` | Passed                                                           |
| `pnpm exec eslint apps/api/src/application/ports/auth.ts apps/api/src/application/services/startRunAuthorizedFacade.ts apps/api/src/entrypoints/http/authErrorMapper.ts apps/api/test/application/services/startRunAuthorizedFacade.test.ts apps/api/test/entrypoints/http/authErrorMapper.test.ts apps/api/test/entrypoints/http/startRunRoute.test.ts`                                                                                     | Passed                                                           |
| `pnpm --filter @dvt/run-domain build`                                                                                                                                                                                                                                                                                                                                                                                                        | Passed                                                           |
| `pnpm --filter @dvt/plan-interpreter build`                                                                                                                                                                                                                                                                                                                                                                                                  | Passed                                                           |
| `pnpm --filter @dvt/adapter-temporal build`                                                                                                                                                                                                                                                                                                                                                                                                  | Passed                                                           |
| `pnpm --filter @dvt/crypto build`                                                                                                                                                                                                                                                                                                                                                                                                            | Passed                                                           |
| `pnpm --filter dvt-api build`                                                                                                                                                                                                                                                                                                                                                                                                                | Passed                                                           |
| `pnpm --dir apps/api exec node --import tsx --test test/application/services/startRunAuthorizedFacade.test.ts test/entrypoints/http/authErrorMapper.test.ts test/entrypoints/http/startRunRoute.test.ts`                                                                                                                                                                                                                                     | Passed outside sandbox after `spawn EPERM` under sandbox         |
| `pnpm --filter dvt-api test:arch`                                                                                                                                                                                                                                                                                                                                                                                                            | Passed                                                           |
| `pnpm docs:sync`                                                                                                                                                                                                                                                                                                                                                                                                                             | Passed                                                           |
| `pnpm exec markdownlint-cli2 "docs/planning/closeouts/20260316-api-start-run-adapter-config-closeout.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc`                                                                                                                                                                                                                                                                | Passed                                                           |
| `pnpm docs:quality:check`                                                                                                                                                                                                                                                                                                                                                                                                                    | Passed with pre-existing non-English warnings outside this slice |
| `pnpm docs:canonical:check`                                                                                                                                                                                                                                                                                                                                                                                                                  | Passed                                                           |

Additional baseline observation:

- `pnpm --filter dvt-api pretest` failed before this slice's targeted validation completed because the current workspace script order does not build every transitive package needed by `apps/api` (`@dvt/run-domain`, then `@dvt/crypto` via `@dvt/engine`). This was pre-existing build wiring, not introduced by this slice.

## Debt introduced

None.
