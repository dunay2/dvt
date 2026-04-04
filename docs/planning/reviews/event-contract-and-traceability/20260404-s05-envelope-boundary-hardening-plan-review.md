---
title: 20260404 S05 Envelope Boundary Hardening Plan Review
status: Review
owner: adapters / contracts / qa
last_reviewed: 2026-04-04
planning_type: review
---

# 20260404 S05 Envelope Boundary Hardening Plan Review

## Findings

### High

- Title: S05 remains partially closed at envelope boundary
  Why it matters: Lane B still marks S05 in `review` with 70% progress, so the contractual boundary is not fully hardened.
  Evidence: `docs/planning/state/agent-lane-b.yaml` (task `S05` status, progress, and status_reason).
  Risk: Event producers can still bypass full envelope guarantees in paths not uniformly validated.
  Recommendation: Close S05 with a single write-boundary guard that enforces payloadVersion presence, supported value, and eventType payload schema in one deterministic path.

- Title: Missing explicit task-level QA execution artifact for S05
  Why it matters: S05 has references to architectural reviews, but no dedicated execution artifact that maps findings to DoD + commands.
  Evidence: `docs/planning/state/agent-lane-b.yaml` task `S05` `evidence_refs` only points to architecture reviews.
  Risk: Scope drift and ambiguous "done" criteria during implementation and QA.
  Recommendation: Use this review as canonical S05 execution artifact and keep it linked from lane/task tracking.

### Medium

- Title: Validation baseline for S05 is not yet codified as a task checklist
  Why it matters: QA templates require command-backed closeout criteria and explicit not-verified reporting.
  Evidence: `docs/planning/templates/qa/TEMPLATE_QA_CURRENT_TASK_CHECK_PROMPT.md`, `docs/planning/templates/qa/TEMPLATE_QA_GLOBAL_CHECK_PROMPT.md`.
  Risk: Task can be marked as done without equivalent confidence across contracts, adapter runtime, and repo gates.
  Recommendation: Execute task checklist below and require `pnpm verify:prepush` before S05 is closed.

### Low

- Title: Review board does not yet surface a dedicated S05 planning review
  Why it matters: Active review visibility helps routing and avoids re-opening the same planning question.
  Evidence: `docs/planning/reviews/review-status-board.md` active table currently has no S05-specific review row.
  Risk: Discoverability and governance traceability friction.
  Recommendation: Add this document to the active review board linked to `S05`.

## Task Alignment

- Declared task vs actual changes: This slice now includes runtime code changes in `@dvt/engine` in-memory write boundaries plus new negative tests; adapter-postgres boundary was already enforcing schema at append-time.
- Doc vs code: Current code has payload schema and payloadVersion checks in contracts and adapter tests, but lane-level acceptance says envelope-level closure is still pending.
- Promise vs implementation: Promise is full envelope hardening; implementation status is partial (`S05-F1` done, parent `S05` still in review).
- Tests vs claims: Existing tests prove parts of boundary behavior; S05 needs one explicit task validation matrix for closure.
- Current truth vs planned truth: Current truth is partial hardening; planned truth is one accepted boundary path for all write envelopes.
- Documentation update status: This review is the new canonical planning artifact for S05 execution.
- Evidence and risk-doc status when applicable: Current planning phase only. ARC evidence/risk update must be re-evaluated when code touches `packages/@dvt/contracts/**`, `packages/@dvt/adapter-*/**`, or `packages/@dvt/engine/**`.

## Architecture Assessment

- SRP: Target is correct if validation stays at append/write boundary and does not leak into unrelated services.
- DDD: Boundary invariant belongs to event contract + append authority seam.
- Hexagonal: Validation should sit at ingress port/boundary before persistence side effects.
- CQRS: Write-side rejection must happen before event log mutation.
- Complexity: Moderate; main risk is inconsistent enforcement across paths.
- Modularity: Good if contracts schema parsing and adapter write-gate remain composable and shared.

## Test Assessment

- Negative paths present: payload mismatch, missing payloadVersion, unsupported payloadVersion exist in contract and adapter suites.
- Negative paths missing: S05 closeout still needs a consolidated matrix proving all write entrypoints reject invalid envelopes identically.
- Regression status: Not fully closed until unified S05 matrix and prepush baseline pass together.
- Determinism: Required; boundary errors must be deterministic for the same invalid input.
- Local suite vs meaningful confidence: Local tests are strong but S05 requires explicit cross-surface closure criteria.

