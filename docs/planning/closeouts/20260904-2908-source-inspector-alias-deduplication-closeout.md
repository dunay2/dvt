---
title: Issue 2908 Source Inspector Alias Deduplication Closeout
status: Accepted
date: 2026-09-04
owners:
  - Web / Canvas Node Properties
issue: https://github.com/dunay2/dvt/issues/2908
pull_request: https://github.com/dunay2/dvt/pull/2910
featureId: GH-2908-SOURCE-INSPECTOR-ALIAS-DEDUPLICATION
---

# Issue 2908 Source Inspector Alias Deduplication Closeout

## Think-First reconciliation

The Source General section presented one transient `draft.alias` twice: once
as a read-only fact in the identity summary and once as the authoritative
editable Alias field. The state and command rail were not duplicated. The fix
therefore removes only the read-only presentation and preserves the editable
field, validation, persistence, and qualified source identity.

The combined Cypress authoring scenario also referenced the obsolete label
`PostgreSQL connection`. It now uses the current visible contract,
`Connection`, and reaches the Source Alias assertion and complete Source
roundtrip. A later, independent Sink-pane clipping failure is recorded in
issue #2909 rather than hidden or expanded into this slice.

## Governing sources used

- `AGENTS.md`.
- `docs/planning/status/governance-document-rule-inventory.md`.
- `docs/planning/state/github-mvp-issue-workflow.md`.
- `docs/guides/ai-work-protocol.md`.
- `docs/architecture/command-query-rail-governance.md`.
- `docs/architecture/fowler-opportunity-planning-governance.md`.
- `docs/adr/ADR-0060-dbt-project-authoring-authority.md`.
- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-properties-authoring-roundtrip-plan-20260812.md`.
- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-inspector-plugin-authoring-fields-plan-20260604.md`.
- `docs/planning/proposals/mandatory/frontend-and-ux/source-inspector-alias-deduplication-plan-20260904.md`.

The Planning DB architecture-design authority was queried before consulting
the component plans. The existing `InspectCanvasNode` query and
`ConfigureCanvasDvtNode` command remain the governing rails; no parallel
operation was added.

## Real work performed

- Removed the read-only Alias row from
  `DvtSourceAuthoringSection.tsx`.
- Added a presentation assertion requiring exactly one Alias label while
  retaining the editable value and update assertion.
- Strengthened the existing Cypress Source flow with the same uniqueness
  assertion and replaced its obsolete connection label.
- Added the governed plan, current/solution diagrams, rationale, mechanization
  manifest, and this closeout.
- Opened issue #2909 for the independent Sink visibility defect discovered by
  the combined Cypress flow.

No API, contract, engine, planner, adapter, persistence, or Alias-generation
behavior changed.

## Acceptance and evidence

| Acceptance                                | Evidence                                                                              | Result                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------- |
| Alias is presented once                   | TDD presentation test first failed with two labels, then passed 10/10                 | Passed                     |
| Alias editing remains functional          | Existing input value and draft-update assertions pass                                 | Passed                     |
| Source identity remains visible           | Qualified target, Connection, Schema, and Table assertions pass                       | Passed                     |
| Real imported Source is correct           | Visible `auth_audit_events` inspection counted one exact Alias label                  | Passed                     |
| Source browser flow is covered            | Cypress reached the single-Alias, Apply, Cancel, reopen, and persistence assertions   | Passed                     |
| Combined Source-to-Sink scenario is green | Later Sink Schema label is clipped; tracked in #2909                                  | Blocked outside this slice |
| Web regression baseline is green          | Unit suite 273 files / 1,591 tests; changed presentation and architecture guards pass | Passed                     |
| Repository gates are green                | Lint, type-check, mechanization, governance refresh, and `pnpm verify:prepush` pass   | Passed                     |

## Validation closeout

- `pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts DvtAuthoringFields.test.tsx`:
  passed 10/10 after the expected red result of two Alias labels.
- `pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts CanvasNodeWorkbenchDraftController.architecture.test.ts`:
  passed 1/1.
- `pnpm --filter @dvt/web lint`: passed.
- `pnpm --filter @dvt/web typecheck`: passed.
- `pnpm --filter @dvt/web test`: passed 273 unit files / 1,591 unit
  tests, 217 presentation files / 969 presentation tests, and 101
  architecture files / 276 architecture tests.
- Isolated Cypress Source-to-Sink scenario: Source assertions passed; the run
  ended 0/1 at the later Sink clipping assertion documented in #2909.
- `pnpm lint:md:changed`: passed.
- `pnpm docs:feature-mechanization:implementation`: passed.
- `pnpm governance:refresh`: passed and stabilized after two passes.
- `pnpm verify:prepush`: passed.

## Obsolete and rejected behavior

- The second read-only Alias presentation is removed.
- The Cypress-only `PostgreSQL connection` name is removed in favor of the
  current user-visible `Connection` label.
- Removing the editable Alias field was rejected because it is the command
  authoring authority.
- Renaming the duplicate row was rejected because it would retain two visual
  authorities for one value.

## No-debt and no-stub evidence

- No debt entry, TODO, FIXME, placeholder, fake adapter, fake success path, or
  unfinished production branch was added.
- The independent Sink problem has a real GitHub issue, #2909, rather than a
  hidden skipped assertion.
- No lint, type, test, quality, hook, or governance rule was disabled or
  relaxed.
- No hook or check was bypassed. The commit helper ran pre-commit formatting,
  ESLint, and determinism checks.
