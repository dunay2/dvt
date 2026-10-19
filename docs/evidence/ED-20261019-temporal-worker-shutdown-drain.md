---
title: Temporal worker shutdown drain evidence
status: final
date: 2026-10-19
owners:
  - '@dvt/adapter-temporal'
  - dvt-temporal-worker
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts
  - packages/@dvt/adapter-temporal/test/TemporalWorkerHost.lifecycle.test.ts
  - apps/temporal-worker/test/runtime/createTemporalWorkerRuntime.test.ts
  - apps/temporal-worker/test/host/runTemporalWorkerHost.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/TemporalWorkerHost.lifecycle.test.ts
    - pnpm --filter dvt-temporal-worker exec vitest run test/runtime/createTemporalWorkerRuntime.test.ts
    - pnpm --filter dvt-temporal-worker exec vitest run test/runtime/createTemporalWorkerRuntime.srp.architecture.test.ts
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter dvt-temporal-worker typecheck
    - pnpm --filter @dvt/adapter-temporal prepare:integration
    - DVT_PG_INTEGRATION=1 pnpm --filter dvt-temporal-worker exec vitest run test/host/runTemporalWorkerHost.test.ts -t drains.an.in-flight.SDK.activity --pool=forks --maxWorkers=1 --minWorkers=1 --no-file-parallelism
---

# Temporal Worker Shutdown Drain Evidence

## Decision and authority

