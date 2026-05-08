---
title: Canvas Visible I18n Debt Plan
status: Proposed
owner: Frontend / Architecture
last_reviewed: 2026-05-08
planning_type: proposal
lane: E
---

# Canvas Visible I18n Debt Plan

## Debt Summary

The Canvas route now resolves toolbar, draft autosave posture, and workbench tab
labels through the Canvas i18n catalog. That closes the immediate mixed-language
chrome issue for the Stage 2 autosave slice, but the visible Canvas product still
has i18n debt outside that narrow surface.

The remaining debt is not a simple string replacement. Several visible labels
come from plugin registrations, node-kind registrations, generated node names,
or persisted draft content. Those surfaces mix presentation copy with semantic
product identifiers. Translating them blindly risks changing persisted user
content, canonical node identity, or test fixtures that currently express
authoring semantics.

This document records the future cleanup. It does not change product code.

## Current Evidence

Observed local shape on 2026-05-08:

<!-- markdownlint-disable MD060 -->

| Surface                                                     | Current visible posture                                                      | Debt signal                                                              |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `apps/web/src/app/components/DbtExplorer.tsx`               | Hardcoded `Project Nodes`, `Add data`, `Add node`, explorer helper copy      | Explorer chrome is not sourced from the Canvas i18n catalog              |
| `apps/web/src/app/plugins/dvt/dvtContributions.ts`          | Hardcoded `Transformation canvas`, empty-state titles, and helper copy       | Plugin registration copy is visible but not localizable                  |
| `apps/web/src/app/plugins/dvt/dvtNodeTypeCatalog.ts`        | Hardcoded `Source`, `SQL transform`, `Sink`, `Unknown`                       | Node-kind display labels are semantic registrations, not localized views |
| `apps/web/src/app/views/canvas/CanvasWorkbenchTabPanel.tsx` | Hardcoded unavailable state and loading copy                                 | Rare Workbench states remain outside i18n                                |
| `apps/web/cypress/e2e/canvas/*.cy.ts`                       | Some proofs resolve runtime copy, but no browser proof forces `es-ES` locale | E2E coverage can miss Spanish-only regressions                           |
| Workspace draft node and canvas names                       | Generated defaults such as `SQL transform 1` and `Transformation canvas`     | Generated names may become persisted user-visible content                |

<!-- markdownlint-enable MD060 -->

## Target Direction

### Split display labels from persisted semantics

Future work should distinguish:

- stable semantic identifiers, such as `dvt:sql_transform` and canvas kind
  `transformation`;
- localized display labels, such as button labels, badge labels, empty-state
  titles, and route chrome;
- persisted user content, such as a canvas title or node name that should not
  be silently retranslated after creation.

The target model should keep semantic identifiers stable and resolve display
labels at presentation time. Generated default names need an explicit policy:
either they are localized only at creation time and then treated as user content,
or they remain language-neutral product names with localized surrounding chrome.

### Give plugin registrations a localization boundary

Plugin and node-kind registrations should not force every consumer to read raw
English strings. The future slice should introduce one of these patterns:

1. extend plugin registration labels to `LocalizableString` where the value is
   display-only;
2. add a Canvas/plugin copy resolver that maps known registration IDs to the
   active Canvas locale;
3. keep registration labels as canonical fallback labels, but require every
   route presenter to resolve a localized display label before rendering.

The selected option must be documented in the implementation plan before code
changes.

### Add locale-explicit browser proof

The future implementation should add a Cypress proof that boots Canvas with an
explicit Spanish browser/document locale and asserts that the visible Canvas
chrome, Explorer chrome, Workbench states, and plugin display labels do not mix
English and Spanish for the same presentation surface.

## Non-Goals

- Do not translate historical persisted canvas or node names in existing drafts.
- Do not change node-kind IDs, plugin IDs, canonical roles, preview step kinds,
  or graph semantics.
- Do not touch backend routes, contracts, adapters, planner, engine, or
  protected draft API surfaces.
