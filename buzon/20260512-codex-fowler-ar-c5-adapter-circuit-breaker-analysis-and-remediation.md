# AR-C5 Fowler Architecture Analysis And Remediation

## Fowler Architecture Analysis

AR-C5 addresses a boundary resilience gap left after WE-HX-5. Provider lookup is
centralized, but adapter-call outage policy still depends on timeout-only
guards at individual call sites. Fowler framing: this is boundary drift plus
duplicate semantics risk. The mature fix is a Gateway/Decorator around the
provider port with an explicit Circuit Breaker policy.

## Mature-System Comparison

Mature orchestration systems avoid letting every application service rediscover
provider outage behavior. Runtime call protection is placed at the outbound
gateway, health exposes current posture, and telemetry records state transitions
separately from business lifecycle events. AR-C5 follows that model while
preserving ADR-0003: Temporal outage posture is not canonical run status.

## Improved Patterns

- WE-HX-5 provider resolver is reused instead of bypassed.
- Timeout-only protection becomes a named circuit-breaker policy.
- Health becomes a real operational read model for breaker posture.
- Semantic architecture tests validate behavior ownership, not barrel thinness.

## Antipatterns Detected

- Timeout-only protection for provider outages.
- Repeated failure semantics risk across start, cancel, signal, and enrichment.
- Health drift: adapter ping status exists without breaker posture.
- Hidden operational authority if adapter packages decided breaker behavior
  outside the engine runtime safety model.

## Components To Group

- `CircuitBreakingProviderAdapter`: engine-owned provider resilience policy.
- `buildCircuitBreakingAdapterRegistry`: composition helper that prevents
  unprotected registries in production wiring.
- `RunHealthService` breaker posture: operational read model for adapter state.

## Future Lessons

- Runtime safety policies belong at owned outbound boundaries.
- Health output should expose operational posture for any fail-fast policy.
- Architecture guards should check semantic composition, not only imports.
- Provider adapter packages should implement protocol translation, not engine
  outage policy.

## Repetitions To Fix

- Repeated timeout-only adapter calls are replaced by one breaker decorator.
- Future provider registry construction should use the protected registry
  helper instead of recreating wrapper logic.

## Drift To Fix

- Component docs now describe breaker API, invariants, transitions, consumers,
  diagrams, and drift guards.
- User stories cover open, closed, half-open, health, telemetry, and regression
  scenarios.
- Health output is aligned with the new operational posture.

## Opportunities

- Add sustained SLA evidence for breaker transition metrics in a future
  operations slice.
- Add provider-specific breaker thresholds after multiple production providers
  exist.
- Feed breaker posture into dashboard/alert work under the existing Lane C SLA
  tasks.
