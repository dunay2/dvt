---
slice: TF-C2-B-read-surface-evidence
date: 2026-04-08
lane: C
author: AI (Codex)
last_reviewed: 2026-04-08
---

# Closeout: TF-C2-B read-surface evidence

## Think-First Analysis

### Problem summary

The transformation-flow proposal set requires `GET /runs/:runId` and
`GET /runs/:runId/events` to expose executor identity, sink materialization
evidence, and failed-step diagnostics, but the shipped runtime read contract
still returns only coarse run status fields.

### Root cause

The frontend result UX was prepared ahead of the runtime read-model contract.
`RunStatusSnapshot` and the shared event schemas never absorbed the
transformation outcome fields, so the engine projector, API use case, and
event record validator all stop before caller-visible evidence can cross the
boundary.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, doc-driven public-behavior changes,
  no hidden debt, and mandatory validation evidence.
- `docs/guides/ai-work-protocol.md`: this slice is `Full` because it changes
  public runtime read contracts and shared artifacts.
- `docs/adr/ADR-0004-event-sourcing-strategy.md`: state reads must remain
  deterministic projections derived from events.
- `docs/adr/ADR-0015-getRunStatus-read-model-separation.md`: the default run
  read path must stay provider-independent and read from projected state, not
  live adapter calls.
- `docs/planning/proposals/mandatory/runtime-and-contracts/transformation-flow-architecture-and-contracts-20260405.md`:
  TF-C2-B requires caller-visible executor identity, rows written, sink target,
  failure step attribution, and timestamps on runtime read surfaces.

### Options considered

1. Patch only the API DTO and fabricate evidence fields from ad hoc event scans.
2. Extend the shared run snapshot and event contracts, then project those
   fields from canonical events into the read model.
3. Delay the slice until the PostgreSQL executor is fully wired and keep the
   current read contract unchanged.

### Selected option and rationale

Choose option 2.

TF-C2-B is a read-surface contract slice, not a UI-only mapper tweak. The
fields must exist in shared contracts and in the projector so API and frontend
consume the same canonical shape without violating ADR-0004 or ADR-0015.

### Rejected alternatives

- Option 1 was rejected because it would create route-local inference logic and
  duplicate state semantics outside the projector.
- Option 3 was rejected because the dependency on TF-C2-A blocks real executor
  production, not the contract work needed to make result evidence transportable
  and testable now.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - `docs/planning/closeouts/20260408-tf-c2-b-read-surface-evidence-closeout.md`
  - `docs/planning/state/agent-lane-c.yaml`
  - `packages/@dvt/contracts/src/types/contracts.ts`
  - `packages/@dvt/contracts/src/schemas.ts`
  - `packages/@dvt/contracts/test/validation.test.ts`
  - `packages/@dvt/run-domain/src/applyRunEvent.ts`
  - `packages/@dvt/run-domain/test/applyRunEvent.test.ts`
  - `packages/@dvt/engine/src/ports/IRunStateStore.ts`
  - `packages/@dvt/engine/src/state/runEventWritePolicy.ts`
  - `packages/@dvt/engine/src/core/SnapshotProjector.ts`
  - `packages/@dvt/engine/test/types/engine-types.test.ts`
  - `apps/api/src/application/ports/runtime.ts`
  - `apps/api/src/application/services/getRunStatusUseCase.ts`
  - `apps/api/test/application/services/getRunStatusUseCase.test.ts`
  - `apps/api/test/application/services/getRunEventsUseCase.test.ts`
  - `apps/api/test/entrypoints/http/getRunRoute.test.ts`
  - `apps/api/test/entrypoints/http/getRunEventsRoute.test.ts`
- Expected outcome:
  - shared run snapshot contract carries optional-first TF-C2-B outcome fields
  - projector derives current step, failed step, error reason, and
    materialization evidence from canonical events
  - API run status route returns those fields without live provider dependency
  - run events validation accepts evidence-bearing success and failure payloads
- Risks and mitigations:
  - Risk: contract drift between `@dvt/contracts`, `@dvt/engine`, and API DTOs
  - Mitigation: update shared contracts first and keep API DTO types as picks of
    `RunStatusSnapshot`
  - Risk: snapshot schema change could break stored snapshots
  - Mitigation: add optional fields only and keep JSONB snapshot compatibility
    without DDL changes
  - Risk: event payload widening could break existing parsers
  - Mitigation: make new payload fields optional and preserve all current valid
    shapes
- Out of scope:
  - real PostgreSQL executor emission logic for materialization evidence
  - frontend rendering changes beyond the already wired consumer fields
  - provenance linkage beyond the event and snapshot fields needed for TF-C2-B
- Validation plan:
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm --filter @dvt/contracts test`
  - `pnpm --filter @dvt/run-domain test`
  - `pnpm --filter @dvt/engine test`
  - `pnpm --filter dvt-api test`
  - `pnpm verify:prepush`
- Test coverage plan:
  - parse run status snapshots with TF-C2-B optional fields
  - parse step-completed and step-failed events carrying evidence payloads
  - projector records current step, failed step, error reason, and
    materialization evidence
  - API get-run returns projected TF-C2-B fields
  - run events route and use case preserve evidence-bearing payloads

## Implementation Summary

- Shared contracts now carry optional-first TF-C2-B outcome fields on
  `RunStatusSnapshot` and evidence-bearing payload shapes on `StepCompleted`
  and `StepFailed`.
- The shared run-domain projector now derives current-step attribution,
  failed-step diagnostics, and materialization evidence from canonical events.
- API run-status responses now forward the projected TF-C2-B fields directly
  from snapshot state, preserving ADR-0015 read-model separation.
- The slice intentionally stops at contract and projection readiness; real
  payload production remains dependent on the executor work sequenced under
  `TF-C2-A` and provenance closure from `TF-B1-B`.

## Validation Run

- `pnpm --filter @dvt/contracts build`
- `pnpm --filter @dvt/contracts test`
- `pnpm --filter @dvt/run-domain test`
- `pnpm --filter @dvt/engine test`
- `pnpm --filter dvt-api typecheck`
- `pnpm --filter dvt-api test`
- `pnpm verify:prepush`
