# ADR-0015 — getRunStatus Read Model Separation

Status: Proposed  
Date: 2026-02-20

## Context

`WorkflowEngine.getRunStatus` currently calls the provider adapter synchronously (with long timeouts), coupling UI polling latency to provider health and introducing operational instability.

## Decision

- `getRunStatus(runHandle)` returns **projected state from the event log only**.
- Provider substatus enrichment is a separate optional endpoint (name deferred to implementation).
  - It MUST be distinct from `getRunStatus`.
- The default read path MUST NOT call the provider.

Circuit breakers are applied only on the optional enrichment path. The engine-level circuit breaker in the main read path can be removed.

## Consequences

- Stable UI polling independent of provider health.
- Clear separation between authoritative state (event log) and enrichment (provider view).
- Eventual consistency remains: provider status may differ transiently until events arrive.
