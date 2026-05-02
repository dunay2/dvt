---
title: TF-E2-M-C First Authoring Live Proof Closeout
status: Accepted
date: 2026-05-02
owners:
  - Frontend
  - Architecture
planning_type: closeout
---

# TF-E2-M-C First Authoring Live Proof Closeout

## Summary

`TF-E2-M-C` is closed.

The Canvas first-authoring path now has a mandatory live proof for the operator
journey that matters most: open `/canvas` against the protected runtime, create
the first typed canvas, add the first node, drag it from the governed handle,
persist through the authoritative draft boundary, reload, and restore the graph
plus route-local layout.

The closeout also repairs the planning drift found in the Fowler QA review: the
code and Cypress proof were already present, but the lane still described the
slice as implementation-open.

## Governing Sources

- [TF-E2-M-C implementation plan](../proposals/mandatory/frontend-and-ux/tf-e2-m-c-first-canvas-first-node-live-proof-implementation-plan-20260501.md)
- [Canvas first authoring live proof component](../../architecture/components/web/graph/canvas-first-authoring-live-proof-component.md)
- [Canvas startup and draft recovery user stories](../../architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md)
- [Canvas layout persistence component](../../architecture/components/web/graph/canvas-layout-persistence-component.md)
- [TF-E2-M-C Fowler hard QA review](../reviews/architecture-and-governance/20260501-tf-e2-m-c-fowler-hard-qa-review.md)
- [Command and query rail governance](../../architecture/command-query-rail-governance.md)
- [Fowler opportunity planning governance](../../architecture/fowler-opportunity-planning-governance.md)

## Real Work Verified

- `canvasFirstAuthoringLiveProof.ts` owns the pure closed proof model.
- `canvasFirstAuthoringLiveProof.test.ts` covers positive and negative proof
  states.
- `canvas-first-authoring-live.cy.ts` proves both `transformation` and `dbt`
  variants through browser UI.
- `canvasFirstAuthoring.ts` keeps protected draft reads and route-local layout
  assertions in named Cypress support helpers.
- `run-canvas-first-authoring-live-proof.cjs` boots the mandatory live proof
  runner and fails instead of accepting zero executed proof tests.
- `canvasStartupAndDraftRecovery.architecture.test.ts` guards semantic
  ownership, no draft endpoint intercepts, and no direct draft seeding before
  the UI flow.

## Fowler Reading

- Walking skeleton: the proof crosses browser, route, protected draft API,
  local layout projection, reload, and restore.
- SRP: proof state, Cypress protected-runtime support, layout persistence, and
  route rendering remain separate concerns.
- DDD: the slice is bound to `WorkspaceGraphDraft`, `CanvasDocument`,
  `CanvasAuthoringGraph`, `CanvasNodeDraft`, and `CanvasLayoutProjection`.
- Hexagonal boundary: the route consumes existing command/query rails instead
  of inventing a local persistence authority.
- Mature-system check: Cypress does not use `cy.intercept()` for
  `/workspace/graph/draft` and does not issue a direct `PUT` before the UI
  create command.

## Validation

- `pnpm docs:feature-mechanization:tf-e2-m-c`
- `pnpm --filter @dvt/web test -- canvasFirstAuthoringLiveProof.test.ts`
- `pnpm --filter @dvt/web test -- canvasStartupAndDraftRecovery.architecture.test.ts`
- `pnpm --filter @dvt/web test -- canvasHostCycleState.test.ts canvasCreateCanvasDocumentCommand.test.ts`
- `pnpm --filter @dvt/web test -- useCanvasController.core.test.tsx useCanvasController.persistence.test.tsx`
- `pnpm --filter @dvt/web test -- useCanvasNodeChangeHandlers.test.tsx useCanvasViewportGraphModel.test.tsx CanvasViewport.test.tsx canvasInteractionStore.test.ts`
- `pnpm --filter dvt-api test -- app.test.ts`
- `pnpm --filter @dvt/web test:e2e:first-authoring:live`

The live Cypress proof executed two passing scenarios and zero skipped tests:
first transformation canvas/node and first dbt canvas/node.

## Debt And Stub Check

- No stubs, placeholders, fake adapters, or TODO/FIXME markers were introduced.
- No direct database cleanup or direct draft seeding was used as success proof.
- No lint, type, test, docs, Cypress, or hook rule was disabled or relaxed.
- No new debt entry is required because this closeout changes planning truth and
  records already passing implementation evidence.

## Outcome

The operator-visible first-authoring path is now proven through the mandatory
protected-runtime browser lane. Remaining `TF-E2-M` work should move to denied
draft posture (`TF-E2-M-B`) and any additional startup diagnostics, not reopen
first-canvas or first-node creation.
