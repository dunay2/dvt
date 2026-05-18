---
title: F-16 Dense Operational Tables Closeout
status: Accepted
owner: Web / Architecture
date: 2026-05-18
planning_type: closeout
---

# F-16 Dense Operational Tables Closeout

## Scope

F-16 replaced legacy card-based Runs operational scanning with dense table
presentation models and TanStack Table renderers.

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/ux-implementation-guide.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/f16-dense-operational-tables-plan-20260518.md`

## Work Performed

- Added `runOperationalTableModel.ts` for run row, filter, sort, and URL state.
- Added `RunOperationalTable.tsx` for `/runs` dense rows.
- Added `runEventTableModel.ts` and `RunEventTimelineTable.tsx` for dense
  runtime event chronology.
- Removed legacy `RunTimelineEventCard.tsx`.
- Added TDD tests for models, list view, route detail timeline, and semantic
  architecture guard.
- Updated Runs component docs, timeline docs, user stories, and the F-16 Fowler
  analysis in `buzon/`.

## Validation Evidence

Commands run before closeout:

```text
pnpm docs:feature-mechanization -- --feature F16-DENSE-OPERATIONAL-TABLES-20260518
pnpm --filter @dvt/web test -- src/app/views/runs/runOperationalTableModel.test.ts src/app/views/runs/runEventTableModel.test.ts src/app/views/runs/RunListStateView.test.tsx src/app/views/RunsView.test.tsx src/app/views/runs/RunStates.test.tsx src/app/views/runs/runsDomainBoundary.architecture.test.ts
pnpm --filter @dvt/web typecheck
```

All commands above passed after the red/green cycle.

## No-Debt Evidence

- No debt entry was added.
- No rules, lint, tests, hooks, or CI checks were disabled.
- No `--no-verify` or equivalent bypass was used.
- No backend command/query rail was introduced; existing `listRunSummaries` and
  `listRunEvents` query rails remain authoritative.

## No-Stub Evidence

- No stubs, placeholders, fake adapters, fake success paths, TODOs, or unfinished
  branches were added.
- TanStack Table is used only as a renderer primitive; DVT-owned row semantics
  live in local presentation models and tests.

## Residual Posture

ADR not required: this slice implements existing UX, Fowler, and command/query
governance without changing runtime contracts, adapters, or persistence
boundaries.
