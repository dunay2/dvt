---
title: Web Physical Module Decomposition Debt Plan
status: Proposed
owner: Frontend / Architecture
last_reviewed: 2026-05-08
planning_type: proposal
---

# Web Physical Module Decomposition Debt Plan

## Debt Summary

The current repository layout mixes three different concepts that are easy to
confuse during review:

1. deployable applications under `apps/**`;
2. reusable DVT packages under `packages/@dvt/**`;
3. architecture-document component folders under `docs/architecture/components/**`.

That split is valid in principle, but the current frontend and CLI surfaces
carry physical-layout debt:

- `apps/web` is the correct home for the deployable browser app, but its
  internal module structure is too broad. `apps/web/src/app/views` contains the
  dominant implementation mass, and `views/canvas` is the main concentration
  point.
- `packages/cli` contains `validate-contracts.cjs` without a package manifest,
  while `packages/@dvt/cli` is the actual workspace package. That duplicate
  physical level creates ownership ambiguity.
- Documentation folders such as `docs/architecture/components/web/**` describe
  architecture components; they are not intended to mirror source folders
  one-to-one. Reviewers still need an explicit rule so source moves are not
  driven by doc folder names alone.

This document records the future cleanup. It does not move code.

## Current Evidence

Observed local shape on 2026-05-08:

| Surface                         | Current posture                                 | Debt signal                                                 |
| ------------------------------- | ----------------------------------------------- | ----------------------------------------------------------- |
| `apps/web`                      | Private deployable package named `@dvt/web`     | Correct app home, but internally too coarse                 |
| `apps/web/src/app/views`        | Route/workbench implementation concentration    | Too many route, Canvas, and feature files in one area       |
| `apps/web/src/app/views/canvas` | Main frontend concentration point               | Candidate for first feature-module extraction               |
| `packages/@dvt/cli`             | Real workspace package with `package.json`      | Should own CLI package behavior                             |
| `packages/cli`                  | Loose folder with `validate-contracts.cjs` only | Orphaned legacy surface outside `packages/@dvt/**`          |
| `docs/architecture/components`  | Architecture documentation taxonomy             | Must stay documentation-oriented, not physical source truth |

## Target Direction

### Keep deployable apps under `apps/**`

`apps/web` should remain the deployable browser shell. Moving it wholesale to
`packages/@dvt/web` would blur the app/package boundary. The package name
`@dvt/web` is a workspace name used by pnpm filters; the physical folder still
correctly says this is an application.

### Split `apps/web` internally before extracting packages

The next implementation cut should split `apps/web/src/app` by owned feature
modules before creating reusable packages:

```text
apps/web/src/app/
  shell/
  shared-ui/
  features/
    canvas/
    runs/
    artifacts/
    lineage/
    code/
    admin/
  services/
  ports/
```

The first slice should target Canvas because it is the largest concentration
point. A package extraction is only justified after a module has a second real
consumer or a stable non-React contract.

### Consolidate loose CLI surfaces

`packages/cli/validate-contracts.cjs` should be reconciled with
`packages/@dvt/cli/validate-contracts.cjs` and the root
`scripts/validate-contracts.cjs` wrapper.

The expected target is one of:

1. move the useful behavior into `packages/@dvt/cli` and delete
   `packages/cli`;
2. move repository-only validation behavior into `scripts/**` and keep
   `packages/@dvt/cli` for package-owned commands;
3. keep a compatibility wrapper only if an active CI or documented command
   still depends on the old path.

The future slice must prove which path is still referenced before deletion.

## Non-Goals

- Do not move `apps/web` wholesale under `packages/@dvt`.
- Do not create `packages/@dvt/ui` until there is a stable reusable UI contract
  and at least one real non-`apps/web` consumer.
- Do not rename docs component folders just to match source folders.
- Do not change runtime routes, frontend DTOs, API rails, or package exports in
  the debt-registration slice.

## Required Future Checks

Before implementing the cleanup, the future slice must:

