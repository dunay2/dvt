---
title: Web Workspace Gap Report
status: Draft
owner: Architecture / Web
workspace: '@dvt/web'
date: 2026-06-07
last_reviewed: 2026-06-07
planning_type: review
---

# Web Workspace Gap Report

## Workspace

- Workspace key: `web`
- Package: `@dvt/web`
- Path: `apps/web/**`
- Scope source: `tools/ci/scope-config.mjs` and `tools/ci/policy/workflow-scope.json`

## Evidence used

- `apps/web/package.json`
- `docs/architecture/components/web/frontend-mechanical-truth-inventory.md`
- `docs/architecture/components/web/frontend-component-inventory.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/frontend-component-reflection-inventory-plan-20260604.md`
- `docs/planning/status/generated-capability-coverage.md`
- root `package.json`

## Current state summary

`@dvt/web` is not a thin demo surface. It has Vite, React 18, React Router,
TanStack Query, Zustand, React Flow, MUI, Radix, Monaco, Cypress, and a broad
suite taxonomy. The package exposes build, typecheck, lint, unit, presentation,
architecture, canvas, Monaco, shell-session, workspace-services, changed-suite,
CI, and E2E scripts.

The governed frontend inventories are also materially ahead of a normal UI doc:

- `frontend_mechanical_truth_surfaces` records visible surfaces, route state,
  consumed endpoints, stores, queries, no-backend affordances, capability gaps,
  and validation evidence.
- `frontend_components` records component IDs, files, surface links, rails, and
  evidence.
- `ListFrontendComponentReflection` exists as a DB-first planning query rail for
  component reflection.

The real problem is not absence of UI. The problem is product closure: a user can
see many surfaces, but some core workflow actions are still preview, fail-closed,
or missing backend/rail closure.

## What is missing

### W-01 — Real end-to-end workflow authoring closure

The Canvas surface is marked `operational-product`, but its capability gaps still
include creating/testing warehouse connection and execution readiness validation.
The tabs surface remains `preview` and misses save code buffer, update node code
projection, and node execution evidence.

**Why it matters**

DVT must allow a real flow: select source, configure operations, validate,
preview/compile/import plan, run, inspect logs/evidence, and iterate. Route
existence is not enough.

**Required next step**

Create a user-flow closure matrix:

| Flow step | UI surface | Command/query rail | API route | Backend package | Evidence | Gap |
| --- | --- | --- | --- | --- | --- | --- |
| create/select source | Canvas | pending/implemented | source import | api/planner/dsl | Cypress/unit | TBD |
| configure operation | Canvas/tabs | pending/implemented | preview/compile | dsl/planner/verifier | TBD | TBD |
| validate readiness | CanvasToolbar | `ValidateCanvasExecutionReadiness` | TBD | verifier | missing | gap-needed |
| run selected graph | CanvasToolbar | `StartRun` | `/runs` | api/engine/temporal | partial | TBD |
| inspect run | Runs/detail | `GetRunEvents` | `/runs/:id/events` | state-store/api | present | TBD |

### W-02 — Command/query rail closure by UI action

The component inventory shows `CanvasToolbar` uses `PreviewExecutablePlan` and
`StartRun`, but `ValidateCanvasExecutionReadiness` is explicitly `gap-needed`.
Other visible surfaces also have command gaps: workspace scope selection,
template commands, plugin install/enable commands, admin roles/audit, cancel run,
recover run, open run source canvas, list node execution evidence.

**Why it matters**

A button, menu item, palette action, or route tab is externally observable
behavior. It must map to a governed command/query rail rather than local UI
semantics.

**Required next step**

Add a web action inventory grouped by:

- top bar commands
- view/menu commands
- palette commands
- canvas toolbar commands
- node/card/context commands
- run table/detail commands
- plugin/admin commands

Each row must include rail name, rail kind, status, API dependency, authorization
posture, test evidence, and blocker.

### W-03 — Backend dependency posture per surface is incomplete

The mechanical truth inventory names consumed endpoints, but the report still
needs a maturity classifier per endpoint:

