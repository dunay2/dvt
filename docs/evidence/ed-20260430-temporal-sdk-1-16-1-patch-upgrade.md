---
title: Temporal SDK 1.16.1 patch upgrade
status: Accepted
date: 2026-04-30
owners:
  - packages/@dvt/adapter-temporal
  - apps/temporal-worker
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/package.json
  - apps/temporal-worker/package.json
  - pnpm-lock.yaml
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter dvt-temporal-worker typecheck
    - pnpm --filter dvt-temporal-worker test
    - pnpm verify:prepush
---

# Temporal SDK 1.16.1 Patch Upgrade

## Summary

PR #1038 upgrades the Temporal TypeScript SDK packages used by the Temporal
adapter and Temporal worker from `1.16.0` to `1.16.1`.

The upstream patch is a Temporal SDK bugfix release. This repository change is
limited to dependency metadata and the lockfile; it does not change adapter
source code, contracts, workflow definitions, or runtime configuration.

## ARC-2 Rationale

The change touches `packages/@dvt/adapter-temporal/package.json`, so the ARC
policy classifies the PR as ARC-2 and requires explicit evidence plus a risk
register update even though the code delta is dependency-only.

## Validation Scope

The validation scope covers the two affected workspaces:

- `@dvt/adapter-temporal`, where Temporal SDK packages are consumed by the
  provider adapter and integration test harness.
- `dvt-temporal-worker`, where the worker runtime consumes
  `@temporalio/worker`.

The closeout evidence for the PR must include type-check, unit test, and
pre-push validation output for these workspaces.

## Compatibility Notes

- No public DVT contract changed.
- No adapter API changed.
- No database or event schema changed.
- No migration is required.
- Existing Temporal integration lanes remain the authoritative signal for
  provider-level regressions after merge.
