---
title: Canvas Structured Transform Fields Plan
status: Active
owner: Web / Canvas / VTX2
last_reviewed: 2026-09-03
planning_type: proposal
---

# Canvas Structured Transform Fields Plan

## Intent

Issue #2771 turns a centre drop between two Transform fields into an explicit
proposal for a real Substrait `Type.Struct`. Apply persists the parent and its
ordered children in the existing semantic document; Cancel changes nothing.
The same proposal and command are available from pointer and keyboard paths.

## Current State

```mermaid
flowchart LR
  ROW[Flat field row] -->|before / after| REORDER[Flat output reorder]
  ROW -->|centre drop| FUNCTION[Apply scalar function]
  REORDER --> CMD[ConfigureCanvasDvtNode]
  FUNCTION --> CMD
  CMD --> PLAN[ProjectRel + flat sidecar fields]
```

The centre target currently means only “apply one admitted scalar function to
another output”. The canonical plan and sidecar have no parent-child field
binding, so presenting a visual group as a composite would create a second
semantic model.

## Target State

```mermaid
flowchart LR
  ROW[Field row] --> TARGET{Drop target}
  TARGET -->|edge| REORDER[Reorder sibling]
  TARGET -->|centre| PROPOSAL[Structured-field proposal]
  KEYBOARD[Keyboard compose action] --> PROPOSAL
  PROPOSAL -->|Cancel| SAME[Unchanged revision]
  PROPOSAL -->|Apply| CMD[ConfigureCanvasDvtNode]
  CMD --> STRUCT[Substrait Type.Struct + stable sidecar tree]
  STRUCT --> CARD[Card]
  STRUCT --> INSPECTOR[Node Properties]
  STRUCT --> LINEAGE[Lineage]
  STRUCT --> PREVIEW[Preview / target projection]
```

## Product And Architecture Decisions

- Admit the pinned core identity `substrait.Type kind.struct` through the
  standard-first capability catalog before exposing the command.
- Keep `ConfigureCanvasDvtNode` as the only mutation rail and the typed
  Substrait semantic document as the only persisted authority.
- Extend field bindings with an optional parent identity; absence means a root
  field. Sibling `outputOrdinal` is scoped to the parent.
- A scalar-on-scalar centre drop opens a proposal. It never mutates or silently
  converts either field before Apply.
- Apply creates one new parent identity and retains both child identities,
  types, nullability, provenance and order. Dropping into an existing struct
  retains the parent identity and inserts the child at the selected position.
- Self-nesting, ancestry cycles, duplicate identities, incompatible shapes,
  unknown fields, stale revisions and unsupported projections fail closed.
- PostgreSQL exposure remains unavailable until a governed row/composite
  projection is implemented and tested; the UI must show that posture rather
  than fabricate JSON semantics.

## Fowler Opportunity Matrix

| Scenario                               | Signal                 | Refactoring                           | Owner               | Evidence                  |
| -------------------------------------- | ---------------------- | ------------------------------------- | ------------------- | ------------------------- |
| Centre drop has function-only meaning  | Divergent change       | Replace conditional with typed intent | Field interaction   | pointer/keyboard behavior |
| Flat sidecar cannot represent children | Primitive obsession    | Introduce value object                | Semantic document   | encode/reload tests       |
| Card could own a private tree          | Hidden authority       | Projection from aggregate             | Canvas presentation | cross-view agreement      |
| PostgreSQL has no composite mapping    | Speculative generality | Fail closed                           | Target projection   | negative projection test  |

## Delivery Boundaries

- Mode: Full vertical slice.
- No private JSON packing, UI-only groups, SQL record convention, parallel
  command, compatibility alias, hidden node, placeholder or provider claim.
- Refactors of `GraphNodeRenderer`, `DbtNodeRenderer`, legacy event dispatch,
  copy extraction and broad `Record<string, unknown>` replacement remain
  separate increments unless directly required by this behavior.
- Keep each changed production module focused and below 200 lines; split by
  semantic responsibility rather than by arbitrary line count.

```feature-mechanization
version: 1
featureId: CANVAS-STRUCTURED-TRANSFORM-FIELDS-2771
mechanizationStatus: planned
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/canvas-structured-transform-fields-plan-20260903.md
componentGuides:
  - docs/architecture/components/web/graph/canvas-authoring-draft-boundary-component.md
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
userStories:
  - https://github.com/dunay2/dvt/issues/2771
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/command-query-rail-governance.md
  - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/vtx2-substrait-semantic-reference-design-20260824.md
allowedImplementationSurfaces:
  - packages/@dvt/contracts/src/contracts/planner/**
  - packages/@dvt/contracts/test/**
  - apps/web/src/app/plugins/graph/**
  - apps/web/src/app/views/canvas/**
  - apps/web/cypress/e2e/canvas/**
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-structured-transform-fields-plan-20260903.md
  - docs/evidence/**
  - docs/risk-register/quality/**
  - docs/.manifest.json
  - docs/**/index.md
  - docs/planning/status/**
forbiddenImplementationSurfaces:
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - apps/api/**
commandQueryRails:
  - name: ConfigureCanvasDvtNode
    type: command
    dddOwner: DvtNodeAuthoringMetadata
domainObjects:
  - name: CanvasStructuredFieldProposal
    type: value object
    owner: apps/web Canvas authoring
  - name: DvtSubstraitFieldBindingV1
    type: value object
    owner: packages/@dvt/contracts
  - name: DvtSubstraitProjectionDraft
    type: aggregate state
    owner: typed Substrait Plan plus DVT sidecar
fowlerSignals:
  - Divergent change
  - Hidden authority
  - Primitive obsession
  - Speculative generality
architectureGuards:
  - pnpm docs:feature-mechanization:implementation -- --feature CANVAS-STRUCTURED-TRANSFORM-FIELDS-2771
cypressFlows:
  - apps/web/cypress/e2e/canvas/canvas-structured-transform-fields.cy.ts
completionGate:
  - pnpm --filter @dvt/contracts test
  - pnpm --filter @dvt/contracts typecheck
  - pnpm --filter @dvt/web test:unit:run
  - pnpm --filter @dvt/web test:presentation:run
  - pnpm --filter @dvt/web test:architecture:run
  - pnpm verify:prepush
```
