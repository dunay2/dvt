# Implementation Notes: Outbox Delivery Worker

**Issue**: #16  
**Status**: Implemented (core behavior available)  
**Last reviewed**: 2026-02-13

## Overview

The Outbox Delivery Worker is implemented as the reliability mechanism for at-least-once external event delivery.

It follows the roadmap anchor decision for transactional outbox semantics and deterministic replay safety.

## Current Code Locations

- Worker: `packages/engine/src/workers/OutboxWorker.ts`
- In-memory event bus: `packages/engine/src/outbox/InMemoryEventBus.ts`
- In-memory outbox storage: `packages/engine/src/outbox/InMemoryOutboxStorage.ts`
- Contract-related tests: `packages/engine/test/contracts/`

## Implemented Behavior

- Poll-based delivery loop with configurable interval and batch size.
- Retry/backoff behavior for transient failures.
- Delivery semantics compatible with idempotent consumers.
- Metrics-oriented hooks for lag/rate monitoring.

## Validation Status

- Type checking is wired through workspace TypeScript configs.
- Tests for outbox and contract paths execute from package-scoped test locations.
- CI workflows consume package-scoped paths for artifacts and hash checks.

## Open Work

1. Expand adapter-backed integration coverage (beyond in-memory support).
2. Harden high-availability coordination strategy for multi-worker deployment.
3. Extend observability integration guidance for production deployments.

## References

- `ROADMAP.md`
- `docs/architecture/engine/contracts/state-store/README.md`
- `docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md`
- `docs/status/IMPLEMENTATION_SUMMARY.md`
