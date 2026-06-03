---
title: AR-C5 adapter circuit breaker
status: Accepted
date: 2026-05-12
owners:
  - '@dvt/engine'
  - 'dvt-api'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/adapters/CircuitBreakingProviderAdapter.ts
  - packages/@dvt/engine/src/services/RunHealthService.ts
  - apps/api/src/application/services/WorkflowEngineFactory.ts
evidence:
  tests:
    - pnpm docs:feature-mechanization -- --feature AR-C5-ADAPTER-CIRCUIT-BREAKING
    - pnpm --filter @dvt/engine test -- test/adapters/CircuitBreakingProviderAdapter.test.ts test/architecture/adapterCircuitBreaker.architecture.test.ts
    - pnpm --filter dvt-api test -- test/application/services/WorkflowEngineFactory.test.ts
    - pnpm --filter @dvt/engine typecheck
    - pnpm --filter dvt-api typecheck
---

# AR-C5 Adapter Circuit Breaker Evidence

AR-C5 adds an engine-owned circuit breaker at the provider adapter boundary.
The evidence proves closed/open/half-open transitions, fail-fast behavior,
state metrics, production API composition, and health-check breaker posture.

## Scope

- `@dvt/engine` owns `CircuitBreakingProviderAdapter`, breaker snapshots, and
  health posture.
- `dvt-api` wraps runtime adapters once in production composition before
  constructing run services.

## Result

- Start, cancel, signal, enrichment, and lookup provider calls are protected.
- Open breakers fail fast without invoking the delegate adapter.
- Half-open successful probes close the breaker; failed probes reopen it.
- Health output includes breaker state for protected adapter components.
