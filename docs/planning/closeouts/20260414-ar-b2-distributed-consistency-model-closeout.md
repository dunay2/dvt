---
slice: AR-B2-distributed-consistency-model
date: 2026-04-14
lane: B
author: AI (Codex)
last_reviewed: 2026-04-14
---

# Closeout: AR-B2 distributed consistency model

## Think-First Analysis

### Problem summary

The repository already implements the right building blocks for a mature
distributed runtime:

- DVT-owned execution semantics
- append-only event authority
- atomic bootstrap and append-plus-outbox transactions
- caller-visible snapshot freshness
- separated provider-live enrichment
- standalone outbox ownership and delivery monitoring

What is still missing is one canonical document that tells operators and
developers what guarantees they actually get when those parts interact across
Postgres, Temporal, snapshots, and outbox delivery.

That gap is now explicit in planning under `AR-B2`: the model is correct in
code, but still too implicit in documentation.

### Root cause

The runtime evolved slice by slice:

- `ADR-0003` and `ADR-0004` locked authority and persistence semantics
- `ADR-0013` closed the first-write atomicity race
- `ADR-0015` split canonical read state from provider-live enrichment
- runbooks later added SLA and freshness signals

Each slice solved its local problem well, but the repository never assembled
them into one cross-cutting consistency model with:

1. explicit consistency domains;
2. named windows between them;
3. duration or threshold sources;
4. failure mode semantics when a window is exceeded; and
5. operator-facing signals and owners.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, doc-driven closure, no hidden debt, no
  stubs, and validation evidence including `pnpm verify:prepush`.
- `docs/guides/ai-work-protocol.md`: this is `Full` mode because the slice adds
  a canonical architecture artifact and changes planning posture.
- `docs/adr/ADR-0003-execution-model.md`: DVT owns lifecycle semantics; the
  document must not let provider behavior redefine canonical state.
- `docs/adr/ADR-0004-event-sourcing-strategy.md`: event authority remains in
  the append-only log and replayable projection model.
- `docs/adr/ADR-0013-run-state-store-bootstrapRunTx.md`: the first-write path
  must stay explicit and atomic on the Postgres side.
- `docs/adr/ADR-0015-getRunStatus-read-model-separation.md`: canonical status
  and provider-live enrichment remain distinct read paths.
- `docs/planning/state/agent-lane-b.yaml`: `AR-B2` must close as a cross-cutting
  architectural document referenced from operational runbooks.

### Options considered

1. Write a narrow runbook-only note and leave architecture surfaces unchanged.
2. Write a purely conceptual architecture note with no concrete windows,
   timings, or operator signals.
3. Publish one canonical architecture document that maps the actual consistency
   domains, names the windows, ties them to current code and telemetry, and
   then route operators to it from the relevant runbooks.

### Selected option and rationale

Choose option 3.

This repository already behaves like a mature event-sourced system, but mature
systems do not stop at "we use CQRS" or "we use an outbox". They make the
consistency story explicit.

The document therefore borrows the right patterns from mature systems without
copying their assumptions blindly:

- Microsoft CQRS/Event Sourcing guidance: authoritative write model plus
  asynchronous read model
- Debezium outbox pattern: transactional bridge to downstream delivery with
  at-least-once semantics
- Temporal durable execution model: provider durability is real, but still not
  the same thing as DVT canonical authority

The improvement over those generic patterns is that this slice binds each
window to DVT-specific code anchors, current thresholds, and operational
signals instead of leaving the model at pattern level.

### Rejected alternatives

- Option 1 was rejected because it would keep the model fragmented across
  runbooks and reviews.
- Option 2 was rejected because it would read well but still fail the actual
  task requirement: operators need bounded windows, failure semantics, and
  monitoring signals, not just architecture prose.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - `docs/architecture/system/distributed-consistency-model.md`
  - `docs/architecture/components/engine/architecture/index.md`
  - `docs/architecture/components/engine/architecture/core.md`
  - `docs/architecture/system-delivery-status.md`
  - `docs/runbooks/backend-mvp-control-plane-runbook-20260329.md`
  - `docs/runbooks/outbox-worker-g5.md`
  - `docs/planning/state/agent-lane-b.yaml`
  - `docs/planning/state/domain-status-board.md`
  - `docs/planning/closeouts/20260414-ar-b2-distributed-consistency-model-closeout.md`
  - `docs/evidence/ED-20260414-ar-b2-distributed-consistency-model.md`
