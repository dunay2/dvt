---
title: RC-D1A Health Contract Compatibility And Watchdog Integration
status: Proposed
owner: API / Runtime / QA
last_reviewed: 2026-03-23
planning_type: proposal
---

# RC-D1A — Health Contract Compatibility And Watchdog Integration

## Problem

RC-D1 introduced operational health detail for the intent reconciler, but two
gaps remain:

1. `/healthz` response shape changed without an explicit compatibility
   transition contract for strict consumers.
2. Watchdog staleness behavior is covered in unit-level helpers but lacks a
   runtime-timer integration test that proves wiring-level behavior.

## Scope

- API health contract compatibility policy for `/healthz`.
- Runtime integration test coverage for stale watchdog degradation and recovery.
- No change to reconciler business logic ownership.

## Required Outcomes

1. Document and enforce a compatibility posture for `/healthz` (versioned
   endpoint or explicit transition rule for strict clients).
2. Add integration tests that validate:
   - transition to `degraded/runtime_unavailable` when no sweep signal arrives
     before stale threshold,
   - transition back to `healthy` after a subsequent sweep success signal.
3. Keep existing unit tests for pure staleness helpers as fast guards.

## Acceptance Criteria

- Compatibility rule for `/healthz` is documented in planning and reflected in
  API tests.
- At least one runtime-level test exercises timer-driven stale evaluation.
- `pnpm --filter dvt-api typecheck` passes.
- `pnpm --filter dvt-api test` passes.
- `pnpm verify:prepush` passes for final closure PR.

## Risks Addressed

- Breaking strict health consumers during rollout.
- Undetected regressions in runtime wiring between signal hooks and watchdog.

## Dependencies

- Builds on `RC-D1` merged baseline.
- No blocker dependency on queued runtime contract tracks.
