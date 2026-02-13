# Issue #5 — Temporal Adapter: Current Status and Implementation Proposal

**Date**: 2026-02-13  
**Branch**: `docs/issue-5-implementation-proposal`  
**Related issues**: #5, #68, #15, #6, #70, #73

---

## 1) Current status (audited)

### Reached points

1. Monorepo package structure is active under `packages/*`.
2. Engine core exists and is tested in active path (`packages/engine/src/core`).
3. Contract package is active (`packages/contracts`).
4. Temporal package exists as workspace package (`packages/adapter-temporal`), but only as scaffold.

### Blocking gaps for Issue #5

1. Temporal runtime adapter is still stubbed in active engine path:
   - `packages/engine/src/adapters/temporal/TemporalAdapterStub.ts`
2. Temporal package is placeholder-only:
   - `packages/adapter-temporal/src/index.ts`
3. No real Temporal SDK integration in active path (client/worker/workflow wiring).
4. No end-to-end adapter tests for Temporal in active package path.
5. Issue #5 still references pre-monorepo layout (`engine/...`) and old interface naming; this creates tracking drift with #68.

---

## 2) Why Issue #5 is blocking

Issue #5 is a phase-1 blocker because downstream work depends on executable adapter behavior (not stubs):

- Golden paths with real adapter execution (#70)
- Multi-adapter determinism validation (#73)
- Temporal interpreter workflow completion path (#15)

Without a real Temporal adapter, the system can only validate core engine + mock flows, not production-like orchestration behavior.

---

## 3) Implementation proposal (active package path)

## 3.1 Scope alignment (first action)

Normalize issue scope to active paths and avoid duplicate tracking:

- Keep #68 as implementation epic for active package path, or
- Merge #5 + #68 checklist into one canonical issue and link the other as superseded.

## 3.2 Technical target architecture

### A) `packages/adapter-temporal`

- `src/TemporalAdapter.ts` (real adapter implementation)
- `src/TemporalClient.ts` (SDK wrapper / connection lifecycle)
- `src/WorkflowMapper.ts` (contract ↔ temporal mapping)
- `src/index.ts` (public exports)

### B) `packages/engine`

- Replace temporary wiring to stub with runtime adapter registration.
- Keep fallback stub only for explicit test mode (if needed), not default production path.

### C) Integration boundaries

- Inputs validated at engine boundary (aligned with #67 active-path migration)
- Engine run references persisted through state/outbox flow
- Signal and status mapped consistently with contracts

---

## 3.3 Execution plan by phases

### Phase A — Adapter foundation (2–3 days)

1. Create Temporal SDK client wrapper (connect/close).
2. Implement adapter methods:
   - startRun
   - cancelRun
   - getRunStatus
   - signal
3. Add deterministic mapping for run identifiers and status projection.

### Phase B — Engine wiring (1 day)

1. Register real Temporal adapter in engine bootstrap path.
2. Keep explicit feature flag for stub usage in local isolated tests only.

### Phase C — Tests (2–3 days)

1. Unit tests in `packages/adapter-temporal/test`.
2. Integration tests engine + Temporal adapter path.
3. Failure-path tests (timeouts/cancel/signal routing).

### Phase D — CI and docs (1 day)

1. Ensure lint/type/test pass in workspace.
2. Add adapter README usage and local setup.
3. Update roadmap/status references to canonical issue state.

---

## 4) Proposed acceptance criteria (updated for current repo)

1. `packages/adapter-temporal` exports a real adapter implementation (no placeholder).
2. Active engine path no longer depends on `TemporalAdapterStub` for normal execution.
3. Temporal adapter tests pass with meaningful coverage of lifecycle and signals.
4. Integration test validates `startRun -> signal/query/status -> cancel` flow.
5. CI workspace checks pass for affected packages.
6. Issue tracking normalized (#5/#68 relationship explicitly resolved).

---

## 5) Dependencies and risks

### Dependencies

- Contract alignment in active paths (`packages/contracts`)
- State/persistence interactions (related to #6)

### Risks

1. Legacy-path references in issues can cause duplicated work.
2. Temporal test environment complexity can delay CI stabilization.
3. If #6 remains pending, full persistence semantics may require temporary in-memory fallback in tests.

### Mitigations

1. Canonical issue consolidation before coding.
2. Split PRs by phase (foundation, wiring, tests, docs).
3. Keep deterministic fixtures stable while adapter internals evolve.

---

## 6) Recommended immediate next actions

1. Decide canonical tracking model (#5 vs #68).
2. Open implementation PR for Phase A+B under active package paths.
3. Reserve a follow-up PR for tests + CI hardening.
4. Re-audit #70/#73 once Temporal adapter is executable.

---

## 7) Evidence references (repo files)

- `packages/engine/src/adapters/temporal/TemporalAdapterStub.ts`
- `packages/adapter-temporal/src/index.ts`
- `packages/engine/src/core/WorkflowEngine.ts`
- `packages/engine/test/core/WorkflowEngine.test.ts`
