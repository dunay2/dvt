# ADR Implementation Status

**Document ID:** `ARCH-ADR-STATUS`  
**Version:** `1.3`  
**Status:** Active  
**Owner:** Architecture Team  
**Updated:** 2026-02-22

---

## 1) Executive Summary (code-based)

| Area                                              | Current Status            | Evidence in code                                                                                                                                                                                                                                                                                                                                                                     | Notes                                                                                                                         |
| ------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| ADR-0000 Code-generation traceability             | 🟡 Partial                | [`traceability:adr0`](package.json:39), [`gen-ai-index`](package.json:36)                                                                                                                                                                                                                                                                                                            | Tooling exists; full CI enforcement still partial.                                                                            |
| ADR-0001 Temporal integration test policy         | 🟡 Partial                | [`test:adapter-temporal`](package.json:30), [`pr-quality-gate` temporal integration](.github/workflows/pr-quality-gate.yml:205)                                                                                                                                                                                                                                                      | Integration tests exist; policy hardening remains iterative.                                                                  |
| ADR-0002 Neo4j knowledge graph context repository | 🟡 Partial                | [`kg:generate`](package.json:42), [`kg:seed`](package.json:44), [`kg:ingest`](package.json:45)                                                                                                                                                                                                                                                                                       | Generation/seed/ingest implemented; governance flow still evolving.                                                           |
| ADR-0003 Execution model sovereignty              | ✅ Implemented            | [`WorkflowEngine`](packages/@dvt/engine/src/core/WorkflowEngine.ts:124)                                                                                                                                                                                                                                                                                                              | Core execution orchestration centralized in engine.                                                                           |
| ADR-0004 Event sourcing strategy                  | ✅ Implemented            | [`InMemoryTxStore.appendAndEnqueueTx()`](packages/@dvt/engine/src/state/InMemoryTxStore.ts:121), [`PostgresStateStoreAdapter.appendAndEnqueueTx()`](packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:291)                                                                                                                                                             | Append-only events + outbox path implemented in both stores.                                                                  |
| ADR-0005 Contract formalization tooling           | 🟡 Partial                | [`@dvt/contracts`](packages/@dvt/contracts/package.json:2), [`contracts` workflow](.github/workflows/contracts.yml:1)                                                                                                                                                                                                                                                                | Strong baseline, but full conformance matrix still pending.                                                                   |
| ADR-0006 Contract tooling governance              | 🟡 Partial                | [`contracts.yml`](.github/workflows/contracts.yml:1), [`contracts:index:check`](package.json:52)                                                                                                                                                                                                                                                                                     | Governance pipeline exists; still under active tuning.                                                                        |
| ADR-0007 Run cancellation                         | ✅ Implemented            | [`cancelRun()`](packages/@dvt/engine/src/core/WorkflowEngine.ts:243)                                                                                                                                                                                                                                                                                                                 | Engine cancellation flow and run event emission implemented.                                                                  |
| ADR-0008 Signal idempotency                       | 🟡 Partial                | [`emitSignalDerivedRunEvent()`](packages/@dvt/engine/src/core/WorkflowEngine.ts:416), [`IdempotencyKeyBuilder.signalKey()`](packages/@dvt/engine/src/core/idempotency.ts:42)                                                                                                                                                                                                         | Idempotent keying present; broader provider parity is pending.                                                                |
| ADR-0009 Outbox ordering                          | ✅ Implemented            | [`listPending()` ordering](packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:566), [`outbox_pending_idx`](packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:862)                                                                                                                                                                                         | Ordered fetch + claiming strategy implemented.                                                                                |
| ADR-0010 Run event envelope split                 | ✅ Implemented            | [`RunEventInput`/`RunEventPersisted`](packages/@dvt/engine/src/state/InMemoryTxStore.ts:3), [`AppendResult` usage](packages/@dvt/engine/src/state/IRunStateStore.ts:25)                                                                                                                                                                                                              | Input/persisted envelope split in place.                                                                                      |
| ADR-0011 RunStarted ownership                     | ✅ Implemented            | [`startRun()` + bootstrap](packages/@dvt/engine/src/core/WorkflowEngine.ts:169)                                                                                                                                                                                                                                                                                                      | Engine owns bootstrap sequence and initial event flow.                                                                        |
| ADR-0012 Plan Integrity Ownership                 | 🟡 Partial                | [`WorkflowEngine.startRun()`](packages/@dvt/engine/src/core/WorkflowEngine.ts:135), [`PlanIntegrityValidator`](packages/@dvt/engine/src/security/planIntegrity.ts:18), [`MockAdapter.startRun()`](packages/@dvt/engine/src/adapters/mock/MockAdapter.ts:42)                                                                                                                          | Engine validates metadata/preconditions; adapter path owns plan fetch in mock tests. Shared package extraction still pending. |
| ADR-0012a Canonical Error Codes                   | 🟡 Partial                | [`RunAlreadyExistsError`](packages/@dvt/engine/src/contracts/errors.js:1), [`RunMetadataNotFoundError`](packages/@dvt/engine/src/contracts/errors.js:1), [`OutboxRateLimitExceededError`](packages/@dvt/engine/src/contracts/errors.js:1)                                                                                                                                            | Canonical engine-domain errors exist; cross-adapter normalization not fully unified.                                          |
| ADR-0013 bootstrapRunTx atomicity                 | ✅ Implemented            | [`bootstrapRunTx()`](packages/@dvt/engine/src/state/IRunStateStore.ts:25), [`WorkflowEngine` bootstrap usage](packages/@dvt/engine/src/core/WorkflowEngine.ts:169), [`PostgresStateStoreAdapter.bootstrapRunTx()`](packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:308), [`InMemoryTxStore.bootstrapRunTx()`](packages/@dvt/engine/src/state/InMemoryTxStore.ts:101) | Implemented in engine contract + in-memory + postgres adapters.                                                               |
| ADR-0014 Run-driven Adapter Model                 | ✅ Implemented            | [`WorkflowEngine.startRun()`](packages/@dvt/engine/src/core/WorkflowEngine.ts:135), [`MockAdapter.startRun()`](packages/@dvt/engine/src/adapters/mock/MockAdapter.ts:42)                                                                                                                                                                                                             | Adapter returns `runRef`; engine persists run via bootstrap transaction.                                                      |
| ADR-0015 getRunStatus read-model separation       | ✅ Implemented            | [`getRunStatus()` snapshot-first path](packages/@dvt/engine/src/core/WorkflowEngine.ts:273), [`snapshotToStatus`](packages/@dvt/engine/src/core/SnapshotProjector.ts:1), [`Postgres run_snapshots`](packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:786)                                                                                                             | O(1) snapshot path with replay fallback.                                                                                      |
| ADR-0016 logicalAttemptId adapter ownership       | 🟡 Partial                | [`buildRunEvent()` fixed logicalAttemptId](packages/@dvt/engine/src/core/WorkflowEngine.ts:447), adapter activity contracts in temporal adapter                                                                                                                                                                                                                                      | Baseline present but ownership boundaries still evolving by adapter/runtime.                                                  |
| ADR-0017 ExecutionPlan schema versioning          | ✅ Implemented (baseline) | planRef checks in [`validateStartRunPreconditions()`](packages/@dvt/engine/src/core/WorkflowEngine.ts:196), contract tests in [`engine.test.ts`](packages/@dvt/engine/test/contracts/engine.test.ts:289)                                                                                                                                                                             | Schema version gate enforced in engine preconditions.                                                                         |

