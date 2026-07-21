---
title: Temporal TypeScript SDK 1.20 upgrade
status: Accepted
date: 2026-07-21
owners:
  - packages/@dvt/adapter-temporal
  - apps/temporal-worker
arc_level: ARC-2
breaking: false
code_refs:
  - package.json
  - pnpm-lock.yaml
  - packages/@dvt/adapter-temporal/package.json
  - apps/temporal-worker/package.json
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter @dvt/adapter-temporal build
    - pnpm --filter dvt-temporal-worker test
    - pnpm --filter dvt-temporal-worker typecheck
    - pnpm --filter dvt-temporal-worker build
    - pnpm --filter @dvt/adapter-temporal ci:test:integration
    - pnpm --filter @dvt/adapter-temporal ci:test:integration:transformation
    - pnpm --filter @dvt/adapter-temporal ci:test:integration:postgres
    - pnpm verify:prepush
---

# Temporal TypeScript SDK 1.20 Upgrade

## Summary

PR #2008 upgrades the Temporal TypeScript SDK packages consumed by the
Temporal adapter and worker from `1.18.1` to `1.20.3`. The package boundary,
workflow contracts, activity contracts, and DVT public contracts remain
unchanged.

## ARC-2 Rationale

The dependency update changes `packages/@dvt/adapter-temporal/package.json`, so
the repository classifies it as ARC-2. Compatibility is established through
the adapter and worker type, build, unit, time-skipping, transformation, and
Postgres integration suites rather than inferred from a successful install.

## Dependency Resolution

`@temporalio/proto@1.20.3` resolves `protobufjs@7.6.4` directly. The root
override introduced for Temporal 1.18.1 is therefore removed, closing
`R-20260630-TEMPORAL-PROTOBUF-OVERRIDE` instead of retaining obsolete package
authority.

## Compatibility

- No DVT command, query, event, or persistence schema changes.
- No workflow or activity signature changes.
- Existing workers and adapters consume one aligned Temporal SDK version.
- Rollback consists of reverting the dependency commit; no data migration is
  required.

This document is ARC validation evidence, not a planning authority.
