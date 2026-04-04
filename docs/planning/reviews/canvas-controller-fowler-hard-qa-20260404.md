---
title: Canvas controller Fowler hard QA 2026-04-04
status: Active
owner: Frontend / Architecture / QA
last_reviewed: 2026-04-04
planning_type: review
---

# Canvas controller Fowler hard QA 2026-04-04

## Scope

- `apps/web` canvas controller hardening chain (`F-05`) and aligned docs.
- Document-to-code alignment, SRP, DDD/hexagonal direction, negative tests,
  modularization, legibility, and regression risk.

## Governing Sources

- [Governance document and rule inventory](../status/governance-document-rule-inventory.md)
- [Testing and CI capabilities](../../guides/testing-and-ci-capabilities.md)
- [Canvas controller current-to-target architecture](../../architecture/frontend/graph/canvas-controller-current-to-target-architecture.md)
- [Canvas controller hardening compliance roadmap](../proposals/nice-to-have/frontend-and-ux/canvas-controller-hardening-compliance-roadmap-20260404.md)
- [Screen manuals and user stories](../../architecture/frontend/screen-manuals-and-user-stories.md)

## Checkable Findings

### F1 - `hide/show` API semantics were non-idempotent

- Status: `Completed`
- Severity: `High`
- Evidence:
  - `hideExplorerPanel` and `showExplorerPanel` were both bound to the same
    toggle command.
  - Same behavior for inspector.
- Verification checklist:
  - [x] Calling `hideExplorerPanel` when already hidden does not toggle.
  - [x] Calling `showExplorerPanel` when already visible does not toggle.
  - [x] Same idempotent behavior for inspector panel.

### F2 - Canvas store facade over-coupled to global app store

- Status: `Completed`
- Severity: `High`
- Evidence:
  - `useCanvasStoreFacade` consumed full store and re-exported `...store`.
- Verification checklist:
  - [x] Facade uses selectors for required fields only.
  - [x] Facade no longer spreads the full store object.
  - [x] Controller keeps behavior unchanged for route consumers.

### F3 - Negative tests partially implementation-aware

- Status: `Completed`
- Severity: `Medium`
- Evidence:
  - Negative suite uses harness internals to force state transitions.
- Verification checklist:
  - [x] Keep invariant-level checks route-facing where possible.
  - [x] Reserve harness internals for setup only, not behavioral assertions.

### F4 - Test-suite warnings remain

- Status: `Completed`
- Severity: `Medium`
- Evidence:
  - React `act(...)` warning in navigation test.
  - UI ref warning from existing Radix path in root tests.
- Verification checklist:
  - [x] Navigation test has no `act(...)` warning.
  - [x] Root warning is either fixed or tracked as explicit known issue.

## Opportunities Backlog

### O1 - Idempotent panel command contract

- Priority: `P0`
- Target:
  - expose explicit `show/hide` commands in facade;
  - keep toggle-based store internals isolated behind those commands.
- DoD:
  - [x] Controller returns semantically correct `hide/show` commands.
  - [x] New tests prove idempotence for explorer/inspector commands.

### O2 - Selector-first store facade

- Priority: `P0`
- Target:
  - consume only needed app-store slices;
  - remove full-store spread.
- DoD:
  - [x] Facade exposes only route-required contract.
  - [x] Re-render risk from unrelated store fields is reduced.

### O3 - Negative test contract tightening

- Priority: `P1`
- Target:
  - migrate to higher-level assertions where feasible.
- DoD:
  - [x] Invariant tests can be read as behavior contracts, not internals.

### O4 - Warning-free frontend test baseline

- Priority: `P1`
- Target:
  - remove avoidable warnings in web test run.
- DoD:
  - [x] No avoidable `act(...)` warnings from canvas test suites.

## Regression Watch

- [ ] Graph error path still returns safe state.
- [ ] Cost overlay fallback `cost -> runtime` still works when cost disappears.
- [ ] Run-start navigation handoff still goes to `/runs/:runId`.
- [ ] Layout persistence still guarded while query is pending.

## Validation Evidence

- [x] `pnpm --filter @dvt/web test`
- [x] `pnpm --filter @dvt/web typecheck`
- [x] `pnpm verify:prepush`
