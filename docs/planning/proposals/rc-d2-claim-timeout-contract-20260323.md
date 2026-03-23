---
title: RC-D2 Follow-up - Outbox Claim Timeout Contract Explicitness
status: Draft
owner: Architecture / Delivery / Docs
last_reviewed: 2026-03-23
planning_type: proposal
---

# RC-D2 Follow-up - Outbox Claim Timeout Contract Explicitness

## Context

`RC-D2` is implemented in `packages/@dvt/adapter-postgres` and the claim lease
timeout is now configurable instead of hardcoded in SQL.

The implementation closed the original deployment-fragility issue, but QA review
found a remaining semantic gap:

- `outboxClaimTimeoutMs` is typed as `number`
- the SQL treats it as milliseconds
- fractional values are implicitly truncated by the `bigint` cast

This creates a quiet contract ambiguity for callers that may pass non-integer
values through configuration or derived runtime input.

## Follow-up Task

Make the claim-timeout contract explicit and deterministic.

### Goal

Define whether the timeout is:

1. strictly an integer number of milliseconds, or
2. a decimal duration that is rounded/truncated by policy.

### Recommended direction

Prefer integer milliseconds only.

That preserves the current storage model, avoids silent coercion, and keeps the
adapter contract aligned with the rest of the repository's time-based settings.

## Expected work

1. Tighten validation in the adapter config path so non-integer values fail
   closed before reaching SQL.
2. Document the accepted range and unit in the adapter design surface.
3. Add regression coverage for non-integer timeout inputs.
4. If needed, mirror the contract in the relevant planning status surface when
   the docs branch is ready.

## Acceptance Criteria

- `outboxClaimTimeoutMs` rejects non-integer, non-finite, zero, and negative
  values.
- Tests cover both the default path and explicit configured path.
- No silent truncation remains in the claim timeout path.
- The contract is documented in the adapter design or linked governance surface.

## Risk If Unaddressed

- A caller can configure `90.5` and observe `90` or `91` milliseconds depending
  on coercion behavior.
- That ambiguity is small but real, and it makes the runtime contract less
  explicit than the rest of the storage adapter.
