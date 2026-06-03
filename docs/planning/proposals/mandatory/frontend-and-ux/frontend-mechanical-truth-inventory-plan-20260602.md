---
title: Frontend Mechanical Truth Inventory Plan
status: Active
owner: Web / Architecture
date: 2026-06-02
last_reviewed: 2026-06-02
planning_type: proposal
---

# Frontend Mechanical Truth Inventory Plan

## Think-First Analysis

Problem summary: frontend route existence is currently easier to observe than
capability closure. Agents can see a screen, a route, or a component and infer
that the product capability is complete even when the route is a preview,
fail-closed shell, or partial projection over an existing backend rail.

Root cause: the frontend command/query rail inventory names governed rails, but
it is not a mechanical screen inventory. Route status, plugin composition,
consumed endpoints, local stores, TanStack queries, visible affordances without a
real backend, and capability gaps are not stored in one DB-queryable read model.

Constraints and invariants:

- The existing command/query rail catalog remains the source for rail reuse and
  creation-intent checks.
- The new read model must answer a different question: what visible frontend
  surfaces exist, and what is their product-readiness posture?
- The source of truth must be a governed architecture document imported into the
  planning query store, not a one-off local script.
- The inventory must preserve the difference between `operational-product`,
  `preview`, `disabled-unsupported`, and `experimental`.

Options considered:

- Extend `creation-intent` with screen metadata. Rejected because that rail is
  optimized for command/query reuse, not route-level operational truth.
- Keep evidence only in a closeout. Rejected because agents need a reusable
  preflight query before creating or claiming frontend behavior.
- Add a focused frontend mechanical truth read model. Selected because it keeps
  rail reuse and screen capability status separate while making both queryable.

## Pre-Implementation Brief

Mode: Full.

Scope:

- Create a governed frontend mechanical truth inventory document.
- Import that inventory into the planning DB governance projection.
- Expose `pnpm planning:db:query frontend-surfaces` with filters for route kind,
  state, path, owner, and limit.
- Repair the `/runs` native E2E smoke bootstrap stubs so Phase 0 route evidence
  is reproducible.
- Record Phase 0 web validation evidence in the frontend inventory.

Out of scope:

- New backend endpoints.
- New frontend product behavior.
- Changing route status from preview to product without corresponding rails and
  tests.
- Replacing the existing command/query rail catalog.

Validation plan:

- `pnpm docs:feature-mechanization -- --feature FRONTEND-MECHANICAL-TRUTH-INVENTORY-20260602`
- `node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs`
- `node --test scripts/planning-db-query.test.cjs scripts/planning-db-import.test.cjs scripts/planning-db-migrate.test.cjs`
- `pnpm --filter @dvt/web test:e2e:native -- --spec "cypress/e2e/shell/startup-route-readiness.cy.ts,cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts,cypress/e2e/runs/runs-runtime-contract.cy.ts"`
- `pnpm --filter @dvt/web lint`
- `pnpm docs:sync`
- `pnpm governance:refresh`
- `pnpm verify:prepush`

## Fowler Opportunity Matrix

<!-- markdownlint-disable MD060 -->

| Scenario                        | Opportunity          | Fowler pattern                         | DDD owner                        | Rail                                  | Tests                                                      |
| ------------------------------- | -------------------- | -------------------------------------- | -------------------------------- | ------------------------------------- | ---------------------------------------------------------- |
| Screen exists but is not closed | Hidden authority     | Explicit Read Model                    | FrontendMechanicalTruthInventory | `ListFrontendMechanicalTruthSurfaces` | `planning-db-frontend-mechanical-truth-inventory.test.cjs` |
| Route/plugin metadata scattered | Data clumps          | Introduce Parameter Object             | Frontend surface inventory row   | `ListFrontendMechanicalTruthSurfaces` | `planning-db-query.test.cjs`                               |
| Evidence only in command output | Documentation drift  | Published Language / Documentation Map | Web component documentation      | `ListFrontendMechanicalTruthSurfaces` | docs sync and planning DB import tests                     |
| E2E smoke stubs miss bootstraps | Test-only confidence | Characterization Test                  | Runs route smoke contract        | existing runs queries                 | `runs-runtime-contract.cy.ts` native smoke                 |

<!-- markdownlint-enable MD060 -->

