---
title: ED-20260320 - Planner R2 typed graph-source boundary
status: accepted
date: 2026-03-20
owners: Engineering
arc_level: ARC-1
breaking: false
evidence_class: critical
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts
  - packages/@dvt/contracts/src/contracts/planner/PlannerInputEnvelopeV2.schema.json
  - packages/@dvt/contracts/src/schemas.ts
  - packages/@dvt/contracts/src/validation.ts
  - packages/@dvt/planner/src/application/PlannerFacade.ts
  - packages/@dvt/planner/src/domain/InputEnvelopeValidator.ts
  - packages/@dvt/planner/src/domain/Planner.ts
  - packages/@dvt/planner/src/ports/IArtifactResolver.ts
  - docs/planning/status/planner-current-state-assessment.md
  - docs/planning/archive/proposals/planner-target-state-roadmap-20260320.md
evidence:
  tests: []
  notes:
    - the planner public contract now has a typed graph-source boundary via graphSource and PlannerGraphSourceV1
    - manifestRef now resolves typed graph sources through IArtifactResolver.resolveGraphSource
    - the planner core consumes graphSource or nodes only; raw manifest normalization is isolated to PlannerFacade compatibility handling
---

# ED-20260320 - Planner R2 typed graph-source boundary

## Purpose

`R2` was defined as replacing the weak DBT-shaped planner admission surface
with a typed graph-source boundary while keeping `manifestRef` as the canonical
production ingress path.

Before this slice, that target architecture existed only in roadmap language.
The public contract still exposed a weak `DbtManifestLike` inline path and the
planner core still derived nodes from raw manifest input directly.

This evidence document records the code and governance changes that made the
typed boundary real.

## Changes

### Contracts

The planner contract now publishes a typed inline boundary:

- `PLANNER_GRAPH_SOURCE_KIND = 'normalized-graph-v1'`
- `PlannerGraphSourceV1`
- `PlannerInputEnvelopeV2.graphSource`

The JSON schema and Zod schema were updated in parallel, and the contract
validation entrypoints now parse the typed graph-source payload explicitly.

### Planner runtime

`PlannerFacade` now owns raw-manifest compatibility handling:

- `manifestRef` resolves through `IArtifactResolver.resolveGraphSource(...)`
- raw `manifest` is converted into a typed `graphSource` before domain hand-off
- the domain `Planner` consumes `graphSource` or direct `nodes`, not raw
  manifests

This keeps DBT-shaped parsing behind one implementation seam instead of leaving
it as the semantic public boundary.

### Active documentation

The planner assessment, target-state roadmap, Phase 2 roadmap, system status,
and canonical doc/code matrix were updated so active docs no longer describe
`R2` / `S10` as unimplemented.

## Validation Run

Executed on 2026-03-20 in `c:\dvt`:

```text
pnpm --filter @dvt/contracts build
  passed

pnpm --filter @dvt/contracts test
  passed (8 files, 64 tests)

pnpm --filter @dvt/planner build
  passed

pnpm --filter @dvt/planner test
  passed (13 files, 58 tests)

pnpm validate:contracts
  passed
```

## Traceability

- Governing workflow: `AGENTS.md`, `docs/guides/ai-work-protocol.md`
- Contract governance:
  `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`
- Plan integrity and versioning context:
  `docs/adr/ADR-0012-plan-integrity-ownership.md`,
  `docs/adr/ADR-0017_ExecutionPlan_Schema_Versioning.md`
- Slice closeout:
  `docs/planning/closeouts/20260320-planner-r2-typed-graph-source-boundary-closeout.md`
