---
title: G5 / US-G5.4 Operability And Ownership Hardening Plan
status: Review
owner: Architecture / Engine / Platform
last_reviewed: 2026-03-11
planning_type: proposal
---

# G5 / US-G5.4 Operability And Ownership Hardening Plan

Execution plan for the QA follow-up that remains after `G5.3` correctness
hardening.

- Gap: `G5 - Outbox worker independiente`
- Current status source: [`GAP_EXECUTION_PLANS.md`](GAP_EXECUTION_PLANS.md)
- Canonical gap plan: [`G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md`](G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md)
- Predecessor hardening slice: [`G5 / US-G5.3 Correctness Hardening Plan`](G5-US-G5.3-CORRECTNESS-HARDENING-PLAN.md)
- Risk record: [`R-20260311-G5-4-QA-01`](../../risk-register/quality/R-20260311-g5-4-operability-and-fencing-residuals.md)
- Ordering baseline: [`ADR-0009_Outbox_Ordering.md`](../../adr/ADR-0009_Outbox_Ordering.md)

## Working Rule

This document is the execution contract for the next `G5` operability slice.

While this slice is in progress:

1. scope changes update this file first;
2. no closeout claims are made from package tests alone;
3. ownership, readiness, and downstream duplicate handling stay explicit;
4. multi-worker rollout remains out of scope until a real fence exists.

## Objective

Close the operational hardening gaps that remain after `G5.3` without widening
scope into a generic subscriber platform or the full `ADR-0009` multi-worker
strategy.

The concrete target is to make the standalone worker operationally defensible
for single-owner rollout by proving:

- freshness-aware readiness,
- immediate readiness withdrawal during shutdown,
- explicit ownership boundaries,
- explicit downstream duplicate-handling expectations,
- reclaim and backlog behavior in a real PostgreSQL lane.

## Root Problem

`G5.3` proved more of the outbox correctness story, but it did not yet close
the operability story that production rollout depends on.

Current inspection shows four remaining gaps:

1. `ready=true` depends on runtime state only.
   - If the last completed tick left the worker in `idle` or `draining`, the
     process can keep advertising readiness even if no new tick is completing.
2. Shutdown does not yet have a distinct externally visible withdrawal state.
   - Bootstrap interruption is now correct, but readiness is not withdrawn by a
     dedicated `stopping` state or freshness rule.
3. Active ownership still depends on rollout discipline instead of a runtime
   fence.
   - That is acceptable for single-owner rollout only if the limit stays
     explicit and enforced in docs and deployment wiring.
4. Downstream duplicate handling and reclaim/backlog evidence are still not
   formalized enough.
   - The worker proves at-least-once delivery, but not yet the consumer
     contract or the production behavior of orphan recovery under load.

## Comparative Signals From Similar Systems

These references are `reference-only` and do not override repo governance, but
they reinforce the same failure classes:

- [Airflow health checks](https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/logging-monitoring/check-health.html)
  use heartbeat freshness rather than process existence alone.
- [Airflow scheduler HA](https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/scheduler.html)
  allows multiple schedulers only with explicit DB locking guarantees.
