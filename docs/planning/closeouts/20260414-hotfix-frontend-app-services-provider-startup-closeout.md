---
slice: hotfix-frontend-app-services-provider-startup
date: 2026-04-14
lane: A
author: AI (Codex)
last_reviewed: 2026-04-14
---

# Closeout: Frontend AppServicesProvider startup hotfix

## Think-First Analysis

### Problem summary

The web shell crashes on the initial route with:

`AppServicesProvider is required to consume app services.`

The failing stack comes from the route-level redirect path:
`DefaultCoreRouteRedirect -> useShellRuntime -> useCapabilitiesQuery ->
useCapabilitiesPort`.

### Root cause

`AppServicesProvider` and `QueryClientProvider` are mounted inside the routed
`Root` component instead of above `RouterProvider`.

That makes the app startup sensitive to when route elements resolve runtime
hooks during initial navigation. The shell composition is valid only after
`Root` has mounted, but the default redirect path is already consulting runtime
services.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, no hidden debt, real validation, no
  skipped hooks.
- `docs/architecture/reference-architecture.md`: infrastructure should sit
  behind stable boundaries; composition belongs at the entry layer.
- `docs/architecture/system-delivery-status.md`: `apps/web` owns the runtime
  shell and must keep caller-visible entry behavior stable.
- `docs/guides/ai-work-protocol.md`: Slim mode hotfixes still require
  think-first analysis, pre-implementation brief, validation, and closeout.

### Selected option and rationale

Move `AppServicesProvider` and `QueryClientProvider` to a dedicated top-level
`AppProviders` composition component used by `App.tsx`, and reduce `Root` to
the routed shell only.

This fixes the startup crash at the correct boundary: route elements should
never depend on providers that are mounted only by a child route component.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `apps/web/src/app/App.tsx`
  - `apps/web/src/app/Root.tsx`
  - `apps/web/src/app/AppProviders.tsx`
  - `apps/web/src/app/Root.test.tsx`
  - `apps/web/src/app/AppProviders.test.tsx`
- Expected outcome:
  - the initial route no longer crashes on `AppServicesProvider` missing
  - route-level runtime hooks can resolve safely during app startup
  - `Root` becomes a shell-only component instead of an app composition root
- Risks and mitigations:
  - Risk: tests assume `Root` still owns providers
  - Mitigation: update the integration guard to assert app-level provider
    ownership explicitly
  - Risk: query client lifecycle changes subtly
  - Mitigation: centralize query client creation in `AppProviders` and cover it
    with a composition test that exercises `useCapabilitiesQuery`
- Out of scope:
  - changing route semantics or plugin availability rules
  - redesigning shell runtime or capabilities contracts

## Implementation Summary

- Added `apps/web/src/app/AppProviders.tsx` as the app-level composition root
  for `AppServicesProvider` plus `QueryClientProvider`.
- Moved provider ownership from `Root` to `App.tsx` so `RouterProvider` and all
  route elements mount beneath the required shell providers.
- Reduced `Root.tsx` to the routed shell frame only.
- Updated the root integration guard in `apps/web/src/app/Root.test.tsx` so it
  now proves `Root` works when app-level providers wrap the routed shell.
- Added `apps/web/src/app/AppProviders.test.tsx` to cover the exact startup
  seam: route-level runtime hooks can consume app services and React Query from
  the top-level app composition.

## Validation Run

- `pnpm exec eslint --max-warnings 0 apps/web/src/app/App.tsx apps/web/src/app/AppProviders.tsx apps/web/src/app/AppProviders.test.tsx apps/web/src/app/Root.tsx apps/web/src/app/Root.test.tsx apps/web/src/app/services/AppServicesContext.tsx` - PASS
- `pnpm --filter @dvt/web typecheck` - PASS
- `pnpm --filter @dvt/web test -- Root.test.tsx AppProviders.test.tsx useCapabilitiesQuery.test.tsx` - PASS
- `pnpm --filter @dvt/web build` - PASS
- `pnpm docs:sync` - PASS
- `pnpm docs:status:generate` - PASS
- `pnpm docs:gov:links:changed` - PASS
- `pnpm verify:prepush` - PASS (`changed-only` gates do not see uncommitted
  worktree deltas in this repo, so the direct slice commands above are the real
  validation baseline for this hotfix)

## Residuals

- The redirect still resolves `defaultCoreViewPath` from shell runtime data.
  This hotfix does not simplify that route logic; it fixes the provider
  boundary so those hooks can execute safely during startup.
