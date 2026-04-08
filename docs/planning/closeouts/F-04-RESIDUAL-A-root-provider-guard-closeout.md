---
slice: F-04-RESIDUAL-A-root-provider-guard
date: 2026-04-08
lane: E
author: AI (Codex)
last_reviewed: 2026-04-08
---

# Closeout: F-04-RESIDUAL-A Root provider guard

## Think-First Analysis

### Problem summary

Lane E `F-04-RESIDUAL-A` requires a Root-level integration guard so shell
composition regressions fail fast. The current shell boundary documentation says
`Root` mounts `AppServicesProvider`, but the real runtime still mounts that
provider in `App.tsx`. As a result, the existing Root integration test can pass
even if the real route composition drifts away from the documented ownership
model.

### Root cause

The earlier `F-04-D/E/F` work centralized frontend service composition, but the
provider ownership boundary stayed one level above the route root. The runtime
still works because `App` wraps `RouterProvider`, yet the canonical shell
contract and the route-level integration guard both assume `Root` owns the
provider around `Outlet`. That leaves a testability gap and a code/doc mismatch
at the shell entrypoint.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, think-first before code, no hidden
  debt, and real validation including `pnpm verify:prepush`.
- `docs/guides/ai-work-protocol.md`: architecture-affecting frontend work must
  record think-first analysis, a pre-implementation brief, and close with
  validation evidence.
- `docs/planning/state/agent-lane-e.yaml`: `F-04-RESIDUAL-A` explicitly calls
  for a dedicated `Root` test that fails if `AppServicesProvider` is removed or
  bypassed.
- `docs/architecture/frontend/appshell/data-source-service-boundary.md`: `Root`
  is the documented owner of shell composition and mode resolution; views
  consume typed hooks through that provider boundary.

### Options considered

- Add another test that mounts `App` and keep provider ownership there.
  - Rejected because it preserves the code/doc mismatch and leaves `Root`
    inconsistent with the canonical boundary contract.
- Keep provider ownership in `App` and rewrite the docs to match.
  - Rejected because the boundary doc is already explicit that `Root` owns shell
    composition around route consumers; the residual slice exists to restore
    that guard, not weaken it.
- Move `AppServicesProvider` into `Root`, keep `App` focused on router and
  toaster bootstrapping, and add a `Root` integration test that renders nested
  hook consumers without an outer provider wrapper.
  - Accepted because it aligns runtime truth with the architecture docs and
    makes the regression test meaningful.
- Libraries evaluated:
  - None evaluated. Existing React and repo provider patterns are sufficient.

### Selected option and rationale

Make `Root` the actual provider owner by wrapping `RootShell` with
`AppServicesProvider` inside `Root.tsx`, remove the outer provider from
`App.tsx`, and rewrite the Root integration guard so it mounts `Root` directly.
That way the test fails if provider ownership regresses and the runtime matches
the documented shell boundary again.

### Rejected alternatives

- Add module-level mocks to force Root tests through provider errors.
  - Rejected because `F-04` explicitly prefers provider-owned seams over global
    module mutation.
- Keep double provider wrapping at both `App` and `Root`.
  - Rejected because it would hide ownership mistakes instead of making them
    observable.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - `apps/web/src/app/App.tsx`
  - `apps/web/src/app/Root.tsx`
  - `apps/web/src/app/Root.test.tsx`
  - `docs/planning/state/agent-lane-e.yaml`
  - this closeout file
- Expected outcome:
  - `Root` becomes the real owner of `AppServicesProvider`
  - a dedicated Root integration test fails if provider composition is removed
    or bypassed
  - Lane E reflects `F-04-RESIDUAL-A` progress truthfully
- Risks and mitigations:
  - Risk: moving provider ownership could break route rendering or duplicate
    provider state
  - Mitigation: keep exactly one provider by removing the outer wrapper from
    `App.tsx` and add a real nested-route probe in `Root.test.tsx`
  - Risk: shell tests may keep passing without proving the real root path
  - Mitigation: the integration guard will mount `Root` without manually adding
    `AppServicesProvider`
- Out of scope:
  - `F-04-RESIDUAL-B` canvas-controller test seam cleanup
  - `F-04-RESIDUAL-C` console copy normalization
  - store decomposition or later `F-05` controller extraction
