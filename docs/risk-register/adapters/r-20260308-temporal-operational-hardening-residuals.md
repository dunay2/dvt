---
id: R-20260308-TEMPORAL-OPERATIONS-01
title: Temporal lifecycle still has failure propagation and operational evidence gaps
status: Mitigating
date: 2026-03-08
last_reviewed: 2026-10-20
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
merge receipts. The separately admitted
[#3694](https://github.com/dunay2/dvt/issues/3694) addresses these observed paths:

- A fatal `Worker.run()` rejection is recorded by the adapter, but the composed
  host waits for process abort rather than observing that terminal worker result.
  Its readiness response can therefore remain successful after the worker exits.
- Early startup-abort returns in `runTemporalWorkerHost()` execute cleanup in
  `finally`, but can bypass the later `cleanupError` throw and lose a genuine
  cleanup failure at the caller boundary.
- A terminal error recorder can itself throw through an injected logger or
  counter, masking the original SDK failure unless both values are retained.

The #3694 implementation exposes the retained SDK outcome, withdraws readiness
through the existing monitor, preserves startup-abort cleanup errors, and rejects
startup after runtime stop begins. Focused lifecycle tests pass for those paths,
including the additional diagnostic-failure regressions. Final candidate gates
and native graceful/forced-shutdown proof remain under verification in its
evidence record.
This is mitigation in review, not an integrated-production acceptance claim.

Two existing boundaries remain outside that correction:

- Worker defaults and client timeout behavior still need sustained-load and
  production-like network evidence beyond unit and time-skipping tests.
- Direct concurrent calls to adapter `start()` while native worker creation is
  pending are not coordinated by this slice. The composed runtime coalesces its
  admitted startup calls, but that does not establish the same guarantee for
  direct adapter callers.

These are existing operational risks, not new debt introduced by the bounded
lifecycle repair. Consequences include traffic directed to a process with no
running worker, hidden cleanup or diagnostic failures, and unverified behavior
outside the exercised startup and workload boundaries. This risk remains
`Mitigating`; neither lifecycle correction certifies production-load behavior.

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
- Retain one fulfilled SDK completion result and propagate its original failure
  through the composed host, including an abort/fatal race. Preserve a separate
  diagnostic failure when recording also throws; never replace the SDK cause.
- Route every startup-abort checkpoint through the same cleanup owner and error
  epilogue. Reject startup on a runtime handle once stop begins, while retaining
  the existing coalescing of admitted starts.
- Require the #3694 native graceful/forced-shutdown receipts and final candidate
  gates before accepting that termination correction. Its activity fixture does
  not certify DBT workload completion or direct adapter concurrent startup.
- Collect production-like telemetry evidence in a follow-up pass before
  treating Temporal worker defaults as fully validated under load.

## Evidence

- `docs/evidence/critical/ED-20260308-temporal-operational-close-out.md`
- [Temporal worker shutdown drain evidence](../../evidence/ED-20261019-temporal-worker-shutdown-drain.md)
- [Temporal worker terminal outcome and cleanup evidence](../../evidence/ED-20261020-temporal-worker-termination.md)
- [#3694 lifecycle admission](https://github.com/dunay2/dvt/issues/3694#issuecomment-6279831471)
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
