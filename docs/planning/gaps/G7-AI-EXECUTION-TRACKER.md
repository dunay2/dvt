---
title: G7 - AI Execution Tracker
status: Active
owner: Delivery / Engineering
last_reviewed: 2026-03-13
planning_type: execution-plan
---

# G7 - AI Execution Tracker

Operational tracker for AI-assisted execution of the remaining `G7` work.

## Authority Rule

`G7` does not yet have a dedicated gap spec file. Until one exists, use these
sources in this precedence order:

- Normative drivers:
  - [ADR-0004 - Event Sourcing Strategy](../../adr/ADR-0004-event-sourcing-strategy.md)
  - [ADR-0015 - getRunStatus Read Model Separation](../../adr/ADR-0015-getRunStatus-read-model-separation.md)
  - [Execution Semantics Contract v2.0.0](../../architecture/engine/contracts/engine/ExecutionSemantics.v2.0.md)
  - [State Store Overview](../../architecture/engine/contracts/state-store/overview.md)
- Architectural context:
  - [DVT+ Execution Model Specification](../execution-model/dvt-execution-model.md)
  - [Engine C4 / Maturity Notes](../../architecture/engine/c4-engine.md)
- Active status docs:
  - [DVT+ - Gap Execution Plans](GAP_EXECUTION_PLANS.md)
  - [Current Status](../../architecture/system-delivery-status.md)

This file is not a second source of truth.

Its job is narrower:

- record the current execution pointer for AI work;
- pin the design constraints already fixed by accepted ADRs/contracts;
- isolate the open scope questions that still need sign-off before code;
- define the first implementation slice and validation lane once scope is fixed.

If `G7` needs a dedicated canonical spec after this planning pass, create that
spec before the first substantial implementation slice and then sync this
tracker to it.

## Current Pointer

Update this section before any substantial implementation turn.

- `as_of`: `2026-03-14`
- `gap`: `G7`
- `epic`: `G7`
- `current_focus`: `G7.1 in-process projector hardening`
- `state`: `Active`
- `currently_working_on`: `documented hardening of in-process projection and bootstrap ordering; standalone host work not started`
- `next_after_current`: `write the dedicated G7 standalone projector/checkpoint spec and choose the first read-model slice`
- `blocking_dependencies`: `the first read-model tuple, projector host boundary, and checkpoint/rebuild contract still need explicit sign-off`
- `last_completed`: `in-process projector now rejects terminal-state rewrites; WorkflowEngine pre-bootstrap path validated when an adapter exposes estimateRunRef`

## Remaining G7 Roadmap

- `Slice 0 / planning`
  scope: write the think-first baseline, identify governing invariants, and
  reduce `G7` from a broad label into implementation-sized slices
  exit signal: tracker committed; sources, options, and open questions explicit
- `Slice 1 / projector host + checkpoint spec`
  scope: decide the standalone projector process boundary, persisted checkpoint
  model, rebuild semantics, and first denormalized read model
  exit signal: dedicated spec or tracker-approved brief with touched files,
  acceptance criteria, and validation lane
- `Slice 2 / standalone projector runtime`
  scope: implement a standalone projector host that consumes persisted ordered
  events from the state store and resumes from a watermark/checkpoint
  exit signal: worker can start, catch up, resume after restart, and expose lag
  or health signals
- `Slice 3 / read models + indexes`
  scope: persist the first production read-model tables/indexes and switch one
  real read path to them
  exit signal: at least one production read path is served from denormalized
  persisted state without provider calls
- `Slice 4 / rebuild + closeout`
  scope: replay/rebuild tooling, documentation, and evidence for the chosen
  read-model path
  exit signal: rebuild/replay path demonstrated and `G7` status docs synced

## Execution Protocol For AI

