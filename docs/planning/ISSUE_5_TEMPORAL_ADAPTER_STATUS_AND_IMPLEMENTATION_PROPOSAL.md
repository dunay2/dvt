# Issue #5 / #68 — Status, Achievements, and Temporal Implementation Proposal

**Date**: 2026-02-13  
**Branch**: `docs/issue-5-implementation-proposal`  
**Scope**: Execution documentation to unblock Temporal implementation on active `packages/*` paths

---

## 1) Current status and achieved points

### Achieved points (confirmed)

1. Active monorepo structure under `packages/*`.
2. Functional engine core with tests in `packages/engine`.
3. Centralized contracts in `packages/contracts`.
4. `packages/adapter-temporal` package created (existing workspace base).

### Blocking gaps (Issue #5)

1. In `packages/engine/src/adapters/temporal/TemporalAdapterStub.ts`, real execution is still `NotImplemented`.
2. `packages/adapter-temporal/src/index.ts` is still a placeholder.
3. Full Temporal SDK wiring (Client + Worker + Workflow + Activities) does not yet exist on active paths.
4. Missing real adapter+engine Temporal integration test suite.
5. Drift exists between #5 and #68 (legacy scope vs current monorepo scope).

---

## 2) Non-negotiable principles

1. Separation of concerns: planner ≠ engine ≠ state ≠ UI.
2. Workflow determinism (no non-deterministic APIs in workflow code).
3. External effects in Activities (at-least-once ⇒ mandatory idempotency).
4. `RunStateStore` is the operational source of truth for adapter status contracts.
   - Temporal Workflow Query is optional diagnostic state, never the sole authority.
5. Workflow versioning is mandatory for replay-compatible evolution.
   - MVP baseline uses patch markers (`patched()` / `deprecatePatch()`).
   - Worker Versioning is deferred as a later hardening track.

---

## 3) PR plan (execution order)

### PR-0 — Normalize tracking (#5 vs #68) + canonical paths

**Objective**

- Remove tracking drift.
- Keep one canonical issue for active Temporal implementation.

**Current status**

- ✅ Done — PR-0 tracking updated and canonical texts prepared.

**Done**

- Canonical operational text prepared for:
  - Closing #5 as superseded.
  - Updating #68 as canonical epic.
- Action taken in this branch:
  - Added final links and tracker text for #5 and #68 (see "Tracker links" below).
  - Prepared issue-close comment for #5 (copy/paste-ready in this doc).

**Next (manual)**

- Post the superseded comment to Issue #5 and close it (see §7.1 text below).
- Replace Issue #68 body with the canonical epic (see §7.2) and link this doc/branch.


---

**Tracker links (to publish after merge):**

- Issue #5 (superseded): https://github.com/dunay2/dvt/issues/5
- Issue #68 (canonical epic): https://github.com/dunay2/dvt/issues/68
- Current branch / PR (status doc & implementation): https://github.com/dunay2/dvt/pull/80


### PR-1 — `adapter-temporal` foundation (Client + Config + Mapper contracts)

**Key files**

- `packages/adapter-temporal/src/config.ts`
- `packages/adapter-temporal/src/TemporalClient.ts`
- `packages/adapter-temporal/src/WorkflowMapper.ts`
- `packages/adapter-temporal/src/index.ts`

**Done**

- Client wrapper with `connect/close` lifecycle.
- Mapper with `workflowId = runId`, status mapping, and MVP task queue.

### PR-2 — `adapter-temporal` runnable MVP (WorkerHost + Workflow + Activities)

**Key files**

