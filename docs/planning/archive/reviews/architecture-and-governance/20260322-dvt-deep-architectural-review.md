---
title: 20260322 DVT Deep Architectural Review
status: Historical
owner: Architecture
last_reviewed: 2026-03-22
planning_type: review
---

# DVT+ Deep Architectural Review — 2026-03-22

---

## 1. Conceptual Soundness

### What is solid

The core principle — **"UI does not execute, engine does not decide, planner does not persist state"** — is structurally enforced in the package graph.

- `@dvt/planner` has zero I/O in its domain pipeline:
  ```
  validate → normalize → build graph → select → sort → assemble
  ```
- `PlanAssembler` produces a content-addressable artifact:
  ```
  planId = sha256(JCS(planCore))
  ```

**Event sourcing is coherent:**

- `run_events` is append-only
- Constraint: `UNIQUE(run_id, idempotency_key)`
- `applyRunEvent` is the single derivation function
- `WorkflowSnapshot` = CQRS read model (ADR-0039 F4)

**Pre-bootstrap path correctness:**

```text
estimateRunRef → bootstrapRunTx → adapter.startRun
```

Eliminates dual-producer race.

**Hexagonal architecture:**

- `@dvt/contracts` = shared kernel (no workspace dependencies)
- Adapters depend inward
- `IProviderAdapter` is a proper secondary port

### What is fragile

#### 1. WorkflowEngine conflation (ADR-0039 F2)

`WorkflowEngine.startRun()` does:

- Authorization
- Rate limiting
- Orchestration across multiple ports
- Domain event construction

This is an **Application Service**, not a Domain Service.  
ADR-0039 prescribes `StartRunApplicationService` extraction (S03).  
**S03 is not implemented.**

#### 2. IRunStateStore monolith (ADR-0039 F3)

Single interface mixes:

- Write operations
- Read operations
- Maintenance operations

Violates ISP.

Required split (S02):

- `IRunWriteStore`
- `IRunReadStore`
- `IRunMaintenanceStore`

#### 3. Boundary violations

- `providerSelection.ts` reads `process.env` inside `@dvt/engine`
- `IRunAccessPolicy` is not a true port

#### 4. Snapshot concurrency undefined

Two writers update `run_snapshots`:

- `appendAndEnqueueTx`
- `ProjectorWorkerRuntime.rebuildSnapshot`

Missing:

- optimistic locking
- version check
- CAS on `last_run_seq`

This creates a last-write-wins race.

#### 5. Gateway DSL unversioned

- `gateway.expression` is a raw string
- Evaluator lives inside `RunPlanWorkflow.ts`
- No `gatewayDslVersion`

This is a determinism risk.

#### 6. ADR-0009 unresolved

Outbox ordering is still not settled.  
This directly affects lineage correctness.

### What is missing

- Explicit snapshot concurrency model
- Per-step retry policy
- Backpressure strategy
- Real-time UI update contract (SSE/WebSocket)
- Runtime contract version enforcement
- Explicit rollback semantics when `bootstrapRunTx` succeeds and `adapter.startRun` fails

---

## 2. Architectural Risk Map

| Risk                                               | Severity | Likelihood | Why                                          | Mitigation                                           |
| -------------------------------------------------- | -------- | ---------- | -------------------------------------------- | ---------------------------------------------------- |
| AllowAllAuthorizer is the only concrete authorizer | CRITICAL | Certain    | Production RBAC is absent                    | Deliver a real `IAuthorizer`; remove insecure bypass |
| Snapshot write race                                | HIGH     | Medium     | No optimistic concurrency on `run_snapshots` | Add CAS on `last_run_seq`                            |
| `IRunStateStore` monolith never split              | HIGH     | High       | S02 mandated, not implemented                | Execute S02 now                                      |
| Outbox ordering undefined                          | HIGH     | Medium     | Can corrupt lineage graph ordering           | Settle ADR-0009; add event sequence envelope         |
| Gateway DSL non-determinism                        | HIGH     | Low        | Evaluator unversioned, adapter-internal      | Add `gatewayDslVersion`                              |
| Deprecated methods still present                   | MEDIUM   | High       | Bypass atomic guarantees                     | Remove them immediately                              |
| `process.env` in domain package                    | MEDIUM   | Certain    | Boundary violation                           | Move to composition root                             |
| Planner CPU saturation                             | MEDIUM   | High       | CPU-bound work on API event loop             | Worker pool with bounded queue                       |
| Outbox double-delivery                             | MEDIUM   | Medium     | No mandatory claim/lease                     | Make lease mandatory                                 |
| `continueAsNew` boundary drift                     | MEDIUM   | Low        | Config can change mid-run                    | Freeze config in plan/workflow state                 |
| Dead-letter accumulation                           | MEDIUM   | High       | No purge/replay symmetry                     | Add replay + retention policy                        |
| Duplicate `estimateRunRef` declaration             | LOW      | Certain    | Review debt                                  | Fix interface                                        |

