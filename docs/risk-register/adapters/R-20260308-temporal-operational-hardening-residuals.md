---
id: R-20260308-TEMPORAL-OPERATIONS-01
title: Temporal runtime hardening is closed, but sustained-load behavior still depends on production telemetry
status: Mitigating
date: 2026-03-08
owners:
  - adapter-temporal
  - observability
severity: Medium
probability: Low
---

# R-20260308-TEMPORAL-OPERATIONS-01 - Temporal runtime hardening is closed, but sustained-load behavior still depends on production telemetry

## Context

`@dvt/adapter-temporal` now enforces client connect and request timeouts, emits
structured worker lifecycle diagnostics, and records observability signals for
`lookupRunRef()` and `ping()`.

Connection hardening now uses the Temporal SDK native `connectTimeout` path,
and health checks plus runtime `lookupRunRef()` probes are cancelled with
`AbortSignal` instead of relying on a caller-only promise race.

The package also has expanded unit coverage plus a time-skipping integration
lane that exercises start, cancel, retry, failure, gateway, and restart
behavior.

## Risk

The remaining operational risk is no longer missing implementation. It is
evidence depth: worker defaults and client timeout behavior can still drift
under sustained load or production-like network conditions that are not fully
represented by unit and time-skipping integration tests.

If that happens, the adapter could remain functionally correct while still
degrading through slow liveness checks, noisy failure signals, or incomplete
operational telemetry during incidents.

## Mitigation

- Enforce `connectTimeoutMs` through the Temporal SDK native connect deadline.
- Enforce `requestTimeoutMs` through abortable health checks and runtime
  lookup probes so timed-out client RPCs do not continue orphaned.
- Emit structured logs, counters, and duration histograms for worker start,
  stop, ping, and `lookupRunRef()` paths.
- Keep the time-skipping integration suite green for cancellation, failure,
  gateway, and crash-recovery behavior.
- Collect production-like telemetry evidence in a follow-up pass before
  treating Temporal worker defaults as fully validated under load.

## Evidence

- `docs/evidence/critical/ED-20260308-temporal-operational-close-out.md`
- `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts`
- `packages/@dvt/adapter-temporal/src/TemporalClient.ts`
- `packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts`
- `packages/@dvt/adapter-temporal/src/temporalObservability.ts`
- `packages/@dvt/adapter-temporal/test/TemporalWorkerHost.lifecycle.test.ts`
- `packages/@dvt/adapter-temporal/test/smoke.test.ts`
- `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