Legend: ✅ Implemented · 🟡 Partial · ❌ Not started

---

## 1.1) Full ADR index (0000–0017)

| ADR       | Scope                              | Status         | Reference                                                                                                                                                                                                                |
| --------- | ---------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ADR-0000  | Trazabilidad normativa             | 🟡 Partial     | [`ADR-0000`](docs/adr/ADR-0000-Generación%20de%20código%20con%20trazabilidad%20normativa%20obligatoria.md)                                                                                                               |
| ADR-0001  | Temporal integration test policy   | 🟡 Partial     | [`ADR-0001`](docs/adr/ADR-0001-temporal-integration-test-policy.md)                                                                                                                                                      |
| ADR-0002  | Neo4j knowledge graph              | 🟡 Partial     | [`ADR-0002`](docs/adr/ADR-0002-neo4j-knowledge-graph-context-repository.md)                                                                                                                                              |
| ADR-0003  | Execution model                    | ✅ Implemented | [`WorkflowEngine`](packages/@dvt/engine/src/core/WorkflowEngine.ts:124)                                                                                                                                                  |
| ADR-0004  | Event sourcing                     | ✅ Implemented | [`InMemoryTxStore.appendAndEnqueueTx()`](packages/@dvt/engine/src/state/InMemoryTxStore.ts:121), [`PostgresStateStoreAdapter.appendAndEnqueueTx()`](packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:291) |
| ADR-0005  | Contract formalization tooling     | 🟡 Partial     | [`@dvt/contracts`](packages/@dvt/contracts/package.json:2)                                                                                                                                                               |
| ADR-0006  | Contract tooling governance        | 🟡 Partial     | [`contracts workflow`](.github/workflows/contracts.yml:1)                                                                                                                                                                |
| ADR-0007  | Run cancellation                   | ✅ Implemented | [`cancelRun()`](packages/@dvt/engine/src/core/WorkflowEngine.ts:243)                                                                                                                                                     |
| ADR-0008  | Signal idempotency                 | 🟡 Partial     | [`emitSignalDerivedRunEvent()`](packages/@dvt/engine/src/core/WorkflowEngine.ts:416)                                                                                                                                     |
| ADR-0009  | Outbox ordering                    | ✅ Implemented | [`listPending()` ordering](packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:566)                                                                                                                          |
| ADR-0010  | Run event envelope split           | ✅ Implemented | [`RunEventInput/RunEventPersisted usage`](packages/@dvt/engine/src/state/InMemoryTxStore.ts:3)                                                                                                                           |
| ADR-0011  | RunStarted ownership               | ✅ Implemented | [`startRun()` bootstraps and emits RunQueued](packages/@dvt/engine/src/core/WorkflowEngine.ts:169)                                                                                                                       |
| ADR-0012  | Plan integrity ownership           | 🟡 Partial     | [`validateStartRunPreconditions()`](packages/@dvt/engine/src/core/WorkflowEngine.ts:196), [`PlanIntegrityValidator`](packages/@dvt/engine/src/security/planIntegrity.ts:18)                                              |
| ADR-0012a | Canonical error codes              | 🟡 Partial     | [`engine errors`](packages/@dvt/engine/src/contracts/errors.js:1)                                                                                                                                                        |
| ADR-0013  | bootstrapRunTx                     | ✅ Implemented | [`bootstrapRunTx`](packages/@dvt/engine/src/state/IRunStateStore.ts:25), [`WorkflowEngine` use](packages/@dvt/engine/src/core/WorkflowEngine.ts:169)                                                                     |
| ADR-0014  | Run-driven adapter model           | ✅ Implemented | [`MockAdapter.startRun()`](packages/@dvt/engine/src/adapters/mock/MockAdapter.ts:42)                                                                                                                                     |
| ADR-0015  | getRunStatus read-model separation | ✅ Implemented | [`getRunStatus()` snapshot-first](packages/@dvt/engine/src/core/WorkflowEngine.ts:273)                                                                                                                                   |
| ADR-0016  | logicalAttemptId ownership         | 🟡 Partial     | [`buildRunEvent()`](packages/@dvt/engine/src/core/WorkflowEngine.ts:447)                                                                                                                                                 |
| ADR-0017  | ExecutionPlan schema versioning    | ✅ Implemented | [`validateStartRunPreconditions()`](packages/@dvt/engine/src/core/WorkflowEngine.ts:196)                                                                                                                                 |

