---
title: TF-A2-C1 execution selection contract pack closeout
status: Done
owner: contracts
last_reviewed: 2026-04-23
planning_type: closeout
---

# TF-A2-C1 execution selection contract pack closeout

## Think-First Analysis

- Problem summary:
  `TF-A2-C` had a dedicated proposal and partial contract work in the branch,
  but the public contract facade, planner-local component guide, and semantic
  architecture guard were still missing. That left the execution seam exposed
  only through scattered docs and incomplete exports.
- Root cause:
  The branch correctly prioritized the persisted authoring aggregate and the
  protected draft envelope first. The follow-up contract files were then added,
  but the semantic encapsulation work had not yet converged: no planner-local
  barrel existed, no local component guide explained ownership, and no
  semantic fitness function enforced the boundary.
- Constraints and invariants:
  - `AGENTS.md` requires inventory-first startup, explicit governing sources,
    validation evidence, and no hidden debt.
  - `docs/guides/ai-work-protocol.md` requires think-first and
    pre-implementation brief material before code changes for a new artifact
    slice.
  - `docs/architecture/reference-architecture.md` requires explicit port and
    contract boundaries instead of route-local convenience DTOs.
  - `WorkspaceGraphAuthoringDraft` remains the only editable persisted
    aggregate.
  - `ExecutionSelection` must express execution intent only; it must not mutate
    the draft or carry auth/runtime-admission concerns.
  - `ExecutableSubgraph` must remain a derived read model and not become a
    second persisted draft family.
- Options considered:
  1. Delay code and keep the seam only in planning docs.
     Rejected: leaves the contract line incomplete and makes downstream drift
     likely.
  2. Implement the contract pack first, with positive and negative tests, and
     defer planner/api/web adoption.
     Selected: smallest executable slice that freezes the public boundary.
  3. Jump directly to planner derivation without contracts.
     Rejected: planner ownership would have to invent unpublished DTOs.
- Selected option and rationale:
  Implement `TF-A2-C1` as a contracts-first slice. That freezes the public
  vocabulary before planner, api, or web adopt it.

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  `packages/@dvt/contracts/**`,
  `docs/contracts/planner/**`,
  `docs/architecture/components/planner/**`,
  `docs/planning/state/agent-lane-a.yaml`,
  `docs/planning/closeouts/**`,
  and ARC-2 evidence/risk surfaces if the contract slice changes them
- Expected outcome:
  the repo exposes canonical `ExecutionSelection` and `ExecutableSubgraph`
  contracts with tests, exports, local docs, ARC-2 evidence, and updated risk
  posture, while planner/api/web adoption remains explicitly sequenced as later
  slices
- Risks and mitigations:
  - Risk: over-design the diagnostic taxonomy before planner derivation exists.
    Mitigation: freeze only the minimum diagnostic categories already required
    by the proposal.
  - Risk: blur contract scope with planner implementation behavior.
    Mitigation: keep the slice on contract DTOs, schemas, exports, tests, and
    docs only.
  - Risk: forget ARC-2 evidence and risk update expectations for
    `@dvt/contracts`.
    Mitigation: publish evidence and update the active TF-A2 risk record within
    the same slice.
- Out-of-scope items:
  planner derivation service, api adoption, web adoption, or runtime behavior
  changes
- Validation plan:
  `pnpm --filter @dvt/contracts test`,
  `pnpm --filter @dvt/contracts schema:verify`,
  `pnpm --filter @dvt/contracts build`,
  `pnpm docs:sync`,
  `pnpm docs:workboard:generate`,
  `pnpm docs:status:generate`,
  `pnpm docs:gov:manifest`,
  `pnpm verify:prepush`
- Test coverage plan:
  positive validation for canonical selection modes and derived subgraph shape,
  plus negative validation for empty `nodeIds`, extra fields, and invalid
  diagnostic payloads
- Libraries evaluated:
  None. The slice extends the existing zod-based contract pack.

## Real Work Performed

- Added the planner-local semantic barrel:
  `packages/@dvt/contracts/src/contracts/planner/index.ts`.
- Published the canonical contract pair:
  - `packages/@dvt/contracts/src/contracts/planner/ExecutionSelection.v1.ts`
  - `packages/@dvt/contracts/src/contracts/planner/ExecutableSubgraph.v1.ts`
- Wired the contract pack through the public contract facade and schema/parse
  surfaces:
  - `packages/@dvt/contracts/src/index.ts`
  - `packages/@dvt/contracts/src/schema-packs/execution-selection.ts`
  - `packages/@dvt/contracts/src/schema-packs/planner.ts`
  - `packages/@dvt/contracts/src/validation.ts`
  - `packages/@dvt/contracts/src/validation/planner.ts`
- Added test coverage:
  - `packages/@dvt/contracts/test/execution-selection.contract.test.ts`
  - `packages/@dvt/contracts/test/execution-selection.architecture.test.ts`
  - `packages/@dvt/contracts/test/validation/execution-selection.ts`
  - `packages/@dvt/contracts/test/validation.test.ts`
- Added the local component guide:
  `docs/architecture/components/planner/execution-selection-component.md`.
- Added the contract doc:
  `docs/contracts/planner/execution-selection-and-executable-subgraph-v1.md`.
- Updated companion docs and traceability:
  - `docs/contracts/planner/workspace-graph-draft-persistence-v1.md`
  - `docs/architecture/components/planner/workspace-authoring-draft-aggregate.md`
  - `docs/architecture/components/planner/index.md`
  - `docs/planning/status/canonical-doc-code-matrix.md`
- Added ARC-2 evidence:
  `docs/evidence/ed-20260423-tf-a2-c1-execution-selection-contract-pack.md`.
- Updated the active adoption-drift risk:
  `docs/risk-register/quality/R-20260423-WORKSPACE-AUTHORING-DRAFT-AGGREGATE.yaml`.

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/reference-architecture.md`
- `docs/contracts/planner/workspace-graph-draft-persistence-v1.md`
- `docs/architecture/components/planner/workspace-authoring-draft-aggregate.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a2-c-execution-selection-and-executable-subgraph-plan-20260423.md`
- `.arc-policy.yaml`

## Validation Evidence

- Passed:
  `pnpm --filter @dvt/contracts test -- execution-selection.contract.test.ts execution-selection.architecture.test.ts validation.test.ts`
- Passed:
  `pnpm --filter @dvt/contracts test`
- Passed:
  `pnpm --filter @dvt/contracts schema:verify`
- Passed:
  `pnpm --filter @dvt/contracts build`
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

- No rules were relaxed or disabled.
- No hooks were bypassed.
- No second DTO family or compatibility shim was introduced.
- No debt entry was created; the slice closes an existing contract/documentation
  drift seam.

## No-Stub Evidence

- The new component guide documents real contract modules exported by the
  package facade.
- The architecture test enforces boundary semantics and ownership, not a
  placeholder barrel.
- The ARC evidence and risk update describe the real public contract slice that
  now exists in `@dvt/contracts`.
