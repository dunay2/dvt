---
id: R-20260308-TEMPORAL-OPERATIONS-01
title: Temporal lifecycle still has failure propagation and operational evidence gaps
status: Mitigating
date: 2026-03-08
last_reviewed: 2026-10-19
owners:
  - adapter-temporal
  - observability
severity: Medium
probability: Low
---

# R-20260308-TEMPORAL-OPERATIONS-01 - Temporal lifecycle still has failure propagation and operational evidence gaps

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

The 2026-10 lifecycle review found implementation gaps in addition to the
existing evidence-depth risk. The earlier statement that runtime hardening was
closed was too broad. Existing client timeout and telemetry work does not prove
that the composed process observes every terminal worker outcome correctly.

The drain correction in [#3591](https://github.com/dunay2/dvt/issues/3591) prevents
a second SDK shutdown request from bypassing the wait for an already-draining
worker. Its focused tests and native Linux SIGTERM canary pass; prepush, exact
base/head acceptance, and PR checks are recorded in the issue's candidate and
merge receipts. That correction does not resolve these separately observed paths:

- A fatal `Worker.run()` rejection is recorded by the adapter, but the composed
  host waits for process abort rather than observing that terminal worker result.
  Its readiness response can therefore remain successful after the worker exits.
- Early startup-abort returns in `runTemporalWorkerHost()` execute cleanup in
  `finally`, but can bypass the later `cleanupError` throw and lose a genuine
  cleanup failure at the caller boundary.
- Worker defaults and client timeout behavior still need sustained-load and
  production-like network evidence beyond unit and time-skipping tests.

These are existing operational risks, not new debt introduced by the bounded
drain repair. Consequences include traffic directed to a process with no running
worker, an apparently successful stop despite failed cleanup, and incomplete
incident telemetry. This risk remains `Mitigating`; #3591 does not close the
entire lifecycle or certify production-load behavior.

## Mitigation

- Enforce `connectTimeoutMs` through the Temporal SDK native connect deadline.
- Enforce `requestTimeoutMs` through abortable health checks and runtime
  lookup probes so timed-out client RPCs do not continue orphaned.
- Emit structured logs, counters, and duration histograms for worker start,
  stop, ping, and `lookupRunRef()` paths.
- Keep the time-skipping integration suite green for cancellation, failure,
  gateway, and crash-recovery behavior.
- At the SDK gateway, request shutdown only from `RUNNING`, then await the
  captured run in every state, including `STOPPED` and `FAILED` while native
  finalization is pending. Keep resource release behind that completion boundary.
- Retain focused regression coverage for duplicate SDK shutdown, concurrent
  runtime stops, ordered closers, and genuine shutdown/run-error observability.
  Use the native Linux signal canary for the in-flight activity path; its explicit
  fixture is not a claim of real DBT workload completion.
- Reconcile fatal worker exit with composed host readiness and preserve cleanup
  failures on early startup abort through separately admitted lifecycle work.
  Those changes are not implemented or accepted by this drain evidence.
- Collect production-like telemetry evidence in a follow-up pass before
  treating Temporal worker defaults as fully validated under load.

## Evidence

- `docs/evidence/critical/ED-20260308-temporal-operational-close-out.md`
- [Temporal worker shutdown drain evidence](../../evidence/ED-20261019-temporal-worker-shutdown-drain.md)
- [#3591 ARC-2 admission](https://github.com/dunay2/dvt/issues/3591#issuecomment-6278501955)
- [Lifecycle review findings](https://github.com/dunay2/dvt/issues/3604#issuecomment-6276147618)
- `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts`
- `packages/@dvt/adapter-temporal/src/TemporalClient.ts`
- `packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts`
- `packages/@dvt/adapter-temporal/src/temporalObservability.ts`
- `packages/@dvt/adapter-temporal/test/TemporalWorkerHost.lifecycle.test.ts`
- `packages/@dvt/adapter-temporal/test/smoke.test.ts`
- `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
- `apps/temporal-worker/src/host/runTemporalWorkerHost.ts`
- `apps/temporal-worker/src/runtime/temporalWorkerRuntimeHandle.ts`
- `apps/temporal-worker/test/runtime/createTemporalWorkerRuntime.test.ts`
- `apps/temporal-worker/test/host/runTemporalWorkerHost.test.ts`
