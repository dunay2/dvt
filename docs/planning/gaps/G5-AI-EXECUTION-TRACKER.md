---
title: G5 - AI Execution Tracker
status: Active
owner: Delivery / Engineering
last_reviewed: 2026-03-10
planning_type: execution-plan
---

# G5 - AI Execution Tracker

Operational tracker for AI-assisted execution of the remaining `G5` work.

## Authority Rule

- Canonical spec: [G5 - Outbox Worker Consolidated Plan](G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md)
- Active status doc: [DVT+ - Gap Execution Plans](GAP_EXECUTION_PLANS.md)
- Last completed slice contract: [G5 / US-G5.3 Correctness Hardening Plan](G5-US-G5.3-CORRECTNESS-HARDENING-PLAN.md)

This file is not a second source of truth.

Its job is narrower:

- record the current execution pointer for AI work;
- show what remains in `G5` after `#412`;
- make the next validation lane explicit;
- leave a short execution log.

If this tracker conflicts with the canonical plan, update the canonical plan
first and then sync this tracker.

## Current Pointer

Update this section before any substantial implementation turn.

- `as_of`: `2026-03-10`
- `gap`: `G5`
- `epic`: `#409`
- `current_focus`: `G5.4 / #413 - single-owner canary cutover and rollback wiring`
- `state`: `In progress`
- `currently_working_on`: `Repo-side ownership contract hardening is complete; the remaining PR-4 work is external canary evidence and rollback verification against the real deployment wiring`
- `next_after_current`: `G5.5 / #414 - ADR-0009 multi-worker strategy before horizontal scale-out`
- `blocking_dependencies`: `#410`, `#411`, and `#412` are closed; no remaining GitHub blocker is declared on `#413`
- `last_completed`: `G5.3 / #412 merged via PR #444 on 2026-03-10`

## Remaining G5 Roadmap

| Stage | GitHub issue | Scope                                                                   | Current status                                                                           | Exit signal                                                                                                 |
| ----- | ------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| PR-4  | `#413`       | single-owner canary cutover, explicit ownership toggle, rollback wiring | in progress; repo-side ownership contract landed, external canary evidence still pending | one environment runs the standalone worker as sole active owner and rollback is documented/testable         |
| PR-5  | `#414`       | choose and implement one ADR-0009 concurrent-worker strategy            | pending after PR-4                                                                       | concurrent workers cannot reorder events for the same `runId` and horizontal scale-out is no longer blocked |

## Execution Protocol For AI

