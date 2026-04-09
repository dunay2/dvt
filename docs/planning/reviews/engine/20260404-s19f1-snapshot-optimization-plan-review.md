---
title: 20260404 S19-F1 Snapshot Optimization Plan Review
status: Review
owner: engine / contracts / qa
last_reviewed: 2026-04-04
planning_type: review
---

# 20260404 S19-F1 Snapshot Optimization Plan Review

## Summary

This review converts `S19-F1-C` into an execution-ready QA plan focused on
performance proof and claim-semantics closure for snapshot work-queue behavior.

Canonical execution tracking remains in:

- `docs/planning/state/agent-lane-a.yaml`
- `docs/evidence/critical/ED-20260330-s19f1-phase1-phase2-snapshot-work-queue.md`

## Governing Sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `AGENTS.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/templates/qa/TEMPLATE_QA_ARTIFACT_EXAMPLE.md`
- `docs/planning/state/agent-lane-a.yaml`
- `docs/risk-register/quality/R-20260330-S19F1-SNAPSHOT-WORK-QUEUE-CLAIM-SEMANTICS.yaml`

## Findings

### High

- Title: `S19-F1-C` remains open without closure-grade performance evidence
  Why it matters: lane A still tracks `S19-F1-C` as `in_progress` with residual
  risk for 5000-concurrent-runs target.
  Evidence: `docs/planning/state/agent-lane-a.yaml` (`S19-F1`, `S19-F1-C`).
  Risk: runtime confidence at target load remains incomplete.
  Recommendation: execute EXPLAIN-backed evidence and claim-semantics proof,
  then update lane and risk posture in the same closure slice.

### Medium

- Title: planning artifact quality drift in current S19 review doc
  Why it matters: current document contains mixed sections and duplicated blocks,
  which weakens execution clarity.
  Evidence: existing `20260404-s19f1-snapshot-optimization-plan-review.md`
  content before this rewrite.
  Risk: ambiguous handoff and checklist drift.
  Recommendation: maintain one template-conformant artifact with explicit DoD.

### Low

- Title: residual risk-to-evidence mapping is implicit
  Why it matters: risk retirement requires explicit command/evidence mapping.
  Evidence: lane references risk entry but no closure matrix in this artifact.
  Risk: closure can be marked without deterministic proof trail.
  Recommendation: include one invariant-to-command matrix in execution phase.

## Alignment

- Doc vs code: phase 1 and 2 are already delivered; closure gap is evidence and
  risk retirement.
- Promise vs implementation: O(1) selector and queue path exist; closure proof
  for concurrency semantics remains open.
- Tests vs claims: local tests exist, but closure needs stress + claim-semantics
  evidence at target load.
- Current truth vs planned truth: current truth is partially closed; planned
  truth is `S19-F1-C` done with risk retired.
- Documentation update status: this artifact is now normalized and executable.
- Evidence and risk-doc status when applicable: risk entry exists; closure
  evidence for final retirement is pending.

## Architecture Assessment

- SRP: keep performance and claim semantics validation scoped to queue/selector
  ownership seam.
- DDD: snapshot discovery and claim policy stay explicit in one boundary.
- Hexagonal: enforce proof at adapter/query boundary, not in app orchestration.
- CQRS if relevant: optimization is read-path and queue-claim behavior.
- Complexity: moderate; concurrency proof is the main risk.
- Modularity: good if selector, claim policy, and evidence harness remain
  separated and testable.

## Test Assessment

- Negative paths present: existing queue/selector suites from phase 1 and 2.
- Negative paths missing: explicit 5000-run stress and claim-race retirement
  proof for closure.
- Regression status: not fully closed until `S19-F1-C` evidence is accepted.
- Determinism: required for claim ownership and queue-processing invariants.
- Local suite vs meaningful global confidence: local confidence is good,
  closure-grade confidence still pending target-load evidence.
- Global system view applied: yes, includes selector + queue + risk retirement.
- Harness or shared fixture need: yes, use one shared stress harness.
- Test grouping by type (`unit` / `integration` / `contract` / `e2e` /
  regression) and rationale: group stress + claim-race as integration/regression
  to isolate cost and signal.

## Quality Gates

- Commands executed in this planning slice:
  - `pnpm verify:prepush`
- What passed:
  - `pnpm verify:prepush`.
- What failed:
  - none.
- What could not be verified:
  - actual 5000-run stress execution in this planning-only pass.

## Unblock Roadmap

### Wave 0 - Truth and baseline

Tasks: `S19-F1-C-T1`, `S19-F1-C-T2`

Target:

- current runtime truth and risk scope are explicit;
- closure invariants and evidence commands are frozen before execution.

### Wave 1 - Performance and claim semantics proof

Tasks: `S19-F1-C-T3`, `S19-F1-C-T4`

Target:

- stress and EXPLAIN evidence at target load are captured;
- claim semantics under concurrency is proven and reproducible.

### Wave 2 - Governance closure

Tasks: `S19-F1-C-T5`, `S19-F1-C-T6`

Target:

- risk retirement and evidence links are synchronized;
- lane/review status transitions to done with auditable closure.

## Action Artifact

### Markdown Artifact Path Suggestion

- `docs/planning/reviews/engine/20260404-s19f1-snapshot-optimization-plan-review.md`

### Task Checklist

- [x] `S19-F1-C-T1` Freeze current-state runtime and risk baseline
- [x] `S19-F1-C-T2` Define closure invariants and command matrix
- [x] `S19-F1-C-T3` Execute EXPLAIN-backed performance proof at target load
- [x] `S19-F1-C-T4` Execute claim-semantics concurrency validation
- [ ] `S19-F1-C-T5` Publish closure evidence and update risk status
- [ ] `S19-F1-C-T6` Sync lane/review surfaces and close the slice

### Execution Log

- 2026-04-04:
  - Executed `S19-F1-C-T1` by freezing baseline from lane state and risk entry.
  - Executed `S19-F1-C-T2` by defining closure invariants and command matrix.
  - Executed `pnpm verify:prepush` for this planning slice.
  - Executed concurrency/regression suites for `S19-F1-C-T4` baseline:
    - `pnpm exec vitest run packages/@dvt/delivery/test/ProjectorWorkerRuntime.test.ts packages/@dvt/adapter-postgres/test/PostgresRunEventStore.test.ts packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.sharding.test.ts`
    - Result: pass (`4` files, `66` tests).
  - `S19-F1-C-T3` and final closure of `S19-F1-C-T4` remain open pending explicit
    target-load (`5000` concurrent runs) plus EXPLAIN-backed evidence capture.
  - Added executable integration closure harness:
    - `packages/@dvt/adapter-postgres/test/S19F1SnapshotWorkQueueClosure.integration.test.ts`
    - Includes:
      - EXPLAIN + 5000-run stale-selector path check (`run_event_heads` usage signal).
      - Concurrent `claimSnapshotWork` split/no-duplicate claim invariant check.
  - Executed:
    - `pnpm exec vitest run packages/@dvt/adapter-postgres/test/S19F1SnapshotWorkQueueClosure.integration.test.ts`
    - Result: `skipped` (`2` tests) because integration env vars are not present in this shell:
      - `DVT_PG_INTEGRATION` unset
      - `DVT_PG_URL` unset
      - `DATABASE_URL` unset
  - Blocker for hard closure:
    - Real Postgres integration environment is required to produce closure-grade EXPLAIN and
      5000-concurrency evidence for `S19-F1-C-T3/T4`.
  - Executed with Docker Postgres (`infra/docker/postgres/docker-compose.yml`) and real env:
    - `DVT_PG_INTEGRATION=1`
    - `DVT_PG_URL=postgresql://dvt:dvt@localhost:5432/dvt`
  - Real execution result:
    - `pnpm exec vitest run packages/@dvt/adapter-postgres/test/S19F1SnapshotWorkQueueClosure.integration.test.ts`
    - Pass (`2` tests).
  - Material findings and fix applied:
    - Found real claim SQL failure under Postgres:
      - `FOR UPDATE cannot be applied to the nullable side of an outer join`.
    - Fixed claim query lock target in `PostgresSnapshotWorkQueue`:
      - from `FOR UPDATE SKIP LOCKED`
      - to `FOR UPDATE OF q SKIP LOCKED`
  - `S19-F1-C-T3/T4` are now evidenced as executed on real Postgres.

### Closure Invariant Matrix (`S19-F1-C-T2`)

| Invariant                                                                                        | Command                                                                                                                     | Expected signal                                                                     | Failure signal                                                                    |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Target-load snapshot selector remains bounded and does not regress into correlated scan hot path | `pnpm --filter @dvt/adapter-postgres test -- PostgresStateTransitions.integration.test.ts` plus EXPLAIN capture in evidence | Query plan and measured behavior align with bounded selector path at target load    | Correlated scan reappears or latency/throughput degrades beyond closure threshold |
| Snapshot work-queue claim semantics are race-safe under concurrency                              | `pnpm --filter @dvt/engine test -- SnapshotProjector` and concurrency-focused claim suite in execution slice                | No duplicate/lost claim behavior under contention; deterministic ownership outcomes | Duplicate claim, dropped work item, or non-deterministic ownership                |
| Governance closure is evidence-backed and risk-synchronized                                      | `pnpm docs:sync`, `pnpm docs:workboard:generate`, `pnpm verify:prepush`                                                     | Lane/review/risk/evidence references are synchronized and pass repo gates           | Drift between lane/review/evidence or failing governance/quality gates            |

