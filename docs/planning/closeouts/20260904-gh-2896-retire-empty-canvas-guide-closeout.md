---
title: GH-2896 Retire Empty Canvas Guide Closeout
status: Accepted
owner: web
last_reviewed: 2026-09-04
planning_type: closeout
---

# GH-2896 Retire Empty Canvas Guide Closeout

## Outcome

[#2896](https://github.com/dunay2/dvt/issues/2896) retires the passive empty-Canvas
guide. A persisted empty Canvas now exposes its normal graph viewport and the
existing toolbar and contextual authoring commands without an obstructing
onboarding card.

## Governing Sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/planning/state/github-mvp-issue-workflow.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/components/web/frontend-command-query-rail-inventory.md`
- `docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md`
- `docs/architecture/components/web/graph/canvas-empty-authoring-entrypoint-component.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-empty-guide-preference-plan-20260602.md`

## Rail Decision

The change removes duplicate presentation from the `GetWorkspaceGraphDraft`
read projection. It does not introduce a command or query rail. Existing
`CreateCanvasAuthoringNode`, source-import, graph-admission, and first-document
creation commands remain authoritative.

## Work Performed

- Removed the typed-empty onboarding card and its overlay rendering path.
- Removed the persisted `canvasEmptyStateGuideVisible` preference and its
  Canvas-settings toggle.
- Removed plugin `emptyState` copy and contract fields that only supported the
  retired card.
- Simplified typed-empty host-cycle state to preserve the canonical Canvas
  document while allowing the graph viewport to render.
- Updated route, unit, architecture, and Cypress assertions to require an
  unobstructed empty viewport and retained authoring commands.
- Marked the former empty-guide design and closeout as superseded historical
  evidence.

## Validation Evidence

- `pnpm docs:feature-mechanization -- --feature CANVAS-EMPTY-GUIDE-PREFERENCE-20260602` - passed.
- `pnpm --filter @dvt/web typecheck` - passed.
- `pnpm --filter @dvt/web lint` - passed.
- Focused Canvas presentation tests - passed: 5 files / 18 tests.
- Focused Canvas unit tests - passed: 5 files / 26 tests.
- Focused Canvas architecture tests - passed: 4 files / 21 tests.
- `pnpm --filter @dvt/web test:ci` - passed: 216 files / 965 tests and 101 files / 273 architecture tests.
- `pnpm --filter @dvt/web build` - passed.
- Visible-browser smoke check - passed: the running Canvas loaded its graph
  viewport and retained the contextual `Propiedades del canvas` command.
- Runtime instance check - passed: one listener on port 5173 and one listener
  on port 3000.

The historical feature-scoped implementation check is not a valid closeout
gate after the feature manifest is closed. It also evaluates the stacked
[#2895](https://github.com/dunay2/dvt/issues/2895) delta against `origin/main`.
Its failure is recorded in #2896 rather than misrepresented as product
validation.

## No-Debt And No-Stub Evidence

- No debt entry was introduced or required.
- No lint, type, test, quality, or hook rule was disabled or relaxed.
- No check was bypassed.
- No stub, placeholder, fake adapter, fake success path, TODO, or unfinished
  branch was added.
