---
title: TF-A2-C2 executable subgraph derivation closeout
status: Done
owner: planner
last_reviewed: 2026-04-23
planning_type: closeout
---

# TF-A2-C2 executable subgraph derivation closeout

## Think-First Analysis

- Problem summary:
  `TF-A2-C1` froze the contracts, but planner still had no owned seam that
  derived `ExecutableSubgraph` from `WorkspaceGraphAuthoringDraft` and
  `ExecutionSelection`. That left API and web one step away from falling back
  to whole-draft compile assumptions.
- Root cause:
  The branch had frozen vocabulary before behavior, which was correct, but the
  planner package still only exposed plan compilation from `graphSource`. The
  selected-closure read model existed as a contract without a planner owner.
- Constraints and invariants:
  - `AGENTS.md` requires inventory-first startup, plan-driven updates,
    validation evidence, and no hidden debt.
  - `docs/guides/ai-work-protocol.md` requires docs-first clarification before
    implementation on a new architectural seam.
  - `docs/architecture/reference-architecture.md` requires planner ownership of
    derivation, not route or UI helpers.
  - `WorkspaceGraphAuthoringDraft` remains the only editable persisted draft.
  - No compatibility path or dual-parse is required for this slice; this is a
    hard cut.
  - The selected closure must never widen silently to the whole draft.
- Options considered:
  1. Add route-local or web-local closure logic.
     Rejected: violates the ownership map frozen by `TF-A2-C`.
  2. Add a second public planner entry point outside `PlannerFacade`.
     Rejected: fights the existing facade-first public package posture.
  3. Add selected-closure derivation behind `PlannerFacade` and keep the real
     behavior in one planner-local derivation service.
     Selected: matches the package boundary and keeps the seam explicit.
- Selected option and rationale:
  Implement a planner-local `ExecutableSubgraphDeriver` and expose it through
  `PlannerFacade#deriveExecutableSubgraph`.

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  `packages/@dvt/planner/**`,
  `docs/architecture/components/planner/**`,
  `docs/contracts/planner/**`,
  `docs/planning/state/agent-lane-a.yaml`,
  `docs/planning/status/canonical-doc-code-matrix.md`,
  `docs/evidence/**`,
  `docs/risk-register/quality/**`,
  and `docs/planning/closeouts/**`
- Expected outcome:
  planner derives canonical `ExecutableSubgraph` results from authoring truth
  and selection intent, documents the seam locally, and closes the `TF-A2-C2`
  slice with ARC-2 evidence and risk updates
- Risks and mitigations:
  - Risk: widen traversal to hidden or unrelated nodes.
    Mitigation: test visible-only traversal and explicit no-widen behavior.
  - Risk: keep contract shape but still throw planner errors for selection
    invalidity.
    Mitigation: return canonical diagnostics instead of throwing for semantic
    non-executable cases.
  - Risk: drift the package boundary by exporting a second planner API family.
    Mitigation: keep the public seam on `PlannerFacade`.
- Out-of-scope items:
  API preview/run adoption (`TF-A2-C3`) and web command production (`TF-A2-C4`)
- Validation plan:
  `pnpm --filter @dvt/planner test -- executable-subgraph-deriver.test.ts executable-subgraph-deriver.architecture.test.ts`,
  `pnpm --filter @dvt/planner test`,
  `pnpm --filter @dvt/planner build`,
  `pnpm docs:sync`,
  `pnpm docs:workboard:generate`,
  `pnpm docs:status:generate`,
  `pnpm docs:gov:manifest`,
  `pnpm verify:prepush`
- Test coverage plan:
  cover upstream closure, explicit dependency-gap, hidden-node no-widen
  behavior, downstream dependency-gap, cycle diagnostics, and semantic
  architecture ownership
- Libraries evaluated:
  None. The slice reuses existing planner graph utilities and contract
  validators.

## Real Work Performed

- Added planner-owned derivation code:
  - `packages/@dvt/planner/src/application/ExecutableSubgraphDeriver.ts`
  - `packages/@dvt/planner/src/application/PlannerFacade.ts`
- Added planner test coverage:
  - `packages/@dvt/planner/test/unit/executable-subgraph-deriver.test.ts`
  - `packages/@dvt/planner/test/unit/executable-subgraph-deriver.architecture.test.ts`
- Added the local component guide:
  `docs/architecture/components/planner/executable-subgraph-derivation-component.md`
- Updated companion docs and traceability:
  - `docs/architecture/components/planner/index.md`
  - `docs/architecture/components/planner/execution-selection-component.md`
  - `docs/architecture/components/planner/workspace-authoring-draft-aggregate.md`
  - `docs/contracts/planner/execution-selection-and-executable-subgraph-v1.md`
  - `docs/planning/status/canonical-doc-code-matrix.md`
  - `docs/evidence/index.md`
  - `docs/planning/state/execution-workboard.md`
  - `docs/planning/state/open-task-route.md`
  - `docs/planning/status/generated-code-state.md`
  - `docs/.manifest.json`
- Added ARC-2 evidence:
  `docs/evidence/ed-20260423-tf-a2-c2-executable-subgraph-derivation.md`
- Updated the active adoption-drift risk:
  `docs/risk-register/quality/R-20260423-WORKSPACE-AUTHORING-DRAFT-AGGREGATE.yaml`
- Updated Lane A execution state:
  `docs/planning/state/agent-lane-a.yaml`

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/reference-architecture.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a2-c-execution-selection-and-executable-subgraph-plan-20260423.md`
- `docs/architecture/components/planner/execution-selection-component.md`
- `docs/contracts/planner/execution-selection-and-executable-subgraph-v1.md`
- `.arc-policy.yaml`

## Validation Evidence

- Passed:
  `pnpm --filter @dvt/planner test -- executable-subgraph-deriver.test.ts executable-subgraph-deriver.architecture.test.ts`
- Passed:
  `pnpm --filter @dvt/planner test`
- Passed:
  `pnpm --filter @dvt/planner build`
- Passed:
  `pnpm docs:sync`
- Passed:
  `pnpm docs:workboard:generate`
- Passed:
  `pnpm docs:status:generate`
- Passed:
  `pnpm docs:gov:manifest`
- Passed:
  `pnpm verify:prepush`

## No-Debt Evidence

- No compatibility shim or dual-path derivation was introduced.
- No rules were relaxed or disabled.
- No hooks were bypassed.
- No second frontend-only or route-local DTO family was introduced.

## No-Stub Evidence

- `PlannerFacade#deriveExecutableSubgraph` delegates to real planner-local
  derivation code.
- The new architecture test validates ownership and seam placement, not a thin
  barrel.
- The component guide documents real code paths and real tests.
