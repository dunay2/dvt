---
slice: hotfix-app-services-context-hmr-stability
date: 2026-04-14
lane: A
author: AI (Codex)
last_reviewed: 2026-04-14
---

# Closeout: App services context HMR stability hotfix

## Think-First Analysis

### Problem summary

The frontend can regress into `AppServicesProvider is required to consume app
services.` during Vite hot reload even though the app boot path already mounts
`AppProviders` correctly.

### Root cause

`apps/web/src/app/services/AppServicesContext.tsx` created a fresh React
context object on every module evaluation. Under Vite HMR, providers from the
old module instance can stay mounted while hot-reloaded consumers start reading
from a new context object, which resolves to `null`.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, no hidden debt, real validation, no
  skipped hooks.
- `docs/guides/ai-work-protocol.md`: Slim mode fixes still require think-first
  analysis, validation, and closeout.
- `docs/architecture/system-delivery-status.md`: `apps/web` owns shell startup
  behavior and should not regress runtime service availability during local
  development.

### Selected option and rationale

Persist the React context object on `globalThis` and add a regression test that
imports the module twice to simulate HMR-era provider/consumer skew.

This keeps context identity stable across module reloads without changing the
public hook API or app composition boundary.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `apps/web/src/app/services/AppServicesContext.tsx`
  - `apps/web/src/app/services/AppServicesContext.test.tsx`
- Expected outcome:
  - hot-reloaded consumers keep reading the same app-services context as the
    mounted provider
  - local Vite HMR does not surface false missing-provider crashes
- Risks and mitigations:
  - Risk: global caching leaks between tests
  - Mitigation: regression test clears the global key and resets module state
    after each run
- Out of scope:
  - changing provider ownership or router composition
  - altering runtime services contracts

## Implementation Summary

- Cached `AppServicesContext` on `globalThis` behind a stable repository-local
  key.
- Documented the HMR failure mode inline so the non-obvious global cache has a
  concrete rationale.
- Added a regression test that renders a provider from one module instance and
  consumes hooks from a second module instance after `vi.resetModules()`.

## Validation Run

- `pnpm exec eslint --max-warnings 0 apps/web/src/app/services/AppServicesContext.tsx apps/web/src/app/services/AppServicesContext.test.tsx` - PASS
- `pnpm --filter @dvt/web typecheck` - PASS
- `pnpm --filter @dvt/web test` - PASS
- `pnpm docs:sync` - PASS
- `pnpm docs:gov:links:changed` - PASS
- `pnpm verify:prepush` - PASS

## Residuals

- This fix stabilizes context identity during HMR only. It does not change the
  underlying app provider topology that was already corrected in the earlier
  startup hotfix.
