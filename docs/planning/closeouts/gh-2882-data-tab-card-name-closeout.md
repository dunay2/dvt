---
slice: GH-2882
date: 2026-09-03
last_reviewed: 2026-09-03
issue: 2882
author: Codex
---

# Closeout: GH-2882 — name the data tab after its canvas card

## Governing sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/github-mvp-issue-workflow.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-tabs-placement-design-plan-20260503.md`

Planning DB returned `reuse-existing-rail` for `ListCanvasWorkbenchTabs` and
`CanvasWorkbenchTabsReadModel`. This slice changes that presentation projection; it does not add
a command, query, service, or parallel tab model.

## Think-First analysis

- **Problem:** requesting a card's data renders the generic tab label and the sample row count as
  `Data 20` or `Datos 20`, so the active object's identity is lost.
- **Root cause:** `OperationalDrawerDataSample` already carries the card's `nodeName`, but
  `buildCanvasOperationalDrawerContribution` ignores it when projecting the tab and instead
  assigns `sample.rows.length` to the tab counter.
- **Constraints:** keep the existing data-sample query and operational-drawer read model; preserve
  localized idle copy; do not duplicate selected-node state; do not change sample contents.
- **Selected option:** when a sample is loading, ready, or failed, project its `nodeName` as the
  data tab label and leave that tab's counter empty. The idle tab remains localized as Data/Datos.
- **Rejected alternatives:** concatenating the name and row count retains the confusing second
  identity; deriving the name inside the tab renderer duplicates domain knowledge; introducing a
  dynamic-tab store creates another authority.
- **Fowler opportunity:** remove duplicate semantics from the presentation model and use the
  existing data-sample discriminated union as the single source of selected-card identity.

## Pre-Implementation brief

- **Mode:** Slim bug fix.
- **Scope:** Canvas operational-drawer projection and its behavioral tests.
- **Expected outcome:** the active data tab is named exactly after the card that requested data,
  regardless of sample size; changing cards changes the tab name.
- **Risk and mitigation:** idle state has no card identity, so it keeps the localized generic label;
  loading, success, and error states are covered to prevent stale or success-only behavior.
- **Out of scope:** source sampling, table rendering, other drawer tabs, and multi-document tabs.
- **Libraries:** none evaluated; no custom infrastructure is needed.
- **Validation plan:** focused Vitest, web typecheck, web lint, visible browser proof, and
  `pnpm verify:prepush` after the final commit.
