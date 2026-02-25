# DVT+ — Principal Architect Review

**Date:** 2026-02-25 00:00  
**Role:** Principal / Staff Architect Review  
**Scope Basis:** ADR-0000 → ADR-0017, Planner v2.3.2, IWorkflowEngine v1.1.1, WorkflowEngine.ts, architecture diagram, planner ADRs 0001–0006.

---

## Source Artifacts

This review is based on the following project artifacts:

- Architecture diagram & system framing fileciteturn0file0
- Workflow Engine Artifact (Temporal-first strategy) fileciteturn0file1
- V2 Architecture Explanation fileciteturn0file2
- Product Definition V0 fileciteturn0file3

The three named standalone documents were not present independently; conclusions are derived from implemented code and ADRs.

---

# 1. Conceptual Soundness

## Core Trifecta

> “The UI does not execute.  
>  The engine does not decide.  
>  The planner does not persist.”

At the interface boundary level, this separation is valid.

- `IWorkflowEngine` consumes `PlanRef`, not raw plan bytes.
- Planner emits deterministic `ExecutionPlanV2`.
- `RunStateStore` is the sole source of truth.
- UI is projection-driven.

This separation is architecturally correct.

### Fragility Points

1. **Dual Versioning Namespace**
   - Planner: `planVersion` = schema format.
   - Engine `PlanRef.planVersion` = revision instance.
   - `schemaVersion` (engine compatibility gate).

   Same term, different semantics. High confusion risk.

2. **@dvt/plan-verifier Missing**
   ADR-0012 and ADR-0017 mandate a shared verification package. It does not exist.
   → Integrity enforcement is aspirational, not enforceable.

3. **Temporal Worker Direct DB Writes**
   Temporal activities write directly to `IRunStateStore`.
   This couples adapter workers to Postgres infrastructure.

4. **detectStuckRuns on IWorkflowEngine**
   Operational sweep function placed on primary lifecycle interface.
   Violates boundary purity.

5. **Projection Scalability**
   In-process projector.
   No async deployment model.
   No snapshot frequency enforcement.

---

# 2. Architectural Risk Map

| Risk                        | Severity | Likelihood | Rationale                      | Required Action                                  |
| --------------------------- | -------- | ---------- | ------------------------------ | ------------------------------------------------ |
| plan-verifier absent        | Critical | High       | ADR-mandated but missing       | Build before production                          |
| Temporal worker DB coupling | High     | Certain    | Hard infra dependency          | Accept formally or introduce state-write service |
| Version naming collision    | High     | High       | Semantic overload              | Rename planner field                             |
| DLQ strict blocking         | High     | Medium     | Poison event blocks run stream | Add DLQ tooling                                  |
| Snapshot incomplete         | High     | High       | Replay cost grows              | Implement snapshotting                           |
| Conductor undefined         | Medium   | Certain    | No adapter design              | Freeze parity claim                              |
| Tenant quota missing        | Medium   | Medium     | No limits per tenant           | Add quota enforcement                            |
| Retention undefined         | Medium   | High       | Event log growth               | Define archival policy                           |

---

# 3. Engine Abstraction Review

`IWorkflowEngine` should remain:

- startRun
- cancelRun
- getRunStatus
- enrichRunStatus
- signal

Remove `detectStuckRuns` from primary contract.

Temporal-first is operationally reasonable.

Conductor parity is theoretical; design not yet specified.

Event model is sound:

- logicalAttemptId / engineAttemptId separation
- idempotency hash formula correct
- cancel intent vs terminal separation correct

Determinism risk remains if workflow code introduces non-deterministic behavior.

---

# 4. Execution Planning Layer

Strengths:

- Kahn topological sort (O(N log N))
- Content-addressed `planId = sha256(JCS(planCore))`
- Deterministic canonicalization
- Clear StepFactory extension

Gaps:

- No enforcement that adapters honor retry policy.
- Cost attribution unimplemented.
- Input schema does not constrain resourceType enum.
- Planner and contracts define separate input type systems.

Planner core is production-grade. Surrounding contracts are not yet aligned.

---

# 5. State & Metadata Layer

Postgres is correct for transactional store.

Major missing elements:

- Retention policy
- Archival partitioning strategy
- Snapshot cadence specification
- Read replica/failover spec
- DLQ operator tooling

Projection remains in-process. Not horizontally scalable.

At projected scale (1000 tenants × 100 runs/day):
Append-only growth becomes operational pressure within 12 months.

---

# 6. Plugin System Evaluation

StepFactory extension clean.

However:

- No version contract for StepFactory.
- No isolation ADR for plugin runtime.
- vm2 deprecated; worker-thread alternative not documented.
- Capabilities self-declared; no attestation.

Plugin model conceptually valid but governance underbuilt.

---

# 7. Overbuilt Areas

1. Neo4j CI dependency for AI knowledge graph.
2. Six-phase idempotency migration ceremony.
3. Multi-engine ambition without second engine spec.

---

# 8. Underbuilt Areas

1. plan-verifier (critical).
2. Schema upgrade migration tooling.
3. Rollback semantics for in-flight runs.
4. Cost attribution layer.
5. DLQ operational tooling.
6. Tenant quota enforcement.
7. adapter-postgres implementation.
8. Async projector deployment model.

---

# 9. Scalability Outlook (3-Year)

Planner: horizontally scalable.

Primary bottlenecks:

- Projection read amplification.
- Outbox throughput and DLQ blocking.
- Event table growth without partitioning.
- Single Postgres write node.

Cost dashboards near-real-time capability not designed.

---

# 10. Architectural Scorecard

| Dimension              | Score | Commentary                                           |
| ---------------------- | ----- | ---------------------------------------------------- |
| Conceptual clarity     | 7/10  | Strong core; naming debt + verifier gap              |
| Separation of concerns | 6/10  | Boundaries clean conceptually; leak at adapter layer |
| Engine replaceability  | 5/10  | Interface stable; Conductor design absent            |
| Determinism            | 9/10  | Planner rigor excellent                              |
| Extensibility          | 6/10  | Plugin surface exists; governance missing            |
| Operational realism    | 4/10  | Production prerequisites incomplete                  |
| Maintainability        | 6/10  | ADR discipline strong; execution gaps remain         |

---

# 11. Strategic Priorities

## Immediate

1. Build `@dvt/plan-verifier`.
2. Extract detectStuckRuns from IWorkflowEngine.
3. Rename planner `planVersion` → `planSchemaVersion`.

## Clarify

1. ConductorAdapter write-path design.
2. Projector deployment topology.
3. Run retention & archival policy.

## Freeze

1. IWorkflowEngine lifecycle surface (5 methods only).
2. Idempotency key formula.
3. planCore hash boundary.

## Delay

1. Multi-event-bus expansion.
2. Cost attribution until execution stable.
3. Plugin runtime isolation redesign until first real plugin.

---

# Executive Summary

The conceptual architecture is coherent and disciplined.

The planner is production-grade.

The system is **not production-ready** due to:

- Missing plan-verifier
- Stub persistence adapter
- In-process projection model
- No retention or migration tooling

The risk is architectural ambition exceeding implementation maturity.

Priority should shift from expanding scope to closing enforceability gaps and operational hardening.