1. Before code changes, update [Current Pointer](#current-pointer).
2. If scope or acceptance changes, update [G5 - Outbox Worker Consolidated Plan](G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md) first, then update this tracker.
3. Keep the current stage tied to one GitHub issue at a time.
4. Record the touched-files plan before implementation for the active stage.
5. After each validation batch, append an execution-log entry with exact commands and pass/fail state.
6. When a stage closes, sync this tracker, [GAP_EXECUTION_PLANS.md](GAP_EXECUTION_PLANS.md), and any affected runbook/deployment docs in the same change.

## Stage Detail

### PR-4 / G5.4 - Canary cutover and rollback wiring

Goal:
make ownership of outbox delivery explicit in one environment and prove that the
standalone worker can be enabled and rolled back without ambiguous dual-active
behavior.

Working checklist:

- [x] think-first note written for `#413`
- [x] pre-implementation brief written for `#413`
- [x] current ownership path identified in code and runtime/deployment docs
- [x] environment-scoped worker enablement surface identified
- [x] old embedding path toggle or disable path identified
- [x] canary checklist written
- [x] rollback instructions written
- [x] implementation and docs updated
- [x] validation commands run and reported
- [x] repo-side negative host-path coverage complete
- [ ] external canary evidence captured for one environment
- [ ] rollback evidence captured against the real deployment wiring
- [ ] status docs synced after closure

Expected touched-system candidates:

- `apps/outbox-worker/src/**`
- `apps/outbox-worker/README.md`
- `docs/runbooks/outbox-worker-g5.md`
- deployment/runtime wiring under `apps/api` only if the current owner path still lives there
- status/planning docs for `G5`

Primary validation lane:

- `pnpm --filter dvt-outbox-worker typecheck`
- `pnpm --filter dvt-outbox-worker build`
- `pnpm --filter dvt-outbox-worker test`
- any additional canary-toggle validation command added by the implementation

Current think-first analysis:

- problem summary: the repository already has a standalone worker, but the
  ownership of that worker is not yet explicit at host start-up; a deployment
  can still treat process start as implicit ownership
- constraints and invariants:
  - do not move ownership policy into `@dvt/engine`
  - do not invent a second embedded owner path in `apps/api` that does not
    really exist
  - keep readiness `false` whenever the process is non-owning
  - keep one active owner only
- options considered:
  - boolean enable flag with fail-fast startup
  - host-level ownership mode with `active|passive`
  - runtime-level ownership branching
- selected option and rationale:
  - use host-level ownership mode with `active|passive`
  - rationale: it keeps ownership in the standalone host boundary, preserves the
    reusable runtime/core, supports canary plus rollback, and avoids hidden
    dual-active ambiguity
- rejected alternatives:
  - runtime-level branching was rejected because ownership is a host concern,
    not an engine concern
  - a fake "old embedded owner" implementation was rejected because that would
    create a synthetic path not present in the repo

Current pre-implementation brief:

- scope:
  - parse explicit ownership mode from worker env
  - surface passive ownership in runtime health/metrics
  - allow passive startup without runtime polling ownership
  - document canary and rollback semantics around that mode
- touched files or paths:
  - `apps/outbox-worker/src/host/runOutboxWorkerHost.ts`
  - `apps/outbox-worker/src/server.ts`
  - `apps/outbox-worker/src/plugins/env.ts`
  - `apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts`
  - `apps/outbox-worker/src/lifecycle/stopRuntimeAndOperationalServer.ts`
  - `apps/outbox-worker/src/runtime/createOutboxWorkerRuntime.ts`
  - `apps/outbox-worker/test/host/runOutboxWorkerHost.test.ts`
  - `apps/outbox-worker/test/plugins/env.test.ts`
  - `apps/outbox-worker/test/ops/OperationalServer.test.ts`
  - `apps/outbox-worker/test/ops/OutboxWorkerMonitor.test.ts`
  - `apps/outbox-worker/test/lifecycle/stopRuntimeAndOperationalServer.test.ts`
  - `apps/outbox-worker/test/runtime/createOutboxWorkerRuntime.test.ts`
  - `apps/outbox-worker/README.md`
  - `docs/runbooks/outbox-worker-g5.md`
- expected outcome:
  - one explicit env-controlled owner mode for the standalone worker
  - passive mode remains observable but never owns polling
  - rollback can disable ownership without introducing a second owner
- risks and mitigations:
  - risk: passive mode looks healthy when it should not be ready
  - mitigation: `ready=false` in passive mode, explicit metrics state, and
    runbook language aligned with owner semantics
  - risk: host logic starts bleeding into engine/runtime contracts
  - mitigation: keep ownership branching at `apps/outbox-worker` boundary only
- validation plan:
  - `pnpm --filter dvt-outbox-worker test`
  - `pnpm --filter dvt-outbox-worker typecheck`
  - `pnpm --filter dvt-outbox-worker build`
  - `pnpm lint:md`
  - `pnpm docs:quality:check`
  - `pnpm docs:canonical:check`

### PR-5 / G5.5 - Multi-worker strategy before horizontal scale-out

Goal:
close the remaining scale-out risk by implementing exactly one concurrency
strategy that preserves per-`runId` order across more than one worker instance.

Working checklist:

- [ ] strategy chosen: `runId` sharding or locking/coordination
- [ ] strategy documented in code and deployment config
- [ ] concurrent-worker tests added
- [ ] horizontal scale-out remains blocked until tests pass
- [ ] status docs synced after closure

Primary validation lane:

- `pnpm test:engine`
- `pnpm --filter dvt-outbox-worker test`
- `pnpm test:adapter-postgres`
- any new concurrency-specific validation command added by the chosen strategy

## Mermaid State Map

```mermaid
flowchart LR
    A[G5.3 merged<br/>PR #444<br/>Correctness hardening landed] --> B[G5.4 / #413<br/>Single-owner canary cutover]
    B --> C[Explicit owner toggle<br/>Canary checklist<br/>Rollback path]
    C --> D[G5.5 / #414<br/>Concurrent-worker strategy]
    D --> E[Sharding or coordination chosen]
    E --> F[Concurrent ordering tests green]
    F --> G[G5 fully closed<br/>Standalone runtime + scale-out hardening complete]
```

## Execution Log

| Date       | Pointer       | State          | Summary                                                                                                                                                                                             | Validation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | ------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-03-10 | `G5.3 / #412` | done           | merged via PR `#444`; correctness hardening landed in engine, runtime, PostgreSQL adapter, and planning docs                                                                                        | `pnpm test:engine`; `pnpm --filter dvt-outbox-worker test`; `pnpm --filter dvt-outbox-worker typecheck`; `pnpm --filter dvt-outbox-worker build`; `pnpm test:adapter-postgres`; `pnpm verify:prepush`; `pnpm docs:ci`                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-03-10 | `G5.4 / #413` | ready to start | tracker created to drive the next G5 stage from the canonical plan                                                                                                                                  | `pnpm lint:md`; `pnpm docs:quality:check`; `pnpm docs:canonical:check`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-03-10 | `G5.4 / #413` | in progress    | selected host-level `active/passive` ownership mode as the clean seam for canary and rollback                                                                                                       | repo inspection of `apps/outbox-worker`, `apps/api`, runbook, and issue state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-03-10 | `G5.4 / #413` | in progress    | implemented explicit ownership mode in the standalone host and aligned passive health/readiness semantics                                                                                           | `pnpm --filter dvt-outbox-worker test`; `pnpm --filter dvt-outbox-worker typecheck`; `pnpm --filter dvt-outbox-worker build`; `pnpm lint:md`; `pnpm docs:quality:check`; `pnpm docs:canonical:check`                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-03-10 | `G5.4 / #413` | in progress    | corrected the ownership contract after QA review: ownership mode is explicit, passive bootstrap is decoupled from runtime-only config, and host boot-path tests now cover active vs passive startup | `pnpm --filter dvt-outbox-worker typecheck`; `pnpm --filter dvt-outbox-worker test`; `pnpm --filter dvt-outbox-worker build`; `pnpm exec eslint apps/outbox-worker/src/server.ts apps/outbox-worker/src/plugins/env.ts apps/outbox-worker/src/runtime/createOutboxWorkerRuntime.ts apps/outbox-worker/src/host/runOutboxWorkerHost.ts apps/outbox-worker/test/plugins/env.test.ts apps/outbox-worker/test/runtime/createOutboxWorkerRuntime.test.ts apps/outbox-worker/test/host/runOutboxWorkerHost.test.ts --max-warnings 0`; `pnpm lint:md`; `pnpm docs:quality:check`; `pnpm docs:canonical:check` |
| 2026-03-10 | `G5.4 / #413` | in progress    | added negative host-path coverage for bootstrap/runtime failures, normalized cleanup error reporting, and corrected tracker wording so repo-side progress does not masquerade as canary completion  | `pnpm --filter dvt-outbox-worker typecheck`; `pnpm --filter dvt-outbox-worker test`; `pnpm --filter dvt-outbox-worker build`; `pnpm exec eslint apps/outbox-worker/src/lifecycle/stopRuntimeAndOperationalServer.ts apps/outbox-worker/test/lifecycle/stopRuntimeAndOperationalServer.test.ts apps/outbox-worker/test/host/runOutboxWorkerHost.test.ts --max-warnings 0`; `pnpm lint:md`; `pnpm docs:canonical:check`                                                                                                                                                                                  |
