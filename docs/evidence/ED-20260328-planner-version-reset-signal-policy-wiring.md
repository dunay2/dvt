---
title: Planner version reset and signal policy wiring closeout
status: Accepted
date: 2026-03-28
owners:
  - planner
  - api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/planner/docs/contracts/PlanCore.schema.json
  - apps/api/src/plugins/env.ts
  - apps/api/src/app.ts
  - apps/api/src/entrypoints/http/signalRunRouteParser.ts
  - apps/api/src/entrypoints/http/runCommandRouteExecutor.ts
  - apps/api/test/app.test.ts
evidence:
  - pnpm --filter dvt-api test -- test/app.test.ts
  - pnpm verify:prepush
---

# Planner version reset and signal policy wiring closeout

## Scope

This change set closes two governance-critical slices:

- align planner PlanCore schema version with the emitted plan version (`1.0`);
- enforce and prove runtime wiring from `DVT_SIGNAL_ROUTE_ALLOW_CANCEL` into
  `/runs/:runId/signal` policy behavior.

## Outcome

- `PlanCore.schema.json` now matches the current emitted major/minor family.
- App composition test coverage now verifies env-driven `CANCEL` rejection when
  `DVT_SIGNAL_ROUTE_ALLOW_CANCEL=false`.
- Shared run-command executor remains route-generic and detached from
  signal-specific constant catalogs.

## Validation Notes

- `pnpm --filter dvt-api test -- test/app.test.ts` validates env-to-route
  composition behavior.
- `pnpm verify:prepush` validates changed-file formatting/lint plus required
  prepush baseline for this repo workflow.
