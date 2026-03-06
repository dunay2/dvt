---
title: DVT+ — AI-Executable Remediation Plan (Engine + Planner + State)
status: Draft
owner: docs
last_reviewed: 2026-03-04
planning_type: proposal
---

# DVT+ — AI-Executable Remediation Plan (Engine + Planner + State)

**Reference date:** 2026-02-26 (Atlantic/Canary)  
**Scope:** Convert the architectural review into an _implementation-grade_, step-by-step plan that an AI (or a team) can execute with verification gates, production-safe rollout steps, and “no-gaps” checks.

---

## 0) Non‑negotiable invariants (freeze now)

These must **not change** during remediation (or you re-open correctness/security risk).

1. **Adapter-first startRun ordering**  
   `adapter.startRun() → bootstrapRunTx → (on failure) adapter.cancelRun()`  
   _Why:_ closes the two-phase write gap and preserves compensation semantics.  
   _Risk if changed:_ “phantom runs” in Postgres or orphan workflows.

2. **Idempotency key derivation** (SHA‑256 preimage formula and golden vectors)  
   _Why:_ stable dedupe and safe retries/replays; changing it creates irreversible drift.

3. **Plan integrity ownership**  
   Adapter fetches plan bytes + validates SHA-256; engine receives **PlanRef only**.  
   _Why:_ keeps engine pure and testable; prevents “engine touches plan bytes” drift.

4. **Timestamp split**  
   `emittedAt` (producer) vs `persistedAt` (append authority).  
   _Why:_ audit correctness under clock skew.

---

## 1) Operating model for the remediation (how the AI should execute)

### 1.1 Execution cadence

- **One task at a time**, always in this sequence:
  1. **Change spec/contracts/ADR**,
  2. **Implement**,
  3. **Add tests (unit + integration)**,
  4. **Run CI gates**,
  5. **Ship behind a feature flag**,
  6. **Deploy**,
  7. **Observe**,
  8. **Promote flag**.

### 1.2 “No-gaps” gates (must pass after each P0 task)

- **Type boundary gate:** every cross-package boundary validates with runtime schemas (Zod).
- **Determinism gate (Temporal):** replay tests + ban non-deterministic primitives in workflow code.
- **Multi-tenant gate:** negative tests for cross-tenant reads and operations (IDOR prevention).
- **Outbox gate:** outbox queue must drain under load (at-least-once) and projector must catch up.

> Temporal testing and safe deployment references: citeturn3search0turn3search1turn3search4

---

## 2) Pattern library (what to implement, using proven OSS patterns)

### 2.1 Transactional outbox + relay

- **Pattern:** transactional outbox (write event + outbox row in the same DB tx), then relay to the bus.  
  Source: microservices.io outbox pattern citeturn0search1
- **Relay options:**
  - **Polling relay (P0)**: simplest, reliable, acceptable for Phase 1–2.
  - **CDC relay (P1)**: Debezium Outbox Event Router for scale. citeturn1search3

### 2.2 Deterministic gateway expressions

- **Pick:** CEL (Common Expression Language) for deterministic, constrained evaluation.
  - CEL spec: https://cel.dev/
  - JS/TS implementation: bufbuild/cel-es citeturn0search2
- **Hard rule:** gateway evaluation runs **in Activity context**, not workflow code.

### 2.3 dbt planning inputs (real artifacts)

- Use real dbt artifacts:
  - manifest.json reference citeturn1search0
  - node selection/graph operators citeturn1search1
  - sample project for fixtures: dbt-labs/jaffle-shop citeturn0search1

### 2.4 Postgres scaling primitives

- **Partition run_events** by time and/or tenant to prevent runaway table growth. citeturn2search2turn2search4
- PgBouncer for connection pooling (staging first): https://www.pgbouncer.org/config.html

### 2.5 Multi-tenant hardening (IDOR prevention)

- OWASP Multi-Tenant Security + IDOR cheat sheets citeturn1search2
- **Rule:** every read/list/cancel/signal requires tenantId and authz checks.

---

## 3) Remediation roadmap (P0/P1/P2) with step-by-step tasks

### Legend

- **DoD** = Definition of Done
- **AI checks** = what an AI must verify before marking “DONE”
- **Alternatives** = viable options with tradeoffs
- **Rollout** = production-safe deployment notes

---

## P0-02 — Unify `IRunStateStore` (contracts as single source of truth)

### Goal

Eliminate the 3 incompatible interfaces and force every package to import the same contract.

### Steps (AI-executable)

1. **Inventory current variants**
   - `packages/@dvt/engine/src/state/IRunStateStore.ts`
   - `packages/@dvt/contracts/...IRunStateStore...`
   - `packages/@dvt/engine/src/ports/IRunStateStore.ts`