[#3591](https://github.com/dunay2/dvt/issues/3591) owns the correction to the
existing `StopTemporalWorkerRuntime` command. Planning DB design
`GH-3591-TEMPORAL-SHUTDOWN-DRAIN-V2` is in `review`; the same
`TF-C3-C-TEMPORAL-WORKER-LIFECYCLE` rail is retained at native revision 1.
The [original admission](https://github.com/dunay2/dvt/issues/3591#issuecomment-6277641733)
and [ARC artifact extension](https://github.com/dunay2/dvt/issues/3591#issuecomment-6278501955)
bound this work to the existing runtime intent and its required evidence.

Governing sources are `AGENTS.md`, the governance-document-rule inventory,
ADR-0001, command/query rail governance, Fowler opportunity governance, and the
[TF-C3 composition plan](../planning/proposals/mandatory/runtime-and-contracts/tf-c3-production-plugin-host-composition-plan-20260414.md).
`.arc-policy.yaml`, `tools/ci/arc-check.mjs`, and `tools/ci/doc-check.mjs` own ARC
classification and artifact requirements.

The evaluator ran on base `7b0eb3df47905fad029c20d914c5af3e61bbc718` and candidate
`6785479f37d587825497fd7fe3323436b3f72851`. It returned ARC-2 with evidence and risk
required, and rollout notes and compatibility matrix not required. This records
the executed classification; the complete final diff still requires evaluation
and acceptance.

## Failure and bounded change

The Temporal SDK and process composition both receive shutdown signals. The SDK
may already have moved the worker into `STOPPING` or `DRAINING` when
`RuntimeHandle.stop()` reaches `TemporalWorkerHost.shutdown()`. Calling the SDK
shutdown method again throws, so the previous gateway could leave the captured
run unfinished while outer cleanup proceeded.

The production change is the three-line guard around the existing SDK shutdown
request: call it only when `getState() === 'RUNNING'`. The existing await of the
captured run remains outside that guard. `STOPPING`, `DRAINING`, `DRAINED`,
`STOPPED`, and `FAILED` must all join that run when it is still pending. A
terminal SDK state alone does not prove completion of native finalization.

The adapter remains the owner of the SDK state decision. The existing runtime
`stopPromise` coalesces concurrent stop calls. There is no new API, command,
coordinator, retry policy, or override of the SDK signal handlers. Genuine
synchronous shutdown errors still propagate; the existing run-error logging,
metrics, and rejection policy are preserved rather than silently redefined.

Only `TemporalWorkerHost.ts` changes production behavior. The adapter lifecycle
spec, runtime composition spec, and host spec provide focused regression proof;
TF-C3 documents the boundary and rationale. This evidence and the existing risk
record satisfy the admitted ARC artifact scope.

## Focused proof

The adapter lifecycle spec first produced **6 failures among 16 cases** against
the old unconditional shutdown request. After the guard, **16/16 pass**. The
regressions cover already-stopping/draining/finalizing workers, `FAILED` run
finalization, and concurrent callers. Existing never-started behavior and genuine
shutdown/run-error observability remain covered.

The runtime composition spec passes **12/12**, including concurrent `stop()`
calls that wait for the host and close connection/store resources exactly once
and in order. The existing runtime SRP guard passes **5/5**. The two selected
host unit cases pass **2/2**; they are distinct from the native signal proof.

The Linux host canary passes **1/1**, taking 8.060 seconds for the case and
16.65 seconds for the Vitest run. Three other cases in that file were outside
the selector. It uses an actual Temporal SDK worker and server, native
connection, PostgreSQL stores, composed runtime, and operational server.
`DVT_PG_URL` points to the owned throwaway PostgreSQL instance.

An explicit executor fixture holds a real in-flight SDK activity at the
existing test seam. SIGTERM reaches the SDK first; the application stop then
observes an already-draining worker. The fixture releases only after asserting
native cancellation and absence of premature resource closure, and throws the
actual cancellation reason. It does not simulate SDK state or replace
`Worker.run()` with a delayed promise. It is not evidence of successful DBT
execution or a substitute for the existing DBT canary.

The observed SDK sequence is
`RUNNING -> STOPPING -> DRAINING -> DRAINED -> STOPPED`. The asserted receipt is:

```text
Worker.run settles
connection.close
state-store.close
plan-reader.close
operational-server.stop
```

Connection/store observers also assert that the original native run has settled
before closing. The case is explicitly Linux-only with `DVT_PG_INTEGRATION=1`
and a 120-second ceiling. Windows unit execution is not reported as POSIX signal
evidence. Canonical Linux preparation passed for all 10 adapter build targets
and all 18 worker dependency targets.

## Validation record and limits

| Check                                                                              | Result                                                                           |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Adapter lifecycle spec                                                             | RED: 6 failed / 16; GREEN: 16 passed / 16                                        |
| Runtime composition spec                                                           | 12 passed / 12                                                                   |
| Existing runtime SRP architecture spec                                             | 5 passed / 5                                                                     |
| Selected host unit cases                                                           | 2 passed / 2                                                                     |
| Selected native Linux SIGTERM canary                                               | 1 passed / 1; 3 unrelated cases outside selector                                 |
| ESLint on the four changed TypeScript files                                        | PASS                                                                             |
| `pnpm --filter @dvt/adapter-temporal typecheck`                                    | PASS, including its normal pretypecheck and test types                           |
| `pnpm --filter dvt-temporal-worker typecheck`                                      | PASS, including its normal pretypecheck and test types                           |
| `pnpm --filter @dvt/adapter-temporal prepare:integration`                          | PASS on Linux, 10 build targets                                                  |
| `node scripts/build-workspace-runtime-deps.cjs dvt-temporal-worker`                | PASS on Linux, 18 dependency targets                                             |
| Final `pnpm verify:prepush`, exact base/head DB acceptance, and required PR checks | Recorded against the final candidate in the #3591 publication and merge receipts |

The first Linux attempt failed before entering the held activity:
`INVALID_WORKFLOW_INPUT: maxContinueAsNewPayloadBytes_must_be_positive_integer`.
The subsequent wait for activity entry timed out. The canary input had omitted
two required workflow control fields. Adding `maxContinueAsNewPayloadBytes:
500_000` and `continueAsNewAfterLayerCount: 100`, matching the existing host DBT
case and workflow contract, enabled the successful rerun. This initial fixture
failure is not recorded as either a drain regression or a passing proof.

The successful Linux snapshot was main `7b0eb3d` plus candidate `6785479f3` and
that two-field fixture correction. The production guard was unchanged. The
package typechecks also included the corrected fixture; their log filenames
referencing `6785479f3` do not establish a clean exact-SHA run. The later main
integration contains a CodeQL-only change, outside this runtime proof. Final
acceptance must identify the resulting complete base/head explicitly.

The Contracts & Determinism classifier routes schema and golden jobs out of
scope for the original five source paths. ARC-2 still lists those categories in
`requiredChecks`; a scope-routed skip is not a successful execution. Reevaluate
routing for the complete final diff and retain required merge checks.

No rule is disabled or relaxed, no hook bypass is introduced, and no debt entry,
production stub, fake provider, or success placeholder is added. Validation is
deliberately bounded to the affected lifecycle and native signal path.
Fatal worker exit propagation/readiness and cleanup-error loss through early
startup-abort returns remain existing defects outside this drain correction;
the [Temporal operational risk](../risk-register/adapters/R-20260308-temporal-operational-hardening-residuals.md)
continues to record them. This is the final focused test report, not a claim of
complete lifecycle hardening. Publication and integration require the separate
committed-candidate receipts in #3591.
