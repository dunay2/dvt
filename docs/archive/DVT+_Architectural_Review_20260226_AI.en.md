# DVT+ â€” Technical Architectural Review (AI) â€” 2026-02-26

**Author:** AI Architect Review
**Date:** 2026-02-26
**Objective:** Critical evaluation of risks, conceptual consistency, separation of responsibilities, and long-term maintainability.

---

## Sources Used (Agreed)

1. `dvt_workflow_engine_artifact` â†’ `docs/architecture/engine/index.md`
2. `dvt_v2_architecture_explanation` â†’ `docs/archive/DVT+_Architectural_Review_20260225.md`
3. Product Definition Principle validated by indirect normative references in:
   - `docs/architecture/engine/contracts/engine/RunEvents.v1.md`
   - `docs/architecture/engine/security/SECURITY_INVARIANTS.v1.md`

---

## 1) Conceptual Soundness

### Solid

- The engine boundary is well defined: execution by `PlanRef`, not by embedded plan.
- The event model is correct in its base invariants: `runSeq` as order, `idempotencyKey` as dedupe, `persistedAt` as authoritative audit time.
- The idempotency formula is strictly defined and testable.
- Temporal workflow already preserves `gatewayDecisions` in `continueAsNew`, closing a relevant gap.

### Fragile

- The "engine does not decide" principle is eroded: runtime evaluates gateway DSL in workflow.
- Contractual drift exists in State Store between normative contract, legacy contract, and real runtime usage.
- The planner is below the specification level required by scope (real dbt DAG, partial execution, retry policy ownership).
- Documentation misalignment between v1.x and v2.0 references adds implementation ambiguity.

### Missing

- Distributed concurrency model for `startRun` formalized end-to-end.
- Unambiguous ownership of retry/backoff and authority over `logicalAttemptId`.
- Operational strategy for compatibility/migration between plan versions.

---

## 2) Architectural Risk Map

| Risk                              | Severity | Likelihood | Why                                                                      | Mitigation                                                    |
| --------------------------------- | -------- | ---------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| StateStore contract split         | High     | High       | Incompatible APIs between contract and runtime                           | Unify single canonical contract and remove legacy             |
| State/event explosion             | Critical | High       | Event sourcing + outbox + snapshots without closed growth policy         | Partitioning + tiered retention + automatic archiving         |
| Broken idempotency at edges       | High     | Medium     | Stability requirement for `eventId` depends on implementation discipline | Durable registry `(runId,idempotencyKey)` + crash/retry tests |
| Planner/engine creep              | High     | High       | Engine evaluates policies (gateway DSL), planner underspecified          | Move decisions to planner and harden contract                 |
| Plugin security                   | Critical | Medium     | Sandbox is DRAFT, no validated production enforcement                    | Block marketplace until strong, audited isolation             |
| Incomplete multi-tenant isolation | High     | Medium     | Documented invariant, no proven cross-cutting enforcement                | Mandatory tenant scope + negative test in CI                  |
| Overpromised Conductor parity     | High     | High       | Conductor declares gaps in replay/pause/cancel                           | Redefine goal as state equivalence                            |
| Operational complexity            | High     | High       | High contractual and operational surface for current maturity            | Reduce scope to executable and observable P0                  |

---

## 3) Engine Abstraction Critique

- `IWorkflowEngine` is small and correct in form, but still incomplete in operational semantics (concurrency, degradation, retry ownership).
- Temporal-first is the correct sequence.
- Conductor parity is not realistic as execution equivalence; it can be final state equivalence.
- The event model is robust in contract, but depends on real enforcement (especially stable `eventId` and Layer-3 projector).

---

## 4) Execution Planning Layer Analysis

- The visible contractual planner is insufficient for the promised scope (dbt artifacts + DAG + selection + determinism + versioning).
- Partial execution by layers works, but granularity may be too coarse for large DAGs.
- Retry/backoff ownership is diffuse between planner, engine, and adapter.
- Plan versioning is rigid (strict rejection of unsupported versions) and needs operational migration strategy.

**Diagnosis:** Underbuilt planner and overpromised multi-engine.

---

## 5) State & Metadata Layer Review

- PostgreSQL is valid in early phase, insufficient after 3 years without well-defined partitioning/retention/archiving.
- Snowflake is suitable for analytics, not for interactive control-plane.
- The append-only approach is correct, but requires strong discipline in projection, backfill, and operational cost.
- Artifact immutability is moving in the right direction with hash, but depends on real storage policies.

---

## 6) Plugin System Evaluation

- Contractual sandbox policy is moving in the right direction (prohibition of `vm2`/`node:vm` as boundary).
- Still DRAFT: no proven enforcement, no real guarantees.
- Critical risk: any plugin hook in workflow context compromises determinism.

---

## 7) What Is Overbuilt?

1. Multi-engine replacement narrative before closing minimum observable parity.
2. Ambition for documentary governance layers above real operational hardening.
3. Advanced cost attribution scope without fully defined technical pipeline.

---

## 8) What Is Underbuilt?

1. Planner (contract + implementation + real fixtures).
2. Tooling for contract/plan migration/versioning.
3. Rollback guarantees between engine/plan versions.
4. Distributed concurrency model for `startRun`.
5. Backpressure per tenant and admission limits.
6. Operational retention/archiving with compliance rules.
7. Executable SLO/SLA (not just documented).

---

## 9) Scalability Outlook (3-Year Horizon)

### Expected Bottlenecks

- Append Authority / event log.
- Outbox relay + projector in multi-tenant burst.
- Worker saturation in highly parallel layers.
- Planning recomputation if no effective cache.

### Single Points of Failure

- Primary store.
- Outbox delivery relay.
- Admission control without tenant quotas.

### Data Growth Pressure

- Events + snapshots will grow faster than sustainable manual tuning.

---

## 10) Architectural Scorecard

| Dimension                 | Score | Justification                                                     |
| ------------------------- | ----: | ----------------------------------------------------------------- |
| Conceptual clarity        |  7/10 | Clear principles, partial enforcement                             |
| Separation of concerns    |  6/10 | Reasonable engine-state boundary; planner-engine erosion          |
| Replaceability of engine  |  5/10 | Theoretical; Conductor still does not match operational semantics |
| Determinism               |  7/10 | Strong in Temporal; fragile in extensions/DSL                     |
| Extensibility             |  6/10 | Broad contracts, but key pieces not closed                        |
| Operational realism       |  4/10 | Missing critical operational guarantees                           |
| Long-term maintainability |  5/10 | Contractual drift and complexity > current maturity               |

---

## 11) Strategic Recommendations

### 3 Structural Changes

1. Unify State Store into a single canonical contract and remove legacy variants.
2. Treat planner as blocking P0 with contract/algorithm/fixtures and determinism gates.
3. Formally redefine multi-engine goal as state equivalence, not execution equivalence.

### 3 Necessary Clarifications

1. Authority of retries/backoff and `logicalAttemptId`.
2. Compatibility matrix + migration/rollback between plan and engine schemaVersion.
3. Operational contract for backpressure/admission per tenant.

### 3 Things to Freeze Now

1. Idempotency formula.
2. Split `emittedAt` vs `persistedAt`.
3. Execution rule by `PlanRef` (not full plan).

### 3 Things to Delay

1. Public exposure of marketplace/plugin.
2. Conductor parity claims without real behavior validation.
3. Advanced cost attribution without reliable step cost capture.

---

## Conclusion

DVT+ has a solid contractual base in event semantics, but its durability at scale depends on closing three structural gaps: underspecified planner, contractual drift in state-store, and overpromised multi-engine.
