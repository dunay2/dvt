---
title: Frontend Component Reflection Inventory Plan
status: Accepted
owner: Web / Architecture
date: 2026-06-04
last_reviewed: 2026-06-04
planning_type: proposal
---

# Frontend Component Reflection Inventory Plan

## Source Intake

This proposal is the governed disposition for the inbox study:

- `buzon/dvt_front_component_inventory_app_reflection_study_20260604.md`

The inbox study is useful as analysis, but it is not a canonical planning or
architecture source. This document is the repository-facing proposal. It
preserves the useful direction while rejecting the parts that would create a
large, untestable implementation slice.

## Critical Disposition

The study fits the DVT model as an extension of the existing frontend DB-first
inventory work, not as a replacement for it.

Accepted direction:

- Persist frontend components as queryable planning DB rows linked to real
  application surfaces, files, ports, command/query rails, and evidence.
- Keep `frontend_mechanical_truth_surfaces` focused on visible surface posture:
  route, plugin, affordance, state, backend dependencies, and capability gaps.
- Add a lower-level component reflection inventory for the implementation parts
  that build those surfaces.
- Use the governed architecture document as the initial intention source and a
  later AST extractor as mechanical validation.
- Treat Backstage-style component/API/resource mapping as a useful comparison,
  not as a schema to copy wholesale.

Rejected or constrained direction:

- Do not implement the full relational model, importer, query CLI, Canvas seed,
  Runs seed, AST extractor, and drift gates in one PR.
- Do not create a single JSONB-heavy `frontend_component_inventory` table that
  cannot support joins by file, surface, rail, or evidence.
- Do not let the browser component inventory invent command/query semantics.
  Rails remain governed by the frontend command/query rail catalog.
- Do not treat Storybook as required tooling for this slice. The DB model can
  leave room for visual evidence, but Storybook adoption is a separate decision.
- Do not mark components as `current` unless the file and evidence references
  can be validated mechanically.

## Existing Model Fit

The proposal sits between two existing governed surfaces:

- `ListFrontendMechanicalTruthSurfaces` answers: what visible frontend surfaces
  exist and what maturity posture do they have?
- `ListFrontendCommandQueryRails` answers: what frontend commands and queries
  exist, what owns them, and where are the gaps?

The new component reflection model answers a distinct question:

> Which frontend components, files, symbols, ports, dependencies, and evidence
> implement or support each visible surface and rail?

That distinction is enough to justify a new read model, but not enough to
justify bypassing the existing rails. The first implementation must reuse the
current surface and rail inventories as foreign authority.

## Rail Posture

Creation-intent preflight for "create a frontend component reflection query"
returns existing rail candidates, including:

- `ListFrontendCommandQueryRails`
- `ListFrontendMechanicalTruthSurfaces`

Therefore this proposal must not create a browser product rail. The accepted
slice adds a planning DB query-store read model that references those rails and
registers `ListFrontendComponentReflection` for the lower-level component
question that surface and rail queries cannot answer directly.

Accepted status for the new query:

<!-- markdownlint-disable MD060 -->

| Query                             | Status      | DDD owner                              | Reason                                                                                                            |
| --------------------------------- | ----------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `ListFrontendComponentReflection` | implemented | `FrontendComponentReflectionInventory` | The component-level read model has its own schema, filters, and joins beyond existing frontend surface and rails. |

<!-- markdownlint-enable MD060 -->

