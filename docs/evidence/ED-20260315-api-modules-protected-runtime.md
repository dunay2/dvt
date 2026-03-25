---
title: ED-20260315 - API Protected Runtime Module extraction
status: accepted
date: 2026-03-15
owners: Engineering
arc_level: ARC-1
breaking: false
code_refs:
  - apps/api/src/app.ts
  - apps/api/src/modules/buildProtectedRuntimeModule.ts
  - apps/api/src/modules/buildProviderAdapters.ts
  - apps/api/src/modules/registerOperationalHooks.ts
  - apps/api/src/modules/types.ts
  - apps/api/src/plugins/env.ts
  - apps/api/test/modules.test.ts
  - apps/api/test/plugins/env.test.ts
evidence:
  tests: []
  notes:
    - app.ts delegates protected runtime wiring to dedicated modules
    - buildProtectedRuntimeModule remains the composition boundary for DB, auth, engine, and facade wiring
    - buildProviderAdapters always registers mock and conditionally registers Temporal
    - registerOperationalHooks owns onReady/onClose lifecycle registration
    - API boolean env flags now enable only on explicit true
    - module and env tests now cover real behavior instead of stale Not implemented expectations
---

# ED-20260315 - API Protected Runtime Module extraction

## Purpose

`apps/api` had a real modular runtime implementation but still carried two pieces
of publication drift:

- operational boolean flags were parsed with `z.coerce.boolean()`, which could
  enable routes unexpectedly for values such as `false` or `0`
- `modules.test.ts` still described an old stubbed state with `Not implemented`
  assertions even though the modules were already real

This evidence document records the cleanup needed to make the modular API slice
safe and publishable.

## Changes

### `apps/api/src/plugins/env.ts`

Introduced strict boolean parsing for API operational flags. Only explicit
`true` enables these booleans; unset, `false`, `0`, or arbitrary strings keep
routes disabled.

Affected flags:

- `DVT_INTENT_RECONCILER_ENABLED`
- `OBS_ENABLED`
- `DVT_READYZ_ENABLED`
- `DVT_VERSION_ENABLED`
- `DVT_DB_READY_ENABLED`
- `DVT_ADMIN_ROUTES_ENABLED`

### `apps/api/test/plugins/env.test.ts`

Added negative-path coverage to prove that admin routes stay disabled unless the
environment contains an explicit `true`, and that the same semantics apply to the
other API booleans.

### `apps/api/test/modules.test.ts`

Replaced obsolete `Not implemented` assertions with real tests for the modular
runtime contract:

- `buildProtectedRuntimeModule` fails fast without `DATABASE_URL`
- `registerOperationalHooks` wires `migrate()` and `close()` to Fastify lifecycle hooks
- `buildProviderAdapters` always returns the mock adapter when Temporal is not configured

## Validation Run

Executed on 2026-03-15 in the clean `pr-api-protected-runtime` worktree:

```text
pnpm install --frozen-lockfile
  passed

pnpm --filter dvt-api build
  passed after building required workspace packages in the worktree

pnpm --filter @dvt/crypto build
pnpm --filter @dvt/contracts build
pnpm --filter @dvt/planner build
pnpm --filter @dvt/observability build
pnpm --filter @dvt/observability-otel build
pnpm --filter @dvt/plan-interpreter build
pnpm --filter @dvt/adapter-postgres build
pnpm --filter @dvt/adapter-temporal build
pnpm --filter @dvt/engine build
pnpm --dir apps/api exec node --import tsx --test test/**/*.test.ts
  passed (39/39)

pnpm --filter dvt-api test
  failed for a pre-existing baseline reason: pretest omits @dvt/crypto before @dvt/engine build

pnpm --filter dvt-api test:arch
  passed
```

## Traceability

- Governing workflow: `AGENTS.md`, `docs/guides/ai-work-protocol.md`
- Runtime boundary: `ADR-0003`
- Tenant/repair route constraint: `ADR-0031`
- Slice closeout: `docs/planning/closeouts/20260315-api-protected-runtime-closeout.md`
