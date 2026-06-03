---
title: AR-A6 snapshot rebuild concurrency contract
status: Accepted
date: 2026-05-13
owners:
  - '@dvt/contracts'
  - '@dvt/engine'
  - '@dvt/adapter-postgres'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
  - packages/@dvt/engine/src/ports/IRunStateStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- test/run-state-store-maintenance-concurrency.architecture.test.ts
---

# AR-A6 Snapshot Rebuild Concurrency Contract

## Summary

AR-A6 moves snapshot rebuild mutual exclusion from a PostgreSQL implementation
detail into the portable state-store maintenance contract.

The live `IRunStateStoreMaintenance.rebuildSnapshot` documentation now states
that rebuild is a per `(tenantId, runId)` command where only one durable
snapshot mutation may run at a time. Competing commands must serialize or fail
with a typed transient concurrency error.

## Evidence

- Fowler analysis saved to
  `buzon/20260513-codex-fowler-ar-a6-snapshot-rebuild-concurrency-contract-analysis.md`.
- Component guide and user stories added under
  `docs/architecture/components/engine/contracts/state-store/`.
- Semantic architecture guard added in
  `packages/@dvt/contracts/test/run-state-store-maintenance-concurrency.architecture.test.ts`.

## Compatibility

This is a contract clarification and documentation hardening. It does not add a
new public method, remove a type, or change runtime behavior in the PostgreSQL
adapter.
