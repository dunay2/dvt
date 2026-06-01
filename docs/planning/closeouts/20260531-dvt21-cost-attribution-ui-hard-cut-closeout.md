---
title: DVT-21/2 Cost Attribution UI Hard-Cut Closeout
status: Draft
owner: Web / Product / Architecture
date: 2026-05-31
last_reviewed: 2026-05-31
planning_type: closeout
---

# DVT-21/2 Cost Attribution UI Hard-Cut Closeout

## Summary

This closeout records the first implementation pass for `DVT-21/2`, which hard-cuts
the Cost route away from local graph-node monetary inference and toward the protected
runtime query rail `GetCostAttributionSummary`.

The branch is open as draft PR `#1401` because executable validation still needs to run
through CI or a local checkout. The implementation is not presented as merge-ready until
those gates are green.

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/cost-attribution-model-plan-20260524.md`
- `docs/architecture/components/api/cost-attribution-summary-component.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/dvt-21-2-cost-attribution-ui-hard-cut-plan-20260531.md`

## Implemented Work

### Planning and Fowler analysis

Added:

- `docs/planning/proposals/mandatory/frontend-and-ux/dvt-21-2-cost-attribution-ui-hard-cut-plan-20260531.md`

The proposal records:

- Phase 0 existing-material check.
- Think-first analysis.
- Root cause.
- Reused command/query rail: `GetCostAttributionSummary`.
- Current-state and target Mermaid flows.
- Fowler opportunity matrix.
- Allowed and forbidden implementation surfaces.
- Red/green cycle plan.
- Feature-mechanization manifest.

### Web port and API adapter

Added:

- `apps/web/src/app/ports/cost.ts`
- `apps/web/src/app/services/cost/costApiDecoders.ts`
- `apps/web/src/app/services/cost/costService.api.ts`
- `apps/web/src/app/services/cost/costService.api.test.ts`
- `apps/web/src/app/queries/costQueries.ts`

Updated:

- `apps/web/src/app/queries/queryKeys.ts`
- `apps/web/src/app/services/AppServicesContext.tsx`
- `apps/web/src/app/services/composition/appServices.ts`

Result:

- Web now has an explicit `ICostAttributionSummaryPort`.
- The API adapter calls `GET /cost/attribution-summary`.
- The decoder rejects invented monetary totals before provider credit capture exists.
- The app composition root exposes `costAttributionSummaryPort` through the standard service context.

### Cost route and view model

Updated:

- `apps/web/src/app/views/CostView.tsx`
- `apps/web/src/app/views/cost/useCostData.ts`
- `apps/web/src/app/views/cost/costViewModel.ts`
- `apps/web/src/app/views/cost/costViewModel.test.ts`
- `apps/web/src/app/views/cost/copy.ts`
- `apps/web/src/app/views/cost/copy.test.ts`
- `apps/web/src/app/views/cost/CostStatGrid.tsx`
- `apps/web/src/app/views/cost/CostCharts.tsx`
- `apps/web/src/app/views/cost/CostDriverList.tsx`
- `apps/web/src/app/views/cost/CostCoverageCard.tsx`

Result:

- `useCostData` now reads `useCostAttributionSummaryQuery` instead of graph-node cost fields.
- The view model is built from runtime usage facts.
- Monetary capture is explicitly rendered as unavailable.
- The previous local-dollar semantics were removed from the route surfaces.

### Architecture guard

Added:

- `apps/web/src/app/views/cost/costAttributionUi.architecture.test.ts`

The guard checks:

- Cost data flows through the cost attribution query rail.
- Cost route modules do not reintroduce `lastCost`, `averageCostPerRun`, `currentRunCost`, `formatCurrency`, or literal dollar symbols.
- The canvas cost overlay does not read `node.lastCost`.

### Overlay posture

Updated:

- `apps/web/src/app/views/canvas/useCanvasOverlayModel.ts`

Result:

- The cost overlay remains disabled unless real `NodeCostData` exists.
- The route no longer implies monetary heat when only runtime usage facts are available.

## Validation Evidence

Validation commands were not executed in this connector-only implementation pass.

The PR was opened as draft with this status explicitly stated. Required commands remain:

```text
pnpm docs:feature-mechanization -- --feature DVT21-COST-ATTRIBUTION-UI-HARD-CUT-20260531
pnpm --filter @dvt/web test -- src/app/services/cost/costService.api.test.ts src/app/views/cost/costViewModel.test.ts src/app/views/cost/costAttributionUi.architecture.test.ts
pnpm --filter @dvt/web typecheck
pnpm --filter @dvt/web lint
pnpm docs:sync
pnpm docs:status:generate
pnpm docs:feature-mechanization:implementation -- --feature DVT21-COST-ATTRIBUTION-UI-HARD-CUT-20260531
pnpm verify:prepush
```

## Known Integration Status

- PR: `#1401`, draft.
- Branch: `feat/dvt-21-2-cost-attribution-ui-hard-cut`.
- Branch state observed before PR creation: ahead of `main` by 23 commits and behind by 6 commits.
- No backend, contracts, engine, planner, or adapter surfaces were intentionally changed.
- Because commits were created through the GitHub connector, the repository `pnpm commit` helper and local pre-commit hooks were not executed in this pass.

## No-Debt / No-Stub Evidence

No placeholder adapter was added. The web side now contains a real port, API adapter,
decoder, query hook, view model, and tests.

Residual risk is validation risk, not intentional product debt:

- The branch must be updated against current `main`.
- The required validation commands must run before the PR can be moved out of draft.
- Docs generated indexes may require refresh because this closeout and the proposal add documentation files.

## Acceptance Status

Not merge-ready yet.

The feature implementation pass is materially complete, but repository validation has
not been executed in the connector-only environment. The PR remains draft until CI or a
local checkout proves the required gates.