```feature-mechanization
version: 1
featureId: FRONTEND-COMPONENT-REFLECTION-INVENTORY-20260604
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/frontend-component-reflection-inventory-plan-20260604.md
componentGuides:
  - docs/architecture/components/web/frontend-component-inventory.md
userStories:
  - docs/architecture/components/web/frontend-component-inventory.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/frontend-mechanical-truth-inventory.md
  - docs/architecture/components/web/frontend-command-query-rail-inventory.md
  - docs/guides/testing-and-ci-capabilities.md
allowedImplementationSurfaces:
  - buzon/dvt_front_component_inventory_app_reflection_study_20260604.md
  - docs/architecture/components/web/frontend-component-inventory.md
  - docs/architecture/components/web/index.md
  - docs/guides/testing-and-ci-capabilities.md
  - docs/planning/proposals/mandatory/frontend-and-ux/frontend-component-reflection-inventory-plan-20260604.md
  - package.json
  - scripts/local-validation-plan.cjs
  - scripts/planning-db/frontend-component-inventory.cjs
  - scripts/planning-db-frontend-component-inventory.test.cjs
  - scripts/planning-db-import.cjs
  - scripts/planning-db-import.test.cjs
  - scripts/planning-db-migrate.test.cjs
  - scripts/planning-db-query.cjs
  - scripts/planning-db-query.test.cjs
  - scripts/verify-changed.test.cjs
  - tools/planning-db/migrations/056_frontend_component_reflection_inventory.sql
forbiddenImplementationSurfaces:
  - apps/api/**
  - apps/web/src/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
commandQueryRails:
  - name: ListFrontendComponentReflection
    type: query
    dddOwner: FrontendComponentReflectionInventory
    status: implemented
domainObjects:
  - name: FrontendComponentReflectionInventory
    type: query-store read model
    owner: scripts/planning-db
fowlerSignals:
  - Hidden authority
  - Documentation drift
  - Data clumps
  - Test-only confidence
architectureGuards:
  - node --test scripts/planning-db-frontend-component-inventory.test.cjs
cypressFlows:
  - N/A - planning DB component reflection only; no browser runtime behavior changes.
completionGate:
  - node --test scripts/planning-db-frontend-component-inventory.test.cjs
  - node --test scripts/planning-db-query.test.cjs scripts/planning-db-import.test.cjs scripts/planning-db-migrate.test.cjs scripts/verify-changed.test.cjs
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: frontend-component-reflection-parser
    redTest: node --test scripts/planning-db-frontend-component-inventory.test.cjs
    expectedFailure: frontend component reflection inventory component does not exist.
    patchSurfaces:
      - scripts/planning-db/frontend-component-inventory.cjs
      - scripts/planning-db-frontend-component-inventory.test.cjs
      - docs/architecture/components/web/frontend-component-inventory.md
    greenTest: node --test scripts/planning-db-frontend-component-inventory.test.cjs
  - id: frontend-component-reflection-import-query
    redTest: node --test scripts/planning-db-query.test.cjs scripts/planning-db-import.test.cjs scripts/planning-db-migrate.test.cjs
    expectedFailure: frontend component reflection migration, import, and query CLI are not wired.
    patchSurfaces:
      - scripts/planning-db-import.cjs
      - scripts/planning-db-import.test.cjs
      - scripts/planning-db-migrate.test.cjs
      - scripts/planning-db-query.cjs
      - scripts/planning-db-query.test.cjs
      - tools/planning-db/migrations/056_frontend_component_reflection_inventory.sql
    greenTest: node --test scripts/planning-db-query.test.cjs scripts/planning-db-import.test.cjs scripts/planning-db-migrate.test.cjs
  - id: frontend-component-reflection-changed-routing
    redTest: node --test scripts/verify-changed.test.cjs
    expectedFailure: changed-file validation routes component inventory edits through broad planning DB tests.
    patchSurfaces:
      - scripts/local-validation-plan.cjs
      - scripts/verify-changed.test.cjs
      - package.json
    greenTest: node --test scripts/verify-changed.test.cjs
symbols:
  - name: buildFrontendComponentReflectionSnapshot
    path: scripts/planning-db/frontend-component-inventory.cjs
    dddOwner: FrontendComponentReflectionInventory
    cqRails: [ListFrontendComponentReflection]
    fowlerSignals: [Hidden authority, Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-component-inventory.test.cjs
    cypressCoverage: N/A - DB read model imported from governed frontend component inventory.
    unitTests: [node --test scripts/planning-db-frontend-component-inventory.test.cjs]
  - name: buildFrontendComponentRows
    path: scripts/planning-db/frontend-component-inventory.cjs
    dddOwner: FrontendComponentReflectionInventory
    cqRails: [ListFrontendComponentReflection]
    fowlerSignals: [Data clumps]
    architectureGuard: node --test scripts/planning-db-frontend-component-inventory.test.cjs
    cypressCoverage: N/A - DB query output formatter.
    unitTests: [node --test scripts/planning-db-frontend-component-inventory.test.cjs]
  - name: buildFrontendComponentFileRows
    path: scripts/planning-db/frontend-component-inventory.cjs
    dddOwner: FrontendComponentReflectionInventory
    cqRails: [ListFrontendComponentReflection]
    fowlerSignals: [Data clumps]
    architectureGuard: node --test scripts/planning-db-frontend-component-inventory.test.cjs
    cypressCoverage: N/A - DB query output formatter.
    unitTests: [node --test scripts/planning-db-frontend-component-inventory.test.cjs]
  - name: buildFrontendComponentRailRows
    path: scripts/planning-db/frontend-component-inventory.cjs
    dddOwner: FrontendComponentReflectionInventory
    cqRails: [ListFrontendComponentReflection]
    fowlerSignals: [Data clumps]
    architectureGuard: node --test scripts/planning-db-frontend-component-inventory.test.cjs
    cypressCoverage: N/A - DB query output formatter.
    unitTests: [node --test scripts/planning-db-frontend-component-inventory.test.cjs]
  - name: readFrontendComponentRows
    path: scripts/planning-db/frontend-component-inventory.cjs
    dddOwner: FrontendComponentReflectionInventory
    cqRails: [ListFrontendComponentReflection]
    fowlerSignals: [Explicit Read Model]
    architectureGuard: node --test scripts/planning-db-frontend-component-inventory.test.cjs
    cypressCoverage: N/A - planning DB query CLI.
    unitTests: [node --test scripts/planning-db-frontend-component-inventory.test.cjs]
  - name: readFrontendComponentFileRows
    path: scripts/planning-db/frontend-component-inventory.cjs
    dddOwner: FrontendComponentReflectionInventory
    cqRails: [ListFrontendComponentReflection]
    fowlerSignals: [Explicit Read Model]
    architectureGuard: node --test scripts/planning-db-frontend-component-inventory.test.cjs
    cypressCoverage: N/A - planning DB query CLI.
    unitTests: [node --test scripts/planning-db-frontend-component-inventory.test.cjs]
  - name: readFrontendComponentRailRows
    path: scripts/planning-db/frontend-component-inventory.cjs
    dddOwner: FrontendComponentReflectionInventory
    cqRails: [ListFrontendComponentReflection]
    fowlerSignals: [Explicit Read Model]
    architectureGuard: node --test scripts/planning-db-frontend-component-inventory.test.cjs
    cypressCoverage: N/A - planning DB query CLI.
    unitTests: [node --test scripts/planning-db-frontend-component-inventory.test.cjs]
  - name: insertFrontendComponentReflectionSnapshot
    path: scripts/planning-db-import.cjs
    dddOwner: FrontendComponentReflectionInventory
    cqRails: [ListFrontendComponentReflection]
    fowlerSignals: [Documentation drift]
    architectureGuard: node --test scripts/planning-db-import.test.cjs
    cypressCoverage: N/A - planning DB import wiring.
    unitTests: [node --test scripts/planning-db-import.test.cjs]
  - name: normalizeList
    path: scripts/planning-db/frontend-component-inventory.cjs
    dddOwner: FrontendComponentReflectionInventory
    cqRails: [ListFrontendComponentReflection]
    fowlerSignals: [Data clumps]
    architectureGuard: node --test scripts/planning-db-frontend-component-inventory.test.cjs
    cypressCoverage: N/A - parser normalization.
    unitTests: [node --test scripts/planning-db-frontend-component-inventory.test.cjs]
  - name: parseInventoryDocument
    path: scripts/planning-db/frontend-component-inventory.cjs
    dddOwner: FrontendComponentReflectionInventory
    cqRails: [ListFrontendComponentReflection]
    fowlerSignals: [Hidden authority]
    architectureGuard: node --test scripts/planning-db-frontend-component-inventory.test.cjs
    cypressCoverage: N/A - parser implementation.
    unitTests: [node --test scripts/planning-db-frontend-component-inventory.test.cjs]
  - name: sectionTableRows
    path: scripts/planning-db/frontend-component-inventory.cjs
    dddOwner: FrontendComponentReflectionInventory
    cqRails: [ListFrontendComponentReflection]
    fowlerSignals: [Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-component-inventory.test.cjs
    cypressCoverage: N/A - parser implementation.
    unitTests: [node --test scripts/planning-db-frontend-component-inventory.test.cjs]
  - name: appendFilter
    path: scripts/planning-db/frontend-component-inventory.cjs
    dddOwner: FrontendComponentReflectionInventory
    cqRails: [ListFrontendComponentReflection]
    fowlerSignals: [Explicit Read Model]
    architectureGuard: node --test scripts/planning-db-frontend-component-inventory.test.cjs
    cypressCoverage: N/A - SQL filter builder.
    unitTests: [node --test scripts/planning-db-frontend-component-inventory.test.cjs]
  - name: test
    path: scripts/planning-db-frontend-component-inventory.test.cjs
    dddOwner: FrontendComponentReflectionInventory
    cqRails: [ListFrontendComponentReflection]
    fowlerSignals: [Test-only confidence]
    architectureGuard: node --test scripts/planning-db-frontend-component-inventory.test.cjs
    cypressCoverage: N/A - Node test harness.
    unitTests: [node --test scripts/planning-db-frontend-component-inventory.test.cjs]
  - name: assert
    path: scripts/planning-db-frontend-component-inventory.test.cjs
    dddOwner: FrontendComponentReflectionInventory
    cqRails: [ListFrontendComponentReflection]
    fowlerSignals: [Test-only confidence]
    architectureGuard: node --test scripts/planning-db-frontend-component-inventory.test.cjs
    cypressCoverage: N/A - Node test harness.
    unitTests: [node --test scripts/planning-db-frontend-component-inventory.test.cjs]
  - name: inventoryDocument
    path: scripts/planning-db-frontend-component-inventory.test.cjs
    dddOwner: FrontendComponentReflectionInventory
    cqRails: [ListFrontendComponentReflection]
    fowlerSignals: [Test-only confidence]
    architectureGuard: node --test scripts/planning-db-frontend-component-inventory.test.cjs
    cypressCoverage: N/A - test fixture builder.
    unitTests: [node --test scripts/planning-db-frontend-component-inventory.test.cjs]
  - name: sampleInventory
    path: scripts/planning-db-frontend-component-inventory.test.cjs
    dddOwner: FrontendComponentReflectionInventory
    cqRails: [ListFrontendComponentReflection]
    fowlerSignals: [Test-only confidence]
    architectureGuard: node --test scripts/planning-db-frontend-component-inventory.test.cjs
    cypressCoverage: N/A - test fixture builder.
    unitTests: [node --test scripts/planning-db-frontend-component-inventory.test.cjs]
  - &frontendComponentInternalSymbol
    name: countField
    path: scripts/planning-db/frontend-component-inventory.cjs
    dddOwner: FrontendComponentReflectionInventory
    cqRails: [ListFrontendComponentReflection]
    fowlerSignals: [Data clumps]
    architectureGuard: node --test scripts/planning-db-frontend-component-inventory.test.cjs
    cypressCoverage: N/A - parser and query helper.
    unitTests: [node --test scripts/planning-db-frontend-component-inventory.test.cjs]
  - <<: *frontendComponentInternalSymbol
    name: crypto
  - <<: *frontendComponentInternalSymbol
    name: defaultInventoryPath
  - <<: *frontendComponentInternalSymbol
    name: expectVocabulary
  - <<: *frontendComponentInternalSymbol
    name: fs
  - <<: *frontendComponentInternalSymbol
    name: headerIndexes
  - <<: *frontendComponentInternalSymbol
    name: isSeparatorRow
  - <<: *frontendComponentInternalSymbol
    name: markdownCells
  - <<: *frontendComponentInternalSymbol
    name: normalizeCell
  - <<: *frontendComponentInternalSymbol
    name: normalizeHeader
  - <<: *frontendComponentInternalSymbol
    name: normalizeOptional
  - <<: *frontendComponentInternalSymbol
    name: parseInteger
  - <<: *frontendComponentInternalSymbol
    name: parseLimit
  - <<: *frontendComponentInternalSymbol
    name: path
  - <<: *frontendComponentInternalSymbol
    name: rawRow
  - <<: *frontendComponentInternalSymbol
    name: readDefaultInventoryDocument
  - <<: *frontendComponentInternalSymbol
    name: repoRelative
  - <<: *frontendComponentInternalSymbol
    name: repoRoot
  - <<: *frontendComponentInternalSymbol
    name: requiredHeadersBySection
  - <<: *frontendComponentInternalSymbol
    name: rowValue
  - <<: *frontendComponentInternalSymbol
    name: sha256
  - <<: *frontendComponentInternalSymbol
    name: stripInlineCode
  - <<: *frontendComponentInternalSymbol
    name: toPosix
  - <<: *frontendComponentInternalSymbol
    name: validComponentKinds
  - <<: *frontendComponentInternalSymbol
    name: validComponentStatuses
  - <<: *frontendComponentInternalSymbol
    name: validFileRoles
  - <<: *frontendComponentInternalSymbol
    name: validRailKinds
  - <<: *frontendComponentInternalSymbol
    name: validRailStatuses
  - <<: *frontendComponentInternalSymbol
    name: validReuseDecisions
```