2. **Design canonical interface** in `@dvt/contracts`:
   - MUST include:
     - `bootstrapRunTx(...)`
     - `appendAndEnqueueTx(...)` returning **AppendResult** (not void)
     - `listRuns(tenantId, ...)` (**tenantId required**)
     - `listEvents(tenantId, runId, fromSeq, limit)` (tenant-scoped)
     - `getSnapshot(tenantId, runId)`
3. **Delete/replace** engine-local copies with re-exports from contracts.
4. Add **boundary validation** for store inputs with Zod schemas.

### Why this decision

Contracts must be the single source of truth; otherwise drift causes silent incompatibilities.

### Alternatives

- Keep interface in engine and re-export from contracts (rejected): breaks “contracts are universal boundary”.

### DoD

- One interface exists, all imports converge, compilation breaks if any legacy copy used.

### Tests

- Type-level: `tsd` (or strict `pnpm -r typecheck`) ensures no conflicting duplicates.
- Integration: adapter + engine compile against the same interface.

---

## P0-03 — Remove type drift + add runtime validation on boundaries

### Goal

No duplicated core types across packages; all boundary payloads validated.

### Steps

1. Identify duplicated types: `RunStatus`, `PlanRef`, `RunContext`, `EngineRunRef`, `SignalRequest`, etc.
2. Move canonical definitions to `@dvt/contracts`:
   - `types.ts` + `schemas.ts` (Zod)
   - `vX` discriminated unions for evolvable payloads
3. Enforce:
   - API → Engine boundary: validate request payload schema
   - Adapter → Engine boundary: validate adapter outputs (PlanRef, EngineRunRef)
   - Outbox → Projector boundary: validate event envelope schema

### Why

TypeScript structural typing does not protect runtime payloads; Zod does.

### Alternatives

- JSON Schema only (possible, but Zod is faster for TS-first validation).

### DoD

- Every boundary call site has `schema.parse()` (or safeParse + mapped error).
- Negative tests for invalid payloads.

---

## P0-04 — Implement SnapshotProjector Layer-3 (mandatory FSM enforcement)

### Goal

Implement the mandatory contract: projector validation detects invalid transitions and marks run inconsistent.

### Design pattern

- **Finite State Machine** for Run + per-step state.
- **Reduction**: `snapshot = reduce(snapshot, event)`; reject invalid events.

### Steps

1. Define state machine:
   - Run states: `QUEUED → RUNNING → (SUCCEEDED|FAILED|CANCELLED)` plus transitional `CANCELLING`.
   - Step states: `PENDING → RUNNING → (SUCCEEDED|FAILED|SKIPPED)`
2. Define transition table (matrix) and implement reducer:
   - If invalid transition: emit `INCONSISTENT` marker in snapshot + attach reason code.
3. Implement `projectBatch(events[])` for performance and projector idempotence.
4. Add **golden tests**:
   - Valid sequences
   - Invalid sequences
   - Duplicated events (idempotency)
   - Retry sequences with logicalAttemptId (Phase 2 readiness)

### DoD

- Projector passes contract compliance: Layer-3 validation enforced.
- Snapshot explicitly records invalid transition outcomes.

---

## P0-05 — tenantId mandatory everywhere (stop IDOR)

### Goal

Prevent cross-tenant access by construction.

### Steps

1. Make `tenantId` **required** in all engine/service/store reads and lists:
   - `listRuns(tenantId, ...)`
   - `getRunStatus(tenantId, runId)`
   - `cancelRun(tenantId, runId)`
   - `signal(tenantId, runId, ...)`
2. At the API boundary:
   - derive tenantId from auth token/session, never from request body.
3. Add cross-tenant negative tests:
   - create run in tenantA; attempt read/cancel from tenantB must fail.
4. Add OWASP IDOR test cases as regression suite. citeturn1search2

### DoD

- No method accepts missing tenantId.
- Security regression suite in CI.

---

## P0-06/P0-07 — Planner: define contract + implement MVP (dbt manifest → ExecutionPlan)

### Goal

Make the system executable: planner produces real plans from real dbt artifacts.

### P0-06: Define `IPlanner` contract (normative)

**Inputs**

- `manifest.json` (or reference to immutable artifact)
- selection spec (dbt selectors or expanded node set)
- environment context (envId, target profile, vars)
- policy inputs (retry policy defaults, gateway DSL version)

**Outputs**

- `ExecutionPlan` (versioned)
  - layers/stages topologically sorted
  - steps with stable `stepId` derived from dbt `unique_id`
  - gateway info (dslVersion/expression) for conditional steps
  - metadata: planId hash, contractVersion, createdAt

