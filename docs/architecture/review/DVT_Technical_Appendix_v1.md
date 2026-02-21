# DVT+ Architectural Review --- Technical Appendix

Version: Technical Appendix v1.0 Generated: 2026-02-21T17:41:00.845423Z

---

# 1. Purpose

This appendix preserves operational nuance, document-level
contradictions, verification protocols, and execution metrics that are
intentionally simplified in the Executive Integrated Review.

This document is implementation-facing. The Integrated Review remains
stakeholder-facing.

---

# 2. Full Matrix of Documentary Contradictions

---

Document A Document B Contradiction Resolution Verifying Test

---

ADR-0010 §4 RunEvents.v2.0.1 Idempotency payload Deprecate test/idempotency/golden-vectors.test.ts
§3.1 inclusion mismatch ADR-0010 §4

IWorkflowEngine.v2.0.md ADR-0014 startRun signature Enforce PlanRef test/contract/adapter-signature.test.ts
§2 mismatch only (W0-2)

IRunStateStore.v2.0.md IRunStateStore.ts appendEvent vs Align in W1-2 test/state/store-contract.test.ts
appendAndEnqueueTx  
 mismatch

ADR-0012 WorkflowEngine Engine fetching plan Remove test/engine/no-plan-fetcher.test.ts
implementation bytes IPlanFetcher  
 (W0-1)

ADR-0015 getRunStatus Sync provider call Event-log-only test/status/no-sync-provider.test.ts
implementation status

---

All rows must be resolved before Wave 2 begins.

---

# 3. Detailed Verification Protocol

ADR Verification Requirements:

Each Accepted ADR must include:

- A failing test that validates its invariant.
- The test must be part of mandatory CI suite.
- The ADR must contain a "Verification" section referencing the test
  path.
- The commit marking ADR as Accepted must include the verification
  test.

Exceptions: - Glossary or purely documentary ADRs. - Must explicitly
state why no test is required.

Shadow Validation Mode: - For behavioral ADRs, run invariant tests in CI
for 1 week minimum. - If no regression is detected, mark ADR as
"Accepted (Verified)".

---

# 4. Wave-Level Operational Metrics

## Wave 0

- \% WorkflowEngine tests passing without forbidden mocks
- Atomic run creation invariant holds under forced crash test
- getRunStatus never calls provider adapter
- Snapshot consistency verified via replay test

## Wave 1

- Number of documented contradictions remaining (target: 0)
- \% ADRs with linked verification tests (target: 100%)

## Wave 2

- \% Golden paths passing with real Postgres + Temporal infra
- ExecutionPlan.schemaVersion enforcement active

## Wave 3

- Mean stuck-run detection time \< SLA + 1 minute
- Outbox ordering invariant holds under concurrent publishing

## Wave 4

- p99 getRunStatus latency \< 100ms with 10K events
- runSeq contention benchmark under 100 concurrent runs

## Wave 5

- Number of loadable example plugins (target: ≥3)
- Planner v1 produces deterministic topological plan

---

# 5. logicalAttemptId --- Persistence Invariant

logicalAttemptId must:

- Be stored inside Temporal workflow state
- Be passed as parameter to activities
- Never be derived from database
- Survive worker restart
- Survive full workflow replay
- Survive retry signal after replay

Mandatory Tests:

- test/retry/logicalAttemptId-restart.test.ts
- test/retry/logicalAttemptId-replay.test.ts

---

# 6. Outbox Ordering --- Detailed Risk

Risk: Outbox writes are atomic, but publishing workers may run
concurrently.

Ordering Guarantee Requirement:

- Partition key = runId (Kafka)
- Subject scoped per runId (NATS)
- Or acquire per-runId lock before publishing

Invariant Test:

- Concurrent publish simulation must preserve per-run order

---

# 7. Hidden Dependencies (Example: Wave 0)

Example:

W0-5 (Signal idempotency) appears independent of W0-2.

Hidden dependency: If signals require PlanRef resolution, W0-2 must
precede W0-5.

Conclusion: W0-5 must not begin until W0-2 is complete.

---

# 8. Rollback & Contingency Plans

Each Wave must define:

Rollback Strategy: - Feature flags around major refactors - Reversible
schema migrations - Dual-path execution during transition

Safe Parallelization Rules: - Tasks modifying same interface cannot
proceed independently - Contract updates must be completed before
infrastructure expansion

---

# 9. ADR Migration Governance Risk

Risk: ADRs marked Accepted without enforcement.

Mitigation Process:

1.  Implement change.
2.  Write invariant test.
3.  Run in CI shadow mode.
4.  Update ADR with verification section.
5.  Merge only after review by Architecture owner.

Architecture owner must sign-off on: - Contract changes - Idempotency
formula changes - Event model changes

---

# 10. Timeline Clarification

Month 1 means: Month 1 after freezing all unrelated development.

No Wave 2 work may begin until Wave 0 invariants are fully verified in
CI.

---

# 11. Cross-Linking Requirement

The Executive Review document must include:

"Operational and verification details are defined in Technical Appendix
§X."

This appendix must remain synchronized with contract evolution.

---

End of Technical Appendix