## Fowler Opportunity Matrix

<!-- markdownlint-disable MD060 -->

| Scenario                                                                           | Opportunity          | Fowler pattern                                      | DDD owner                              | Command/query rail                                                                             | Implementation surfaces                                      | Tests                                        | Out of scope                |
| ---------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------- | --------------------------- |
| A visible route exists but its implementing components and files are not queryable | Hidden authority     | Explicit Read Model                                 | `FrontendComponentReflectionInventory` | proposed `ListFrontendComponentReflection` or extension of existing frontend inventory queries | planning DB migration, governed inventory document, importer | planning DB migration/import/query tests     | AST extractor               |
| Component status lives in prose and cannot be joined to files or rails             | Documentation drift  | Published Language / Documentation Map              | web component inventory                | existing `ListFrontendMechanicalTruthSurfaces`, existing `ListFrontendCommandQueryRails`       | architecture inventory doc                                   | docs sync and import tests                   | product UI changes          |
| Repeated route toolbars and panels have no shared reflection model                 | Duplicate semantics  | Separate Model from Presentation; Extract Component | workbench component catalog            | none - planning read model only                                                                | component inventory seed                                     | parser and vocabulary tests                  | extracting React components |
| Files, symbols, ports, rails, and evidence travel as loose lists                   | Data clumps          | Introduce Parameter Object; normalized child tables | component reflection row               | proposed query once accepted                                                                   | parser row builders and DB tables                            | unit tests for row normalization             | broad source scan           |
| Tests prove string fixtures instead of architecture relationships                  | Test-only confidence | Characterization Test with semantic joins           | component reflection drift check       | proposed query once accepted                                                                   | query views and drift checks                                 | negative tests for missing file/surface/rail | full web suite expansion    |