- Expected outcome:
  - one canonical architecture document defines the DVT distributed consistency
    model
  - start-run, snapshot, enrichment, outbox, and reconciliation windows are
    explicitly mapped
  - relevant runbooks route operators to that document
  - `AR-B2` closes in Lane B with evidence and synchronized planning surfaces
- Risks and mitigations:
  - Risk: overclaiming guarantees that the runtime does not implement
  - Mitigation: every window uses current code anchors and existing thresholds
    only; no invented SLA is introduced
  - Risk: duplicating SLA or freshness documents
  - Mitigation: this slice defines the cross-cutting model and links to the
    existing runbooks for window-specific thresholds
  - Risk: turning the document into provider-centric semantics
  - Mitigation: authority matrix and non-goals keep DVT canonical state, outbox
    delivery, and provider-live views clearly separated
- Out of scope:
  - new backpressure mechanics under `AR-C4`
  - dashboard and alert wiring under `AR-C2-T2/T3`
  - zero-downtime rollback under `AR-D4`
  - changing runtime behavior or thresholds
- Validation plan:
  - `pnpm exec markdownlint-cli2 "docs/architecture/system/distributed-consistency-model.md" "docs/planning/closeouts/20260414-ar-b2-distributed-consistency-model-closeout.md" "docs/evidence/ED-20260414-ar-b2-distributed-consistency-model.md" "docs/runbooks/backend-mvp-control-plane-runbook-20260329.md" "docs/runbooks/outbox-worker-g5.md" "docs/planning/state/domain-status-board.md" "docs/architecture/system-delivery-status.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc`
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm verify:prepush`
- Test coverage plan:
  - doc/route validation only; no runtime behavior changes are in scope
  - generated planning views must match the lane YAML after closure
  - docs indexes must stay synchronized after the new architecture and evidence
    artifacts land

## Implementation Summary

- Published one canonical system architecture artifact:
  `docs/architecture/system/distributed-consistency-model.md`
- Documented four explicit consistency domains:
  - Postgres canonical write domain
  - provider execution domain
  - asynchronous outbox delivery domain
  - caller read domain
- Mapped seven concrete windows to current code anchors, thresholds, failure
  modes, and operator routes:
  - estimated-ref `RunQueued -> adapter.startRun`
  - non-estimated `adapter.startRun -> bootstrapRunTx`
  - event append -> snapshot visibility
  - canonical snapshot -> provider-live enrichment
  - outbox commit -> worker claim
  - worker claim -> delivery or dead-letter
  - orphan intent -> reconciler repair
- Made the external delivery guarantee explicit as at-least-once and stated the
  non-goals that were previously only implicit.
- Routed operators to the new model from:
  - `docs/runbooks/backend-mvp-control-plane-runbook-20260329.md`
  - `docs/runbooks/outbox-worker-g5.md`
- Updated active architecture and planning truth:
  - `docs/architecture/components/engine/architecture/index.md`
  - `docs/architecture/components/engine/architecture/core.md`
  - `docs/architecture/system-delivery-status.md`
  - `docs/planning/state/agent-lane-b.yaml`
  - `docs/planning/state/domain-status-board.md`
- Published accepted evidence:
  - `docs/evidence/ED-20260414-ar-b2-distributed-consistency-model.md`
- Regenerated derived planning and docs surfaces:
  - `docs/planning/state/execution-workboard.md`
  - `docs/planning/state/open-task-route.md`
  - `docs/planning/state/agent-lane-b.md`
  - `docs/evidence/index.md`

## Validation Run

- `pnpm exec markdownlint-cli2 "docs/architecture/system/distributed-consistency-model.md" "docs/planning/closeouts/20260414-ar-b2-distributed-consistency-model-closeout.md" "docs/evidence/ED-20260414-ar-b2-distributed-consistency-model.md" "docs/runbooks/backend-mvp-control-plane-runbook-20260329.md" "docs/runbooks/outbox-worker-g5.md" "docs/planning/state/domain-status-board.md" "docs/architecture/system-delivery-status.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` -> PASS
- `pnpm docs:workboard:generate` -> PASS
- `pnpm docs:sync` -> PASS
- `pnpm verify:prepush` -> PASS operationally
- Validation note:
  - `verify:prepush` uses changed-only checks in this repo and reported no
    changed files for the uncommitted worktree, so the meaningful closure
    evidence for this docs slice is the direct markdownlint run plus the
    successful generator commands above.