- `packages/adapter-temporal/src/TemporalWorkerHost.ts`
- `packages/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- `packages/adapter-temporal/src/activities/StepActivity.ts`

**Done**

- Workflow running in a sandboxed/deterministic environment (no Node/DOM APIs in workflow code).
- Minimum evidence: workflow start + activity executed + completion event persisted + query/status returns store projection.

### PR-3 — Engine wiring (real adapter by default, stub for tests only)

**Objective**

- Remove the stub from the normal execution path.

**Done**

- Temporal provider selection wiring added in `packages/engine/src/application/providerSelection.ts`.
- Engine exports include provider-selection helpers in `packages/engine/src/index.ts`.
- Adapter implementation introduced in `packages/adapter-temporal/src/TemporalAdapter.ts` and exported from `packages/adapter-temporal/src/index.ts`.
- Validation tests added for provider selection in `packages/engine/test/application/providerSelection.test.ts`.

### PR-4 — Idempotent Event Sink + RunState persistence contract (MVP)

**Objective**

- Cover at-least-once semantics without duplicates.

**Done**

- Retry/idempotency proof test added in `packages/adapter-temporal/test/activities.test.ts`.
- Scenario validates transient append failure + retry path and verifies one logical persisted event by idempotency key.

### PR-5 — Tests (unit + integration with Temporal environment)

**Objective**

- Stable CI harness.

**Done**

- Added integration test using `TestWorkflowEnvironment.createTimeSkipping()` in `packages/adapter-temporal/test/integration.time-skipping.test.ts`.
- Added script `test:integration` in `packages/adapter-temporal/package.json`.
- Added dev dependency `@temporalio/testing` pinned to `1.11.7`.

**Recommended strategy**

- CI base: `TestWorkflowEnvironment.createTimeSkipping()`.
- Documented fallback: full local/server environment when CI requires it.

### PR-6 — CI + operational documentation

**Objective**

- Make it executable and maintainable by the team.

**Current status**

- 🟨 In progress.
- Documentation and scripts are updated; CI workflow file update remains pending.

---

## 4) Tracking checklist table

| ID   | Deliverable                         | Status         | Required evidence                                                                 | Dependencies       |
| ---- | ----------------------------------- | -------------- | --------------------------------------------------------------------------------- | ------------------ |
| PR-0 | Canonical tracking #5/#68           | 🟨 In progress | Canonical text drafted in section 7; pending publication of issue comments/status | —                  |
| PR-1 | Client+Config+Mapper                | ✅ Done        | Code + unit tests + lint                                                          | PR-0               |
| PR-2 | Worker+Workflow+Activities MVP      | ✅ Done        | Real Temporal integration run                                                     | PR-1               |
| PR-3 | Engine uses real adapter by default | ✅ Done        | Real boot without stub in normal mode                                             | PR-2               |
| PR-4 | Idempotency + minimal persistence   | ✅ Done        | Duplicate-free test under retries                                                 | PR-3, #6 (partial) |
| PR-5 | Stable CI test suite                | ✅ Done        | Green unit+integration tests using `TestWorkflowEnvironment.createTimeSkipping()` | PR-4               |
| PR-6 | CI + operational docs               | 🟨 In progress | README + CI workflow + roadmap/status                                             | PR-5               |

---

## 5) Global acceptance criteria (MVP)

1. `packages/adapter-temporal/src/index.ts` is no longer a placeholder.
2. `packages/engine/src/adapters/temporal/TemporalAdapterStub.ts` is removed from the normal production flow.
3. Minimum validated flow: `startRun -> status -> cancel`.
4. Idempotency proven under activity retries.
5. Run state derived from persisted events.
6. Normalized tracking (#5/#68) with no scope ambiguity.
   - PR-0 is only considered completed after tracker publication is done (#5 closed as superseded and #68 updated as canonical epic).

---

## 6) Questions resolved

1. Resolved: #68 is canonical (epic) and #5 becomes superseded.
2. Resolved: CI first with embedded harness (`createTimeSkipping`), docker/local server as fallback.
3. Resolved with conditions: `in-memory` temporarily allowed for PR-4, but with equivalent idempotency semantics and clearly marked test/dev-only.

---

## 7) Operational text for PR-0 (tracking)

### 7.1 Closing comment for #5 (superseded)

```md
Closing #5 as **superseded** by #68.

Reason:

- The original scope of #5 includes references to legacy layout (`engine/...`) and previous naming.
- Real Temporal implementation must run and be tested on active paths **`packages/*`** (current monorepo).

New source of truth:

- **#68** becomes the canonical epic for Temporal Adapter (Client + Worker + Workflow + Activities + tests + CI).
- Status/plan document (branch): `docs/issue-5-implementation-proposal`.

Blocker solved by #68:

- Remove `TemporalAdapterStub` from normal flow.
- Add real Temporal SDK wiring in `packages/adapter-temporal` + engine integration.
- Integration test suite (Temporal + engine) and idempotent semantics (at-least-once).
```

### 7.2 Suggested body for #68 (canonical epic)

```md
# #68 — Temporal Adapter (Epic, canonical)

**Scope**: Runnable Temporal Adapter implementation on active `packages/*` paths (monorepo).
**Status**: ACTIVE — Blocking for golden paths and deterministic multi-adapter validation.

## Non-negotiable principles

1. planner ≠ engine ≠ state ≠ UI
2. Workflow determinism
3. External effects in activities (idempotency)
4. RunStateStore as source of truth
5. Workflow versioning for replay/evolution

## Checklist

