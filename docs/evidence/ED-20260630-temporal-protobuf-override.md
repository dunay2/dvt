---
title: Temporal protobuf dependency override
status: Accepted
date: 2026-06-30
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
    - pnpm test:adapter-temporal
    - pnpm --filter @dvt/adapter-temporal build
    - pnpm --filter dvt-temporal-worker build
    - pnpm verify:prepush
---

# Temporal Protobuf Dependency Override

## Summary

PR #1578 upgrades the Temporal TypeScript SDK packages used by the Temporal
adapter and Temporal worker from `1.17.2` to `1.18.1`.

The upstream `@temporalio/proto@1.18.1` package pins `protobufjs@7.5.8`, which
GitHub Dependency Review flags for GHSA-wcpc-wj8m-hjx6. The PR now adds a root
`pnpm` override so the dependency graph resolves `protobufjs` to `7.6.4`
instead of the vulnerable transitive version.

## ARC-2 Rationale

The PR touches `packages/@dvt/adapter-temporal/package.json`, so the ARC policy
classifies the PR as ARC-2 and requires explicit evidence plus a risk register
update even though this follow-up patch is dependency metadata only.

## Validation Scope

The validation scope covers the affected Temporal surfaces:

- `@dvt/adapter-temporal`, where Temporal SDK packages are consumed by the
  provider adapter and unit test harness.
- `dvt-temporal-worker`, where the worker runtime consumes
  `@temporalio/worker` and `@temporalio/testing`.

## Compatibility Notes

- No public DVT contract changed.
- No adapter API changed.
- No database or event schema changed.
- No migration is required.
- The override is scoped to dependency resolution and can be removed when
  Temporal publishes a release that no longer pins the vulnerable transitive
  package.
