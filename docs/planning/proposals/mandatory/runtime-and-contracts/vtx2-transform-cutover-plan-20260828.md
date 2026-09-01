---
title: VTX2 Single Canonical Model and Governed Projections Cutover Plan
status: Accepted
owner: Architecture / Product / Web / dbt / Planner / Runtime / PostgreSQL
last_reviewed: 2026-09-01
planning_type: mandatory-proposal
feature_id: VTX2-SINGLE-MODEL-PROJECTIONS
parent_issue: 2650
---

# VTX2 Single Canonical Model and Governed Projections Cutover Plan

## Product outcome

DVT authors one canonical transformation revision and derives every product,
target, operational, lineage, and evidence representation from it:

```text
typed pinned Substrait Plan + DVT identity/provenance sidecar
        ├── Transform/card projection
        ├── dbt compatibility or generated projection
        ├── provider AST/code projection
        ├── workload / ExecutionPlan projection
        └── lineage/read/evidence projection
```

ADR-0064 owns the decision. Epic #2594 owns strategy; epic #2650 owns cutover.
This plan coordinates bounded issues and does not duplicate their acceptance
criteria.

## Current boundary

Canonical Substrait authoring, stable identity, capability catalog, card
projection, and a bounded PostgreSQL projection exist. SQL/VTX1/dbt
compatibility and technical runtime activities still coexist. No compatibility
surface may become a second semantic authority or silently write back.

The current programme has no SQL/dbt-to-Substrait import path. External dbt
authoring, if retained, is explicitly classified compatibility.

## Owned delivery cuts

| Outcome                                                 | Owners                     |
| ------------------------------------------------------- | -------------------------- |
| durable canonical document and field identity           | #2655, #2596               |
| Transform language, kind, and capability projection     | #2635, #2721, #2642        |
| multi-input canonical composition                       | #2634                      |
| dbt and PostgreSQL target projections/readiness         | #2737, #2652, #2657, #2333 |
| operational projection and runtime execution            | #2524, #2723               |
| materialization/publication decision and implementation | #2523, #2724, #2725        |
| fail-closed acceptance and legacy deletion              | #2722, #2599, #2600        |

Delivery order is canonical persistence, product projection, composition and
targets, operational projection, runtime, acceptance, then deletion. Each issue
ships independently green; no omnibus implementation PR is required.

## Invariants

- Cards, files, SQL, workloads, and ExecutionPlans are projections, not models.
- Stored projections bind canonical SHA/profile and required target/tool identity.
- Semantic operator count, card count, and workload count remain independent.
- Planner and Engine do not parse Substrait, dbt, card, or SQL semantics.
- Unsupported semantics, topology, provider, or stale identity fail closed.
- No private relational IR, operator node taxonomy, hidden child graph, second
  graph/store/planner/runtime, or permanent compatibility alias is introduced.

## Completion

- product edits mutate only the canonical semantic revision;
- Transform, target, operational, and lineage projections agree on identity;
- multi-input composition creates no fake cards, materializations, or workloads;
- provider-native readiness validates the selected target projection;
- exact selected graph lowers without silent truncation;
- superseded SQL/VTX1/dbt compatibility is deleted or version-confined; and
- focused package, service, browser, live, and prepush evidence is green.

```feature-mechanization
version: 1
featureId: VTX2-SINGLE-MODEL-PROJECTIONS
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/vtx2-transform-cutover-plan-20260828.md
componentGuides:
  - docs/architecture/system/subsystems/semantic-transformation/index.md
userStories:
  - https://github.com/dunay2/dvt/issues/2594
  - https://github.com/dunay2/dvt/issues/2650
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
allowedImplementationSurfaces:
  - packages/@dvt/contracts/src/**
  - packages/@dvt/planner/src/**
  - apps/web/src/app/views/canvas/**
  - apps/api/src/**
  - packages/@dvt/adapter-*/**
  - apps/temporal-worker/**
forbiddenImplementationSurfaces:
  - SQL-or-dbt-to-Substrait importer for the current programme
  - second semantic model, relational IR, graph, planner, store, or runtime
  - operator-specific native node taxonomy or hidden Transform child graph
  - permanent compatibility alias
commandQueryRails:
  - name: ConfigureCanvasDvtNode
    type: command
    dddOwner: Canonical DVT semantic authoring
  - name: SaveCanvasAuthoringDraft
    type: command
    dddOwner: WorkspaceGraphAuthoringDraft
  - name: PreviewExecutionPlan
    type: command
    dddOwner: Planner compile boundary
  - name: StartRun
    type: command
    dddOwner: Engine run lifecycle
fowlerSignals:
  - Competing card, SQL, and dbt semantic authorities.
  - Technical provider phases modeled as product steps.
domainObjects:
  - Canonical Substrait semantic revision
  - Governed transformation projection
architectureGuards:
  - one canonical Substrait semantic model plus sidecar
  - every stored projection binds the canonical semantic SHA
  - Planner and Engine remain independent of relational semantics
  - new plans contain no synthetic PREPARE or EVIDENCE workloads
cypressFlows:
  - Transform Apply/reload and multi-input Preview preserve canonical identity
completionGate:
  - pnpm docs:feature-mechanization -- --feature VTX2-SINGLE-MODEL-PROJECTIONS
  - pnpm verify:prepush
redGreenCycles:
  - id: canonical-authority
    redTest: more than one editable transformation authority survives
    expectedFailure: projections can diverge or overwrite canonical semantics
    patchSurfaces:
      - apps/web/src/app/views/canvas/**
    greenTest: only canonical Substrait commands mutate meaning
  - id: exact-operational-projection
    redTest: selected graph is truncated or mapped to synthetic technical steps
    expectedFailure: selected semantics and operational work diverge
    patchSurfaces:
      - packages/@dvt/planner/src/**
    greenTest: exact graph lowers to real workloads only
negativeTests:
  - Unsupported semantics or topology never produce a partial plan.
  - A projection with mismatched semantic SHA is rejected.
  - Generated projections cannot overwrite canonical semantics.
symbols:
  - name: applyDvtSubstraitSemanticDocument
    path: apps/web/src/app/views/canvas/canvasDvtTransformAuthoringAuthority.ts
    dddOwner: Canonical DVT semantic authoring
    cqRails: [ConfigureCanvasDvtNode]
    fowlerSignals: [Single semantic authority]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: Transform Apply and reload
    unitTests: [pnpm --filter @dvt/web test:changed]
  - name: projectCanvasNodePresentationTruth
    path: apps/web/src/app/views/canvas/canvasNodePresentationProjection.ts
    dddOwner: Governed Canvas projection
    cqRails: [ProjectCanvasNodePresentation]
    fowlerSignals: [Projection instead of duplicate model]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: Transform card projection
    unitTests: [pnpm --filter @dvt/web test:changed]
```