- [ ] PR-0 tracking
- [ ] PR-1 foundation
- [ ] PR-2 runnable MVP
- [ ] PR-3 engine wiring
- [ ] PR-4 idempotency + persistence
- [ ] PR-5 CI tests
- [ ] PR-6 CI + docs
```

---

## 8) References

- Temporal TypeScript SDK: https://docs.temporal.io/develop/typescript
- Determinism / core app: https://docs.temporal.io/develop/typescript/core-application
- Testing suite: https://docs.temporal.io/develop/typescript/testing-suite
- Versioning: https://docs.temporal.io/develop/typescript/versioning
- Message passing: https://docs.temporal.io/develop/typescript/message-passing

---

## 9) Implementation progress (2026-02-13)

### PR-0 tracking progress (current)

- Canonical tracking text is drafted in section 7 (`#5` superseded close comment + `#68` canonical epic body).
- Checklist status for PR-0 moved to in-progress.
- Exit condition for PR-0: publish issue updates and record resulting links/status in this document.

### PR-1 executed in code

- Config foundation implemented in `packages/adapter-temporal/src/config.ts`.
- Client wrapper lifecycle implemented in `packages/adapter-temporal/src/TemporalClient.ts`.
- Base mapper implemented in `packages/adapter-temporal/src/WorkflowMapper.ts`.
- Public exports enabled in `packages/adapter-temporal/src/index.ts`.

### Technical validation

- Package tests updated and green (`4 passed`) in `packages/adapter-temporal/test/smoke.test.ts`.
- Package TypeScript build green (`tsc -p tsconfig.json`).

### Scope note

This progress covers the PR-1 objective (foundation). Real workflow/activity execution (PR-2) remains the next step.

### Hardening applied after review

- The wrapper is no longer fake: it uses real Temporal connection with `Connection.connect` + `Client`.
- `single-flight` concurrency control was added for concurrent `connect()` calls.
- `close()` now closes real resources via `connection.close()`.
- `identity` remains optional to allow native SDK default behavior.

### PR-2 executed in code

- Activity factory implemented in `packages/adapter-temporal/src/activities/stepActivities.ts`.
  - `fetchPlan`: integrity validation + JSON parse + PlanRef metadata match.
  - `executeStep`: MVP step shape validation (stepId, kind only).
  - `emitEvent`: idempotent event emission to state store + outbox.
  - `saveRunMetadata`: run correlation persistence.
- Deterministic interpreter workflow in `packages/adapter-temporal/src/workflows/RunPlanWorkflow.ts`.
  - Signals: `pause`, `resume`, `cancel`.
  - Query: `status` (returns `WorkflowState`).
  - Logic: fetch plan → walk steps → emit lifecycle events.
  - Zero `Date.now`/`Math.random`/`process.env`/Node.js APIs.
- Worker lifecycle manager in `packages/adapter-temporal/src/TemporalWorkerHost.ts`.
  - `start(connection)` → creates Worker with bundled workflow + injected activities.
  - `shutdown()` → graceful drain.
- Local engine type surface in `packages/adapter-temporal/src/engine-types.ts` (structurally compatible with `@dvt/engine`).
- Public exports updated in `packages/adapter-temporal/src/index.ts`.
- New dependencies: `@temporalio/worker`, `@temporalio/workflow`, `@temporalio/activity`.

### PR-2 technical validation

- 15 tests passing (6 PR-1 foundation + 9 PR-2 activities).
- TypeScript build green (`tsc -p tsconfig.json`).
- tsconfig `paths` override applied to resolve `@dvt/contracts` via node_modules dist.

### PR-3/PR-4/PR-5 implementation updates (2026-02-14)

- Engine provider-selection helpers implemented in `packages/engine/src/application/providerSelection.ts` with coverage in `packages/engine/test/application/providerSelection.test.ts`.
- Temporal adapter implementation added in `packages/adapter-temporal/src/TemporalAdapter.ts` and exported via `packages/adapter-temporal/src/index.ts`.
- Retry/idempotency test added in `packages/adapter-temporal/test/activities.test.ts`.
- Time-skipping integration test added in `packages/adapter-temporal/test/integration.time-skipping.test.ts`.
- Temporal testing dependency and integration script added in `packages/adapter-temporal/package.json`.

### PR-3/PR-4/PR-5 technical validation

- `pnpm --filter @dvt/adapter-temporal test:integration` ✅
- `pnpm --filter @dvt/engine test` ✅
- `pnpm --filter @dvt/adapter-temporal test` ✅

### CI-like local validation (2026-02-14)

- `pnpm build` ✅
- `pnpm lint` ✅
- `pnpm type-check` ✅
- `pnpm test` ✅

Notes:

- `pnpm build` initially failed in `packages/engine` due to workspace path resolution inheritance; fixed by overriding `baseUrl`/`paths` in `packages/engine/tsconfig.json`.
- Engine tests were adjusted for stricter mock typing in `packages/engine/test/contracts/engine.test.ts`.

### PR-6 pending item

- Add/update CI workflow to execute integration time-skipping test in pipeline (documentation and scripts already prepared).
