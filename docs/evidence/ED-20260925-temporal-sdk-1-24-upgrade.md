---
title: Temporal TypeScript SDK 1.24 upgrade
status: Accepted
date: 2026-09-25
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
    - pnpm install --lockfile-only --ignore-scripts
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter dvt-temporal-worker test
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter dvt-temporal-worker typecheck
---

# Temporal TypeScript SDK 1.24 Upgrade

## Summary

PR #3345 upgrades the aligned Temporal TypeScript SDK packages consumed by the
Temporal adapter and worker from `1.23.0` to `1.24.0`. DVT commands, queries,
workflow payloads, activity signatures, and persistence schemas are unchanged.

The upstream breaking changes affect `@temporalio/openai-agents` and the
experimental external-storage selector. DVT consumes neither surface.

## Compatibility Evidence

- The lockfile resolves Temporal 1.24 together with the current `main`
  dependency graph.
- The adapter passes 28 test files and 243 tests.
- The worker passes 12 test files and 61 tests; its 3 existing
  environment-gated service tests remain skipped.
- Adapter and worker production and test TypeScript projects pass typecheck.
- The worker preparation compiles its 18-package runtime dependency graph.

Rollback is a dependency revert and requires no data migration.
