---
title: Temporal TypeScript SDK 1.23 upgrade
status: Accepted
date: 2026-09-02
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
    - pnpm install --frozen-lockfile --ignore-scripts
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter dvt-temporal-worker test
    - pnpm verify:prepush
---

# Temporal TypeScript SDK 1.23 Upgrade

## Summary

PR #2629 upgrades the aligned Temporal TypeScript SDK packages consumed by the
Temporal adapter and worker from `1.20.3` to `1.23.0`. It changes dependency
metadata only; DVT commands, queries, workflow payloads, activity signatures,
and persistence schemas remain unchanged.

## Compatibility Evidence

- The frozen lockfile installs without additional resolution.
- The adapter's 251 behavior and architecture tests pass.
- The worker's 60 executable tests pass; its two existing environment-gated
  integration cases remain skipped locally.
- Required Temporal integration and dependency-review lanes remain merge gates.

Rollback is a dependency revert and requires no data migration.
