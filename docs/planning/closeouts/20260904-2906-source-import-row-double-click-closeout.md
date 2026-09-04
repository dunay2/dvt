---
title: Issue 2906 Source Import Row Double-Click Closeout
status: Accepted
date: 2026-09-04
owners:
  - Warehouse Source Import / Web
issue: https://github.com/dunay2/dvt/issues/2906
pull_request: https://github.com/dunay2/dvt/pull/2907
featureId: GH-2906-SOURCE-ROW-DOUBLE-CLICK
---

# Issue 2906 Source Import Row Double-Click Closeout

## Outcome

Double-clicking anywhere on a selectable table row in the Add Source catalog
now toggles that table's existing selection checkbox on or off. A double click
that starts directly on the checkbox performs one net toggle. Single-click
inspection, keyboard checkbox activation, and the non-selectable posture for
unsupported objects remain unchanged.

The implementation delegates to the existing `onToggleSourceObject` callback.
It does not create a second selection state, command, query, or persistence
path.

## Governing sources used

- `AGENTS.md`.
- `docs/planning/status/governance-document-rule-inventory.md`.
- `docs/guides/ai-work-protocol.md`.
- `docs/planning/state/github-mvp-issue-workflow.md`.
- `docs/architecture/command-query-rail-governance.md`.
- `docs/architecture/fowler-opportunity-planning-governance.md`.
- `docs/architecture/components/web/frontend-component-inventory.md`.
- `docs/planning/proposals/mandatory/frontend-and-ux/source-import-row-double-click-plan-20260904.md`.

The Planning DB architecture-design authority was queried before consulting
component documentation. The existing `ImportWarehouseSources` command rail,
owned by `AddSourceDialogPresentation`, governs this presentation interaction.

## Real work performed

- Added the selectable row's double-click boundary to
  `SourceImportObjectCard` and delegated it to the canonical toggle callback.
- Prevented the checkbox's second physical click and stopped its double-click
  propagation so one gesture cannot issue multiple mutations.
- Added controlled presentation coverage for toggle on, toggle off, direct
  checkbox double click, and unsupported objects.
- Updated the existing live warehouse-source Cypress driver to select the row
  by double click and assert its checkbox state.
- Recorded the design, alternatives, diagrams, acceptance, and validation in
  the issue and governed plan.

No API, contract, engine, adapter, database, or persisted model changed.

## Acceptance and evidence

| Acceptance                                          | Evidence                                                                        | Result |
| --------------------------------------------------- | ------------------------------------------------------------------------------- | ------ |
| Entire selectable row toggles on and off            | Controlled presentation test and visible `false -> true -> false` browser proof | Passed |
| Direct checkbox double click toggles once           | Physical click-sequence test and visible browser proof                          | Passed |
| Unsupported object cannot be selected               | Negative presentation assertion                                                 | Passed |
| Inspection and accessible checkbox semantics remain | Existing separation test plus unchanged native checkbox rail                    | Passed |
| Package behavior remains coherent                   | Full Web test command completed with exit code 0                                | Passed |
| Repository gates remain coherent                    | Mechanization, governance refresh, and pre-push completed with exit code 0      | Passed |

## Validation evidence

- `pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts SourceImportCatalogView.test.tsx`
  passed: 1 file and 8 tests. Its initial TDD run failed because the row issued
  zero toggles and the direct checkbox gesture issued two.
- `pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts SourceImportCatalogView.architecture.test.ts`
  passed: 1 file and 3 tests.
- `pnpm --filter @dvt/web lint` passed.
- `pnpm --filter @dvt/web typecheck` passed.
- `pnpm --filter @dvt/web test` passed: 217 files and 971 unit/presentation
  tests, followed by 101 files and 276 architecture tests.
- `pnpm lint:md:changed` passed.
- `pnpm docs:feature-mechanization:implementation` passed against 267
  manifests in the committed-tree run.
- `pnpm governance:refresh` passed and stabilized after two generation passes.
- `pnpm verify:prepush` passed, including changed Web suites, Prettier, ESLint,
  command-catalog checks, and forbidden-file checks.
- Visible Chrome proof used the real local application and live catalog row
  `dvt.core.health_check`; the row changed `false -> true -> false`, while a
  direct checkbox double click changed `false -> true` once.

The Cypress driver was updated but the Cypress scenario was not executed
locally. The equivalent real UI gesture and state transition were exercised in
the visible browser; CI remains responsible for running the committed Cypress
flow.

## Obsolete and rejected behavior

- Selection being available only through the small checkbox is obsolete.
- Duplicating selection state inside the row was rejected.
- Replacing single-click inspection with row selection was rejected.
- A second command or query for the pointer gesture was rejected; the existing
  `ImportWarehouseSources` rail remains authoritative.
- Allowing the two click events and the bubbled double-click event to produce
  multiple toggles was rejected.

## No-debt and no-stub evidence

- No debt entry, TODO, FIXME, placeholder, fake adapter, fake success path, or
  unfinished production branch was introduced.
- No lint, type, test, accessibility, formatting, or architecture rule was
  disabled or relaxed.
- The commit helper ran the pre-commit hook, and the push ran the pre-push hook.
  No hook or check was bypassed.
- PR #2907 is intentionally based on PR #2901 because the latter removes the
  defective post-checkout writer. This is an explicit review dependency, not
  hidden product debt; the functional diff remains scoped to issue #2906.
