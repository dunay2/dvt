---
title: ED-20260319 - TS + ESM Monorepo Migration (M-01 through M-04)
status: Final
date: 2026-03-19
owners: Core Architecture
arc_level: ARC-1
breaking: false
policy_version: 1
code_refs:
  - apps/api/package.json
  - apps/api/vitest.config.ts
  - apps/outbox-worker/package.json
  - apps/outbox-worker/vitest.config.ts
  - apps/projector-worker/package.json
  - apps/projector-worker/vitest.config.ts
contracts_touched: []
evidence:
  tests:
    - apps/api/test/**/*.test.ts (15 files, 44 tests)
    - apps/outbox-worker/test/**/*.test.ts (15 files, 112 tests + 3 skipped integration)
    - apps/projector-worker/test/**/*.test.ts (1 file, 2 tests)
  code:
    - apps/api/vitest.config.ts
    - apps/outbox-worker/vitest.config.ts
    - apps/projector-worker/vitest.config.ts
risk_update:
  required: false
rollout:
  required: false
compatibility:
  required: false
  matrix: 'No external API surface changes. Internal test runner change only.'
---

## Evidence Doc: TS + ESM Monorepo Migration (M-01 through M-04)

### Summary

Slices M-01 through M-04 of the archived
[TS + ESM monorepo audit](../archive/planning/proposals/ts-esm-monorepo-audit-and-migration-20260318.md)
are now implemented.

All 27 flagged issues (F-01 through F-27) are resolved or classified as
intentionally deferred (M-05 — root project references, optional).

### Slice M-01 — Critical Fixes (pre-implemented)

All M-01 critical issues were already fixed before 2026-03-19:

- F-03: `@dvt/state-store` — tsconfig extends `tsconfig.package-bundler.base.json` ✓
- F-04: `@dvt/dsl` — `main`/`types`/`exports` point to `dist/` ✓
- F-05: `@dvt/adapter-temporal` — `vitest.config.cjs` removed from tsconfig include ✓
- F-06: `@dvt/dsl` — test script uses `vitest.config.ts` ✓
- F-07: `@dvt/plan-interpreter` — test script uses `vitest.config.ts` ✓

### Slice M-02 — Cohort 1 Structural Cleanup (pre-implemented)

All M-02 structural issues were already fixed before 2026-03-19:

- F-16: `@dvt/planner` — stale `vitest: ^1.6.0` removed; `typescript: 5.9.3` ✓
- F-17: `@dvt/plan-verifier` — `typescript: 5.9.3`; extends bundler base ✓
- F-18: `@dvt/traceability-service` — exports field present; `vitest: 3.2.4` ✓
- F-22: `tsconfig.package-bundler.base.json` — `lib: ["ES2022"]` (no DOM) ✓
- F-23: `tsconfig.base.json` / root tsconfig — `@dvt/crypto` path alias present ✓
- F-24: `@dvt/engine`, `@dvt/delivery` — stale `@types/node: 25.5.0` removed ✓

### Slice M-03 — Chain A Semantic Migration (pre-implemented)

All 10 Chain A packages already had `"type": "module"` and extended
`tsconfig.package-bundler.base.json` before 2026-03-19:

adapter-postgres, adapter-temporal, canonical, cli, observability,
observability-otel, plan-interpreter, planner-contracts, state-store (via M-01),
dsl (via M-01).

### Slice M-04 — Apps and Workers Cleanup (implemented 2026-03-19)

**F-19** — `apps/projector-worker`: `rootDir: "src"`, test files excluded from
build tsconfig, separate `test/tsconfig.json` added ✓ (implemented in prior session)

**F-20 / F-21** — `@dvt/web`: `noEmit: true` in tsconfig; `module: ES2022`
inherited from bundler base ✓ (pre-implemented)

**F-26** — `apps/lineage-worker`: `test` script + `vitest.config.ts` added ✓
(implemented in prior session)

**F-25** — Vitest migration for api, outbox-worker, projector-worker ✓

Migrated 31 test files across 3 apps from `node --import tsx --test` +
`node:assert/strict` to Vitest 3.2.4:

| App                  | Files | Tests | Result                                 |
| -------------------- | ----- | ----- | -------------------------------------- |
| dvt-api              | 15    | 44    | 44 passed                              |
| dvt-outbox-worker    | 15    | 115   | 112 passed, 3 skipped (DB integration) |
| dvt-projector-worker | 1     | 2     | 2 passed                               |

Changes per app:

- Added `"vitest": "3.2.4"` to devDependencies
- Changed `test` script to `vitest run --config vitest.config.ts`
- Created `vitest.config.ts`
- Converted all test files:
  - `import test from 'node:test'` → `import { it, describe, expect, ... } from 'vitest'`
  - `import assert from 'node:assert/strict'` → removed; `assert.*` → `expect(...)` matchers
  - `await test(name, fn)` → `it(name, fn)`

### Slice M-05 — Root tsconfig Project References (deferred)

Intentionally deferred. No active breakage. Can be added when incremental CI
build value is confirmed.

### Validation

```
pnpm --filter dvt-api test            ✓  15 files, 44 tests
pnpm --filter dvt-outbox-worker test  ✓  15 files, 112 passed, 3 skipped
pnpm --filter dvt-projector-worker test  ✓  1 file, 2 tests
pnpm docs:gov                         ✓  0 errors
pnpm docs:gov:locations               ✓  OK
```