<!-- markdownlint-enable MD060 -->

## Recommended Architecture

```mermaid
flowchart LR
  Study["Inbox study"] --> Proposal["Governed proposal"]
  Proposal --> InventoryDoc["Frontend component inventory document"]
  InventoryDoc --> Importer["Planning DB importer"]
  Importer --> ReadModel["Component reflection read model"]
  SurfaceQuery["Frontend surface inventory"] --> ReadModel
  RailQuery["Frontend C/Q rail inventory"] --> ReadModel
  ReadModel --> AgentQuery["AI preflight queries"]
  AstExtractor["AST extractor - later"] -. validates .-> ReadModel
```

## Implementation Slices

### Slice 1 - Governed Proposal

Status: implemented.

Objective: decide whether the inbox study fits the model and record the
accepted constraints.

Allowed surfaces:

- this proposal;
- docs indexes generated by `pnpm docs:sync`.

No product behavior changes belong in this slice.

### Slice 2 - Minimal DB Model

Status: implemented for the P0 component set.

Objective: add the smallest relational component reflection model that can
answer component-to-surface, component-to-file, component-to-rail, and
component-to-evidence questions.

Candidate tables:

- `frontend_components`
- `frontend_surface_component_links`
- `frontend_component_files`
- `frontend_component_cq_rails`
- `frontend_component_evidence`