---

## 3. Engine Abstraction Critique

### Is `IWorkflowEngine` minimal and correct?

Current methods:

- `startRun`
- `cancelRun`
- `getRunStatus`
- `enrichRunStatus`
- `signal`

Problem:

- `getRunStatus` and `enrichRunStatus` return the same shape
- Distinction is operational, not contractual

Better shape:

```ts
getRunStatus(input: { enrich?: boolean }): RunStatusSnapshot
```

Or move enrichment into a separate diagnostic port.

### Is Temporal-first wise?

For durable, deterministic step orchestration: yes.

But the workflow implementation is explicitly Temporal-native:

- `continueAsNew`
- Temporal signals
- `workflow.now()`
- `workflow.patched()`

That means `IProviderAdapter` is a clean abstraction, but the concrete workflow model is not runtime-neutral in practice.

### Is the event model robust?

Good:

- `StepStarted`
- `StepCompleted`
- `StepFailed`
- `RunQueued`
- `RunStarted`
- `RunCompleted`
- `RunFailed`
- `RunCancelRequested`
- `RunCancelled`

Risk points:

- gateway expressions evaluated against unstable semantics
- time usage outside workflow-safe boundaries
- `continueAsNew` layer-count stability

### Is `ExecutionPlan` sufficiently expressive?

For straight DAG execution: mostly yes.  
For gateways: partially.

Missing:

- per-step retry policy
- per-step timeout
- step execution context
- `gatewayDslVersion`

---

## 4. Execution Planning Layer Analysis

### Correct

- Kahn’s algorithm is appropriate
- content-addressable `planId` is the right identity model

### Partial execution

There is no native resume-plan concept.

Failure recovery works by re-planning with a different selection.  
That is acceptable if treated as an explicit system constraint.

### Retry/backoff ownership

Retry is currently owned by Temporal deployment configuration, not by the plan.

That weakens determinism because runtime operators can change retry semantics without changing plan version.

### Cost estimator realism

Not implemented.

There is:

- no `ICostEstimator`
- no cost fields in `ExecutionStepV2`
- no cost attribution in emitted events

Any future cost dashboard must wait for cost events to exist.

### Plan versioning

ADR-0036 defines registry/versioning, but runtime compatibility enforcement is not implemented.

### Over-engineering

Planner input currently has four graph-source paths:

- `manifestRef`
- `graphSource`
- `manifest`
- `nodes`

This is governance-heavy surface area that should be reduced or strongly deprecated.

### Under-specification

Missing or unclear:

- gateway DSL
- per-step retry semantics
- relationship between `planVersion` and engine workflow version

---

## 5. State & Metadata Layer Review

### What is solid

Artifact immutability is correct:

- `planId = sha256(JCS(planCore))`
- `PlanRef.sha256` provides fetch-time integrity validation

### Write amplification risk

A single `appendAndEnqueueTx` can do all of the following:

- insert event rows into `run_events`
- update full snapshot JSON in `run_snapshots`
- insert outbox records into `outbox`

At high parallelism and high run volume, Postgres becomes the bottleneck before Temporal.

### Event sourcing vs mutable state tradeoff

`rebuildSnapshot` performs full replay from `listEvents`.

Problems:

- O(events)
- full event log loaded into memory
- no pagination in rebuild path

At scale, this is a hot-path danger if projector lag occurs.

### Projector weakness

- single instance
- no visible sharding strategy

If it lags, snapshot fallback forces full replay on demand.

---

## 6. What Is Overbuilt

- Archive schema exists before retention/trigger policy exists
- `IRunStateStore` has optional methods instead of being split
- `ConductorRunRef` exists without concrete adapter
- `continueAsNew` adds complexity early

---

## 7. What Is Underbuilt

- Real RBAC
- Outbox claim/lease path
- Backpressure
- Explicit rollback semantics
- Per-step retry and timeout in plan
- Runtime version enforcement
- UI real-time update mechanism
- Gateway DSL specification
- Lineage dead-letter replay
- Failure recovery SLA

