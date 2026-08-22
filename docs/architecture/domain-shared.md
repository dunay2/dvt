---
title: Shared Boundary Domain
status: Active
owner: Architecture / Docs
last_reviewed: 2026-05-14
---

# Shared Boundary Domain

This domain contains the intentionally shared technical surfaces used across
planning, execution, delivery, API, and UI.

It is where genuinely shared contracts, telemetry abstractions, lineage
mapping, and canonicalization helpers belong. It is not a fallback bucket for
ownerless business logic.

## Scope

- `@dvt/contracts`
- `@dvt/observability`
- `@dvt/observability-otel`
- `@dvt/traceability-service`
- `@dvt/crypto`

## Current Interactions

```mermaid
flowchart LR
  Planning["Planning"] --> Shared["Shared boundary"]
  Execution["Execution"] --> Shared
  Delivery["Delivery"] --> Shared
  API["API"] --> Shared
  UI["UI"] --> Shared
```

## Current Responsibilities

- publish shared transport and contract shapes that multiple domains really use;
- define observability contracts and the OTel binding path;
- resolve and map lineage payload inputs for downstream emission;
- provide canonicalization and hashing utilities used across planner and
  runtime boundaries.

## Code Anchors

- [contracts index](../../packages/@dvt/contracts/src/index.ts)
- [ExecutionPlan.v1.ts](../../packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts)
- [observability index](../../packages/@dvt/observability/src/index.ts)
- [StepStartedLineageMapper.ts](../../packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts)
- [crypto index](../../packages/@dvt/crypto/src/index.ts)

## Current Posture

The shared boundary is implemented, and `RC-G1` closed the known contract
ownership drift: domain-private behavior ports now live in owner packages while
`@dvt/contracts` keeps serializable vocabulary, schemas, refs, and event shapes.

## Queued Delta

- `S11`: tighten lineage sink facets without widening the shared surface beyond
  what downstream consumers need.
- keep OTel binding validation honest so observability docs do not overstate
  production readiness.

## Domain Rules

- Only truly shared contracts and technical cross-cutting behavior belong here.
- When ownership is ambiguous, the default fix is owner clarification, not a
  new shared abstraction.
- Shared packages should expose stable boundaries, not hidden orchestration.

## Related Pages

- [Contracts Index](../contracts/index.md)
- [DVT Component Map](./component-map.md)
- [Shared Package Architecture](./shared/index.md)
- [System Delivery Status](./system-delivery-status.md)