1. run `rg -n "packages/cli|validate-contracts.cjs|@dvt/cli"` to identify
   live references;
2. run a file-count and import-graph review for `apps/web/src/app/views/canvas`;
3. define allowed implementation surfaces in a new feature mechanization
   manifest;
4. add architecture tests or dependency-cruiser rules that prevent feature
   modules from importing across each other through private paths;
5. update `docs/architecture/components/web/index.md` and any affected feature
   component docs after code moves.

## Closure Criteria

The debt is closed only when:

- `packages/cli` is removed or reduced to an explicitly documented compatibility
  wrapper;
- Canvas route/workbench code is moved under a feature-owned module boundary;
- shared UI and shell utilities are separated from feature-owned code;
- `pnpm arch:deps`, web typecheck/tests, docs governance, and
  `pnpm verify:prepush` pass after the move;
- no broad package extraction is introduced without a real consumer and a
  documented contract.

```feature-mechanization
version: 1
featureId: WEB-PHYSICAL-MODULE-DECOMPOSITION-DEBT-20260508
mechanizationStatus: closed
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/web-physical-module-decomposition-debt-plan-20260508.md
componentGuides:
  - docs/architecture/components/web/index.md
  - docs/architecture/shared/cli.md
userStories:
  - docs/planning/proposals/mandatory/frontend-and-ux/web-physical-module-decomposition-debt-plan-20260508.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/DOCS_README.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/index.md
  - docs/architecture/shared/cli.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/frontend-and-ux/web-physical-module-decomposition-debt-plan-20260508.md
  - docs/planning/status/**
  - docs/.manifest.json
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - scripts/**
  - specs/**
  - .github/**
commandQueryRails:
  - name: AssessWebPhysicalModuleLayout
    type: query
    dddOwner: WebPhysicalModuleDebtLedger
  - name: RegisterWebModuleDecompositionDebt
    type: command
    dddOwner: WebPhysicalModuleDebtLedger
  - name: AssessCliPhysicalSurfaceDuplication
    type: query
    dddOwner: CliPhysicalSurfaceDebtLedger
domainObjects:
  - name: WebPhysicalModuleDebtLedger
    type: architecture debt ledger
    owner: Frontend architecture
  - name: CliPhysicalSurfaceDebtLedger
    type: architecture debt ledger
    owner: Tooling architecture
fowlerSignals:
  - Large component
  - Shotgun surgery risk
  - Parallel inheritance hierarchy
  - Duplicate physical ownership
architectureGuards:
  - pnpm docs:feature-mechanization:implementation
  - pnpm lint:md:changed
cypressFlows:
  - N/A - debt registration only
completionGate:
  - pnpm docs:sync
  - pnpm governance:refresh
  - pnpm docs:feature-mechanization:implementation
  - pnpm lint:md:changed
  - pnpm verify:prepush
redGreenCycles:
  - id: web-physical-module-debt-registration
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: New debt document is outside allowedImplementationSurfaces before this manifest exists.
    patchSurfaces:
      - docs/planning/proposals/mandatory/frontend-and-ux/web-physical-module-decomposition-debt-plan-20260508.md
      - docs/planning/status/**
      - docs/.manifest.json
    greenTest: pnpm docs:feature-mechanization:implementation
symbols:
  - name: WebPhysicalModuleDecompositionDebtPlan
    path: docs/planning/proposals/mandatory/frontend-and-ux/web-physical-module-decomposition-debt-plan-20260508.md
    dddOwner: WebPhysicalModuleDebtLedger
    cqRails:
      - AssessWebPhysicalModuleLayout
      - RegisterWebModuleDecompositionDebt
      - AssessCliPhysicalSurfaceDuplication
    fowlerSignals:
      - Large component
      - Shotgun surgery risk
      - Parallel inheritance hierarchy
      - Duplicate physical ownership
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - debt registration only
    unitTests:
      - pnpm docs:feature-mechanization:implementation
      - pnpm lint:md:changed
```
