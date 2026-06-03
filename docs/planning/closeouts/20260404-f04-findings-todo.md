---
title: F-04 Pending Findings Todo
status: Accepted
owner: Frontend / Architecture / QA
last_reviewed: 2026-05-14
planning_type: closeout
---

# F-04 Pending Findings Todo

## Scope

Pending findings from:

- `docs/planning/reviews/architecture-and-governance/20260404-f04-frontend-data-boundary-hard-qa-review.md`

## Checklist

- [x] `F04-QA-01` Make sliced stores authoritative and shrink `appStore` adapter surface
- [x] `F04-QA-02` Remove non-composition `resolveDataSource()` calls
- [x] `F04-QA-03` Migrate inline query keys to `queryKeys.ts`
- [x] `F04-QA-04` Add architecture fitness tests (imports + query-key policy)
- [x] `F04-QA-05` Remove malformed comment encoding and `any` from `appStore`
- [x] `F04-QA-06` Publish closeout evidence and deprecation retirement map

## Rationale

The objective is to close only actionable QA findings in severity order while preserving behavior and keeping governance checks green.

## Execution Notes

- `F04-QA-01` started: `Root`, `RunsView`, `CostView`, and `Console` now read from sliced stores instead of `useAppStore`.
- `F04-QA-01` closed: `TopAppBar` and `useCanvasStoreFacade` moved to sliced stores; `useAppStore(...)` runtime usages removed from `apps/web/src`.
- `F04-QA-02` closed: mode resolution moved to composition-root ownership with runtime mode propagation.
- `F04-QA-04` closed: architecture guards now enforce no inline query keys, no direct runtime imports of `stores/appStore`, and composition-root ownership of `resolveDataSource()`.
- `F04-QA-06` closed: closeout evidence published plus deprecation retirement map and dedicated technical/user manuals.

## Definition Of Done

- All checklist items are either completed (`[x]`) or explicitly deferred with reason.
- Web scope validations pass:
  - `pnpm --filter @dvt/web typecheck`
  - `pnpm --filter @dvt/web test`
  - `pnpm --filter @dvt/web build`
  - `pnpm verify:prepush`
- Documentation indexes are synced after adding this artifact:
  - `pnpm docs:sync`