- mocked-only
- no-backend affordance
- read-only live
- command live
- command fail-closed
- plugin-dependent
- tenant/RBAC blocked

**Why it matters**

A surface can look complete while its backend dependency is preview, disabled,
or plugin-dependent. This is especially risky for Canvas, Plugins, Admin, Cost,
and Templates.

**Required next step**

Create a backend dependency posture table from consumed endpoints and API route
inventory.

### W-04 — Cypress coverage must be user-story indexed

The frontend has many tests and E2E smoke evidence, but product readiness should
be indexed by user story, not only by package test family.

**Why it matters**

A large test count can hide missing flows. The product question is whether a user
can complete the workflow, not whether technical surfaces render.

**Required next step**

Map Cypress specs and important unit tests to user stories:

- first source import
- first transform
- first plan preview
- first execution
- first run inspection
- first error recovery
- first plugin-disabled path

### W-05 — Frontend component inventory is intentionally partial

The component inventory currently names a narrow set of shell/workbench/canvas
components. Its maintenance rules explicitly forbid symbol, port, data-contract,
and dependency rows until the AST validation slice exists.

**Why it matters**

The current DB-first component reflection is a useful planning read model, but it
is not yet a complete implementation inventory. It should not be used to claim
all frontend components are modeled.

**Required next step**

Implement the AST validation slice separately and then expand the inventory with:

- exported symbols
- application ports
- adapter/data dependencies
- route ownership
- test ownership
- command/query consumers

### W-06 — Admin and governance screens remain fail-closed/preview

`web.admin` is `disabled-unsupported`. Plugins, templates, cost, and canvas tabs
carry preview posture. That is correct governance, but it means product closure
is not complete.

**Why it matters**

DVT can expose operational shells without pretending they are finished, but the
product roadmap must clearly separate usable MVP flow from visible future shells.

**Required next step**

Produce a product-readiness split:

- MVP flow surfaces that must be closed now
- preview surfaces that can remain visible but clearly constrained
- disabled/fail-closed surfaces that must not appear as shipped features

## Fowler/DDD diagnosis

### Smells

- **Feature envy in UI**: visible UI can start encoding workflow semantics unless
  every action is forced through a command/query rail.
- **Illusory completeness**: route exists + tests pass can be mistaken for flow
  closure.
- **Parallel read models**: Zustand, TanStack Query, planning DB, docs, and API
  responses can all describe capability posture differently.
- **Shotgun validation**: a real Canvas change touches web, API, DSL, planner,
  verifier, contracts, tests, docs, and planning DB.

### Boundary posture

`@dvt/web` should own presentation, local interaction state, and routing. It must
not own workflow semantics, backend capabilities, execution readiness, or access
policy. Those belong to governed command/query rails, API contracts, planner,
verifier, engine, state-store, and authorization services.

## Recommended remediation order

1. **W-01:** Create the end-to-end workflow authoring closure matrix.
2. **W-02:** Complete command/query rail mapping for every visible action.
3. **W-03:** Add backend dependency posture per surface.
4. **W-04:** Re-index Cypress coverage by user story.
5. **W-06:** Split MVP/preview/fail-closed surfaces.
6. **W-05:** Expand component reflection only after AST validation exists.

## Candidate validation commands

```bash
pnpm --filter @dvt/web typecheck
pnpm --filter @dvt/web lint
pnpm --filter @dvt/web test:ci
pnpm --filter @dvt/web build
pnpm --filter @dvt/web test:changed
pnpm --filter @dvt/web test:e2e:native -- --spec "cypress/e2e/shell/startup-route-readiness.cy.ts,cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts,cypress/e2e/runs/runs-runtime-contract.cy.ts"
pnpm planning:db:query frontend-surfaces --limit 20
pnpm planning:db:query frontend-components --limit 20
pnpm verify:prepush
```

## Closeout

This report does not modify UI behavior. It identifies the gap between visible
frontend surfaces and product-closed workflow capability. The next slice should
be a concrete workflow closure matrix for source -> transform -> plan -> run ->
evidence.
