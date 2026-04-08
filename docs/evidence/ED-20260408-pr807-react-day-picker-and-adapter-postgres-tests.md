---
title: PR-807 react-day-picker v9 alignment and adapter-postgres test contract sync
status: Accepted
date: 2026-04-08
owners:
  - apps/web
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: false
code_refs:
  - apps/web/src/app/components/ui/calendar.tsx
  - apps/web/package.json
  - packages/@dvt/adapter-postgres/test/PostgresPlanStore.lifecycle.integration.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-core.integration.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter "@dvt/web..." --if-present run build
    - pnpm --filter @dvt/adapter-postgres test -- test/PostgresPlanStore.lifecycle.integration.test.ts test/PostgresPlanStore.records-core.integration.test.ts
    - pnpm --filter @dvt/adapter-postgres test:integration
    - pnpm docs:sync
    - pnpm verify:prepush
---

## Summary

PR-807 updates `react-day-picker` to v9 and required follow-up alignment in the
web calendar component and adapter-postgres integration tests.

## What changed

- Updated web calendar icon overrides to the v9 `components.Chevron` API.
- Fixed adapter-postgres lifecycle integration test to read fetched artifact
  bytes from the returned artifact object.
- Fixed missing-lineage integration test setup to use a hash matching the
  modified canonical plan payload so the test reaches the intended foreign-key
  constraint path.

## Expected effect

- Web package compiles against `react-day-picker@9`.
- Adapter-postgres integration suite validates current plan-store fetch contract
  and the expected lineage integrity failure path.
