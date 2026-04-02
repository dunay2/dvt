---
title: Adapter runtime and Sonar closeout
status: Accepted
date: 2026-03-28
owners:
  - '@dvt/adapter-postgres'
  - '@dvt/delivery'
arc_level: ARC-2
breaking: false
evidence_class: supporting
code_refs:
  - packages/@dvt/adapter-postgres/src/PostgresAdapterClientSession.ts
  - packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts
  - packages/@dvt/delivery/src/application/LineageWorkerRuntime.ts
  - docs/planning/reviews/20260328-lineage-outbox-fowler-qa-hard-review.md
evidence:
  tests:
    - pnpm vitest packages/@dvt/adapter-postgres/test/PostgresAdapterClientSession.test.ts packages/@dvt/delivery/test/LineageWorkerRuntime.test.ts
    - pnpm --filter @dvt/delivery test
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter @dvt/adapter-postgres typecheck
    - pnpm verify:prepush
---

# 20260328 Adapter Runtime And Sonar Closeout

## Summary

This slice closes the adapter/delivery Sonar warnings reported after runtime decomposition:

1. regex cleanup in lineage runtime sanitizer (TS:S5869)
1. deterministic non-stringifiable error fallback in adapter client session (TS:S6551)
1. removal of redundant type-alias usage in the adapter constructor type signature

## Behavioral impact

- No public runtime behavior change in run orchestration, retry scheduling, or snapshot staleness flow.
- Error persistence remains sanitized and bounded.
- Adapter configuration typing remains equivalent at the package boundary via index type export aliasing.

## Residual risk

- Integration depth on lineage claim-timeout concurrency remains tracked in lane task `RC-B5-F2`.
- Tooling follow-up for `eslint-plugin-import` stability remains tracked in lane task `ADP-LINT-ORDER-01`.