**Validation**

- cycle detection
- missing dependencies
- unreachable node detection
- selection validity per dbt semantics

References: dbt manifest + selection docs citeturn1search0turn1search1

### P0-07: Implement Planner MVP

#### Steps

1. Build graph from `manifest.nodes` and `depends_on.nodes`.
2. Expand selection to a concrete set of nodes (respect dbt graph operators).
3. Topologically sort and produce layers (Kahn’s algorithm).
4. Produce `ExecutionPlan` with stable identifiers:
   - `stepId = sha256(dbt_unique_id)` or canonical mapping table.
5. Fixtures:
   - 10-node: derived from jaffle-shop
   - 100-node: synthetic expansion (repeatable generator)
   - 500-node: large synthetic, plus one real bigger manifest if available
6. Golden tests:
   - deterministic planId for same inputs
   - stable layering
   - cycle detection failures

### Alternatives

- Reuse dbt’s own selection expansion by calling dbt CLI (rejected for purity and deploy complexity).
- Use `@dbt-labs` internal libs (not stable or not TS-native in practice).

### DoD

- Planner produces ExecutionPlan for real manifest fixtures.
- Tests cover: determinism, selection semantics, cycles, missing deps.

---

## P0-08 — Plan cache by content hash

### Goal

Avoid re-parsing manifest and recomputing DAG on repeated runs.

### Cache key

- `cacheKey = sha256(manifestSha256 + selectionSpec + envId + plannerVersion + policyHash)`
- **Include tenantId** if plans can embed tenant-specific config (safer default).

### Implement

- P0: in-process LRU
- P1: Redis (shared cache)

### DoD

- Cache hit/miss metrics exported.
- Tests validate identical inputs reuse cached plan.

---

## P0-09/P0-10 — Gateway DSL + persist gatewayDecisions across continueAsNew

### P0-09: CEL evaluator spec + deterministic execution boundary

1. Standardize DSL: CEL v1; restrict functions to pure set.
2. Implementation using `cel-es` (TS) citeturn0search2
3. Execute evaluator in **Activity**, return boolean decision to workflow.
4. Add CI determinism gate:
   - Run Temporal replay tests for workflows with gateway steps (no nondeterministic use).

Temporal determinism/testing references: citeturn3search1turn3search0

### P0-10: continueAsNew state preservation

- Extend workflow input with `gatewayDecisions: Record<stepId, boolean>`
- Ensure each continueAsNew call forwards full map.

### DoD

- Repeated continueAsNew produces same gating decisions given same step results.
- Replay tests pass.

---

## P0-11 — Outbox relay MVP (polling) + DLQ

### Goal

Complete the outbox pattern: events are published and consumers (projectors/UI) observe them.

### Design

- `OutboxRelayWorker`:
  - polls `outbox` table for pending rows
  - publishes to `IEventBus.publish(envelope)`
  - marks delivered or failed (with retry/backoff)
- Delivery semantics:
  - at-least-once
  - idempotent consumers required (dedupe by `(runId, seq)`)

Outbox references: citeturn0search1turn1search3

### Alternatives

- CDC with Debezium (P1). citeturn1search3

### DoD

- Outbox drains continuously.
- Injected failure tests: publish fails → retry → DLQ after N attempts.

---

## P0-12 — startRun concurrency fix (Temporal workflowId = runId)

### Goal

Prevent duplicate workflows for same runId across concurrent API calls.

### Temporal approach

- Use `workflowId = runId`
- Set WorkflowIdConflictPolicy / reuse policy appropriate to desired semantics  
  (Temporal TS API reference) citeturn3search1turn3search5

### Steps

1. In adapter.startRun: always use workflowId=runId.
2. If workflow exists:
   - treat as idempotent start (return existing EngineRunRef)
   - do **not cancel** a legitimate workflow due to losing race.
3. Add a race test:
   - N parallel startRun calls → exactly one Temporal workflow execution, all callers get same runRef.

### DoD

- Race test passes; no cancel of legitimate workflow occurs.

---

## P0-13 — Extract detectStuckRuns into maintenance service

### Goal

Remove operational batch behavior from IWorkflowEngine.

### Steps

1. Define `IRunMaintenanceService`:
   - `detectStuckRuns(tenantId, limit, policy)` (or internal scheduled worker)
2. Engine remains lifecycle-only: start/cancel/status/signal.
3. Implement maintenance worker as separate process (or separate queue).

### DoD

- Engine interface minimal again.
- Maintenance runs cannot race engine calls without explicit locking policy.

---

## P0-14 — CI “no-gaps” suite (replay/idempotence/chaos)

### Suite composition

