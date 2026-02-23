# ADR-0004: run_seq UPSERT for monotonic seq

- **Status**: Accepted
- **Date**: 2026-02-23

## Context

Need monotonic per-run ordering for SSE catch-up; MAX(seq)+1 is race-prone.

## Decision

Use UPSERT on run_seq to allocate seq atomically within the append transaction.

## Consequences

Deterministic ordering, small per-event overhead.

## References

- https://www.postgresql.org/docs/current/sql-insert.html
