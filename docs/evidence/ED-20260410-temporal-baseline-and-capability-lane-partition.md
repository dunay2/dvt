---
title: Partition Temporal baseline integration from transformation and Postgres capability lanes
status: Accepted
date: 2026-04-10
owners:
  - packages/@dvt/adapter-temporal
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
  - packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts
  - packages/@dvt/adapter-temporal/test/integration.postgres.time-skipping.test.ts
  - packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts
  - packages/@dvt/adapter-temporal/package.json
  - scripts/build-workspace-runtime-deps.cjs
  - .github/workflows/pr-quality-gate.yml
  - tools/ci/scope-config.mjs
evidence:
  tests:
    - pnpm docs:status:generate
    - node --check scripts/build-workspace-runtime-deps.cjs
    - pnpm test:ci-tools
    - pnpm test:adapter-temporal
    - pnpm test:adapter-temporal:integration
    - pnpm test:adapter-temporal:integration:transformation
    - pnpm test:adapter-temporal:integration:postgres
    - pnpm exec markdownlint-cli2 "docs/guides/testing-and-ci-capabilities.md" "docs/architecture/components/engine/adapters/temporal/EnginePolicies.md" "docs/planning/status/canonical-doc-code-matrix.md" "docs/architecture/system-delivery-status.md" "scripts/README.md"
    - pnpm verify:prepush
---

## Summary

This slice removes two architectural smells from the Temporal integration
surface:

1. the runtime-dependency helper no longer reimplements workspace discovery and
   graph walking by hand
2. the general Temporal integration baseline no longer carries
   transformation-flow or relational Postgres semantics

## Scope

1. The runtime-dependency helper now asks PNPM for the runtime closure with
   `pnpm list --filter-prod <pkg>...`.
2. Temporal integration tests are split into three explicit lanes:
   baseline, transformation, and Postgres capability.
3. CI routing now exposes a dedicated transformation integration lane and keeps
   the Postgres capability lane separate from the Temporal baseline.
4. Active docs and command surfaces now describe the capability-specific lanes
   as conditional verification, not as universal baseline closure.

## Residual considerations

1. The runtime-dependency helper still depends on PNPM's JSON output contract.
   This is recorded in
   [R-20260410-TEMPORAL-RUNTIME-CLOSURE-PNPM-JSON-COUPLING](../risk-register/quality/R-20260410-TEMPORAL-RUNTIME-CLOSURE-PNPM-JSON-COUPLING.yaml).
2. CI scope routing remains intentionally conservative for broad engine and
   contract changes, so capability lanes can over-trigger for some unrelated
   slices. This is recorded in
   [R-20260410-TEMPORAL-CAPABILITY-LANE-SCOPE-OVERTRIGGER](../risk-register/quality/R-20260410-TEMPORAL-CAPABILITY-LANE-SCOPE-OVERTRIGGER.yaml).
