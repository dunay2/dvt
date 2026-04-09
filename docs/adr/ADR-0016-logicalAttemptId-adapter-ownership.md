---
title: ADR-0016 - logicalAttemptId Ownership by Adapter
status: Superseded
owner: Architecture / Engine
last_reviewed: 2026-03-24
superseded_by: ADR-0040
---

# ADR-0016 - logicalAttemptId Ownership by Adapter

## Status

Superseded by [ADR-0040](./ADR-0040-retry-ownership-and-attempt-authority.md).

## Historical Context

ADR-0016 captured an early attempt to keep Temporal deterministic by making the
adapter own `logicalAttemptId`.

That decision was materially incomplete:

- it predated the recovery/run-lineage review work;
- it did not define authority for business retry budget across a recovery chain;
- it conflated adapter-local retry state with DVT business semantics.

## Superseding Decision

ADR-0040 replaces the ownership rule with this split:

- `engineAttemptId` is adapter/runtime-owned and diagnostic only;
- `logicalAttemptId` is engine/application-owned and authoritative for business
  retry lineage;
- adapters receive a resolved runtime context and MUST NOT invent or advance the
  logical attempt counter.

## Consequence

Any code or document still treating adapters as the source of truth for
`logicalAttemptId` is non-canonical and must be updated toward ADR-0040.
