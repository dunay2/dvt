---
slice: tf-e2-route-bootstrap-srp-refactor
date: 2026-04-17
lane: E
task_id: TF-E2
mode: Slim
status: Completed
author: AI (Codex)
last_reviewed: 2026-04-18
---

# TF-E2 route bootstrap SRP refactor closeout

## Phase 1. Think-First Analysis

### Problem summary

The route-bootstrap code worked but had SRP drift:

- one module mixed contract types, registration parsing, and global registry state
- active-route registration discovery was duplicated across `Root.tsx` and
  `usePublishedRouteBootstrap.ts`

### Root cause

The first generalization pass prioritized behavior closure and left packaging
responsibilities merged in one file.

### Constraints and invariants

- `AGENTS.md`: docs and evidence must stay aligned with implementation.
- `docs/guides/ai-work-protocol.md`: Slim-mode refactor requires docs update
  when public architecture description changes.
- `docs/planning/state/planning-control-tower.md`: closeout + lane evidence
  surfaces must reflect active planning truth.
- `docs/architecture/components/web/graph/graph-route-bootstrap-architecture.md`:
  route bootstrap invariants must remain explicit and shell-facing.

### Options considered

- keep a single module and only add comments
- split by SRP into contract, registration, and registry modules

### Selected option and rationale

Split by SRP with direct ownership modules:

- explicit ownership boundaries
- no route behavior regression

## Phase 2. Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `apps/web/src/app/bootstrap/routeBootstrapContract.ts`
  - `apps/web/src/app/bootstrap/routeBootstrapRegistration.ts`
  - `apps/web/src/app/bootstrap/routeBootstrapRegistry.ts`
  - `apps/web/src/app/bootstrap/useActiveRouteBootstrapRegistration.ts`
  - `apps/web/src/app/bootstrap/usePublishedRouteBootstrap.ts`
  - `apps/web/src/app/Root.tsx`
  - planning and architecture docs updated in this closeout
- Expected outcome:
  - route-bootstrap contract, registration, and registry responsibilities are
    explicit
  - active-route registration discovery is centralized in one hook
  - shell and published-route behavior remains unchanged
- Risks and mitigations:
  - risk: break bootstrap flow due to registration lookup changes
    mitigation: keep lookup algorithm identical and cover with focused tests
  - risk: documentation drift on module ownership
    mitigation: update canonical graph architecture and lane evidence references
- Out of scope:
  - startup state-machine redesign
  - route classification policy changes
  - Canvas domain behavior changes

## Implementation Summary

- split bootstrap responsibilities into dedicated modules:
  - `routeBootstrapContract.ts`
  - `routeBootstrapRegistration.ts`
  - `routeBootstrapRegistry.ts`
- added `useActiveRouteBootstrapRegistration.ts` to centralize active match
  registration discovery.
- updated `usePublishedRouteBootstrap.ts` and `Root.tsx` to consume the shared
  registration hook.
- updated planning/architecture docs to reflect the SRP split.

## Hardening follow-up (same slice, post-SRP split)

After the SRP split baseline, the slice added operational hardening that must
remain part of the accepted outcome:

- typed bootstrap error taxonomy:
  - `RouteBootstrapDataRouterContextError`
  - `RouteBootstrapActiveRegistrationMissingError`
  - `RouteBootstrapRegistrationNotFoundError`
  - shared base `RouteBootstrapError` with stable `code` values.
- runtime i18n wiring for bootstrap errors:
  - locale resolved from runtime through
    `navigator.language -> navigator.languages[0] -> document.documentElement.lang -> en`
  - copy resolved via `routeBootstrapErrorCopy.ts` with Spanish bootstrap-local
    overrides while English continues through fallback copy resolution.
- structural Data Router detection in
  `useActiveRouteBootstrapRegistration.ts`:
  - missing Data Router context is identified via React Router Data Router
    contexts instead of string-matching upstream exception text
  - the unstable React Router context dependency is isolated in
    `routeBootstrapDataRouterContext.ts`
  - `useMatches()` stays on a stable hook path and non-router runtime
    exceptions are rethrown without masking when Data Router context is
    present.
- production/runtime invariant in `usePublishedRouteBootstrap.ts`:
  missing explicit registration for a published route throws typed
  `RouteBootstrapRegistrationNotFoundError` (test runtime keeps the isolated
  fallback behavior).
- shell-consumption invariant in `Root.tsx` + `routeBootstrapRegistry.ts`:
  active route registration is required before the shell reads route posture;
  missing active registration throws typed
  `RouteBootstrapActiveRegistrationMissingError`, and the registry no longer
  synthesizes a shell-owned pending fallback.
- compatibility removal:
  - deleted `routeBootstrapPresentation.ts`
  - consumers now import directly from contract/registration/registry owners
    instead of a compatibility barrel.
- default redirect route hardening:
  - `shell.default-core-redirect` now publishes explicit pending posture
    through `usePublishedRouteBootstrap` while mounted instead of relying only
    on handle seed metadata.
  - the redirect remains a transient `published` route and hands startup
    ownership to the navigated target route after navigation resolves.

Affected implementation paths:

- `apps/web/src/app/bootstrap/routeBootstrapErrors.ts`
- `apps/web/src/app/bootstrap/routeBootstrapErrorCopy.ts`
- `apps/web/src/app/bootstrap/routeBootstrapDataRouterContext.ts`
- `apps/web/src/app/bootstrap/useActiveRouteBootstrapRegistration.ts`
- `apps/web/src/app/bootstrap/usePublishedRouteBootstrap.ts`
- `apps/web/src/app/routes.ts`
- `apps/web/src/app/routes.test.tsx`
- `apps/web/src/app/bootstrap/useActiveRouteBootstrapRegistration.test.tsx`
- `apps/web/src/app/bootstrap/usePublishedRouteBootstrap.test.tsx`
- `apps/web/src/app/bootstrap/routeBootstrapErrorCopy.test.ts`

## Validation

- `pnpm --filter @dvt/web exec vitest run src/app/bootstrap/routeBootstrapRegistry.test.ts src/app/Root.test.tsx src/app/views/Canvas.test.tsx src/app/routes.test.tsx` - PASS
- `pnpm --filter @dvt/web exec vitest run src/app/bootstrap/routeBootstrapErrorCopy.test.ts src/app/bootstrap/useActiveRouteBootstrapRegistration.test.tsx src/app/bootstrap/usePublishedRouteBootstrap.test.tsx` - PASS
- `pnpm --filter @dvt/web typecheck` - PASS
- `pnpm verify:prepush` - PASS

## Residuals

- SRP + hardening rounds close the bootstrap architecture drift identified in
  QA for this slice.
- `TF-E2` remains in progress for broader productization scope (node/edge/
  Inspector lifecycle, operability, and full proof matrix).