Deferred tables:

- `frontend_component_symbols`
- `frontend_component_ports`
- `frontend_component_data_contracts`
- `frontend_component_dependencies`

Reason for deferral: those surfaces need either richer manual inventory rules
or AST validation to avoid creating unverifiable prose tables.

### Slice 3 - Governed Inventory And Query CLI

Status: implemented for `frontend-components`, `frontend-component-files`, and
`frontend-component-rails`.

Objective: create `docs/architecture/components/web/frontend-component-inventory.md`,
an importer, and query commands.

Required queries:

```bash
pnpm planning:db:query frontend-components --limit 50
pnpm planning:db:query frontend-components --surface web.canvas.graph
pnpm planning:db:query frontend-component-files --component web.component.canvas.CanvasToolbar
pnpm planning:db:query frontend-component-rails --status gap-needed
```

### Slice 4 - Mechanical Drift Checks

Objective: fail when inventory rows claim app reflection that no longer exists.

Required negative checks:

- declared component file does not exist;
- declared surface ID does not exist in
  `frontend_mechanical_truth_surfaces`;
- declared rail does not exist in the frontend command/query rail catalog;
- `current` component has no file or no evidence;
- `gap-needed` rail is not paired with an explicit capability gap.

### Slice 5 - AST Reflection

Objective: use the TypeScript compiler API or `ts-morph` to validate exports,
React components, hooks, query hooks, stores, ports, and plugin contributions.

