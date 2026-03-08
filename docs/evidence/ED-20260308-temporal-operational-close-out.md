---
title: ED-20260308 - Temporal adapter operational close-out
status: Final
date: 2026-03-08
owners: Engine / Runtime
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
  - packages/@dvt/adapter-temporal/src/TemporalClient.ts
  - packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts
  - packages/@dvt/adapter-temporal/src/temporalObservability.ts
  - packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts
  - packages/@dvt/adapter-temporal/test/TemporalWorkerHost.lifecycle.test.ts
  - packages/@dvt/adapter-temporal/test/smoke.test.ts
evidence:
  tests:
    - packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts
    - packages/@dvt/adapter-temporal/test/TemporalWorkerHost.lifecycle.test.ts
    - packages/@dvt/adapter-temporal/test/smoke.test.ts
    - packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
  code:
    - packages/@dvt/adapter-temporal/src/TemporalAdapter.ts
    - packages/@dvt/adapter-temporal/src/TemporalClient.ts
    - packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts
---

# Evidence Doc: Temporal adapter operational close-out

## Scope

This evidence closes the remaining Phase 1 hardening work for the Temporal adapter runtime package.

- Temporal client connection timeouts are now enforced in code.
- Worker lifecycle now emits structured diagnostics on start, shutdown, and unexpected run exit.
- `lookupRunRef()` and `ping()` now emit observability signals instead of behaving as opaque provider calls.

## Delivered Changes

1. Client timeout policy is active, not declarative only.
   - `connectTimeoutMs` now configures the Temporal SDK native connect deadline.
   - `requestTimeoutMs` now bounds client liveness checks through abortable `ensureConnected()` calls.
2. Worker host operational diagnostics are implemented.
   - structured logs on start, success, failure, and shutdown
   - counters and duration histograms
   - explicit error reporting when `worker.run()` exits unexpectedly
   - shutdown clears internal state even after run failure
3. Provider-side maintenance diagnostics are implemented.
   - `lookupRunRef()` records `found` / `missing` / `error`
   - `ping()` records success/failure and duration
4. Regression coverage was expanded.
   - client timeout and health-check tests
   - worker observability and failure-path tests
   - `lookupRunRef()` observability assertions
   - time-skipping integration coverage remains part of runtime closure verification

## Acceptance Notes

- Build: `pnpm --filter @dvt/adapter-temporal build`
- Runtime closure verification: `pnpm test:adapter-temporal` and `pnpm test:adapter-temporal:integration`
- Package result: build green, unit suite green, integration suite green, no remaining Phase 1 implementation gaps in `@dvt/adapter-temporal`

## Residual Follow-up

- Sustained load evidence for Temporal worker defaults should be gathered from integration or production-like telemetry, not from unit tests.
- `AbortSignal` support for `describe()` remains dependent on Temporal SDK capabilities and is not a blocker for Phase 1 closure.
- Cross-adapter timeout harmonization can proceed as a separate consistency pass; it no longer blocks the Temporal adapter itself.
- Residual operational risk is tracked in `docs/risk-register/adapters/R-20260308-temporal-operational-hardening-residuals.md`.

## Closure Decision

G1 is closed as of 2026-03-08.
