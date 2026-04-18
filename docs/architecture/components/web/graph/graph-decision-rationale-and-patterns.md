---
title: Graph Decision Rationale And Patterns
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-17
---

# Graph Decision Rationale And Patterns

## Why This Split Exists

The previous architecture page accumulated too many concerns in one place.
Splitting into focused documents makes ownership and review boundaries explicit:

- overview (`graph-frontend-architecture.md`)
- startup contract details (`graph-route-bootstrap-architecture.md`)
- runtime model details (`graph-canvas-runtime-model.md`)
- behavior dynamics (`graph-sequences-and-state-machines.md`)

## Decision Rationale

### Decision 1: Startup must be route-contract driven

Rationale:

- avoids shell heuristics coupled to route internals
- enforces explicit route operability semantics
- allows static and published modes without hidden fallback behavior

### Decision 2: Bootstrap module must be SRP-split

Rationale:

- contract changes, parser changes, and registry behavior evolve at different
  rates
- isolates correctness tests by concern
- lowers regression risk when adding new routes

### Decision 3: Canvas runtime uses explicit aggregate/read-model seams

Rationale:

- route behavior remains deterministic under conflict and recovery
- React Flow remains projection-only
- plan/run handoff stays aligned with canonical route scope

## Patterns Applied

- Fowler:
  separate aggregate-like session model, read model, and publication adapter.
- DDD:
  explicit bounded contexts: shell startup, route startup contract, route
  authoring runtime.
- Hexagonal:
  ports isolate external draft/plan/run dependencies from route policy.
- SOLID:
  SRP in bootstrap modules; DIP where shell consumes contract, not route internals.

## Point-In-Time Posture (2026-04-17)

- startup contract generalized and SRP-split in implementation
- graph architecture docs restructured by concern
- TF-E2 execution companion remains the canonical backlog and phase sequence

## Evolution Plan

Near term:

- complete TF-E2-A..E execution chain with proof-oriented closure
- lock startup classification governance for every new route
- extend route-level negative-path tests for startup and recovery

Medium term:

- align graph and non-graph routes on the same startup contract quality bar
- strengthen operability runbooks for conflict storms and degraded persistence
- preserve backwards-compatible draft evolution posture across releases

## Canonical References

- [TF-E2 Canvas Target Architecture Execution Plan](../../../../planning/proposals/mandatory/frontend-and-ux/tf-e2-canvas-target-architecture-execution-plan-20260417.md)
- [TF-E2 Route Bootstrap SRP Refactor Closeout](../../../../planning/closeouts/20260417-tf-e2-route-bootstrap-srp-refactor-closeout.md)
- [Canvas Controller Current To Target Architecture](./canvas-controller-current-to-target-architecture.md)
- [Canvas Component Map And Modernization Review](./canvas-component-map-and-modernization-review.md)