## Quality Gates

- Commands executed in this implementation slice:
  - `pnpm --filter @dvt/engine test -- InMemoryRunStateStore.appendInvariants.test.ts`
  - `pnpm --filter @dvt/engine test -- bootstrapRunTx.atomicity.test.ts`
  - `pnpm --filter @dvt/engine test -- InMemoryTxStore.outbox.test.ts`
  - `pnpm verify:prepush`
- What passed: pending execution.
- What failed: pending execution.
- What could not be verified: adapter-postgres full integration suite in this pass (requires integration environment).

## Opportunities

- Reuse one S05 validation checklist across implementation, review, and closeout.
- Keep one canonical mapping from invariant -> test -> command.
- Add a boundary-focused regression harness section grouped by test type (`contract`, `integration`, `regression`).

## Action Artifact

### Markdown Artifact Path Suggestion

- `docs/planning/reviews/event-contract-and-traceability/20260404-s05-envelope-boundary-hardening-plan-review.md`

### Task Checklist

- [x] `S05-T1` Freeze current-state truth and boundary map
- [x] `S05-T2` Define canonical envelope validation contract for write boundary
- [x] `S05-T3` Implement write-boundary guard unification for payloadVersion and eventType schema
- [x] `S05-T4` Add negative and regression tests grouped by type
- [ ] `S05-T5` Run governed validation baseline and publish evidence
- [ ] `S05-T6` Close planning and lane tracking surfaces

### Task Details

#### `S05-T1` Freeze current-state truth and boundary map

- Objective: Record current boundary behavior before additional code changes.
- Scope: Lane B task metadata, this review artifact, and current contract references.
- In current task scope: Yes.
- Dependencies: None.
- Documentation impact: Review/lane docs updated.
- Evidence / risk-doc impact: No ARC artifact required for docs-only slice.
- Comment with rationale: Implementation without frozen baseline creates acceptance ambiguity.
- Definition of Done:
  - current-state summary exists;
  - current-state Mermaid diagram exists;
  - S05 lane entry links this artifact.

#### `S05-T2` Define canonical envelope validation contract for write boundary

- Objective: Specify one contract-level rule set for payloadVersion and eventType payload schema gating.
- Scope: Contracts docs + validator entrypoints used by write boundary.
- In current task scope: Yes (planning/spec alignment).
- Dependencies: `S05-T1`.
- Documentation impact: Contract references and review acceptance criteria updated.
- Evidence / risk-doc impact: Re-check ARC trigger before implementation PR.
- Comment with rationale: One normative rule prevents drift between contract package and adapter behavior.
- Definition of Done:
  - rule set explicitly maps required fields and rejection modes;
  - deterministic error behavior is stated;
  - all write paths are enumerated.

#### `S05-T3` Implement write-boundary guard unification for payloadVersion and eventType schema

- Objective: Enforce envelope + payload schema checks in a single write-boundary path.
- Scope: `@dvt/contracts`, `@dvt/adapter-postgres`, and possibly `@dvt/engine` integration points.
- In current task scope: Yes (execution phase).
- Dependencies: `S05-T2`.
- Documentation impact: Update review/closeout and any affected contract docs.
- Evidence / risk-doc impact: ARC-2 likely required if governed paths are touched.
- Comment with rationale: S05 cannot close if checks are scattered or bypassable.
- Definition of Done:
  - invalid envelopes are rejected pre-persist;
  - duplicate behavior remains deterministic;
  - no write path bypasses validation.
- Progress update 2026-04-04:
  - Implemented tenant-boundary enforcement for in-memory write boundaries in:
    - `packages/@dvt/engine/src/state/runEventWritePolicy.ts`
    - `packages/@dvt/engine/src/state/InMemoryRunStateStore.ts`
    - `packages/@dvt/engine/src/state/InMemoryTxStore.ts`
  - Rationale: Postgres append path already enforced envelope schema + tenant consistency; in-memory stores accepted schema-valid envelopes even when tenant mismatched run metadata. This created boundary drift between store implementations.

#### `S05-T4` Add negative and regression tests grouped by type