> Nota: este documento es de estado de implementación, no reemplaza el contenido de cada ADR fuente.

---

## 2) Notable updates since last plan revision

1. **Resolved run bootstrap ordering issue (`RUN_NOT_FOUND`)**
   - Mock adapter no longer appends run events before bootstrap.
   - Current flow aligns with run-driven model: adapter returns run ref, engine persists via bootstrap.
   - Evidence: [`MockAdapter.startRun()`](packages/@dvt/engine/src/adapters/mock/MockAdapter.ts:42), [`WorkflowEngine.startRun()`](packages/@dvt/engine/src/core/WorkflowEngine.ts:135), [`InMemoryTxStore.assertRunExists()`](packages/@dvt/engine/src/state/InMemoryTxStore.ts:36).

2. **CI affected-workspace build filter fixed**
   - Build now includes workspace dependencies in the intended direction.
   - Evidence: [`Build affected workspace`](.github/workflows/ci.yml:187).

3. **Changed-file ESLint check hardened**
   - Ignored-file warnings no longer fail CI with `--max-warnings 0`.
   - Evidence: [`check-changed.cjs` ESLint args](scripts/check-changed.cjs:168).

4. **`kg:check` gate removed from contracts workflow**
   - The explicit generated graph drift check step was removed as requested.
   - Evidence: workflow section around [`contracts.yml`](.github/workflows/contracts.yml:178).

