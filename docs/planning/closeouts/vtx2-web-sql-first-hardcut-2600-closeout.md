---
slice: VTX2-WEB-SQL-FIRST-HARDCUT-2600
date: 2026-09-03
last_reviewed: 2026-09-03
issue: 2600
author: Codex
---

# Closeout: Web SQL-first execution admission hard cut

## Scope

This closeout covers only execution-order step 1 of issue #2600. The issue remains open for
the later VTX1 authoring/compiler, contract, runtime-step and residual-document deletion slices.

## Governing sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md`
- `docs/architecture/components/web/graph/graph-frontend-architecture.md`
- `docs/architecture/components/web/graph/canvas-plan-run-readiness-component.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/vtx2-web-sql-first-hardcut-plan-20260903.md`

Planning DB returned reuse of `ValidateCanvasTransformationRun` and rejected a parallel preview
rail. The cut therefore changes the existing DVT runtime registration and consumes the existing
fail-closed Canvas policy.

## Work performed

- Registered canonical DVT `transformation` authoring as `not_executable`.
- Kept graph mutation, Inspector editing, source import and node-kind admission available.
- Removed selection-for-execution, Preview and Run from the visible Transform behavior.
- Added registry, policy and browser behavior proof without adding another guard or service.
- Updated active architecture so it no longer claims SQL-first execution is current behavior.

## Validation evidence

| Command                                                                        | Result                       |
| ------------------------------------------------------------------------------ | ---------------------------- |
| focused registry and runtime-policy Vitest                                     | PASS — 23/23                 |
| focused Cypress `canvas-preview-run-authoring.cy.ts`                           | PASS — 4/4                   |
| `pnpm --filter @dvt/web lint`                                                  | PASS                         |
| `pnpm --filter @dvt/web typecheck`                                             | PASS                         |
| `pnpm --filter @dvt/web test`                                                  | PASS — 533 files, 2963 tests |
| `pnpm docs:feature-mechanization -- --feature VTX2-WEB-SQL-FIRST-HARDCUT-2600` | PASS                         |
| `pnpm governance:refresh`                                                      | PASS — stable in 2 passes    |
| `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`               | PASS — ARC-0                 |

The repository-wide `pnpm verify:prepush` runs after the closeout commit so the final tree is
hook-normalized first, as required by repository governance.

## Debt and stubs

No debt entry, stub, placeholder, fake adapter, compatibility alias, duplicate execution rail,
feature flag, disabled rule, relaxed check or bypassed hook was introduced. Contracts, planner,
engine, API and adapters were not changed in this slice; ARC evidence and risk records are not
required.