- [Dagster daemon hang incidents](https://github.com/dagster-io/dagster/issues/28910)
  show that a queue daemon can stop making progress while still looking alive.
- [Dagster duplicate run_key issue](https://github.com/dagster-io/dagster/issues/26753)
  shows that dedupe assumptions fail unless the boundary is made explicit and
  tested.
- [Celery worker shutdown stages](https://docs.celeryq.dev/en/stable/userguide/workers.html)
  reinforce the need to distinguish warm shutdown from later termination phases.
- [Temporal graceful shutdown bug](https://github.com/temporalio/sdk-python/issues/783)
  shows that work can still target a worker that is already exiting if the
  system does not withdraw ownership quickly enough.

The plan treats those as supporting signals, not as normative requirements.

## Governing Invariants

Implementation and validation for this slice MUST preserve the following:

1. `ready=true` means the active owner is currently allowed to drain records and
   its tick loop is fresh enough to trust operationally.
2. Shutdown begins by withdrawing readiness, not by waiting for a later cleanup
   phase to make the process unavailable.
3. A stale or hung tick loop must not remain externally `ready`.
4. Active ownership must remain explicit per environment.
5. Until a real fence lands, `G5` remains single-owner only.
6. Duplicate delivery remains acceptable at the worker boundary, but the
   downstream contract must prove idempotent handling keyed by the existing
   envelope identity fields.
7. Claim expiry and orphan recovery must not violate same-`runId` no-bypass
   semantics already pinned by `G5.3`.
8. Backlog pressure must not hide starvation or silent stalls behind healthy
   process metrics.

## Explicit Non-Goals

This slice MUST NOT be presented as:

- multi-worker correctness or shard strategy completion;
- a new outbox schema family;
- a generic downstream subscriber framework;
- exactly-once end-to-end delivery;
- a replacement for the existing `G5.3` correctness hardening work.

## Selected Approach

The chosen approach is to harden the current seams in the standalone worker
instead of redesigning the platform:

- add freshness-aware readiness and a distinct `stopping` state;
- keep single-owner rollout as the only supported mode until fencing exists;
- make future fencing a first-class runtime seam instead of an implicit deploy
  convention;
- publish the downstream duplicate-handling contract and prove it with focused
  tests;
- collect minimal real PostgreSQL reclaim and backlog evidence before claiming
  operability closure.

Rejected alternatives:

1. Treat these findings as documentation only.
   - Rejected because at least two findings are runtime-behavior invariants, not
     wording nits.
2. Jump directly to full multi-worker support.
   - Rejected because that widens scope into `PR-5` of the canonical `G5` plan.
3. Keep readiness based on process liveness only.
   - Rejected because comparable systems repeatedly fail in that mode.

## Scope

### In Scope

- `apps/outbox-worker/src/host/runOutboxWorkerHost.ts`
- `apps/outbox-worker/src/runtime/createOutboxWorkerRuntime.ts`
- `apps/outbox-worker/src/runtime/OutboxWorkerRuntime.ts`
- `apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts`
- `apps/outbox-worker/src/ops/OperationalServer.ts`
- `apps/outbox-worker/test/host/runOutboxWorkerHost.test.ts`
- `apps/outbox-worker/test/runtime/createOutboxWorkerRuntime.test.ts`
- `apps/outbox-worker/test/runtime/OutboxWorkerRuntime.test.ts`
- `apps/outbox-worker/test/canary/standaloneCanaryAcceptance.test.ts`
- `packages/@dvt/adapter-postgres/test/smoke.test.ts`
- `apps/outbox-worker/README.md`
- `docs/runbooks/outbox-worker-g5.md`
- `docs/risk-register/quality/*` and `docs/planning/gaps/*` touched by this slice

### Out Of Scope

- full multi-worker rollout or shard coordination
- outbox schema redesign
- generalized delivery channels
- unrelated API or planner work

## Roadmap

| Step | Name                                            | Purpose                                                                                                                             | Exit signal                                                                                                                             |
| ---- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Freeze operability invariants in tests and docs | Make the stale-readiness, shutdown, ownership, duplicate-handling, and reclaim expectations explicit before widening implementation | Tests, docs, and monitor language define when the worker is `ready`, when it is merely alive, and when duplicate delivery is acceptable |
| 2    | Harden readiness and shutdown withdrawal        | Prevent alive-but-stale or shutting-down workers from advertising readiness                                                         | Monitor and operational endpoints expose freshness-aware readiness and a distinct shutdown-withdrawal state                             |
| 3    | Make ownership boundary explicit                | Keep single-owner rollout honest now and prepare a future fencing seam without claiming multi-worker support                        | Runtime and docs clearly express ownership mode, refusal behavior, and the unsupported nature of dual-active rollout                    |
| 4    | Prove downstream dedupe and reclaim behavior    | Close the remaining production-facing uncertainty around duplicates, orphan recovery, and backlog pressure                          | Duplicate-handling contract is explicit and real PostgreSQL evidence exists for reclaim/backlog sanity                                  |
| 5    | Validate and sync repository state              | Turn the slice into executable evidence and accurate status                                                                         | Canonical commands pass, docs are synced, and open residual risk is reported honestly                                                   |

## Step Plan With Definition Of Done

### Step 1 - Freeze operability invariants

Goal:
Make the operator-visible behavior explicit before or alongside code changes.

Definition of Done:

- [ ] tests define the difference between `up`, `ready`, and `stopping`
- [ ] tests define stale-tick behavior instead of assuming all alive workers are ready
- [ ] docs state explicitly that duplicate delivery is acceptable at the worker
      boundary and must be absorbed downstream
- [ ] docs state explicitly that single-owner rollout remains required today

### Step 2 - Harden readiness and shutdown withdrawal

Goal:
Make readiness reflect real drainability rather than only the last successful
state transition.

Definition of Done:

- [ ] monitor exposes a freshness-aware readiness rule
- [ ] shutdown transitions the worker into a non-ready state immediately
- [ ] readiness fails when the last completed tick becomes older than the chosen threshold
- [ ] metrics expose enough timestamps or gauges to explain why readiness is false
- [ ] tests cover stale loop, clean shutdown, and shutdown-during-drain behavior

### Step 3 - Make the ownership boundary explicit

Goal:
Remove ambiguity around who may drain the outbox in an environment.

Definition of Done:

- [ ] runtime and docs clearly state that dual-active ownership is unsupported today
- [ ] a future fence or lease seam is identified explicitly in code or plan text
- [ ] active owner state is observable in logs and metrics
- [ ] if ownership is lost or unavailable, readiness is withdrawn and delivery does not start
- [ ] no wording implies that env selection alone is equivalent to safe multi-owner coordination

### Step 4 - Prove downstream dedupe and reclaim behavior

Goal:
Close the remaining consumer-facing and recovery-facing ambiguity.

Definition of Done:

- [ ] the downstream consumer contract states how duplicates are identified and absorbed
- [ ] a test or canary path proves duplicate publication is handled idempotently by the supported downstream target
- [ ] real PostgreSQL evidence covers orphaned claim recovery after interruption
- [ ] real PostgreSQL evidence includes at least minimal backlog sanity for the hardened claim path
- [ ] reclaim and backlog behavior do not violate same-`runId` no-bypass semantics

### Step 5 - Validate and sync repository state

Goal:
Leave the slice with executable proof and truthful status docs.

Definition of Done:

- [ ] `pnpm --filter dvt-outbox-worker typecheck` passes
- [ ] `pnpm --filter dvt-outbox-worker build` passes
- [ ] `pnpm --filter dvt-outbox-worker test` passes
- [ ] `pnpm test:adapter-postgres` is executed in a real PostgreSQL-capable environment or its skip state is reported honestly
- [ ] relevant docs and risk records are updated and synced
- [ ] closeout language states what remains open around fencing or scale-out

## Validation Matrix

- `pnpm --filter dvt-outbox-worker typecheck`
- `pnpm --filter dvt-outbox-worker build`
- `pnpm --filter dvt-outbox-worker test`
- `pnpm test:adapter-postgres`
- `pnpm docs:sync`
- `pnpm exec markdownlint-cli2 "docs/planning/gaps/G5-US-G5.4-OPERABILITY-AND-OWNERSHIP-HARDENING-PLAN.md" "docs/risk-register/quality/R-20260311-g5-4-operability-and-fencing-residuals.md" "docs/planning/gaps/GAP_EXECUTION_PLANS.md" "docs/planning/gaps/G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc`

## Risks And Guardrails

1. Risk: readiness hardening becomes a hidden liveness redesign.
   - Guardrail: keep the change focused on freshness and shutdown withdrawal.
2. Risk: ownership work silently widens into multi-worker coordination.
   - Guardrail: stop at explicit single-owner enforcement and visible fencing seams.
3. Risk: downstream duplicate-handling language over-claims exactly-once behavior.
   - Guardrail: keep `at-least-once` explicit in tests, docs, and closeout.
4. Risk: backlog evidence is replaced by synthetic confidence only.
   - Guardrail: require a real PostgreSQL lane or report the residual gap honestly.

## Closeout Condition For This Plan

This plan is complete only when:

1. all five step DoDs are satisfied;
2. canonical validations have been executed and reported;
3. no new debt, stub, or hidden rule downgrade was introduced;
4. `GAP_EXECUTION_PLANS.md` still tells the truth about what remains open in `G5`.