- Validation plan:
  - `pnpm --filter @dvt/web exec vitest run src/app/Root.test.tsx src/app/services/AppServicesContext.test.tsx --config vitest.config.ts`
  - `pnpm --filter @dvt/web typecheck`
  - `pnpm --filter @dvt/web test`
  - `pnpm --filter @dvt/web build`
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - RED test that mounts `Root` directly and proves nested hook consumers can
    read app services without an outer provider wrapper
  - regression check that `RootShell` health UX still works under explicit
    provider overrides
  - negative path preserved through existing `AppServicesContext` tests that
    hook consumers throw without the provider
- Libraries evaluated:
  - None evaluated -- existing repo primitives are sufficient

## Changes made

- `apps/web/src/app/Root.tsx`
  Changed: moved `AppServicesProvider` into `Root` so the route root now owns
  the shell composition boundary described by the canonical docs.
  Why: makes provider ownership observable at the real route entrypoint instead
  of one level above it.
- `apps/web/src/app/App.tsx`
  Changed: removed the outer `AppServicesProvider` wrapper and left `App`
  responsible only for router and toaster bootstrapping.
  Why: avoids double-wrapping and keeps one clear owner for the composition
  boundary.
- `apps/web/src/app/Root.test.tsx`
  Changed: rewrote the Root integration guard to mount `Root` directly rather
  than providing `AppServicesProvider` from the test harness.
  Why: the test now fails if provider ownership is removed or bypassed in the
  real shell path.
- `docs/planning/state/agent-lane-e.yaml`
  Changed: moved `F-04-RESIDUAL` to active work and `F-04-RESIDUAL-A` to
  evidence-backed review state.
  Why: keeps lane truth aligned with the implemented residual guard.
- `docs/planning/closeouts/F-04-RESIDUAL-A-root-provider-guard-closeout.md`
  Changed: recorded think-first analysis, implementation rationale, and
  validation evidence for the Root provider-ownership guard.
  Why: makes the slice auditable and ready for follow-on residual work.

## TDD evidence

- RED:
  - `pnpm --filter @dvt/web exec vitest run src/app/Root.test.tsx src/app/services/AppServicesContext.test.tsx --config vitest.config.ts`
  - Failed before implementation because `Root` did not own
    `AppServicesProvider`, so `LeftNavigation` and a nested hook probe both
    threw `AppServicesProvider is required to consume app services.`
- GREEN:
  - The same focused command passed after `Root` became the real provider owner
    and `App` dropped the stale outer wrapper.

## Docs synced

- [x] `docs/planning/state/agent-lane-e.yaml` updated with the live
      `F-04-RESIDUAL` and `F-04-RESIDUAL-A` state.
- [x] `pnpm docs:sync` executed after adding this closeout file.
- [x] `pnpm docs:workboard:generate` executed after the lane update.

## Test evidence

- `pnpm --filter @dvt/web exec vitest run src/app/Root.test.tsx src/app/services/AppServicesContext.test.tsx --config vitest.config.ts`
  Result: FAIL (expected RED before implementation)
- `pnpm --filter @dvt/web exec vitest run src/app/Root.test.tsx src/app/services/AppServicesContext.test.tsx --config vitest.config.ts`
  Result: PASS
- `pnpm --filter @dvt/web typecheck`
  Result: PASS
- `pnpm --filter @dvt/web test`
  Result: PASS
- `pnpm --filter @dvt/web build`
  Result: PASS
- `pnpm docs:sync`
  Result: PASS
- `pnpm docs:workboard:generate`
  Result: PASS
- `pnpm exec prettier --check apps/web/src/app/App.tsx apps/web/src/app/Root.tsx apps/web/src/app/Root.test.tsx docs/planning/state/agent-lane-e.yaml docs/planning/closeouts/F-04-RESIDUAL-A-root-provider-guard-closeout.md`
  Result: PASS
- `pnpm exec markdownlint-cli2 --ignore-path .markdownlintignore docs/planning/closeouts/F-04-RESIDUAL-A-root-provider-guard-closeout.md`
  Result: PASS
- `pnpm verify:prepush`
  Result: PASS

## Debt introduced

None. No rule was relaxed, no hook was bypassed, and no placeholder
implementation was added.

## Residual follow-up

- `F-04-RESIDUAL-B` remains next: canvas-controller tests still need to stop
  using global module seams and move to provider overrides.
- `F-04-RESIDUAL-C` remains open for API-mode console copy normalization.
