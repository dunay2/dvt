# ADR-0005: Single-process MVP

- **Status**: Accepted
- **Date**: 2026-02-23

## Context

MVP needs lowest operational overhead while proving the closed loop.

## Decision

Run API + outbox publisher + kafka tail consumer in one Node process.

## Consequences

Simpler deploy; later split into services if scale demands it.

## References

- https://microservices.io/patterns/data/transactional-outbox.html
