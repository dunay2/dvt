---
title: Planner manifestRef in-memory cache for repeated S3 fetches
status: Accepted
date: 2026-03-30
owners:
  - packages/@dvt/planner
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/planner/src/application/PlannerFacade.ts
  - packages/@dvt/planner/test/unit/planner-facade.test.ts
evidence:
  - pnpm -C packages/@dvt/planner exec vitest run test/unit/planner-facade.test.ts
  - pnpm verify:prepush
---

## Summary

Added an in-memory LRU-style cache in `PlannerFacade` for `manifestRef` resolution.
This reduces repeated resolver calls (for example repeated `s3://.../manifest.json` reads)
for identical immutable references (`sha256 + uri`) in long-lived planner processes.

## Behavior

- Default cache size is 64 entries.
- `manifestRefCacheSize: 0` disables caching.
- Cache key: `${sha256}:${uri}`.
- When full, the least recently used key is evicted.

## Validation

- Unit tests now cover cache hit, cache disabled, and eviction path.
- Repository pre-push verification baseline executed.
