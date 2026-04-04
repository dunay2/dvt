---
title: In-memory state-store invariants hardening for engine snapshot and outbox paths
status: Accepted
date: 2026-04-04
owners:
  - dvt/engine
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/state/InMemoryRunStateStore.ts
  - packages/@dvt/engine/src/state/InMemoryTxStore.ts
  - packages/@dvt/engine/src/state/runEventWritePolicy.ts
  - packages/@dvt/engine/test/state/InMemoryRunStateStore.appendInvariants.test.ts
  - packages/@dvt/engine/test/state/InMemoryTxStore.outbox.test.ts
  - packages/@dvt/engine/test/state/bootstrapRunTx.atomicity.test.ts
evidence:
  tests:
    - pnpm verify:prepush
---

This change hardens in-memory engine state-store invariants around append ordering, outbox shape,
and bootstrap transaction atomicity. The objective is to prevent silent drift between intended
event-write policy and effective in-memory behavior during fast-feedback and CI-only execution
paths.

The implementation keeps behavior deterministic and test-covered, and does not introduce temporary
paths, stubs, or rule bypasses.
