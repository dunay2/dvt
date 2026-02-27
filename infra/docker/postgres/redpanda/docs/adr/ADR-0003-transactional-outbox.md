# ADR-0003: Transactional outbox

- **Status**: Accepted
- **Date**: 2026-02-23

## Context

Direct DB+Kafka writes in request path are a dual-write risk.

## Decision

Write to outbox in same DB TX; background publisher reads pending rows and publishes to Kafka.

## Consequences

More moving parts, but consistent commit boundary. Requires monitoring of publish failures.

## References

- https://microservices.io/patterns/data/transactional-outbox.html