### Task Details

#### `S19-F1-C-T1` Freeze current-state runtime and risk baseline

- Objective: record current status and residual risk before execution changes.
- Scope: lane A task entries, risk register entry, this review artifact.
- Recommended owner: lane A owner + docs owner.
- In current task scope: yes.
- Dependencies: none.
- Documentation impact: normalize status and scope statements.
- Evidence / risk-doc impact: none yet.
- Comment with rationale: no closure is credible without a frozen baseline.
- Definition of Done:
  - current status summary and dependencies are explicit;
  - current-state Mermaid map exists.

#### `S19-F1-C-T2` Define closure invariants and command matrix

- Objective: map closure claims to executable commands.
- Scope: this review artifact and closure evidence outline.
- Recommended owner: engine owner + QA owner.
- In current task scope: yes.
- Dependencies: `S19-F1-C-T1`.
- Documentation impact: add invariant-to-command matrix in evidence phase.
- Evidence / risk-doc impact: prepares risk retirement criteria.
- Comment with rationale: prevent "green by narrative" closure.
- Definition of Done:
  - each invariant has one command and one expected signal;
  - failure criteria are explicit.

#### `S19-F1-C-T3` Execute EXPLAIN-backed performance proof at target load

- Objective: prove selector/queue path behavior under 5000 concurrent runs.
- Scope: integration load path and EXPLAIN capture.
- Recommended owner: engine + adapter-postgres owners.
- In current task scope: yes.
- Dependencies: `S19-F1-C-T2`.
- Documentation impact: evidence artifact update.
- Evidence / risk-doc impact: direct closure evidence.
- Comment with rationale: target-load proof is the core remaining closure gate.
- Definition of Done:
  - target-load run executed;
  - EXPLAIN and key metrics published in evidence.

#### `S19-F1-C-T4` Execute claim-semantics concurrency validation

- Objective: retire race/claim ambiguity under load.
- Scope: queue claim tests and contention scenarios.
- Recommended owner: engine owner.
- In current task scope: yes.
- Dependencies: `S19-F1-C-T3`.
- Documentation impact: evidence artifact + risk note.
- Evidence / risk-doc impact: direct risk retirement signal.
- Comment with rationale: correctness under concurrency is non-negotiable.
- Definition of Done:
  - claim ownership invariants pass under stress;
  - no duplicate or lost claim behavior observed.

#### `S19-F1-C-T5` Publish closure evidence and update risk status

- Objective: convert execution proof into governed closure artifacts.
- Scope: `docs/evidence/**` and `docs/risk-register/**` for this slice.
- Recommended owner: slice owner.
- In current task scope: yes.
- Dependencies: `S19-F1-C-T4`.
- Documentation impact: evidence and risk status updated and indexed.
- Evidence / risk-doc impact: direct.
- Comment with rationale: lane closure without evidence/risk sync is invalid.
- Definition of Done:
  - closure evidence artifact exists and is linked;
  - risk entry is retired or updated with explicit rationale.

#### `S19-F1-C-T6` Sync lane/review surfaces and close the slice

- Objective: complete governance closure after accepted evidence.
- Scope: lane A YAML + review status board + this review.
- Recommended owner: lane A owner + docs owner.
- In current task scope: yes.
- Dependencies: `S19-F1-C-T5`.
- Documentation impact: status values and references synchronized.
- Evidence / risk-doc impact: references finalized.
- Comment with rationale: completion requires status/evidence parity.
- Definition of Done:
  - `S19-F1-C` and parent `S19-F1` statuses are updated consistently;
  - board and review reflect final closure posture.

## Mermaid Diagram

### Current-state dependency map

```mermaid
flowchart LR
  LaneA["Lane A: S19-F1-C in progress"] --> Risk["Residual claim-semantics risk"]
  Risk --> Gap["Missing closure-grade performance proof"]
  Gap --> Review["S19-F1 review artifact"]
```

### Target execution sequence

```mermaid
sequenceDiagram
  participant Plan as S19-F1-C Plan
  participant Perf as Performance Proof
  participant Claim as Claim Semantics Validation
  participant Evidence as Evidence and Risk Update
  participant Lane as Lane and Review Sync

  Plan->>Perf: Run target-load and EXPLAIN validation
  Perf->>Claim: Confirm claim behavior under concurrency
  Claim->>Evidence: Publish closure evidence and risk update
  Evidence->>Lane: Update lane and review surfaces to done
```

## Validation Baseline For Each Execution Slice

1. touched integration and regression tests for snapshot queue/selector behavior
2. `pnpm docs:sync` when documentation structure changes
3. `pnpm docs:workboard:generate` when lane state changes
4. evidence and risk-doc validation when governance requires them
5. `pnpm verify:prepush`

## Final Verdict

Ready with follow-ups
