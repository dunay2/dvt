# 08. Doc And Code Drift Notes

This page records concrete drift between the live repo and claims that were
easy to make from stale documentation alone.

## 1. `apps/web/package.json` Already Has Governed Package-Level Tests

The frontend package already exposes:

- `test`
- `test:watch`
- `test:e2e`
- `test:e2e:native`
- `typecheck`

Implication:

Documentation should stop describing package-level frontend testing as missing
from the current checkout.

## 2. Runtime Mode Is Still Read Too Early In Some Surfaces

`apps/web/src/app/stores/sessionStore.ts` still imports:

- `getRuntimeDataSourceMode`
- `resolveWorkspaceBootstrapConfig`

and resolves runtime mode at module scope.

`apps/web/src/app/components/TopAppBar.tsx` also resolves workspace bootstrap
at module scope.

Implication:

The frontend has not fully converged on composition-root-only runtime mode
ownership.

## 3. `uiLayoutStore.ts` Still Mixes Layout With Active Tabs

`apps/web/src/app/stores/uiLayoutStore.ts` owns layout concerns such as panel
sizes and focus mode, but it still carries:

- `activeTabs`
- `activeTabId`

Implication:

Layout and workbench-session concerns are still partially coupled.

## 4. The Semantic Theme Exists, But Route-Level Usage Is Partial

`apps/web/src/styles/theme.css` already provides semantic tokens, but live
route surfaces still rely on:

- route-level `slate-*` classes;
- hard-coded hex values;
- local background and border decisions.

Implication:

Token authority exists, but it does not yet fully govern the visual result.

## 5. Some Legacy Frontend Surfaces Still Import Mock Data Directly

`apps/web/src/app/components/GraphCanvas.tsx` still imports:

- `mockNodes`
- `mockExecutionPlan`

Implication:

The repo still contains prototype-era view surfaces that bypass the governed
service boundary and should be isolated from the operator path.

## 6. The Transformation Preview Path Still Uses The Generic Bridge

Current Canvas preview wiring still sends:

- `previewProfile: 'planner-generic-v1'`
- `sourceFamily: 'canvas-canonical-graph'`
- `sourceVersion: 'planner-generic-v1'`

through:

- `apps/web/src/app/views/canvas/useCanvasExecutionActions.ts`
- `apps/web/src/app/views/canvas/previewGraphSource.ts`

Implication:

The live product flow is still bridging through the generic planning profile
instead of the fully frozen transformation contract.

## 7. `PluginsView` Exists, But It Is Not Yet A Full Extension Manager

The route is already useful as a diagnostics and inspection surface, but it is
not yet a productized plugin-management experience with governed readiness,
dock policy, and operator-facing action framing.

## 8. `Code` And `Diff` Remain Transitional In Navigation Posture

This is not a technical bug. It is a product-grammar drift.

With the workbench direction, these surfaces fit better as contextual review
routes than as shell-defining core navigation.

## Summary

The repo is healthier than some older docs suggest, but it still contains clear
areas where architecture intent, UX posture, and live implementation have not
fully converged.