1. Before code changes, update [Current Pointer](#current-pointer).
2. If scope or acceptance changes, update the governing spec first if one
   exists; otherwise update this tracker and then sync
   [GAP_EXECUTION_PLANS.md](GAP_EXECUTION_PLANS.md).
3. Keep each implementation turn tied to one slice at a time.
4. Do not treat the outbox as the trigger source for projector read models
   unless the governing docs are changed first.
5. Record the touched-files plan before the first code edit of each slice.
6. After each validation batch, append an execution-log entry with exact
   commands and pass/fail state.
7. When a slice closes, sync this tracker, [GAP_EXECUTION_PLANS.md](GAP_EXECUTION_PLANS.md),
   and any affected architecture/runbook docs in the same change.

## Stage Detail

### G7.0 - Think-first baseline

Think-first analysis:

- problem summary:
  - `SnapshotProjector` exists only as in-process projection logic inside
    `@dvt/engine`, while `G7` requires a standalone projector/read-model path
    for production reads
  - the current repo has no standalone projector host, no persisted projector
    checkpoint/watermark owner, and no denormalized read-model tables/indexes
    explicitly serving production query paths
- root cause:
  - projection semantics exist, but they are still embedded in the engine/state
    path rather than owned by a dedicated operational worker and read-model
    persistence boundary
- constraints and invariants:
  - default `getRunStatus` MUST remain projected-state only and MUST NOT call
    the provider (`ADR-0015`)
  - projectors MUST order by `runSeq`, not timestamps, and MUST advance
    progress by persisted event sequence (`ExecutionSemantics.v2.0`)
  - snapshots are derived from persisted events and may lag, but must remain
    consistent with a prefix of the event log (`State Store Overview`)
  - the state store is not the business read-model service by itself (`State Store Overview`)
  - the outbox is for atomic delivery intent and MUST NOT be treated as a
    general projector trigger bus (`State Store Overview`)
  - operational worker loops belong at the app/runtime boundary, not inside the
    engine core (`dvt-execution-model.md`)
  - the first slice must target one concrete production read path, not a vague
    "dashboard/read model" umbrella
- options considered:
  - keep projection in-process and only add more snapshot APIs to the state store
  - drive the standalone projector from outbox-delivered events
  - build a standalone projector that polls/replays persisted ordered events
    from the state store and writes denormalized read models in adapter-backed
    storage
- selected baseline and rationale:
  - standalone projector host consumes persisted ordered events from the state
    store, not the outbox
  - rationale: persisted events plus `runSeq` are already the normative
    projection authority; this preserves deterministic replay, keeps provider
    status out of the default read path, and avoids abusing the outbox as a
    business read-model bus
- rejected alternatives:
  - "state-store only" was rejected because `G7` explicitly requires standalone
    projector/read-model ownership and the state store docs say the store is not
    the business read-model service by itself
  - "outbox-driven projector" was rejected because outbox exists for delivery
    intent, while projector ordering/replay authority belongs to persisted run
    events and `runSeq`
- first open questions requiring sign-off:
  - which read path lands first: single-run status only, run listing/indexes, or
    step-level views
  - where the operational worker lives: `apps/projector-worker`,
    `apps/read-model-worker`, or another dedicated service name
  - whether a dedicated read-model/checkpoint port must be formalized in
    `@dvt/contracts` before implementation
  - what rebuild surface is required for closure: CLI only, admin HTTP, or both

Current pre-implementation brief:

- scope:
  - reduce `G7` to a first vertical slice centered on one read path
  - define the standalone projector host boundary and its checkpoint model
  - define the first denormalized read-model table/index set
  - keep projection reduction logic in reusable pure functions; do not move
    event semantics out of the engine core unless governance changes
- touched files or paths for the first code slice if approved:
  - `docs/planning/gaps/G7-STANDALONE-PROJECTOR-SPEC.md` (new, if needed)
  - `apps/**` for the standalone projector host/runtime
  - `packages/@dvt/adapter-postgres/src/**` for checkpoint/read-model storage
  - `packages/@dvt/contracts/src/**` for any formal read-model/checkpoint ports
  - `packages/@dvt/engine/src/core/SnapshotProjector.ts` only if pure reduction
    helpers need extraction/reuse
  - `docs/architecture/system-delivery-status.md`
  - `docs/planning/gaps/GAP_EXECUTION_PLANS.md`
- expected outcome of the first implementation slice:
  - one dedicated process can resume from a persisted checkpoint/watermark and
    project persisted events deterministically
  - at least one production read path is explicitly assigned to a denormalized
    read model instead of implicit in-process replay
  - replay/rebuild semantics are explicit enough to validate and document
- validation plan for the planning slice:
  - `pnpm lint:md`
  - `pnpm docs:quality:check`
  - `pnpm docs:canonical:check`

## Execution Log

- `2026-03-13` `G7` `planning`
  summary: created `G7-AI-EXECUTION-TRACKER.md`; confirmed that `G7` has no
  dedicated spec file yet, but it is not zero-context; normalized the governing
  drivers around `ADR-0004`, `ADR-0015`, `ExecutionSemantics.v2.0`, the state
  store overview, and current architecture/status docs; selected the baseline
  direction that the standalone projector must consume persisted ordered events
  from the state store rather than the outbox
  validation: repo inspection of `GAP_EXECUTION_PLANS.md`,
  `system-delivery-status.md`, `SnapshotProjector.ts`,
  `WorkflowEngine.getRunStatus`, `ExecutionSemantics.v2.0.md`,
  `ADR-0004`, `ADR-0015`, `State Store Overview`, and `c4-engine.md`
- `2026-03-14` `G7` `hardening`
  summary: hardened the in-process projection baseline while keeping `G7`
  partial; `SnapshotProjector` now rejects terminal-state rewrites with
  `InvalidStateTransitionError`; `WorkflowEngine.startRun()` now supports a
  pre-bootstrap path for adapters that provide `estimateRunRef`; synced active
  status docs and recorded the remaining residual around provider run-id
  reconciliation for providers that only know the execution-level id after
  start
  validation: `pnpm --filter dvt-api typecheck` PASS;
  `pnpm --filter @dvt/planner build` PASS;
  `pnpm --filter @dvt/adapter-temporal build` PASS;
  `pnpm --filter dvt-api test` PASS (`34/34`);
  `pnpm --filter @dvt/engine test` PASS (`225/225`);
  `pnpm --filter @dvt/adapter-temporal test` PASS (`87/87`);
  `pnpm exec eslint apps/api/src/app.ts apps/api/src/application/services/WorkflowEngineFactory.ts apps/api/test/application/services/WorkflowEngineFactory.test.ts packages/@dvt/adapter-temporal/src/TemporalAdapter.ts packages/@dvt/engine/test/core/WorkflowEngine.test.ts packages/@dvt/engine/test/core/SnapshotProjector.transitions.test.ts packages/@dvt/planner/src/domain/types.ts` PASS;
  `pnpm exec prettier --check apps/api/src/app.ts apps/api/src/application/services/WorkflowEngineFactory.ts apps/api/test/application/services/WorkflowEngineFactory.test.ts packages/@dvt/adapter-temporal/src/TemporalAdapter.ts packages/@dvt/engine/test/core/WorkflowEngine.test.ts packages/@dvt/engine/test/core/SnapshotProjector.transitions.test.ts packages/@dvt/planner/src/domain/types.ts docs/architecture/system-delivery-status.md docs/planning/gaps/GAP_EXECUTION_PLANS.md docs/planning/status/canonical-doc-code-matrix.md docs/planning/gaps/G7-AI-EXECUTION-TRACKER.md "docs/planning/reviews/20260314 review.md"` PASS;
  `pnpm exec markdownlint-cli2 docs/architecture/system-delivery-status.md docs/planning/gaps/GAP_EXECUTION_PLANS.md docs/planning/status/canonical-doc-code-matrix.md docs/planning/gaps/G7-AI-EXECUTION-TRACKER.md "docs/planning/reviews/20260314 review.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` PASS;
  `pnpm docs:quality:check` PASS with pre-existing non-English warnings in
  `docs/archive/**`, `docs/planning/gaps/GAP_EXECUTION_PLANS.md`,
  `docs/planning/reviews/**`, and
  `docs/planning/status/canonical-doc-code-matrix.md`;
  `pnpm docs:canonical:check` PASS