---

## 8. Scalability Outlook — 3-Year Horizon

Assumptions:

- 1000+ tenants
- thousands of concurrent runs
- 1000+ node dbt projects
- future cost dashboards

### Main bottlenecks

#### Postgres

Single write store for:

- `run_events`
- `run_snapshots`
- `outbox`
- `lineage_outbox`
- `run_metadata`

This is a scaling choke point.

#### Outbox

- scan-heavy path
- no archival policy
- large table growth risk

#### Planner CPU

- synchronous CPU on API process
- event-loop blocking under concurrent planning load

#### Projector worker

- single instance
- no sharding
- lag causes expensive snapshot rebuild fallback

#### Temporal persistence

`continueAsNew` reduces per-segment history, but overall history still grows linearly with workflow volume.

### Missing for future scale

- cost attribution model
- pre-aggregated analytical layer
- HA configuration for workers

### Single points of failure

- Postgres writer
- Temporal cluster
- outbox worker
- projector worker
- lineage worker

---

## 9. Architectural Scorecard

| Dimension                 | Score | Justification                                                  |
| ------------------------- | ----- | -------------------------------------------------------------- |
| Conceptual clarity        | 7/10  | Strong principle, but unresolved conflations remain            |
| Separation of concerns    | 5/10  | Good intent, multiple known violations                         |
| Replaceability of engine  | 6/10  | Clean port, but Temporal-native workflow                       |
| Determinism               | 5/10  | Core is sound, but DSL/retry/version gaps remain               |
| Extensibility             | 7/10  | Registry/adapters are good; some placeholders are aspirational |
| Operational realism       | 4/10  | Not ready for production multi-tenant load                     |
| Long-term maintainability | 6/10  | ADR discipline is strong; remediation lags                     |

### SOLID / Hexagonal summary

- **SRP**: violated in `WorkflowEngine` and `IRunStateStore`
- **OCP**: planner pipeline and adapter extension points are good
- **LSP**: optional methods on `IRunStateStore` create partial implementors
- **ISP**: violated primarily by `IRunStateStore`
- **DIP**: violated by `process.env` in domain and infra concerns inside engine
- **Hexagonal**: mostly sound, but boundary leaks exist
- **CQRS**: intent is correct, interface boundary is conflated

---

## 10. Strategic Recommendations

### 3 Structural Changes

#### 1. Execute ADR-0039 S02 immediately

Split `IRunStateStore` into:

```text
IRunWriteStore
IRunReadStore
IRunMaintenanceStore
```

Reason: every week of delay increases coupling to the monolith.

#### 2. Deliver a real `IAuthorizer` before any multi-tenant deployment

- remove insecure bypass
- enforce tenant-scoped RBAC
- stop treating current state as production-capable

#### 3. Remove deprecated methods from `PostgresStateStoreAdapter`

Delete immediately:

- `saveRunMetadata`
- `appendEventsTx`

They bypass atomic guarantees and create permanent hazard if left in public API.

### 3 Clarifications Needed

1. Gateway expression DSL:
   - language
   - versioning
   - migration strategy

2. Outbox claim/lease deployment model:
   - single worker or multi-worker
   - claim strategy
   - sharding path

3. Snapshot concurrency invariant:
   - CAS required?
   - or is last-write-wins acceptable?

### 3 Things to Freeze Immediately

1. `@dvt/contracts` shape  
   No new fields without ADR.

2. `planId` computation formula  
   `sha256(JCS(planCore))` must remain stable.

3. Pre-bootstrap start path  
   `estimateRunRef → bootstrapRunTx → adapter.startRun`

### 3 Things to Delay

1. Cost attribution  
   Do not build dashboards before cost events exist.

2. Multi-engine abstraction (`Conductor`)  
   Do not carry abstraction cost before a real second engine exists.

3. Archive worker implementation  
   Do not build worker before retention and trigger policy exists.

---

## References

- ADR-0009
- ADR-0015
- ADR-0019
- ADR-0033
- ADR-0036
- ADR-0037
- ADR-0038
- ADR-0039

### External references

- Event Sourcing — Martin Fowler: https://martinfowler.com/eaaDev/EventSourcing.html
- CQRS — Martin Fowler: https://martinfowler.com/bliki/CQRS.html
- Temporal Documentation: https://docs.temporal.io
- Hexagonal Architecture — Alistair Cockburn: https://alistair.cockburn.us/hexagonal-architecture/