```feature-mechanization
version: 1
featureId: FRONTEND-MECHANICAL-TRUTH-INVENTORY-20260602
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/frontend-mechanical-truth-inventory-plan-20260602.md
componentGuides:
  - docs/architecture/components/web/frontend-mechanical-truth-inventory.md
userStories:
  - docs/architecture/components/web/frontend-mechanical-truth-inventory-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/frontend-command-query-rail-inventory.md
  - docs/guides/testing-and-ci-capabilities.md
allowedImplementationSurfaces:
  - apps/web/cypress/e2e/runs/runs-runtime-contract.cy.ts
  - docs/architecture/components/web/frontend-mechanical-truth-inventory.md
  - docs/architecture/components/web/frontend-mechanical-truth-inventory-user-stories.md
  - docs/architecture/components/web/index.md
  - docs/guides/testing-and-ci-capabilities.md
  - docs/planning/proposals/mandatory/frontend-and-ux/frontend-mechanical-truth-inventory-plan-20260602.md
  - docs/planning/closeouts/20260602-web-mechanical-truth-inventory-closeout.md
  - package.json
  - scripts/planning-db/frontend-mechanical-truth-inventory.cjs
  - scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
  - scripts/planning-db-import.cjs
  - scripts/planning-db-import.test.cjs
  - scripts/planning-db-migrate.test.cjs
  - scripts/planning-db-query.cjs
  - scripts/planning-db-query.test.cjs
  - tools/planning-db/migrations/055_frontend_mechanical_truth_inventory.sql
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - apps/api/**
commandQueryRails:
  - name: ListFrontendMechanicalTruthSurfaces
    type: query
    dddOwner: FrontendMechanicalTruthInventory
domainObjects:
  - name: FrontendMechanicalTruthSurface
    type: query-store read model
    owner: scripts/planning-db
fowlerSignals:
  - Hidden authority
  - Data clumps
  - Documentation drift
  - Test-only confidence
architectureGuards:
  - node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
cypressFlows:
  - pnpm --filter @dvt/web test:e2e:native -- --spec "cypress/e2e/shell/startup-route-readiness.cy.ts,cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts,cypress/e2e/runs/runs-runtime-contract.cy.ts"
completionGate:
  - node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
  - node --test scripts/planning-db-query.test.cjs scripts/planning-db-import.test.cjs scripts/planning-db-migrate.test.cjs
  - pnpm --filter @dvt/web lint
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: frontend-mechanical-truth-parser
    redTest: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    expectedFailure: frontend mechanical truth inventory component does not exist.
    patchSurfaces:
      - scripts/planning-db/frontend-mechanical-truth-inventory.cjs
      - scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
      - docs/architecture/components/web/frontend-mechanical-truth-inventory.md
    greenTest: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
  - id: frontend-mechanical-truth-query
    redTest: node --test scripts/planning-db-query.test.cjs
    expectedFailure: frontend-surfaces query name and dispatcher are not wired.
    patchSurfaces:
      - scripts/planning-db-query.cjs
      - scripts/planning-db-query.test.cjs
    greenTest: node --test scripts/planning-db-query.test.cjs
  - id: frontend-mechanical-truth-import
    redTest: node --test scripts/planning-db-import.test.cjs scripts/planning-db-migrate.test.cjs
    expectedFailure: migration and importer do not persist frontend surface rows.
    patchSurfaces:
      - scripts/planning-db-import.cjs
      - scripts/planning-db-import.test.cjs
      - scripts/planning-db-migrate.test.cjs
      - tools/planning-db/migrations/055_frontend_mechanical_truth_inventory.sql
    greenTest: node --test scripts/planning-db-import.test.cjs scripts/planning-db-migrate.test.cjs
symbols:
  - name: buildFrontendMechanicalTruthSnapshot
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Hidden authority, Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - DB read model imported from governed frontend inventory.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: readFrontendMechanicalTruthRows
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Data clumps]
    architectureGuard: node --test scripts/planning-db-query.test.cjs
    cypressCoverage: N/A - query CLI read model; route evidence captured by frontend native smoke.
    unitTests: [node --test scripts/planning-db-query.test.cjs]
  - name: insertFrontendMechanicalTruthSnapshot
    path: scripts/planning-db-import.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Documentation drift]
    architectureGuard: node --test scripts/planning-db-import.test.cjs
    cypressCoverage: N/A - import wiring; route evidence captured by frontend native smoke.
    unitTests: [node --test scripts/planning-db-import.test.cjs]
  - name: stubRunsRouteBootstrapApis
    path: apps/web/cypress/e2e/runs/runs-runtime-contract.cy.ts
    dddOwner: Runs route smoke contract
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web test:e2e:native -- --spec "cypress/e2e/runs/runs-runtime-contract.cy.ts"
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec "cypress/e2e/runs/runs-runtime-contract.cy.ts"
    unitTests: [N/A - Cypress helper]
  - name: buildFrontendMechanicalTruthRows
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Data clumps]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - DB read model row formatter.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: normalizeFrontendMechanicalTruthList
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Primitive obsession]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - DB read model parser helper.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: appendFilter
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Data clumps]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - DB query helper.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: countField
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Data clumps]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - DB read model row helper.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: headerIndexes
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Markdown inventory parser helper.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: isSeparatorRow
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Markdown inventory parser helper.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: markdownCells
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Markdown inventory parser helper.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: normalizeCell
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Primitive obsession]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Markdown inventory parser helper.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: normalizeHeader
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Markdown inventory parser helper.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: parseInventoryTable
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Hidden authority, Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Markdown inventory parser helper.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: parseLimit
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Data clumps]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - DB query helper.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: readDefaultInventoryDocument
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Governed document loader.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: repoRelative
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Path normalization helper.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: rowValue
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Markdown inventory parser helper.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: sha256
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Source hash helper.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: stripInlineCode
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Primitive obsession]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Markdown normalization helper.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: toPosix
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Path normalization helper.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: crypto
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Node dependency for source hashes.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: fs
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Node dependency for governed document loading.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: path
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Node dependency for governed document loading.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: defaultInventoryPath
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Governed inventory path constant.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: repoRoot
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Path normalization constant.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: requiredHeaders
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Documentation drift]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Governed inventory table contract.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: validScreenStates
    path: scripts/planning-db/frontend-mechanical-truth-inventory.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Hidden authority]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Screen state vocabulary guard.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: assert
    path: scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Test-only confidence]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Node test assertion dependency.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: inventoryDocument
    path: scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Test-only confidence]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Test fixture helper.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: sampleInventoryTable
    path: scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Test-only confidence]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Test fixture helper.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
  - name: test
    path: scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    dddOwner: FrontendMechanicalTruthInventory
    cqRails: [ListFrontendMechanicalTruthSurfaces]
    fowlerSignals: [Test-only confidence]
    architectureGuard: node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs
    cypressCoverage: N/A - Node test dependency.
    unitTests: [node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs]
```
