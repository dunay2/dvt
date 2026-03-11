---
id: R-20260311-G5-3-CORRECTNESS-01
title: G5.3 correctness hardening is mergeable, but formal closeout still depends on real PostgreSQL evidence and policy alignment
status: Open
date: 2026-03-11
owners:
  - engine
  - adapter-postgres
  - ci
severity: High
probability: Medium
---

# R-20260311-G5-3-CORRECTNESS-01 - G5.3 correctness hardening is mergeable, but formal closeout still depends on real PostgreSQL evidence and policy alignment

## Context

`G5.3` materially improves outbox correctness:

- same-`runId` no-bypass behavior is now pinned in engine, runtime, canary, and
  PostgreSQL smoke tests;
- `publish success + markDelivered failure -> redelivery` is explicitly covered;
- stale-claim recovery and DLQ replay envelope preservation are now represented
  in PostgreSQL smoke coverage targets;
- runtime and runbook language remain explicit about at-least-once behavior and
  do not claim end-to-end exactly-once delivery.

That means the slice is a real hardening step, not a cosmetic test pass.

The residual risk is not "missing implementation" in the abstract. The residual
risk is over-claiming closure before the remaining repository-level evidence and
policy alignment are complete.

## Risk

If `G5.3` is treated as fully closed without the remaining evidence below, the
repository can drift into a false sense of completion:

- PostgreSQL correctness paths may be well-tested in code yet still unproven in
  a real integration lane if `pnpm test:adapter-postgres` remains skipped in
  the validation environment;
- the hardened `listPending()` query can preserve correctness while still
  becoming a production bottleneck under backlog or multi-`runId` pressure if
  no basic performance evidence is gathered;
- `ADR-0009` still documents "N retries = 5 (default)" while current code and
  runbook policy use `MAX_OUTBOX_ATTEMPTS = 10`, which leaves an explicit
  ADR/runtime drift if it is not resolved or consciously accepted;
- the standalone runtime and reusable worker can still drift over time, as
  already tracked by
  [R-20260308-G5-OUTBOX-WORKER-01](../adapters/R-20260308-g5-state-store-outbox-worker-drift.md).

If that happens, reviewers may approve a technically good hardening slice while
the repository still lacks enough evidence to declare `G5.3` formally closed.

## Mitigation

- Keep `G5.3` language explicit: this slice proves at-least-once ordered
  delivery semantics, not end-to-end exactly-once.
- Execute `pnpm test:adapter-postgres` against a real PostgreSQL integration
  environment and report the pass/skip state honestly in closeout evidence.
- Gather at least minimal query-level evidence for the hardened PostgreSQL
  claim path (`EXPLAIN`, backlog sanity, or equivalent repository-approved
  performance proof) before declaring production-grade closure.
- Resolve the `ADR-0009` retries mismatch by either aligning the ADR to the
  shipped `10` attempts, aligning code to `5`, or recording an explicit
  accepted deviation with follow-up ownership.
- Keep runtime/core drift visible through
  [R-20260308-G5-OUTBOX-WORKER-01](../adapters/R-20260308-g5-state-store-outbox-worker-drift.md)
  until ownership converges on one semantic core.

## Evidence

- `docs/planning/gaps/G5-US-G5.3-CORRECTNESS-HARDENING-PLAN.md`
- `docs/planning/gaps/GAP_EXECUTION_PLANS.md`
- `docs/runbooks/outbox-worker-g5.md`
- `apps/outbox-worker/test/runtime/OutboxWorkerRuntime.test.ts`
- `apps/outbox-worker/test/canary/standaloneCanaryAcceptance.test.ts`
- `packages/@dvt/engine/test/outbox/OutboxWorker.test.ts`
- `packages/@dvt/adapter-postgres/test/smoke.test.ts`
- `docs/risk-register/adapters/R-20260308-g5-state-store-outbox-worker-drift.md`
