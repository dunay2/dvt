---
title: Temporal worker terminal outcome and cleanup evidence
status: review
date: 2026-10-20
owners:
  - '@dvt/adapter-temporal'
  - dvt-temporal-worker
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts
  - packages/@dvt/adapter-temporal/src/index.ts
  - apps/temporal-worker/src/runtime/runtimeTypes.ts
  - apps/temporal-worker/src/runtime/temporalWorkerRuntimeHandle.ts
  - apps/temporal-worker/src/host/runTemporalWorkerHost.ts
  - packages/@dvt/adapter-temporal/test/TemporalWorkerHost.lifecycle.test.ts
  - apps/temporal-worker/test/runtime/createTemporalWorkerRuntime.test.ts
  - apps/temporal-worker/test/host/runTemporalWorkerHost.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/TemporalWorkerHost.lifecycle.test.ts --maxWorkers 1
    - pnpm --filter dvt-temporal-worker exec vitest run test/runtime/createTemporalWorkerRuntime.test.ts test/runtime/createTemporalWorkerRuntime.srp.architecture.test.ts test/host/runTemporalWorkerHost.test.ts --maxWorkers=1 --no-file-parallelism
    - pnpm --filter dvt-temporal-worker exec vitest run test/host/runTemporalWorkerHost.test.ts -t "worker termination propagation" --maxWorkers=1 --no-file-parallelism
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter dvt-temporal-worker typecheck
    - node scripts/build-workspace-runtime-deps.cjs dvt-temporal-worker
    - pnpm --filter dvt-temporal-worker exec tsc -p tsconfig.json --noEmit
    - pnpm --filter dvt-temporal-worker exec tsc -p test/tsconfig.json --noEmit
---

# Temporal Worker Terminal Outcome And Cleanup Evidence

## Authority and scope

