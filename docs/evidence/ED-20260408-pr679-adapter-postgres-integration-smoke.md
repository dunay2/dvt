---
title: PR 679 adapter-postgres integration smoke alignment
status: Accepted
date: 2026-04-08
owners:
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-postgres/test/PostgresPlanStore.lifecycle.integration.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-core.integration.test.ts
evidence:
  tests:
    - pnpm verify:prepush
    - pnpm --filter @dvt/adapter-postgres test:integration
    - gh pr checks 679 --watch --interval 10
---

## Summary

PR 679 failed in `Adapter Postgres Integration Smoke` after the Recharts upgrade
because two adapter-postgres integration tests drifted from current contracts.

## What changed

- Updated lifecycle integration test to consume `store.fetch(planRef)` using
  the current `StoredPlanArtifact` shape (`artifact.bytes`).
- Updated records-core integration test to compute `canonicalHash` from the
  generated `canonicalPlanJson` before asserting missing-lineage reference
  errors.

## Outcome

- `Adapter Postgres Integration Smoke` moved from failing to passing in PR 679.
- Change is test-only and does not alter runtime adapter behavior.
