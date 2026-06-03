---
title: TF-E2-E-A/B/C Selected-Closure Browser Proof Closeout
status: Accepted
date: 2026-04-24
owners:
  - Frontend
  - Architecture
---

# TF-E2-E-A/B/C Selected-Closure Browser Proof Closeout

## Summary

`TF-E2-E-A`, `TF-E2-E-B`, and `TF-E2-E-C` are now closed.

The selected-closure browser lane now proves three things that were previously
only implied or partially covered:

1. preview and run stay scoped to the selected closure inside a larger canvas
2. preview fails closed with explicit re-plan guidance for
   `dependency_gap`, `selected_node_missing`, and `cycle_detected`
3. start-run fails closed with explicit re-plan guidance for
   `graph_source_selection_mismatch`, while stale persisted proof remains
   blocked in the same browser lane

`TF-E2-E-D` remains open. This closeout does not claim a live protected-runtime
lane with no authoring-contract intercepts.

## Governing sources

- [TF-E2-E selected-closure UX proof stories 2026-04-23](../proposals/mandatory/frontend-and-ux/tf-e2-e-selected-closure-ux-proof-stories-20260423.md)
- [Canvas execution selection component](../../architecture/components/web/graph/canvas-execution-selection-component.md)
- [Workspace authoring draft aggregate](../../architecture/components/planner/workspace-authoring-draft-aggregate.md)
- [Executable-subgraph resolution component](../../../apps/api/docs/executable-subgraph-resolution-component.md)
- [AI work protocol](../../guides/ai-work-protocol.md)

## Real work performed

- Extended the browser proof in
  [canvas-preview-run-persisted.cy.ts](../../apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts)
  to cover:
  - selected closure inside a larger canvas with loose-node exclusion
  - preview rejection for `dependency_gap`
  - preview rejection for `selected_node_missing`
  - preview rejection for `cycle_detected`
  - protected start-run rejection for `graph_source_selection_mismatch`
- Hardened the web service layer so protected runtime rejection envelopes are
  normalized in:
  - [protectedRuntimeRejection.ts](../../apps/web/src/app/services/api/protectedRuntimeRejection.ts)
  - [plansService.api.ts](../../apps/web/src/app/services/plans/plansService.api.ts)
  - [runsService.api.ts](../../apps/web/src/app/services/runs/runsService.api.ts)
- Added red-green service proof in:
  - [plansService.test.ts](../../apps/web/src/app/services/plans/plansService.test.ts)
  - [runsService.test.ts](../../apps/web/src/app/services/runs/runsService.test.ts)
- Kept the selected-closure browser lane on the governed Cypress support kit:
  - [e2eApiStub.ts](../../apps/web/cypress/support/e2eApiStub.ts)
  - [canvasDraftAuthoring.ts](../../apps/web/cypress/support/canvasDraftAuthoring.ts)
  - [workspaceSession.ts](../../apps/web/cypress/support/workspaceSession.ts)

## Fowler reading

- `canvasRunSelection.ts` remains the narrow selection seam. It did not absorb
  planner rejection vocabulary.
- Protected runtime rejection normalization now sits in service adapters, which
  is the right place for transport-envelope interpretation.
- The Cypress spec proves route-visible posture rather than inflating controller
  or hook seams into transport-owned integration stories.

## Validation

- `pnpm --filter @dvt/web test -- src/app/services/plans/plansService.test.ts src/app/services/runs/runsService.test.ts`
- `pnpm --filter @dvt/web build:e2e`
- `docker run --rm -t -v "F:/segundodvt/dvt:/repo" -w /repo/apps/web -e CYPRESS_baseUrl=http://host.docker.internal:4173 cypress/included:13.17.0 --project /repo/apps/web --config-file /repo/apps/web/cypress.config.ts --spec /repo/apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts`

## Outcome

The selected-closure browser lane is now explicit for the intercepted proof
family. The remaining route under `TF-E2-E` is `TF-E2-E-D`: one live protected
runtime browser lane with no authoring-contract intercepts.