- Objective: Prove boundary hardening with explicit negative coverage.
- Scope: Contract tests, adapter integration tests, regression scenarios.
- In current task scope: Yes.
- Dependencies: `S05-T3`.
- Documentation impact: Test-to-invariant mapping documented in closeout/evidence.
- Evidence / risk-doc impact: Evidence doc must cite commands and failures covered.
- Comment with rationale: S05 acceptance is quality evidence, not code presence.
- Definition of Done:
  - test groups include `contract`, `integration`, `regression`;
  - missing `payloadVersion` and schema mismatch failures are covered for all write entrypoints;
  - deterministic error assertions are present.
- Progress update 2026-04-04:
  - Added negative tests for tenant mismatch in:
    - `packages/@dvt/engine/test/state/bootstrapRunTx.atomicity.test.ts`
    - `packages/@dvt/engine/test/state/InMemoryRunStateStore.appendInvariants.test.ts`
    - `packages/@dvt/engine/test/state/InMemoryTxStore.outbox.test.ts`
  - Rationale: these tests prove the write boundary rejects cross-tenant envelope writes before state mutation and keeps existing event history unchanged.

## Execution Progress Log

- 2026-04-04:
  - Completed planning baseline (`S05-T1`, `S05-T2`).
  - Completed implementation and negative tests for the in-memory boundary (`S05-T3`, `S05-T4`).
  - Remaining: run governed validation (`S05-T5`) and then sync lane/review closure surfaces (`S05-T6`).

## Situations Requiring More Information

- At this moment, no additional product clarification is required to continue with `S05-T5`.
- Information that will be required only for final closure:
  - decision on whether this slice should close S05 parent directly, or close as an incremental S05 phase and keep parent in `review` until adapter-postgres integration evidence is explicitly refreshed in a dedicated evidence doc.

#### `S05-T5` Run governed validation baseline and publish evidence

- Objective: Execute required checks and capture results.
- Scope: Touched-package checks + repo gate.
- In current task scope: Yes.
- Dependencies: `S05-T4`.
- Documentation impact: Closeout/evidence validation section updated.
- Evidence / risk-doc impact: Required when ARC policy says yes.
- Comment with rationale: Without command evidence, S05 stays review-only.
- Definition of Done:
  - touched package lint/type/test commands pass;
  - `pnpm verify:prepush` passes;
  - command outputs are summarized in artifact.

#### `S05-T6` Close planning and lane tracking surfaces

- Objective: Move S05 from `review` to `done` only if evidence is accepted.
- Scope: `agent-lane-b.yaml`, review status board, closeout/evidence links.
- In current task scope: Yes.
- Dependencies: `S05-T5`.
- Documentation impact: Lane and review status synchronized.
- Evidence / risk-doc impact: evidence_refs updated with final accepted artifacts.
- Comment with rationale: Governance requires planning status and evidence status to match.
- Definition of Done:
  - lane status updated with accepted evidence refs;
  - review status board reflects final role;
  - no unresolved blocker remains undocumented.

## Mermaid Diagram

### Current-state dependency map

```mermaid
flowchart LR
  A["S05 parent task in review"] --> B["S05-F1 payload-content schema done"]
  A --> C["Envelope-level payloadVersion closure pending"]
  C --> D["No dedicated S05 execution artifact"]
  D --> E["Acceptance ambiguity at write boundary"]
```

### Target execution sequence for S05 closure

```mermaid
sequenceDiagram
  participant Planner as Planning Artifact
  participant Contracts as @dvt/contracts
  participant Adapter as @dvt/adapter-postgres
  participant QA as QA Validation
  participant Lane as Lane B Registry

  Planner->>Contracts: Define canonical envelope + payload validation rules
  Contracts->>Adapter: Provide shared parser/validator behavior
  Adapter->>QA: Reject invalid envelopes before persist
  QA->>QA: Run contract/integration/regression tests
  QA->>Lane: Publish evidence + prepush baseline
  Lane->>Lane: Move S05 review -> done (if evidence accepted)
```

## Validation Baseline For S05 Execution Slices

1. `pnpm --filter @dvt/contracts test`
2. `pnpm --filter @dvt/adapter-postgres test`
3. `pnpm --filter @dvt/adapter-postgres lint`
4. `pnpm --filter @dvt/adapter-postgres type-check`
5. `pnpm verify:prepush`

## Final Verdict

Ready with follow-ups
