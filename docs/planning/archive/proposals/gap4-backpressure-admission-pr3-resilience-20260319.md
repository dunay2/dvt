---
title: Gap 4 PR3 Resilience Envelope
status: Done
owner: Architecture / API / Delivery
last_reviewed: 2026-03-26
planning_type: proposal
---

# Gap 4 PR3 Resilience Envelope

## Goal

Wrap the raw snapshot source with bounded resilience so admission can degrade
predictably instead of flapping under storage faults.

## Scope

This PR adds:

- `CachedBackpressureStore`
- `CircuitBreakingBackpressureStore`
- last-known-good fallback
- fallback persistence across hot restart
- low-TTL multi-replica operating assumptions

Implementation note:

- prefer wrapping a mature circuit-breaker library rather than hand-rolling the
  breaker state machine unless a concrete integration constraint blocks it
- first candidate to evaluate:
  `opossum`

## In Scope

- cache TTL behavior
- circuit breaker thresholds
- half-open recovery
- persisted fallback freshness validation
- replica consistency guardrails
- mature-library breaker selection or explicit justification for not using one

## Out Of Scope

- projected snapshot table
- dynamic `Retry-After`
- operability dashboards

## File Areas

- API infrastructure adapters
- config loading
- resilience tests
- small local persistence helper for fallback snapshot

## Verification Target

- timeout and transport failure tests
- circuit open and close tests
- restart-with-fallback tests
- `pnpm --filter dvt-api test`

## Checklist

- [x] cache TTL is configurable and tested
- [x] circuit opens after 5 consecutive failures
- [x] half-open uses a single probe
- [x] stale fallback is rejected
- [x] hot restart can read last-known-good fallback
- [x] multi-replica limitation is documented
- [x] sticky-session recommendation is documented

## Resolution Table

| Item               | Status      | Notes                                                                       |
| ------------------ | ----------- | --------------------------------------------------------------------------- |
| Cache wrapper      | Implemented | Low TTL, instance-local, and fallback snapshots are not re-cached           |
| Circuit breaker    | Implemented | 5 failures, 30s open, 1 probe, and fail-counting stays scoped to live reads |
| Persisted fallback | Implemented | Advisory, freshness-enforced, and reused across hot restart per replica     |
| Review readiness   | Done        | Baseline merged; remains independent from projected snapshot work           |
