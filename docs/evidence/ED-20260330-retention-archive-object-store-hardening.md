---
title: Retention and archive object-store hardening
status: Accepted
date: 2026-03-30
owners:
  - '@dvt/state-store'
  - 'dvt-outbox-worker'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/state-store/src/lifecycle/adapters/FileSystemArchiveObjectStore.ts
  - packages/@dvt/state-store/src/lifecycle/adapters/S3ArchiveObjectStore.ts
  - packages/@dvt/state-store/src/lifecycle/ObjectStorageRunArchiveExporter.ts
  - apps/outbox-worker/src/runtime/RunEventRetentionRuntime.ts
evidence:
  tests:
    - pnpm --filter @dvt/state-store test
    - pnpm --filter dvt-outbox-worker test
    - pnpm verify:prepush
---

# Summary

This slice hardens archive-object existence checks and retention runtime wiring:

- `existsObject` now distinguishes `not found` from operational/storage failures.
- archive exporter tests cover `file://` and `s3://` destination-kind behavior explicitly.
- outbox-worker retention runtime env/config accepts archive destination kind and validates bootstrap constraints.

# Safety outcome

- Missing archive objects remain a normal negative path (`false`).
- Non-not-found S3/fs errors propagate and are no longer hidden as "missing".
- Runtime startup fails fast for inconsistent retention configuration.
