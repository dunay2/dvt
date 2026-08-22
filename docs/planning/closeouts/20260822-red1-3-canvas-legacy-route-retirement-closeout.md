---
title: RED1.3 Canvas Legacy Route Retirement Closeout
status: Accepted
owner: Frontend / Canvas / Architecture
last_reviewed: 2026-08-22
planning_type: closeout
task_ids:
  - GH-2591
---

# RED1.3 Canvas Legacy Route Retirement Closeout

## Think-First Analysis

### Problem summary

Canvas still registered an exhausted `/canvas/*` compatibility route that
translated historical peer-workbench URLs into a one-shot `canvasIntent`
query parameter. The redirect, resolver, handler, feedback copy, propagated
request type, and compatibility-only tests preserved a second navigation
protocol after `/canvas` and contextual workbench commands had become the
canonical authorities.

### Root cause

The contextual Canvas convergence retired peer routes but intentionally kept a
temporary migration adapter. Once supported callers and an independent
compatibility lifecycle disappeared, the adapter remained as speculative
generality and a middle man across routing, route state, shell props, effects,
copy, and tests.

### Constraints and invariants

- `/canvas` remains the only Canvas route authority.
- Project Code remains a contextual Canvas command and continues to use the
  governed workspace-file rails.
- Column lineage remains a Canvas view/lens command rather than a peer route.
- The retired query rail must be removed with no parallel replacement rail.
- Current Canvas authority binding, persisted drafts, execution, permissions,
  source import, and DBT authoring behavior must remain unchanged.
- ADR-0053 requires structural deletion evidence to converge with generated
  code-state and governance fingerprints.
- ADR-0061 keeps GitHub issue #2591 as task lifecycle authority and the
  Planning DB as architecture/mechanization query authority.

### Options and decision

Keeping the redirect would preserve an ownerless protocol. Replacing it with
another compatibility service would duplicate canonical navigation. The
selected option is a hard deletion: remove the wildcard route and the whole
one-shot intent chain while retaining the already-canonical `/canvas` commands
and workspace-file rails.

The complete diagrams, exact-head evidence, Fowler matrix, allowed surfaces,
rail analysis, and red/green cycles are recorded in the
[RED1.3 implementation plan](../proposals/mandatory/frontend-and-ux/red1-3-canvas-legacy-route-retirement-plan-20260822.md).

## Work And Validation Evidence

### Real work performed

- Deleted `CanvasLegacyWorkbenchRedirect`, `canvasLegacyRouteIntent`, and
  `useCanvasRouteIntentHandler` with their compatibility-only tests.
- Removed the `canvas/*` route, `canvasIntent` query processing, unavailable
  legacy-surface feedback copy, shell request type, handler effect, and prop
  threading through both graph-draft and DBT-project-file Canvas surfaces.
- Retained the canonical `/canvas` Project Code working-tree synchronization
  Cypress flow and removed only the obsolete `/canvas/code` case.
- Reconciled route tests, internal-alpha evidence, architecture expectations,
  route-bootstrap documentation, screen manual, and Canvas command/query
  catalog.
- Marked `ResolveLegacyCanvasRouteIntent` as `retired` in the mechanized plan
  and documented that it has no replacement rail.
- Added `canvasCanonicalRouteAuthority.architecture.test.ts` to reject the
  retired modules, wildcard route, route ID, query token, request type, and
  historical Canvas URLs from production TypeScript.
- Normalized CRLF to LF only while loading the CSS fixture in
  `canvasGraphSearchPresentation.test.ts`; exact selector and token assertions
  remain unchanged.

### Red/green evidence

- Red: the new canonical-route architecture guard failed `2/2` while the
  wildcard route, three compatibility modules, and one-shot protocol existed.
- Green: the same guard passed `2/2` after the hard deletion.
- Red: the full Canvas suite exposed one Windows-only failure because an exact
  multiline CSS assertion compared LF text with a clean CRLF working-tree
  file.
- Green: the isolated CSS presentation suite passed `5/5`, then the complete
  Canvas suite passed `1,289/1,289` across 293 files after input line-ending
  normalization.

### Executed validation

- Focused route/architecture suite — passed `21/21` across three files.
- Focused route and contextual-dialog presentation suite — passed `15/15`.
- Monaco suite — passed `123/123` across 19 files.
- `pnpm --filter @dvt/web test:canvas` — passed `1,289/1,289` across 293 files.
- `pnpm --filter @dvt/web typecheck` — passed.
- `pnpm --filter @dvt/web lint` — passed with zero warnings.
- `pnpm --filter @dvt/web build` — passed; Vite reported only the existing
  large-chunk advisory.
- `pnpm --filter @dvt/web test` initially failed `2/1,458` unit tests because
  ignored local `apps/web/.env.local` supplied `VITE_API_BASE_URL` to tests
  whose contract requires it to be absent. The local file was neither changed
  nor deleted. The isolated API-client suite passed `8/8`, and the complete
  command passed after setting `VITE_API_BASE_URL` to an empty value for that
  process only: unit `1,458/1,458`, presentation passed, architecture
  `308/308`.
- Browser verification against the Cypress preview — loaded meaningful
  bootstrap content, reported `HAS_CONTENT`, and found no Vite/framework error
  overlay.
- `pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/code-workbench-workspace-files.cy.ts`
  — passed `1/1` in headless Electron.
- `pnpm docs:feature-mechanization -- --feature RED1-3-CANVAS-LEGACY-ROUTE-RETIREMENT`
  — passed across 186 manifests.
- `pnpm docs:feature-mechanization:implementation` — passed across 244 Planning
  DB manifests before the final governance refresh.
- `pnpm docs:status:generate` correctly refused the dirty pre-commit tree, then
  passed against committed implementation `a9dfb148e` and regenerated all four
  on-demand status views.

The final governance refresh, ARC classification, committed-tree pre-push
gate, and PR-title validation are executed after this closeout is committed so
the hook-normalized final tree is the validation subject.

### Integration evidence

PR #2537 is still open and draft. It overlaps
`DbtProjectFileCanvasView.tsx`, `canvasShell.types.ts`, and the Canvas test
harness for DBT node-authoring work. RED1.3 removes only the retired
route-intent prop/type path. Integration must preserve #2537's node-authoring
changes while retaining the absence of the retired props and modules.

## Debt And Stub Evidence

No debt entry was created. No redirect, alias, replacement compatibility rail,
stub, fake success path, placeholder, TODO/FIXME marker, disabled rule, relaxed
gate, or unfinished branch was introduced. Hooks and checks remained enabled.
The ignored local environment file was not modified. Existing React `act(...)`,
chart-size, Cypress environment-migration, and Vite chunk-size warnings were
reported rather than converted into hidden scope.
