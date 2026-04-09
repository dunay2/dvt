---
slice: ar-a9-planner-cycle-fail-closed
date: 2026-04-04
author: AI (GPT-5)
last_reviewed: 2026-04-04
status: Accepted
title: Closeout: AR-A9 Planner Cycle Fail-Closed
owner: docs
---

# Closeout: AR-A9 Planner Cycle Fail-Closed

## Think-First Analysis

- Problem summary:
  The planner required hardened fail-closed diagnostics and broader
  cycle-focused regression coverage for selected subgraphs, with docs-first
  and TDD-first traceability.
- Root cause:
  Active planning narrative introduced `CYCLE_DETECTED` wording drift while the
  shipped planner contract remained `GRAPH_CYCLE`, and cycle coverage lacked
  key regression scenarios.
- Constraints and invariants:
  `AGENTS.md`; `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`; lane ownership in
  `docs/planning/state/agent-lane-a.yaml`.
- Options considered:
  1. Keep current behavior and only update docs.
  2. Introduce a new error code alias for cycles.
  3. Keep `GRAPH_CYCLE`, harden deterministic diagnostics, add missing cycle
     tests, and reconcile docs/lane.
- Selected option and rationale:
  Option 3. It preserves public contract stability and closes the reliability
  gap with minimal boundary churn.
- Rejected alternatives:
  Option 1 leaves cycle-risk under-tested. Option 2 introduces compatibility
  surface without product value for this slice.

## Pre-Implementation Brief

- Mode:
  Full
- Scope:
  AR-A9 docs gate, cycle TDD coverage, deterministic `topoSort` diagnostics,
  planner boundary regression coverage, lane decomposition, and planning
  closeout.
- Touched files or paths:
  `docs/planning/proposals/mandatory/runtime-and-contracts/`,
  `docs/guides/`, `docs/architecture/components/planner/index.md`,
  `docs/planning/state/agent-lane-a.yaml`,
  `packages/@dvt/planner/src/domain/graph/TopoSort.ts`,
  `packages/@dvt/planner/test/unit/`.
- Out-of-scope:
  changing planner public API shape, introducing `CYCLE_DETECTED`, and
  non-planner runtime behavior changes.

## Implementation

- Added canonical AR-A9 proposal:
  `docs/planning/proposals/superseded/runtime-and-contracts/ar-a9-planner-cycle-fail-closed-plan-20260404.md`
- Added user manual:
  `docs/guides/planner-cycle-detection-user-manual-20260404.md`
- Added technical manual:
  `docs/guides/planner-cycle-detection-technical-manual-20260404.md`
- Linked AR-A9 docs in planner component navigation:
  `docs/architecture/components/planner/index.md`
- Reconciled active review narrative from `CYCLE_DETECTED` to `GRAPH_CYCLE`:
  `docs/planning/reviews/architecture-and-governance/20260402-deep-architectural-review-principal-architect.md`
- Decomposed and closed `AR-A9` into `AR-A9-A..E` in lane A:
  `docs/planning/state/agent-lane-a.yaml`
- Hardened `topoSort` cycle diagnostics while preserving canonical code:
  `packages/@dvt/planner/src/domain/graph/TopoSort.ts`
- Added/extended TDD and regression coverage:
  `packages/@dvt/planner/test/unit/graph.test.ts`,
  `packages/@dvt/planner/test/unit/planner-facade.test.ts`
  including explicit multi-cycle selected-subgraph rejection.

## Validation Evidence

- Red TDD baseline:
  `pnpm --filter @dvt/planner test` failed on new deterministic-cycle-diagnostic
  assertion before `TopoSort` hardening.
- Green validation:
  - `pnpm --filter @dvt/planner test`
  - `pnpm --filter @dvt/planner build`
  - `pnpm --filter @dvt/contracts build`
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm verify:prepush`

## No-Debt / No-Stub Evidence

- `PlannerErrorCode.GRAPH_CYCLE` remains the only canonical cycle error code.
- No compatibility alias or placeholder behavior was introduced.
- No hooks or quality gates were bypassed.
