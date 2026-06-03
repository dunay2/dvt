---
title: TF-A2-C execution selection proposal closeout
status: Done
owner: architecture
last_reviewed: 2026-04-23
planning_type: closeout
---

# TF-A2-C execution selection proposal closeout

## Think-First Analysis

- Problem summary:
  The branch corrected the persisted authoring aggregate and documented the API
  application seam, but the next architectural step still lived only as a
  scattered idea across larger plans and diagrams. The repo needed one
  dedicated planning artifact for `ExecutionSelection` and
  `ExecutableSubgraph`.
- Root cause:
  The aggregate-root reset had higher priority than the selection seam, so the
  execution boundary remained described indirectly inside bigger documents
  instead of having its own canonical proposal.
- Constraints and invariants:
  - `AGENTS.md` requires inventory-first routing, explicit governing sources,
    validation evidence, and no hidden debt.
  - `docs/guides/ai-work-protocol.md` requires planning tasks to update both
    the planning source surface and the linked lane registry entry.
  - `docs/planning/state/planning-control-tower.md` requires new proposals to
    update the corresponding `agent-lane-*.yaml` task entry.
  - `WorkspaceGraphAuthoringDraft` remains the editable persisted aggregate;
    `ExecutionSelection` must not become a second draft family.
  - preview and run must consume selected-closure semantics rather than
    whole-draft compile assumptions.
- Options considered:
  1. Leave the execution-selection seam described only in the parent TF-A2
     plans.
     Rejected: ownership and adoption order stay implicit.
  2. Create a narrow dedicated proposal and update the lane registry plus
     proposal navigation.
     Selected: closes the planning drift with minimal scope.
  3. Fold the new material into `system-delivery-status.md`.
     Rejected: status docs are not the canonical home for future design
     sequencing.
- Selected option and rationale:
  Publish a dedicated `TF-A2-C` proposal, then align Lane A and proposal
  navigation so the remaining execution seam is explicit and schedulable.

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  `docs/planning/proposals/mandatory/runtime-and-contracts/**`,
  `docs/planning/state/agent-lane-a.yaml`,
  `docs/planning/proposals/portfolio-map-20260403.md`,
  `docs/planning/closeouts/**`
- Expected outcome:
  `TF-A2-C` exists as a canonical proposal, Lane A references it explicitly,
  and proposal navigation no longer hides the current TF-A2 proposal chain.
- Risks and mitigations:
  - Risk: create a proposal that duplicates the aggregate-roots plan.
    Mitigation: keep the new proposal narrowly scoped to selection intent and
    executable-subgraph derivation.
  - Risk: planning registry continues to narrate stale contract truth.
    Mitigation: correct the outdated `TF-A2` lane status while adding the new
    child task.
- Out-of-scope items:
  contract implementation, planner derivation code, api adoption, web adoption,
  or runtime behavior changes.
- Validation plan:
  `pnpm docs:sync`,
  `pnpm docs:workboard:generate`,
  `pnpm docs:gov:manifest`,
  `pnpm verify:prepush`
- Test coverage plan:
  planning-only slice; validation is documentation generation and governed docs
  gates rather than package runtime tests.
- Libraries evaluated:
  None. This slice adds canonical planning artifacts only.

## Real Work Performed

- Added the dedicated proposal:
  `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a2-c-execution-selection-and-executable-subgraph-plan-20260423.md`
- Updated `docs/planning/state/agent-lane-a.yaml` to:
  - add the new `TF-A2-C` child task
  - correct the stale `TF-A2` status note that still claimed
    `WorkspaceGraphDraft.v1` embedded `DesignGraphDraft`
  - add the new proposal to the parent evidence trail
- Updated proposal navigation in:
  `docs/planning/proposals/portfolio-map-20260403.md`
  so the active TF-A2 proposal chain is now discoverable
- Added this closeout and linked it from:
  `docs/planning/closeouts/index.md`

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/architecture/reference-architecture.md`
- `docs/contracts/planner/workspace-graph-draft-persistence-v1.md`
- `docs/architecture/components/planner/workspace-authoring-draft-aggregate.md`

## Validation Evidence

- Passed:
  `pnpm docs:sync`
- Passed:
  `pnpm docs:workboard:generate`
- Passed:
  `pnpm docs:gov:manifest`
- Passed:
  `pnpm verify:prepush`

## No-Debt Evidence

- No rules were relaxed or disabled.
- No hooks were bypassed.
- No parallel ad hoc note was created outside the governed planning surfaces.
- No debt entry was added; this slice reduces planning drift.

## No-Stub Evidence

- The new proposal is a real canonical planning artifact with concrete
  ownership, invariants, work packages, and validation baseline.
- The lane update points to that real proposal and corrects stale status text
  instead of adding placeholder routing.