- Do not add a manual Save command. Canvas save remains automatic.
- Do not make Cypress rely on bilingual regexes as proof of localization.

## Required Future Checks

Before implementing the cleanup, the future slice must:

1. run `rg -n "Project Nodes|Add node|Transformation canvas|SQL transform|Open Graph|Loading tab" apps/web/src/app`;
2. classify each hit as route chrome, plugin display label, node-kind display
   label, generated default name, or persisted user content;
3. define the localization boundary for plugin and node-kind registrations;
4. add architecture coverage that blocks raw visible copy in the selected Canvas
   presentation surfaces;
5. add unit coverage for English and Spanish copy resolution;
6. add Cypress coverage for an explicit `es-ES` locale without bilingual regexes;
7. update the Canvas Stage 2 or successor plan manifest before touching code.

## Closure Criteria

The debt is closed only when:

- Canvas Explorer chrome resolves from an i18n catalog;
- Workbench unavailable/loading states resolve from an i18n catalog;
- DVT canvas-kind and node-kind display labels have a documented localization
  boundary;
- generated default names have an explicit persisted-content policy;
- at least one Cypress proof runs with explicit Spanish locale and validates the
  visible Canvas surface without mixed-language assertions;
- `pnpm --filter @dvt/web test`, relevant Cypress specs,
  `pnpm docs:feature-mechanization:implementation`, and
  `pnpm verify:prepush` pass after the implementation.

```feature-mechanization
version: 1
featureId: CANVAS-VISIBLE-I18N-DEBT-20260508
mechanizationStatus: closed
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/canvas-visible-i18n-debt-plan-20260508.md
componentGuides:
  - docs/architecture/components/web/graph/canvas-authoring-draft-boundary-component.md
  - docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-component.md
userStories:
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-visible-i18n-debt-plan-20260508.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-2-autosave-e2e-proof-plan-20260508.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-visible-i18n-debt-plan-20260508.md
  - docs/planning/index.md
  - docs/planning/proposals/index.md
  - docs/planning/status/**
  - docs/.manifest.json
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - scripts/**
  - specs/**
  - .github/**
commandQueryRails:
  - name: AssessCanvasVisibleI18nDebt
    type: query
    dddOwner: CanvasI18nDebtLedger
  - name: RegisterCanvasVisibleI18nDebt
    type: command
    dddOwner: CanvasI18nDebtLedger
  - name: VerifyCanvasLocaleConsistency
    type: query
    dddOwner: CanvasLocaleConsistencyProof
domainObjects:
  - name: CanvasI18nDebtLedger
    type: architecture debt ledger
    owner: Frontend architecture
  - name: CanvasLocaleConsistencyProof
    type: browser verification read model
    owner: Canvas route
fowlerSignals:
  - Primitive obsession
  - Duplicate semantics
  - Documentation drift
  - Test-only confidence
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
  - id: canvas-visible-i18n-debt-registration
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: New debt document is outside allowedImplementationSurfaces before this manifest exists.
    patchSurfaces:
      - docs/planning/proposals/mandatory/frontend-and-ux/canvas-visible-i18n-debt-plan-20260508.md
      - docs/planning/index.md
      - docs/planning/proposals/index.md
      - docs/planning/status/**
      - docs/.manifest.json
    greenTest: pnpm docs:feature-mechanization:implementation
symbols:
  - name: CanvasVisibleI18nDebtPlan
    path: docs/planning/proposals/mandatory/frontend-and-ux/canvas-visible-i18n-debt-plan-20260508.md
    dddOwner: CanvasI18nDebtLedger
    cqRails:
      - AssessCanvasVisibleI18nDebt
      - RegisterCanvasVisibleI18nDebt
      - VerifyCanvasLocaleConsistency
    fowlerSignals:
      - Primitive obsession
      - Duplicate semantics
      - Documentation drift
      - Test-only confidence
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - debt registration only
    unitTests:
      - pnpm docs:feature-mechanization:implementation
      - pnpm lint:md:changed
```
