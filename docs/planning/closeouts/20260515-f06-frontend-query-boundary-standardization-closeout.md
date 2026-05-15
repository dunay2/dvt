---
title: F-06 frontend query boundary standardization closeout
status: Accepted
owner: Web / Architecture
last_reviewed: 2026-05-15
planning_type: closeout
work_item: F-06
---

# F-06 Frontend Query Boundary Standardization Closeout

## Scope Closed

F-06 closes the TanStack Query ownership normalization for governed web
surfaces: health, workspace, runtime, and selected operator views and plugin
panels.

The canonical boundary remains:

- query hooks own query key, query function, and cache policy;
- views consume hooks and derive presentation state;
- direct `@tanstack/react-query` ownership is prevented in guarded operator
  surfaces.

## Governing Sources

- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/frontend-query-boundary-component.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/f06-frontend-query-boundary-standardization-plan-20260514.md`

## Evidence Surfaces

- `apps/web/src/app/queries/queryKeyPolicy.architecture.test.ts`
- `apps/web/src/app/queries/workspaceQueries.ts`
- `apps/web/src/app/queries/runsQueries.ts`
- `apps/web/src/capabilities/platform-health/presentation/usePlatformHealthSnapshotQuery.ts`
- `apps/web/src/capabilities/runtime-capabilities/presentation/useRuntimeCapabilitiesQuery.ts`
- `buzon/20260514-codex-fowler-f06-query-boundary-analysis.md`

## Validation Evidence

Executed on 2026-05-15:

- `pnpm --filter @dvt/web test -- queryKeyPolicy.architecture.test.ts useRunWorkspace.test.tsx useArtifactsViewModel.test.tsx AdminView.test.tsx`
- `pnpm --filter @dvt/web typecheck`
- `pnpm --filter @dvt/web test`

All commands passed.

## Residual Notes

- Existing React test warnings (`act(...)`) are pre-existing runtime-test noise
  in Canvas-heavy suites and do not indicate a failing F-06 boundary.
- F-06 closure does not claim mutation-policy redesign beyond the current query
  ownership boundary.
