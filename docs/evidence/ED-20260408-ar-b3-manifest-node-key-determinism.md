---
title: AR-B3 manifest node-key ordering determinism in planner derivation
status: Accepted
date: 2026-04-08
owners:
  - packages/@dvt/planner
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/planner/src/domain/manifest.ts
  - apps/api/test/infrastructure/planner/ManifestArtifactResolver.test.ts
  - packages/@dvt/planner/test/unit/determinism.test.ts
  - packages/@dvt/planner/test/unit/manifest-graph-source.test.ts
evidence:
  tests:
    - pnpm test:api
    - pnpm --filter @dvt/planner test -- test/unit/determinism.test.ts
    - pnpm --filter @dvt/planner test -- test/unit/manifest-graph-source.test.ts
    - pnpm verify:prepush
---

## Summary

AR-B3 hardens planner determinism at manifest ingestion by enforcing stable
binary node iteration order in `ManifestGraphDeriver`.

## What changed

- `ManifestGraphDeriver` now sorts `manifest.nodes` keys with the repo's
  deterministic `binaryCompare` helper instead of locale-sensitive ordering.
- Added determinism coverage that builds plans from two manifests with identical
  semantics but different key insertion order.
- Added direct unit coverage for underscore-sensitive node IDs so graph-source
  output ordering stays stable across environments.
- Aligned API resolver expectations with the binary node-ordering contract used
  by planner ingestion.
- Added a golden vector assertion for the expected resulting `planId` in that
  manifest-ordering scenario.

## Expected effect

- dbt manifest node-key insertion order no longer influences derived graph order
  in the planner domain service.
- Plan identity stays stable for equivalent manifests even when dbt node object
  ordering differs.
