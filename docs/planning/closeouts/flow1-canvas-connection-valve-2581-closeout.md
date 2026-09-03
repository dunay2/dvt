---
slice: FLOW1-CANVAS-CONNECTION-VALVE-2581
date: 2026-09-03
last_reviewed: 2026-09-03
issue: 2581
author: Codex
---

# Closeout: low-noise Canvas connection valve

## Governing sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/graph/canvas-authoring-draft-boundary-component.md`
- `docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-edge-execution-gate-plan-20260902.md`
- `docs/adr/ADR-0000-Code-generation-with-normative-traceability-required.en.md`

Planning DB returned `reuse-existing-rail` for `AuthorCanvasGraphEdge`. The slice therefore
uses the existing edge command runner and draft save rail; it introduces no parallel mutation.

## Work performed

- Projected persisted and structural execution truth into one typed edge presentation model.
- Rendered closed dependencies with reduced emphasis, a dashed stroke and a centered,
  non-interactive gate glyph while retaining direction and selection cues.
- Added localized close/open actions to the existing edge context surface.
- Routed the action through `AuthorCanvasGraphEdge` and the existing autosaved draft aggregate.
- Proved close, revision confirmation, reload, reopen and reload in a real Cypress browser flow.
- Removed two redundant JSDOM suites that fabricated `contextmenu` events; presenter, view,
  keyboard and browser behavior coverage remain.

## Validation evidence

| Command                                                                                          | Result               |
| ------------------------------------------------------------------------------------------------ | -------------------- |
| `pnpm --filter @dvt/web exec cypress run ... canvas-connection-valve.cy.ts`                      | PASS — 1/1           |
| `pnpm --filter @dvt/web exec vitest run --config vitest.canvas.config.ts --silent`               | PASS — 1507/1507     |
| `pnpm --filter @dvt/web typecheck`                                                               | PASS                 |
| `pnpm --filter @dvt/web lint`                                                                    | PASS                 |
| `pnpm docs:feature-mechanization:implementation -- --feature FLOW1-CANVAS-CONNECTION-VALVE-2581` | PASS — 254 manifests |
| `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`                                 | PASS — ARC-0         |

The repository-wide `pnpm verify:prepush` runs after the closeout commit, so hooks first
normalize the final tree as required by repository governance.

## Debt and stubs

No debt entry, stub, placeholder, fake adapter, duplicate store, alternate edge type, direct
metadata mutation, disabled rule, relaxed check or bypassed hook was introduced. No contract,
engine, planner, adapter or API surface changed, so ARC evidence and risk records are not required.
