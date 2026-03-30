---
id: R-20260330-PLANNER-MANIFEST-CACHE-STALENESS
title: Planner manifestRef cache serves stale graph if sha256 contract is violated upstream
status: Open
date: 2026-03-30
owners:
  - packages/@dvt/planner
severity: Low
probability: Low
---

## Context

Planner now caches resolved `manifestRef` graph sources in memory by immutable key
`sha256 + uri`. This assumes producers obey the immutable artifact contract.

## Risk

If upstream reuses the same hash/uri pair with modified content, planner can serve
stale graph data from cache for the process lifetime.

## Mitigation

- Keep resolver-side SHA-256 verification mandatory.
- Keep cache bounded and configurable (`manifestRefCacheSize`).
- Allow cache disable (`manifestRefCacheSize: 0`) for debugging and strict runs.
