---
title: State-store archive redaction baseline hardening
status: Accepted
date: 2026-06-07
owners:
  - packages/@dvt/state-store
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/state-store/src/lifecycle/ObjectStorageRunArchiveExporter.ts
  - packages/@dvt/state-store/test/ObjectStorageRunArchiveExporter.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/state-store test -- ObjectStorageRunArchiveExporter.test.ts
    - pnpm --filter @dvt/state-store test
    - pnpm --filter @dvt/state-store typecheck
    - pnpm --filter @dvt/state-store build
    - pnpm docs:feature-mechanization:implementation
    - GIT_BASE=origin/main GIT_HEAD=origin/pr/1484/merge node tools/ci/arc-check.mjs
    - pnpm verify:prepush
---

# State-store Archive Redaction Baseline Hardening

## Summary

This evidence records the ARC-2 proof for keeping cold archive payload
redaction mandatory in `ObjectStorageRunArchiveExporter`.

The change removes the exported `ArchiveRedactionPolicy.enabled` switch and
keeps the resolved baseline sensitive-key set active even when a legacy
composition passes `{ "enabled": false }` at runtime. Local archive runtime
configuration may still add sensitive key names and may change the replacement
token, but it cannot disable the default archive redaction baseline.

## Scope

- `ArchiveRedactionPolicy` no longer exposes a disable switch.
- `resolveArchiveRedactionPolicy` always returns a concrete policy with the
  default sensitive keys plus local additions.
- `redactArchiveEvents` no longer accepts a null policy path.
- `ObjectStorageRunArchiveExporter.test.ts` covers the legacy `enabled:false`
  runtime input and proves `password` and `token` fields remain redacted before
  the cold `events.jsonl` object is written.

## Compatibility Notes

- No public event contract changed.
- No archive object schema changed.
- No migration is required for already-written archives.
- Existing custom `sensitiveKeys` and `replacement` options remain supported.
