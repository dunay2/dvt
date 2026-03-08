---
id: R-20260308-G5-OUTBOX-WORKER-01
title: State-store extraction guidance can drift from the eventual independent outbox worker implementation
status: Open
date: 2026-03-08
owners:
  - engine
  - adapter-postgres
  - platform
severity: Medium
probability: Medium
---

# R-20260308-G5-OUTBOX-WORKER-01 - State-store extraction guidance can drift from the eventual independent outbox worker implementation

## Context

This branch curates historical material into a current working description of
the state-store boundary and a G5 guide for an independent outbox worker.

The new documents intentionally remain non-canonical. They consolidate useful
invariants, delivery semantics, and runtime separation guidance, but they do
not by themselves establish implemented contracts.

That split is correct, but it introduces a residual delivery risk: future
implementation work can selectively follow the narrative docs while missing the
hard requirements already enforced by current state-store contracts and
Postgres-backed behavior.

## Risk

The eventual outbox worker and related state-store extraction work can drift in
three ways:

- worker runtime code can adopt the guide's shape without preserving atomic
  append-plus-enqueue guarantees;
- delivery retry or dead-letter behavior can be introduced without contract
  tests that pin state-store invariants;
- working documents can age faster than the canonical ADR and contract set,
  causing reviewers to approve design changes against stale narrative text.

If that happens, the program can ship a clean architectural story while still
regressing correctness around ordering, idempotency, or ownership boundaries.

## Mitigation

- Keep the new extracted documents explicitly marked as non-canonical working
  material.
- Promote only verified parts of the G5 guidance into ADRs, TypeScript ports,
  and adapter contract docs.
- Require future outbox worker delivery code to prove atomic append and enqueue
  behavior, retry classification, and replay semantics through contract tests.
- Review worker rollout changes against the state-store overview and current
  Postgres adapter design, not against narrative docs alone.

## Evidence

- `docs/archive/working-notes/state-store-extraction.md`
- `docs/planning/gaps/g5-outbox-worker-guide.md`
- `docs/architecture/engine/contracts/state-store/overview.md`
- `packages/@dvt/adapter-postgres/DESIGN.md`
- `docs/planning/proposals/g5-outbox-worker-development-proposal-20260308.md`