1. **Determinism replay tests** (Temporal testing suite) citeturn3search0turn3search1
2. **Idempotency vectors** (existing golden vectors) must remain passing.
3. **Cross-tenant negative tests** for every API/store route.
4. **Outbox drain test** (integration with Postgres + fake bus).
5. **Projector gap/backfill** tests: missing seq triggers catch-up correctly.

### DoD

- CI fails if any gate fails; gates are mandatory.

---

## P1/P2 (design now, implement after P0 is stable)

### P1-01 — Contract migration tooling (dual-read executable)

- Implement discriminated unions + migrators; follow blueprint dual-read protocol.
- Add “compatibility matrix” tests: v1 input accepted → v2 output.

### P1-02 — Postgres partitioning for run_events

- Use declarative partitioning by time (persistedAt) and optionally sub-partition by tenantId. citeturn2search2turn2search4
- Add maintenance job to create future partitions; evaluate pg_partman.

### P1-03 — PgBouncer in staging

- Enforce connection pooling and observe pool saturation.

### P1-05 — Plugin sandbox decision + PoC

- **Do not ship vm2** (EOL / vulnerable).
- Evaluate isolated-vm for JS plugin execution. (project link: https://github.com/laverdet/isolated-vm)
- Contractually enforce: plugins only run in Activities.

---

## 4) AI runbook: how to verify correctness after each change

### 4.1 Verification checklist per PR

- [ ] `pnpm -r typecheck` passes
- [ ] `pnpm -r test` passes (unit + integration)
- [ ] Replay tests (Temporal) pass for workflows changed
- [ ] Cross-tenant negative tests pass
- [ ] Outbox drains in docker-compose (or staging) with synthetic load
- [ ] Projector rebuild from event log produces identical snapshots

### 4.2 Production rollout checklist (per feature flag)

- [ ] Deploy relay worker first (safe, no behavior change if disabled)
- [ ] Enable new projector on a subset of tenants (shadow mode)
- [ ] Compare snapshots old vs new (diff tool)
- [ ] Promote flag progressively
- [ ] Confirm SLOs and DB load

---

## 5) Status board (from your provided baseline; requires repo verification)

> **Note:** Marking as HECHO/PARCIAL here reflects your pasted status table, not a live repo scan.

| ID    | Task                              | Priority | Estado    |
| ----- | --------------------------------- | -------: | --------- |
| P0-01 | ADRs clave actualizados           |       P0 | HECHO     |
| P0-02 | IRunStateStore unificado          |       P0 | PARCIAL   |
| P0-03 | Tipos únicos + validación runtime |       P0 | PARCIAL   |
| P0-04 | Projector Layer-3 FSM             |       P0 | PARCIAL   |
| P0-05 | tenantId obligatorio              |       P0 | PARCIAL   |
| P0-06 | IPlanner spec + schema            |       P0 | PARCIAL   |
| P0-07 | Planner MVP                       |       P0 | PENDIENTE |
| P0-08 | Plan cache                        |       P0 | PENDIENTE |
| P0-09 | Gateway CEL                       |       P0 | PARCIAL   |
| P0-10 | continueAsNew + gatewayDecisions  |       P0 | HECHO     |
| P0-11 | Outbox relay                      |       P0 | PARCIAL   |
| P0-12 | startRun concurrency              |       P0 | PARCIAL   |
| P0-13 | Maintenance service               |       P0 | PENDIENTE |
| P0-14 | CI no-gaps suite                  |       P0 | PARCIAL   |
| P1-01 | Contract migration tooling        |       P1 | PENDIENTE |
| P1-02 | Postgres partitioning             |       P1 | PENDIENTE |
| P1-03 | PgBouncer pooling                 |       P1 | PENDIENTE |
| P1-04 | Snowflake tagging PoC             |       P1 | PENDIENTE |
| P1-05 | Plugin sandbox                    |       P1 | PENDIENTE |
| P1-06 | Conductor strategy                |       P1 | HECHO     |
| P2-01 | Retención + GDPR                  |       P2 | PENDIENTE |
| P2-02 | Señales extensibles               |       P2 | PENDIENTE |
| P2-03 | Capacity planning Temporal        |       P2 | PENDIENTE |

---

## 6) Quick next actions (zero ambiguity)

1. **P0-02** unify `IRunStateStore` (contracts only)
2. **P0-11** outbox relay polling worker (end-to-end visibility)
3. **P0-06 → P0-07** IPlanner + planner MVP (system becomes runnable)
4. **P0-04** projector FSM layer‑3 (contract compliance)
5. **P0-05** tenant scoping gate (security)

This ordering produces the fastest path to a production-grade “vertical slice” with correctness + observability.
