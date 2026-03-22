---
slice: planner-r2-typed-graph-source-boundary
date: 2026-03-20
author: AI (GPT-5)
last_reviewed: 2026-03-20
---

# Closeout: Planner R2 Typed Graph-Source Boundary

## Think-First Analysis

### Problem summary

The planner roadmap identified `R2` / `S10` as a typed graph-source boundary,
but the repo still had a weak DBT-shaped admission surface:

- the public contract lacked a typed inline graph-source shape
- `IArtifactResolver` still described manifest-shaped resolution
- the planner core still treated raw-manifest derivation as part of normal
  public ingestion

### Root cause

The planner core was already generic, but the application boundary and public
contract had not been brought up to the same level. That left architecture
drift between the implementation core and the published entry surface.

### Constraints and invariants

- `AGENTS.md`: inventory first, evidence-based closeout, no hidden debt, no
  stubs, required validation including `pnpm verify:prepush`
- `docs/guides/ai-work-protocol.md`: think-first, scoped execution, and
  explicit validation are required
- `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`: public
  planner contract evolution stays canonical in `@dvt/contracts`
- `docs/adr/ADR-0012-plan-integrity-ownership.md` and
  `docs/adr/ADR-0017_ExecutionPlan_Schema_Versioning.md`: planner changes must
  preserve contract integrity and schema/version traceability

### Options considered

1. Keep `manifest` as the only inline graph input and just document it better.
   Rejected because it leaves the public boundary weakly typed and DBT-shaped.
2. Remove `manifest` immediately from the contract.
   Rejected because that would turn an architectural correction into a breaking
   migration slice with broader consumer impact.
3. Add a canonical typed `graphSource` boundary, move raw-manifest handling
   behind `PlannerFacade`, and keep `manifest` / `nodes` as compatibility
   inputs for now.
   Selected because it closes `R2` cleanly without hiding migration debt.

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  - add typed graph-source contract surfaces in `@dvt/contracts`
  - refactor `@dvt/planner` to normalize raw manifest input at the facade
    boundary
  - update active status/roadmap/matrix/planner-contract docs
  - create evidence and this closeout
- Out-of-scope items:
  - retiring compatibility `manifest` / `nodes` inputs
  - `R3`, `R4`, and later planner slices
- Validation plan:
  - `pnpm --filter @dvt/contracts build`
  - `pnpm --filter @dvt/contracts test`
  - `pnpm --filter @dvt/planner build`
  - `pnpm --filter @dvt/planner test`
  - `pnpm validate:contracts`
  - docs checks for touched docs
  - `pnpm verify:prepush`

## Changes made

- [packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts](../../../packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts):
  added `PlannerGraphSourceV1`, `PLANNER_GRAPH_SOURCE_KIND`, and
  `PlannerInputEnvelopeV2.graphSource`
- [packages/@dvt/contracts/src/schemas.ts](../../../packages/@dvt/contracts/src/schemas.ts):
  added `PlannerGraphSourceV1Schema` and wired `graphSource` into the envelope
  schema
- [packages/@dvt/contracts/src/validation.ts](../../../packages/@dvt/contracts/src/validation.ts):
  added `parsePlannerGraphSourceV1(...)`
- [packages/@dvt/planner/src/application/PlannerFacade.ts](../../../packages/@dvt/planner/src/application/PlannerFacade.ts):
  `manifestRef` now resolves typed graph sources; raw `manifest` is normalized
  before domain hand-off
- [packages/@dvt/planner/src/ports/IArtifactResolver.ts](../../../packages/@dvt/planner/src/ports/IArtifactResolver.ts):
  renamed resolver responsibility to `resolveGraphSource(...)`
- [packages/@dvt/planner/src/domain/InputEnvelopeValidator.ts](../../../packages/@dvt/planner/src/domain/InputEnvelopeValidator.ts):
  validator now enforces one-active-source over `graphSource` / `nodes`
- [packages/@dvt/planner/src/domain/Planner.ts](../../../packages/@dvt/planner/src/domain/Planner.ts):
  planner core now consumes `graphSource.nodes` or direct `nodes`
- [docs/planning/status/planner-current-state-assessment-20260320.md](../status/planner-current-state-assessment-20260320.md):
  updated assessment scores, diagrams, and open items
- [docs/planning/proposals/planner-target-state-roadmap-20260320.md](../proposals/planner-target-state-roadmap-20260320.md):
  marked `R2` closed and updated roadmap references
- [docs/planning/proposals/phase2-arch-debt-roadmap-20260315.md](../proposals/phase2-arch-debt-roadmap-20260315.md):
  marked `S10` closed and removed it from the open first-wave set
- [docs/planning/status/canonical-doc-code-matrix.md](../status/canonical-doc-code-matrix.md):
  added a topic row and detail section for the planner typed graph-source
  boundary
- [docs/evidence/ED-20260320-planner-r2-typed-graph-source-boundary.md](../../evidence/ED-20260320-planner-r2-typed-graph-source-boundary.md):
  added slice evidence
- [docs/planning/closeouts/20260320-planner-r2-typed-graph-source-boundary-closeout.md](20260320-planner-r2-typed-graph-source-boundary-closeout.md):
  added think-first analysis and validation record

## Test evidence

- `pnpm --filter @dvt/contracts build`: passed
- `pnpm --filter @dvt/contracts test`: passed (`8` files, `64` tests)
- `pnpm --filter @dvt/planner build`: passed
- `pnpm --filter @dvt/planner test`: passed (`13` files, `58` tests)
- `pnpm validate:contracts`: passed

Further docs and pre-push validation are part of the final task baseline.

## Debt introduced

None. No debt record was added, no rules were relaxed, and no hooks were
bypassed.

## No-stub evidence

No stubs, placeholders, fake adapters, or TODO/FIXME markers were added.
`graphSource` is a real contract/runtime path, and raw `manifest` remains only
as an explicit compatibility input rather than being presented as the canonical
boundary.