[#3694](https://github.com/dunay2/dvt/issues/3694) and its
[admitted design](https://github.com/dunay2/dvt/issues/3694#issuecomment-6279831471)
govern this correction. Planning DB design `GH-3694-TEMPORAL-TERMINATION` retains
the `TF-C3-C-TEMPORAL-WORKER-LIFECYCLE` owner. `StopTemporalWorkerRuntime` is
extended at native revision 4; `StartTemporalWorkerRuntime` catalogs the existing
startup intent. `DescribeTemporalWorkerOperationalReadiness` retains its existing
canonical owner and read model, with a reference from this lifecycle feature.
The final Stop CAS 3-to-4 update adds the four implemented symbols without
changing authority, source provenance, scopes, or historical validation cycles.

Governing sources are `AGENTS.md`, the governance-document-rule inventory,
ADR-0001, command/query rail governance, Fowler opportunity governance, and the
[TF-C3 composition plan](../planning/proposals/mandatory/runtime-and-contracts/tf-c3-production-plugin-host-composition-plan-20260414.md).
The existing monitor, operational HTTP route, SDK signal policy, and server
entrypoint remain the owners of their respective behavior.

The canonical evaluator classified candidate
`3363c9ff24e6acc4fc25be3197a7aa007a4098d1` against `origin/main` as **ARC-2**:
evidence and risk are required; rollout notes and a compatibility matrix are not.
`.arc-policy.yaml`, `tools/ci/arc-check.mjs`, and `tools/ci/doc-check.mjs` own that
decision. This executed classification precedes the diagnostic-failure addendum
and final artifacts; final acceptance requires the complete committed diff.

## Failure and correction

The adapter previously recorded a rejected `Worker.run()` and cleared its active
state without exposing that terminal result. The process host waited only for
abort, so a dead worker could retain successful readiness. Separately, startup
abort returns executed `finally` but bypassed the cleanup-error epilogue.
Runtime startup could also reuse a handle whose retained stop promise already
represented closed resources.

The adapter now exposes a retained, fulfilled `getRunCompletion()` result:
`completed`, or `failed` with the original unknown error. Clearing the active
worker does not erase it. The runtime delegates the same promise, and successful
startup without a completion is an invariant failure. There is no polling,
callback failure channel, synthetic pending result, or second lifecycle machine.

The host observes SDK completion and process abort, withdraws readiness through
the existing monitor, and reconciles a terminal failure even when abort wins the
initial race. Normal SDK completion remains successful. Every startup-abort path
reaches one cleanup owner and the failure epilogue; real primary and cleanup
errors remain visible. The runtime rejects startup once stop has begun, before
the already-started shortcut. Existing concurrent startup coalescing is retained.

The [diagnostic addendum](https://github.com/dunay2/dvt/issues/3694#issuecomment-6280041137)
requires completion to remain fulfilled even if an
injected logger or counter throws while recording the SDK error. The original
SDK value remains `error`; an optional `diagnosticError` preserves the additional
failure by property presence, including thrown `undefined` or `null`. The host
reports both in SDK-then-diagnostic order. Its focused regression work is tracked
separately below; this requirement does not authorize silent diagnostic loss.

The #3591 drain boundary remains: only `RUNNING` initiates SDK shutdown, and
resource cleanup waits for the original run to settle. Run failure is reported
through the terminal result rather than duplicated as a shutdown failure.

## Focused validation

| Executed check                                                  | Result and boundary                                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Adapter lifecycle regression                                    | RED: 7 failures / 23; GREEN: 23 / 23 before diagnostic addendum                                         |
| Runtime lifecycle regression                                    | RED: 5 failures / 17; GREEN: 17 / 17                                                                    |
| Host terminal propagation regression                            | Initial RED: 9 failures; initial GREEN: 13 host unit cases                                              |
| Existing runtime SRP guard                                      | 5 / 5                                                                                                   |
| Combined worker command in frontmatter                          | 35 passed; 3 provider-conditional cases excluded from this Windows run                                  |
| Additional host failure-boundary cases                          | RED: 3 failures; GREEN: 14 selected termination-propagation cases, 5 other cases excluded               |
| Adapter diagnostic-failure regressions                          | RED: 6 failures / 29, including real orphan rejections; GREEN: 29 / 29                                  |
| Adapter and worker package typechecks                           | PASS before the diagnostic addendum, with their normal prehooks                                         |
| Final adapter package typecheck                                 | PASS after the diagnostic addendum, including its normal prehook and test types                         |
| Canonical worker runtime dependency build                       | PASS: 18 / 18 targets                                                                                   |
| Final worker source and test typechecks                         | PASS for both `tsconfig.json` and `test/tsconfig.json`, after canonical dependency preparation          |
| Final affected ESLint                                           | PASS for the adapter changes and five worker TypeScript files, with no warnings                         |
| Native Linux graceful SIGTERM case                              | PASS: 1 / 1, 12.633 seconds, on candidate `147b54977`                                                   |
| Native Linux forced-shutdown case                               | PASS after correcting the oracle: 1 / 1, 6.581 seconds; Vitest 11.03 seconds; 18 cases outside selector |
| Native-test lint and test types after the oracle correction     | PASS: ESLint and `tsc -p test/tsconfig.json --noEmit`                                                   |
| Planning DB implementation acceptance                           | PASS: 595 manifests, base `70c985d18` / head `147b54977`, after symbol reconciliation                   |
| ARC and evidence/risk validation                                | PASS: ARC-2 and doc-check on `147b54977`                                                                |
| Final committed-head acceptance, pre-push and required CI gates | Subsequent receipts belong to #3694; no future pass is asserted here                                    |

The adapter command above produced the initial RED/GREEN. Runtime RED used
`pnpm --filter dvt-temporal-worker exec vitest run test/runtime/createTemporalWorkerRuntime.test.ts --maxWorkers=1 --no-file-parallelism`.
Host RED and the additional host GREEN used the existing
`worker termination propagation` selector in the host file. The combined worker
command produced the 35-case GREEN receipt; these are overlapping receipts, not
independent totals. No suite-wide pass is claimed.

The final local type receipts are
`pnpm --filter @dvt/adapter-temporal typecheck`, followed on the worker side by
`node scripts/build-workspace-runtime-deps.cjs dvt-temporal-worker`,
`pnpm --filter dvt-temporal-worker exec tsc -p tsconfig.json --noEmit`, and
`pnpm --filter dvt-temporal-worker exec tsc -p test/tsconfig.json --noEmit`.
Both worker compiler invocations exited successfully. This distinguishes the
final compiler checks from the earlier complete package-script receipt; it does
not imply a second execution of that package script after the addendum.

Final worker lint passed with no warnings using:

```text
pnpm exec eslint apps/temporal-worker/src/runtime/runtimeTypes.ts apps/temporal-worker/src/runtime/temporalWorkerRuntimeHandle.ts apps/temporal-worker/src/host/runTemporalWorkerHost.ts apps/temporal-worker/test/runtime/createTemporalWorkerRuntime.test.ts apps/temporal-worker/test/host/runTemporalWorkerHost.test.ts --max-warnings 0
```

## Native proof and remaining limits

The two Linux-only cases use the actual Temporal SDK worker/server, native
connection, PostgreSQL stores, composed runtime, and operational HTTP server.
An explicit executor fixture holds a real activity; it does not prove successful
DBT execution. The graceful case retains the SIGTERM drain regression. The
forced case configures the SDK's `shutdownForceTime`, calls its original shutdown,
without application abort. The first native execution confirmed the deadline's
`GracefulShutdownPeriodExpiredError` in SDK diagnostics, but `Worker.run()` rejected
with `IllegalStateError: Worker still in use` from native finalization. The initial
canary incorrectly assumed the diagnostic error class was also the public promise
rejection. A diagnostic rerun also failed that assumption and exposed the actual
finalization error; neither failed execution is reported as a pass. The corrected
oracle compares the host failure by identity with the actual original
`Worker.run()` rejection, while requiring SDK state `FAILED`, a real cancelled
activity, and `/readyz` returning 503 before resource teardown. This
distinguishes SDK finalization behavior from an application error substitution.

The corrected forced case passed all those assertions and the ordered-closer
receipt: original `Worker.run()` settlement, connection close, state-store close,
plan-reader close, and operational-server stop. The receipt is
`.dvt/temporal-failure-closeout/native-forced-green.log`: one selected case passed
in 6.581 seconds, the Vitest command completed in 11.03 seconds, and 18 cases were
outside its selector. The graceful case had already passed in 12.633 seconds on
`147b54977`. These are separate executions, not a claim that the initial combined
run passed both cases.

The final forced proof used production from `147b54977` with only the host-test
overlay changed. That file's SHA-256 was
`37b654cc6008b23a7b57a29301ea412e9392bdfa92c3f0395780cd1d15871ef4`.
Production was unchanged; host-test ESLint and the worker test TypeScript
configuration passed after the oracle correction. Final base/head acceptance
belongs to the subsequent committed candidate and its issue receipts.

Both cases require the original `Worker.run()` settlement before connection,
state store, plan reader, and operational-server closure. Their cleanup releases
fixture gates and has bounded joins. Linux, `DVT_PG_INTEGRATION=1`, owned
throwaway PostgreSQL, and canonical runtime dependency preparation are required.
Windows unit results are not evidence of POSIX signals or native failure.

No hook has been disabled, no rule relaxed, and no new debt entry or production
stub introduced. The
[existing operational risk](../risk-register/adapters/r-20260308-temporal-operational-hardening-residuals.md)
continues to cover production-like load/network evidence and direct adapter
concurrent startup outside the composed runtime's coalescing boundary. This
review records completed checks and their limits; it does not yet declare the
candidate ready for integration.
