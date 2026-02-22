# DVT+ Architectural Review & Roadmap Integration

Version: Integrated Review v1.0 Generated: 2026-02-21T17:37:44.778563Z

---

## 1. Executive Summary

DVT+ has excellent conceptual foundations (append authority, event
sourcing discipline, execution-planning separation). However,
implementation fidelity is currently \~40--50% relative to documented
vision.

The architecture is fundamentally sound. The implementation is not
production-ready.

Primary risk: continuing feature development on top of unresolved Wave 0
defects.

---

## 2. Foundational Assessment

## 2.1 Strengths

- Append authority model correctly implemented.
- Separation of emittedAt vs persistedAt is clean.
- bootstrapRunTx solves metadata-before-events race.
- Three-layer transition enforcement is correct defense-in-depth.
- Temporal-first strategy is aligned with deterministic execution.
- Product principle boundaries are conceptually clean:
  - Planner decides
  - Engine executes
  - State persists
  - UI reflects

## 2.2 Critical Gaps

- ADR-0012 not implemented (engine still fetches plan bytes)
- saveProviderRef outside event sourcing boundary
- getRunStatus synchronous provider call
- logicalAttemptId hardcoded
- Missing Execution Planning layer
- Plugin system defined but not implemented
- No SLA/backpressure/retention model

---

## 3. Integrated Roadmap (Refined)

## Wave 0 -- Correctness Restoration (Blocking)

### Execution Order (Refined)

W0-3 plan-verifier ↓ W0-2 Adapter signature change (PlanRef) ↓ W0-1
Remove IPlanFetcher

W0-4 saveProviderRef atomic integration (depends on W0-2)

Parallel: - W0-5 Signal idempotency contract - W0-6 Event-log-only
getRunStatus - W0-7 Snapshot integrity

### Completion Criteria

- Engine does not fetch plan bytes.
- All runs created atomically.
- No synchronous provider status calls.
- CI prevents regression.

Wave 0 must reach 100% before any adapter/state store expansion.

---

## Wave 1 -- Contract Reconciliation

W1-2 (IRunStateStore.v2.0.md alignment) → must precede W2-1
PostgresStateStore implementation.

Add Verification Protocol: - Every Accepted ADR must link to invariant
test. - CI must fail if invariant is violated. - ADR must link to test
path.

Goal: zero contradictions between docs and code.

---

## Wave 2 -- Critical Path (Real Infrastructure)

- PostgresStateStore MVP
- TemporalAdapter MVP (3-step execution)
- Golden path end-to-end run with real infra

Add: - ExecutionPlan.schemaVersion - Adapter must reject unsupported
plan versions.

---

## Wave 3 -- Operational Foundations

### W3-1 Stuck Run Detection

Architectural decision required:

Option A: Internal worker with leadership election.

Option B: Separate RunMonitor service (preferred for scale).

Add metric: Mean detection time \< SLA + 1 minute.

### W3-2 logicalAttemptId persistence

Must survive: - Worker restart - Full workflow replay - Retry signals
after replay

Tests mandatory.

### W3-3 Pagination

- listEvents paginated
- getRunStatus must implement paginated replay
- No full in-memory event loading

### Outbox Ordering

Guarantee per-run ordering on event bus: - Kafka partition key = runId -
NATS subject scoped per runId

---

## Wave 4 -- Hardening

Load test additions:

- 100 concurrent runs
- 100 events each
- Verify no global sequence contention

Target: p99 getRunStatus \< 100ms at 10K events.

---

## Wave 5 -- Execution Planning Layer

Introduce BasicPlanner:

RunSpec v1:

```ts
type RunSpec = {
  manifest: { uri: string; sha256: string };
  selection: {
    include: string[];
    exclude?: string[];
  };
  environment: string;
};
```

Phase 1 Planner: - Topological ordering only - No cost modeling - No
partial execution yet

Plugin system foundation starts here.

---

## 4. Risks & Mitigations

## ExecutionPlan Version Drift

Mitigation: - schemaVersion mandatory - Adapter compatibility matrix

## Outbox Ordering Drift

Mitigation: - Partition by runId - Ordering invariant test

## ADR Drift

Mitigation: - ADR verification protocol - CI-enforced invariants

---

## 5. Governance Rules

1.  No Wave 2 before Wave 0 completion.
2.  No UI expansion before State & Engine are stable.
3.  Every invariant must have a failing test.
4.  No undocumented behavior accepted into main branch.

---

## 6. Timeline Projection

Months 1--2: Wave 0 Month 3: Wave 1 Months 4--5: Wave 2 Month 6: Wave 3
Month 7: Wave 4 Months 8--9: Wave 5

Primary failure mode: Starting infrastructure expansion before
correctness stabilization.

---

## 7. Final Position

Architecture quality: strong Implementation maturity: insufficient
Roadmap quality: disciplined and realistic

Recommendation: Enforce Wave 0 freeze immediately.

---

End of Integrated Document