---

## 3) ADR-by-ADR status details

### ADR-0012 — Plan Integrity Ownership

**Current:** 🟡 Partial  
**Implemented:**

- Engine validates plan metadata and context preconditions before adapter dispatch in [`validateStartRunPreconditions()`](packages/@dvt/engine/src/core/WorkflowEngine.ts:196).
- Integrity validator exists in [`PlanIntegrityValidator`](packages/@dvt/engine/src/security/planIntegrity.ts:18).

**Pending:**

- Extract and adopt shared verifier package across adapters (single canonical implementation).
- Complete adapter-level consistency checks and error mapping for all providers.

### ADR-0012a — Canonical Error Code Strategy

**Current:** 🟡 Partial  
**Implemented:**

- Engine raises typed domain errors (exists in [`errors.js`](packages/@dvt/engine/src/contracts/errors.js:1)).

**Pending:**

- End-to-end canonical mapping matrix for adapter/provider native errors.
- Explicit conformance tests across all adapters.

### ADR-0013 — `bootstrapRunTx`

**Current:** ✅ Implemented  
**Implemented:**

- Contract surface in [`IRunStateStore`](packages/@dvt/engine/src/state/IRunStateStore.ts:24).
- Engine uses atomic bootstrap in [`startRun()`](packages/@dvt/engine/src/core/WorkflowEngine.ts:169).
- In-memory and postgres adapters implement bootstrap and append+enqueue.

**Follow-up:**

- Keep expanding crash-recovery and failure-mode tests in integration suites.

### ADR-0014 — Run-driven Adapter Model

**Current:** ✅ Implemented  
**Implemented:**

- Adapter-first execution returns provider run reference, persistence performed by engine bootstrap.
- Mock adapter aligned to this model in [`MockAdapter.startRun()`](packages/@dvt/engine/src/adapters/mock/MockAdapter.ts:42).

### ADR-0015 — `getRunStatus` Read-model Separation

**Current:** ✅ Implemented  
**Implemented:**

- Snapshot-first status retrieval with replay fallback in [`getRunStatus()`](packages/@dvt/engine/src/core/WorkflowEngine.ts:273).
- Snapshot persistence in postgres adapter (`run_snapshots`) via [`ensureSchemaObjects()`](packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts:727).

### ADR-0016 — `logicalAttemptId` Adapter Ownership

**Current:** 🟡 Partial  
**Implemented:**

- Events include `logicalAttemptId` in engine-generated envelopes in [`buildRunEvent()`](packages/@dvt/engine/src/core/WorkflowEngine.ts:447).

**Pending:**

- Tighten ownership boundary documentation/tests for provider-emitted events and retries.

### ADR-0017 — ExecutionPlan Schema Versioning

**Current:** ✅ Implemented (baseline)  
**Implemented:**

- Schema version validation enforced in start preconditions.
- Test coverage includes invalid schema version rejection in [`engine.test.ts`](packages/@dvt/engine/test/contracts/engine.test.ts:289).

---

## 4) Updated roadmap (short horizon)

### Phase A (Now)

- Stabilize ADR-0012/0012a cross-adapter parity.
- Add adapter conformance tests for canonical error normalization.

### Phase B (Next)

- Expand resilience tests for ADR-0013 (bootstrap failure, compensation, retries).
- Strengthen ADR-0016 contracts for attempt ownership per runtime.

### Phase C

- Governance cleanup: sync ADR status docs and architecture index files.

---

## 5) Verification checklist

- [x] Status updated from concrete code references.
- [x] Recent CI/workflow changes reflected.
- [x] Run bootstrap ordering fix reflected.
- [ ] Cross-adapter error normalization fully complete (tracked as pending).
