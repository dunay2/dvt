---
title: Execution plan and run execution policy hard QA review
status: Review
owner: Product / Architecture / QA / Docs
last_reviewed: 2026-04-07
planning_type: review
---

# Execution plan and run execution policy hard QA review

## Summary

This artifact is the hard QA gate for the slice that introduced
`RunExecutionPolicy`, removed runtime-policy fields from
`ExecutionPlan.metadata`, and hardened planner/store invariants.

This pass closes the reopened QA.

The reopened defects were resolved as follows:

- `canonicalPlanJson` now persists the planner-emitted canonical
  `ExecutionPlan` bytes using JCS, without rewriting `createdAtIso`.
- the contracts-side sync test is now explicitly `shape-sync`, so it no longer
  overstates JSON Schema coverage.
- the active execution-model checklist now uses the accepted engine-boundary
  wording instead of the rejected `engine non-decision semantics` slogan.

Canonical execution tracking remains in:

- [agent-lane-a.yaml](../../state/agent-lane-a.yaml)
- [ADR-0046](../../../adr/ADR-0046-execution-plan-definition-and-run-execution-policy-separation.md)
- [20260407 execution-plan rationale](20260407-execution-plan-and-run-execution-policy-rationale.md)

## Governing Sources

- [governance-document-rule-inventory.md](../../status/governance-document-rule-inventory.md)
- [AGENTS.md](../../../../AGENTS.md)
- [ai-work-protocol.md](../../../guides/ai-work-protocol.md)
- [QA global check prompt](../../templates/qa/TEMPLATE_QA_GLOBAL_CHECK_PROMPT.md)
- [QA current task check prompt](../../templates/qa/TEMPLATE_QA_CURRENT_TASK_CHECK_PROMPT.md)
- [QA artifact example](../../templates/qa/TEMPLATE_QA_ARTIFACT_EXAMPLE.md)
- [ADR-0012](../../../adr/ADR-0012-plan-integrity-ownership.md)
- [ADR-0014](../../../adr/ADR-0014-run-driven-adapter-model.md)
- [ADR-0042](../../../adr/ADR-0042-execution-plan-canonical-identity-unification.md)
- [ADR-0043](../../../adr/ADR-0043-plan-record-plan-store-and-artifacts-ownership.md)
- [ADR-0046](../../../adr/ADR-0046-execution-plan-definition-and-run-execution-policy-separation.md)
- [ExecutionPlan.v1.ts](../../../../packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts)
- [PlanRecord.v1.ts](../../../../packages/@dvt/contracts/src/contracts/planner/PlanRecord.v1.ts)
- [PlanAssembler.ts](../../../../packages/@dvt/planner/src/domain/PlanAssembler.ts)
- [schemas.ts](../../../../packages/@dvt/contracts/src/schemas.ts)
- [PostgresPlanStore.mappers.ts](../../../../packages/@dvt/adapter-postgres/src/PostgresPlanStore.mappers.ts)
- [plan-store-records-shape-sync.test.ts](../../../../packages/@dvt/contracts/test/plan-store-records-shape-sync.test.ts)
- [dvt-execution-model.md](../../execution-model/dvt-execution-model.md)

## Findings

No critical findings.

## Alignment

- Doc vs code:
  aligned. `canonicalPlanJson` again means `JCS(canonical ExecutionPlan)` in
  both code and documentation.
- Promise vs implementation:
  aligned. The store uses canonicalization for determinism without mutating
  planner-emitted metadata.
- Tests vs claims:
  aligned. Shape-only JSON Schema parity is labeled as shape-only, while
  semantic invariants remain enforced by runtime parsers and contract tests.
- Current truth vs planned truth:
  aligned.
- Documentation update status:
  updated.
- Evidence and risk-doc status when applicable:
  ARC-2 evidence/risk files remain present and consistent with the slice.

## Architecture Assessment

- SRP:
  planner emits the plan, contracts define invariants, and adapter-postgres
  persists the canonical plan artifact without reshaping it.
- DDD:
  artifact vocabulary and ownership are now coherent again.
- Hexagonal:
  the persistence adapter no longer silently changes a public contract artifact.
- CQRS if relevant:
  unchanged and still acceptable.
- Complexity:
  reduced compared to the reopened state because artifact truth and naming now
  match.
- Modularity:
  improved by keeping shape-sync, semantic invariants, and persistence mapping
  distinct.

## Test Assessment

- Negative paths present:
  `PlanRecord` hash mismatch, non-JCS persisted plan JSON, and invalid planner
  build invariants remain covered.
- Negative paths missing:
  none identified for the touched slice.
- Regression status:
  green for the touched contracts and adapter-postgres scope.
- Determinism:
  green. Persisted canonical plan bytes are stable and preserve planner-emitted
  metadata.
- Local suite vs meaningful global confidence:
  acceptable for this slice; package tests plus repo prepush gate passed.
- Global system view applied:
  yes. The pass checked planner output, persisted artifact mapping, contracts,
  docs, evidence, and QA posture together.
- Harness or shared fixture need:
  not required for closure.
- Test grouping by type (`unit` / `integration` / `contract` / `e2e` / regression) and rationale:
  `plan-store-records-shape-sync.test.ts` is now explicitly structural; semantic
  invariants remain covered in contract/runtime validation tests.

## Quality Gates

- Commands executed:
  - `pnpm --filter @dvt/contracts test`
  - `pnpm --filter @dvt/adapter-postgres test`
  - `pnpm --filter @dvt/contracts build`
  - `pnpm --filter @dvt/adapter-postgres build`
  - `pnpm docs:status:generate`
  - `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`
  - `pnpm verify:prepush`
- What passed:
  all listed commands.
- What failed:
  none.
- What could not be verified:
  none relevant to the touched slice.

## Opportunities

- Keep contract test names honest when JSON Schema covers shape only.
- Keep persistence adapters out of public artifact reshaping unless the
  contract is renamed explicitly.
- Reuse the same QA pattern for future planner/store seam changes.

## Unrelated worktree observations

None in this pass.

## Unblock Roadmap

No remaining unblock tasks for this QA artifact.

## Action Artifact

### Task Checklist

- [x] `QA-EP-9` Resolve persisted artifact semantics for `canonicalPlanJson`
- [x] `QA-EP-10` Align active execution-model checklist wording
- [x] `QA-EP-11` Rename or split shape-sync vs semantic-invariant coverage

## Mermaid Diagram

### Closed-state artifact model

```mermaid
flowchart LR
  Planner[Planner emits canonical ExecutionPlan] --> JCS[JCS canonicalization]
  JCS --> Stored[PlanRecord.canonicalPlanJson]
  Stored --> Hash[canonicalHash = sha256(canonicalPlanJson)]
  Docs[ADR-0043 / ADR-0046 / PlanStoreRecords] --> Stored
```

## Validation Baseline For Each Execution Slice

Every correction slice under this artifact should close with:

1. touched-package checks for contracts and adapter-postgres;
2. `pnpm docs:status:generate` when package file structure changes;
3. ARC evidence/risk validation when engine/contracts/adapters are touched;
4. `pnpm verify:prepush`.

## Final Verdict

Ready
