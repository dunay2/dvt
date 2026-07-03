# Web State, Health, And Direction Update

Date: 2026-07-03
Scope: `apps/web/**` and web-governing documentation only.
Status: Review intake / non-canonical update until imported into the Planning DB or promoted into the governed web docs.

## Governing sources read

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/architecture/components/web/index.md`
- `docs/architecture/components/web/frontend-command-query-rail-inventory.md`
- `docs/architecture/components/web/frontend-component-inventory.md`
- `docs/architecture/components/web/frontend-mechanical-truth-inventory.md`
- `docs/architecture/components/web/ux-implementation-guide.md`
- `docs/architecture/components/web/workbench-ux-canon-component.md`
- `docs/architecture/components/web/graph/index.md`
- `docs/architecture/components/web/graph/graph-frontend-architecture.md`
- `docs/architecture/components/web/graph/graph-canvas-runtime-model.md`
- `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`
- `docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md`
- `docs/architecture/components/web/runs/frontend-runtime-contract-technical-manual.md`
- `docs/planning/status/canonical-doc-code-matrix.md`
- `docs/architecture/system-delivery-status.md`
- `apps/web/package.json`
- Representative current web sources under `apps/web/src/**`
- Representative current web tests and Cypress references under `apps/web/**`
- Recent merged web PRs: `#1882`, `#1881`, `#1880`, `#1878`-`#1868`
- Open web or product-hardening issues discovered through GitHub search: `#158`, `#18`, `#168`, `#161`, `#162`, `#163`, `#174`, `#175`

## Current state

The web application is real product code, not a prototype. The canonical web component states that the active web documentation root is `docs/architecture/components/web/**`, that the previous frontend tree is historical/archive context, and that current remaining work is service-boundary tightening, removal of mock-heavy paths, and route-level alignment with protected backend contracts.

The repository-wide `System Delivery Status` still classifies `apps/web` as `Partial`. The delivered posture includes Canvas, explicit transformation authoring, persisted-preview gating, run-detail evidence rendering, package tests, typecheck coverage, and a Cypress E2E runtime-contract lane. The missing posture is broader backend-backed coverage and hardening of the operator workflow.

Recent merged PRs moved the frontend forward in product-facing areas:

- `#1882 feat(web): Propagate warehouse source byte-size metadata` added warehouse source byte-size metadata through source import and graph-card projections.
- `#1881 feat(web): Use warehouse connection identity in source cards` made imported source identity visible through warehouse connection type and name.
- `#1880 feat(web): Enable canvas node freeze from toolbar` converted the previous unavailable freeze affordance into a real UI-local command with persisted frozen node IDs.
- The `#187x` and `#186x` sequence continued DB-first ownership, graph node card composition, visual-token convergence, node-card width stabilization, and interaction hardening.

## Health assessment

| Area | Health | Evidence | Notes |
| --- | --- | --- | --- |
| Governance | Strong | `AGENTS.md`, governance inventory, C&Q rail inventory, Fowler governance | Strong anti-hallucination rails. Any follow-up must keep docs, tests, Planning DB, and code aligned. |
| Canvas shell | Good / RC | `Canvas.tsx`, `CanvasShell.tsx`, `CanvasModalHost.tsx`, `useCanvasController.ts` | Composition is explicit and policy-driven. Remaining risk is backend-backed proof and operational readiness clarity. |
| Graph authoring | Good / RC | `useCanvasAuthoringRuntime.ts`, `useCanvasGraphHandlers.ts`, `useCanvasMutationHandlers.ts` | Draft/session/selection/persistence seams are real. Continue with user-flow hardening, not aesthetic refactors. |
| Node cards | Good / RC | `GraphNodeCardView.tsx`, graph leaf components, recent PRs | Card composition is now DB-first and tokenized. Continue only where semantic metadata or UX truth is missing. |
| Source import | Partial / RC for Postgres path | `SourceImportWizard.tsx`, `useSourceImportWizard.ts`, `workspacePorts.api.ts`, PRs `#1881`, `#1882` | Stronger than before, but still has important evidence and capability gaps listed below. |
| Runs | Partial | `runsService.api.ts`, runs ports, runtime contract manual | Run list/detail/read flow exists. Cancel/recover and source-canvas navigation are not mature from web perspective. |
| Plugins | Partial | `registry.ts`, `dbtContributions.ts`, `dvtContributions.ts` | Registry is broad and useful, but risks responsibility overload if more unrelated route/card/source behavior accumulates. |
| Cypress / E2E | Partial | package scripts and Cypress references | E2E lanes exist, but the main commercial proof must be backend-backed and non-mock. |
| Accessibility | Partial | Tests exist around specific components; issue `#168` tracks broader work | Needs systematic web-wide a11y hardening. |
| Performance | Partial | issue `#158` and frontend performance tracking | 50k-node and large-workspace behavior remain open concerns. |

## Direction

The next direction should be product-maturity hardening around one operator flow, not additional visual micro-polish.

Target flow:

```text
Postgres source import
  -> source cards with truthful connection/table/byte metadata
  -> workspace graph draft persisted
  -> plan preview persisted as PlanRef
  -> start run gated by readiness
  -> run detail with evidence
  -> navigation back to source canvas / affected node
```

This direction respects the current repository rules:

- no fake success paths;
- no UI that promises unsupported capabilities;
- externally visible behavior through command/query rails;
- docs/code/tests/Planning DB alignment;
- negative tests for fail-closed states;
- Cypress or equivalent user-flow proof for user-visible behavior.

## Highest-priority gaps

### Critical

1. **Source import byte-size preservation must be verified end-to-end.**
   - Recent code introduces `WarehouseTable.byteSize` and PR `#1882` claims propagation.
   - The web wizard/import path must prove that `byteSize` is preserved from listed tables into `importSources` payloads and imported graph-card metadata.
   - Required PR: `fix(web): Preserve warehouse byte-size metadata during source import`.

2. **Backend-backed commercial proof is missing as the main maturity gate.**
   - The repo has Cypress lanes, but the product-health question must be answered by one live/protected flow with minimal mocking.
   - Required PR: `test(web): Add backend-backed source preview run proof`.

3. **Execution readiness is not yet explicit enough for operators.**
   - The Canvas has preview/run gating, but the user must see what blocks execution, why, and what fixes it.
   - Required PR: `feat(web): Add canvas execution readiness query`.

### High

4. **Create/test warehouse connection UX is not clearly mature.**
   - Web ports expose source import capability, and backend rails exist, but a visible governed UX for creating/testing a connection needs proof.
   - Required PR: `feat(web): Add governed warehouse connection creation flow`.

5. **Run detail lacks mature operational commands from the web perspective.**
   - Add or explicitly mark out of scope: cancel, recover, source canvas navigation, run evidence drill-down.
   - Required PRs: `feat(web): Add run cancel command to run workbench`, `feat(web): Add recover run command to run detail`.

6. **Mock-heavy paths remain a canonical web-component risk.**
   - The web component says mock-heavy paths still need removal or tightening.
   - Required PR: `refactor(web): Classify and isolate demo-only frontend mocks`.

7. **Plugin registry risks responsibility overload.**
   - The registry owns routes, cards, source import options, graph visuals, run surfaces, and admin/plugin shell contributions.
   - Required PR: `refactor(web): Split plugin registry projection families`.

### Medium

8. **Canvas route/tab posture should be reconciled against the current UX canon.**
   - Route inventory and user decisions around Canvas/code/log/popups must stay aligned.
   - Required PR: `docs(web): Reconcile canvas workbench route posture`.

9. **Source import unsupported warehouse capabilities need clearer UI truth.**
   - Product UI must not imply Snowflake/BigQuery/Redshift support unless the full path exists.
   - Required PR: `fix(web): Show explicit unsupported warehouse adapter posture`.

10. **A11y/performance hardening is still tracked as product debt.**
    - Issue `#168` covers observability, accessibility, and performance; issue `#158` covers large graph performance.
    - Required PRs should be scoped to one component family or one measured scenario at a time.

## Recommended PR backlog

| Priority | PR title | Goal | Primary surfaces | Required validation |
| --- | --- | --- | --- | --- |
| 1 | `fix(web): Preserve warehouse byte-size metadata during source import` | Prove `byteSize` survives list -> selection -> import -> graph card | Source import wizard/model, workspace ports, graph node read model | Targeted web unit/presentation tests, API/web typecheck, lint, Planning DB migration test |
| 2 | `test(web): Add backend-backed source preview run proof` | Demonstrate the commercial source-import to run-detail flow | Cypress, live protected runtime support, Canvas, plans/runs services | Backend-backed Cypress/live command, web typecheck, lint |
| 3 | `feat(web): Add canvas execution readiness query` | Show precise run blockers and remediation actions | Canvas execution model, runtime policy, shell banners | Unit tests, presentation tests, negative tests |
| 4 | `feat(web): Add governed warehouse connection creation flow` | Let user create/test a Postgres connection without fake credentials | Source import wizard, workspace ports, service adapter | Unit, presentation, route/service tests where applicable |
| 5 | `feat(web): Add run cancel command to run workbench` | Add visible cancel command only if backend rail is available | Run detail/workbench, runs port/service | Positive and negative command tests |
| 6 | `feat(web): Add recover run command to run detail` | Add recover action with fail-closed unavailable posture | Run detail/workbench, runs port/service | Positive and negative command tests |
| 7 | `feat(web): Link run detail evidence to source canvas` | Move from run evidence to affected source/node | Runs views, Canvas navigation, graph projection | User-flow test plus unit mapping tests |
| 8 | `refactor(web): Split plugin registry projection families` | Reduce registry responsibility overload without changing behavior | Plugin registry and contribution types | Architecture tests and registry tests |
| 9 | `docs(web): Reconcile frontend rail and component source-import posture` | Align docs, C&Q inventory, component inventory, and current implementation | Web docs and Planning DB surfaces | docs sync/governance refresh/prepush locally |
| 10 | `test(web): Add canvas large-graph interaction budget` | Start measurable graph performance guard | Canvas viewport/model/performance harness | Performance-focused test or benchmark artifact |

## AI continuation checklist

Before any agent touches `apps/web/**`:

- Read `AGENTS.md` and the governance inventory first.
- Identify the web component doc or command/query rail that owns the change.
- Identify the DDD/frontend owner: command, query, projection, presentation component, or policy.
- Check whether the behavior is user-visible. If yes, add a user-flow or presentation test.
- Check whether a mock, fixture, local state, or plugin contribution is defining product truth. If yes, either remove it or label it demo/test-only.
- Do not create a new action if an existing rail already owns the intent.
- Do not make UI show unsupported capabilities as available.
- Keep Planning DB migrations, component inventory, command/query inventory, tests, and docs aligned.
- Run targeted tests plus `pnpm --filter @dvt/web typecheck`, `pnpm --filter @dvt/web lint`, and `pnpm verify:prepush` before claiming closure.
- If validation cannot be run, mark the PR as review intake and do not claim complete closure.

## Validation note for this update

This update was created through the GitHub connector as a review-intake document under `buzon/`.

Validation not run from the connector:

- `pnpm docs:sync`
- `pnpm governance:refresh`
- `pnpm --filter @dvt/web test`
- `pnpm --filter @dvt/web typecheck`
- `pnpm --filter @dvt/web lint`
- `pnpm verify:prepush`

Reason: the connector can read and write GitHub files but does not execute the repository's local Node/pnpm validation environment. The PR must not be treated as cleanly complete until a local/CI validation closeout is added.
