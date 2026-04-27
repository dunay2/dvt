---
title: Temporal PlanRef spec and config hardening
status: Accepted
date: 2026-04-27
owners:
  - packages/@dvt/adapter-temporal
  - apps/api
  - apps/temporal-worker
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/config.ts
  - packages/@dvt/adapter-temporal/test/smoke.test.ts
  - docs/architecture/components/engine/adapters/temporal/temporal-adapter-spec.md
  - apps/api/src/modules/providerAdapters/createTemporalProviderAdapterFactory.ts
  - apps/temporal-worker/src/runtime/createTemporalWorkerRuntime.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal test -- test/smoke.test.ts
    - pnpm --filter dvt-api test -- test/plugins/env.test.ts test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts
    - pnpm --filter dvt-temporal-worker test -- test/plugins/env.test.ts test/runtime/createTemporalWorkerRuntime.test.ts
    - pnpm test:adapter-temporal
    - pnpm lint
    - pnpm type-check
    - pnpm verify:prepush
---

## Summary

This evidence records the AR-D PlanRef follow-up hardening that aligns the
active Temporal adapter spec with ADR-0012 and ADR-0014, and makes governed
Temporal numeric env overrides fail closed when explicitly misconfigured.

## What Changed

- Rewrote the active Temporal adapter spec around `PlanRef` plus resolved
  context, bounded execution segment resolution, and compact continue-as-new
  cursor input.
- Changed `loadTemporalAdapterConfig` so invalid present numeric env values
  throw `TEMPORAL_CONFIG_INVALID` instead of falling back to defaults.
- Added adapter config negative tests for invalid continue-as-new payload budget
  and layer threshold env values.
- Strengthened API factory coverage to prove the resolved Temporal config
  reaches the adapter constructor.
- Updated planning review and Lane D surfaces so remediated findings are not
  left as active blockers.

## Residual Risk

The branch still does not close `AR-D-PLAN-POINTER`. Actual Temporal
time-skipping continue-as-new proof, replay/cutover posture, gateway-fact
negative coverage, segment-scale maturity, and DBT adapter decoupling remain
open and routed through Lane D.
