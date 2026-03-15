---
slice: api-protected-runtime
date: 2026-03-15
gap: api-runtime-modularization
author: AI (GPT-5)
last_reviewed: 2026-03-15
---

# Closeout: API Protected Runtime Modularization

## Think-First Analysis

### Problem summary

`apps/api` contained a partially completed modularization: `buildApp()` already
delegated to runtime modules, but the slice was not publishable because the
branch still contained stale tests that asserted `Not implemented` behavior and
an environment parsing bug that could accidentally expose admin routes.

### Root cause

The modular refactor and the hardening follow-up were developed in the dirty root
without being isolated into a clean PR. That left implementation and tests out of
sync, and the admin flag still relied on `z.coerce.boolean()`, which treated many
non-empty strings as truthy.

### Constraints and invariants

- `AGENTS.md`: think-first before edits, real validation, no hidden debt, no stubs.
- `docs/guides/ai-work-protocol.md`: Full mode because this slice changes public
  API wiring and operational flag behavior.
- `ADR-0003`: execution model sovereignty remains in the engine/runtime boundary,
  not in Fastify route setup.
- `ADR-0004`: admin repair routes must preserve event-sourced semantics and stay
  operational, not public-facing product behavior.
- `ADR-0031`: tenant-scoped operations such as rebuild-snapshot must remain
  tenant-explicit.

### Options considered

- Extract the existing API modularization into a clean worktree and repair the
  missing tests and env parsing there.
  - Selected because the code already exists and the remaining work is bounded.
- Rebuild the modularization from scratch in a fresh branch.
  - Rejected because it risked drifting from the authored implementation.
- Publish only the strict boolean parsing fix.
  - Rejected because the stale module tests would still leave the API slice in an
    inconsistent state.
- Libraries evaluated: None. This is repo-local wiring and validation work.

### Selected option and rationale

Take `apps/api` modularization as one clean slice, but include the strict boolean
parsing and the missing non-happy-path tests in the same PR. That produces a
coherent result: the protected runtime modules become real, tested, and safe to
operate.

### Rejected alternatives

- Shipping the modularization without the admin-flag fix. Rejected because it
  leaves an operational exposure bug in the same area.
- Shipping the admin-flag fix without the modularization cleanup. Rejected because
  the tests would still describe obsolete behavior.

## Changes made

| File                                                                                                                                          | Change                                                                                  | Why                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [apps/api/src/app.ts](../../../apps/api/src/app.ts)                                                                                           | Kept `buildApp()` as composition root and delegated protected runtime wiring to modules | Reduce coupling and keep runtime assembly explicit            |
| [apps/api/src/modules/buildProtectedRuntimeModule.ts](../../../apps/api/src/modules/buildProtectedRuntimeModule.ts)                           | Added the protected runtime assembly module                                             | Centralize DB, auth, adapter, engine, and facade wiring       |
| [apps/api/src/modules/buildProviderAdapters.ts](../../../apps/api/src/modules/buildProviderAdapters.ts)                                       | Added provider adapter builder with mock-always and Temporal-optional behavior          | Isolate provider registration and lifecycle concerns          |
| [apps/api/src/modules/registerOperationalHooks.ts](../../../apps/api/src/modules/registerOperationalHooks.ts)                                 | Added Fastify lifecycle hook registration for migrate/close                             | Keep operational bootstrap separate from route registration   |
| [apps/api/src/modules/types.ts](../../../apps/api/src/modules/types.ts)                                                                       | Added `ProtectedRuntimeModule` contract                                                 | Give the composition root and modules a typed boundary        |
| [apps/api/src/application/services/WorkflowEngineFactory.ts](../../../apps/api/src/application/services/WorkflowEngineFactory.ts)             | Kept the workflow engine construction seam in the application layer                     | Preserve testability and isolate engine construction          |
| [apps/api/src/entrypoints/http/adminRoutes.ts](../../../apps/api/src/entrypoints/http/adminRoutes.ts)                                         | Published tenant-explicit admin repair route wiring                                     | Expose operational snapshot rebuild through a bounded route   |
| [apps/api/src/plugins/env.ts](../../../apps/api/src/plugins/env.ts)                                                                           | Replaced `z.coerce.boolean()` with strict `true` parsing for API booleans               | Prevent accidental enablement of admin and operational routes |
| [apps/api/test/app.test.ts](../../../apps/api/test/app.test.ts)                                                                               | Kept runtime and migration coverage around `buildApp()`                                 | Protect the composition root behavior                         |
| [apps/api/test/application/services/WorkflowEngineFactory.test.ts](../../../apps/api/test/application/services/WorkflowEngineFactory.test.ts) | Kept seam-level factory coverage                                                        | Lock the engine-construction indirection in tests             |
| [apps/api/test/modules.test.ts](../../../apps/api/test/modules.test.ts)                                                                       | Replaced stale `Not implemented` assertions with real module coverage                   | Align tests with the shipped modular runtime                  |
| [apps/api/test/plugins/env.test.ts](../../../apps/api/test/plugins/env.test.ts)                                                               | Added negative and consistency coverage for boolean env parsing                         | Lock the operational flag semantics in tests                  |
| [docs/evidence/ED-20260315-api-modules-protected-runtime.md](../../evidence/ED-20260315-api-modules-protected-runtime.md)                     | Synced evidence with the actual slice and validation path                               | Keep implementation and governance aligned                    |
| [docs/planning/closeouts/20260315-api-protected-runtime-closeout.md](20260315-api-protected-runtime-closeout.md)                              | Recorded think-first and closeout evidence                                              | Required by repo governance                                   |
| [docs/evidence/index.md](../../evidence/index.md)                                                                                             | Regenerated evidence index via `docs:sync`                                              | Keep generated docs navigation aligned                        |

