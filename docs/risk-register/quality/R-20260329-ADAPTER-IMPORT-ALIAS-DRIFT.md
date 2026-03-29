---
id: R-20260329-ADAPTER-IMPORT-ALIAS-DRIFT
title: Adapter-postgres can regress if inline import aliases reappear in runtime modules
status: Open
date: 2026-03-29
owners:
  - '@dvt/adapter-postgres'
severity: Low
probability: Medium
---

## Context

This branch includes adapter-postgres refactoring that removes inline `import type ... as ...` aliases from runtime modules and adds CI guard coverage in `tools/ci/adapter-postgres-import-alias-regression.test.mjs`.

## Risk

Without a persistent governance signal, future refactors can reintroduce alias patterns that break the intended import boundary style and re-open the same CI regression surface.

## Mitigation

1. Keep the adapter import-alias regression test in CI and treat failures as release-blocking for adapter-postgres slices.
2. Require review focus on runtime module import style in adapter-postgres PRs.
3. Close this risk only after repeated green CI cycles confirm the guard is stable across merges.
