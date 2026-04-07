# ADR-0015 — getRunStatus Read Model Separation

Status: Accepted  
Date: 2026-02-20

## Context

`WorkflowEngine.getRunStatus` currently calls the provider adapter synchronously (with long timeouts), coupling UI polling latency to provider health and introducing operational instability.

## Decision

- `getRunStatus(runHandle)` returns **projected state from the event log only**.
- Provider substatus enrichment is a separate optional endpoint (name deferred to implementation).
  - It MUST be distinct from `getRunStatus`.
- The default read path MUST NOT call the provider.
- If the optional enrichment path times out or the provider status lookup fails, the enrichment call MUST fail the request.
  - It MUST NOT silently return a partial response.
  - It MUST NOT silently downgrade to `getRunStatus()` inside the same call.
  - Callers that want guaranteed status availability MUST call `getRunStatus()` explicitly.

Circuit breakers are applied only on the optional enrichment path. The engine-level circuit breaker in the main read path can be removed.

## Consequences

- Stable UI polling independent of provider health.
- Clear separation between authoritative state (event log) and enrichment (provider view).
- Eventual consistency remains: provider status may differ transiently until events arrive.
- SLA separation is explicit:
  - `getRunStatus()` is the stable status path.
  - `enrichRunStatus()` is best-effort diagnostic enrichment and may fail independently.