## Libraries evaluated

None evaluated -- API wiring slice only.

## Docs synced

- [x] `docs/planning/closeouts/20260315-api-protected-runtime-closeout.md` -- think-first, scope, and final evidence for this slice
- [x] `docs/evidence/ED-20260315-api-modules-protected-runtime.md` -- evidence aligned with the shipped behavior
- [x] `docs/evidence/index.md` -- regenerated by `pnpm docs:sync`

## Test evidence

| Command                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Result                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Passed                                                                                                       |
| `pnpm --filter dvt-api build`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Passed                                                                                                       |
| `pnpm --filter @dvt/crypto build; pnpm --filter @dvt/contracts build; pnpm --filter @dvt/planner build; pnpm --filter @dvt/observability build; pnpm --filter @dvt/observability-otel build; pnpm --filter @dvt/plan-interpreter build; pnpm --filter @dvt/adapter-postgres build; pnpm --filter @dvt/adapter-temporal build; pnpm --filter @dvt/engine build; pnpm --dir apps/api exec node --import tsx --test test/**/*.test.ts`                                                                                                                                                                                                                                                   | Passed, `39/39`                                                                                              |
| `pnpm --filter dvt-api test`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Failed for a pre-existing baseline reason: `apps/api` pretest omits `@dvt/crypto` before `@dvt/engine build` |
| `pnpm --filter dvt-api test:arch`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Passed                                                                                                       |
| `pnpm exec eslint apps/api/src/app.ts apps/api/src/application/services/WorkflowEngineFactory.ts apps/api/src/entrypoints/http/adminRoutes.ts apps/api/src/modules/buildProtectedRuntimeModule.ts apps/api/src/modules/buildProviderAdapters.ts apps/api/src/modules/registerOperationalHooks.ts apps/api/src/modules/types.ts apps/api/src/plugins/env.ts apps/api/test/app.test.ts apps/api/test/application/services/WorkflowEngineFactory.test.ts apps/api/test/modules.test.ts apps/api/test/plugins/env.test.ts`                                                                                                                                                                | Passed                                                                                                       |
| `pnpm exec prettier --check apps/api/src/app.ts apps/api/src/application/services/WorkflowEngineFactory.ts apps/api/src/entrypoints/http/adminRoutes.ts apps/api/src/modules/buildProtectedRuntimeModule.ts apps/api/src/modules/buildProviderAdapters.ts apps/api/src/modules/registerOperationalHooks.ts apps/api/src/modules/types.ts apps/api/src/plugins/env.ts apps/api/test/app.test.ts apps/api/test/application/services/WorkflowEngineFactory.test.ts apps/api/test/modules.test.ts apps/api/test/plugins/env.test.ts docs/planning/closeouts/20260315-api-protected-runtime-closeout.md docs/evidence/ED-20260315-api-modules-protected-runtime.md docs/evidence/index.md` | Passed                                                                                                       |
| `pnpm exec markdownlint-cli2 "docs/planning/closeouts/20260315-api-protected-runtime-closeout.md" "docs/evidence/ED-20260315-api-modules-protected-runtime.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc`                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Passed                                                                                                       |
| `pnpm docs:sync`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Passed                                                                                                       |
| `pnpm docs:quality:check`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Passed, with pre-existing warnings outside this slice                                                        |
| `pnpm docs:canonical:check`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Passed                                                                                                       |

## Debt introduced

None.