This is deliberately later work. It validates the architecture; it must not
become the authority that invents architecture.

## Initial Component Scope

Start with the smallest useful P0 set:

| Component ID                                  | Reason                                                      |
| --------------------------------------------- | ----------------------------------------------------------- |
| `web.component.shell.AppShellFrame`           | persistent shell anchor                                     |
| `web.component.shell.ShellTopBar`             | global actions and context                                  |
| `web.component.shell.LeftNavigationRail`      | plugin-driven route navigation                              |
| `web.component.shell.BottomConsoleDrawer`     | execution/supporting context                                |
| `web.component.workbench.RouteWorkbenchFrame` | shared route layout contract                                |
| `web.component.workbench.WorkbenchStates`     | shared loading, empty, error, degraded, read-only states    |
| `web.component.canvas.CanvasToolbar`          | best current extraction source for route-toolbar reflection |

Canvas, Runs, Code, Diff, Lineage, Artifacts, Templates, Plugins, and Admin
component seeds are deferred until the P0 schema and importer are proven.

## Acceptance Criteria

- The inbox study is no longer treated as active authority.
- The component reflection proposal is explicit about what is accepted,
  rejected, and deferred.
- The first implementation slice does not add product behavior.
- Existing frontend surface and command/query inventories remain the authority
  for surface maturity and rail semantics.
- The P0 DB projection has parser, migration, import, query, and changed-gate
  tests before agents rely on it.
- Future AST/drift implementation adds negative tests before expanding the
  projection authority.

## Validation Plan

For the implemented proposal, DB model, and query CLI slices:

```bash
node --test scripts/planning-db-frontend-component-inventory.test.cjs
node --test scripts/planning-db-query.test.cjs scripts/planning-db-import.test.cjs scripts/planning-db-migrate.test.cjs scripts/verify-changed.test.cjs
pnpm planning:db:import -- --governance-only
pnpm planning:db:query frontend-components --limit 20
pnpm docs:sync
pnpm docs:sync:check
pnpm docs:feature-mechanization:implementation
pnpm verify:prepush
```
