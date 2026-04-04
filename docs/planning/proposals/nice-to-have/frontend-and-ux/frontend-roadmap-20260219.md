---
title: Frontend Roadmap - Prototype To Operational UI
status: Active
owner: Product / UX / Frontend
last_reviewed: 2026-04-03
planning_type: proposal
---

# Frontend Roadmap - Prototype To Operational UI

## Context

The execution of this roadmap is tracked in
[Agent Lane E](../../../state/agent-lane-e.yaml)
(`docs/planning/state/agent-lane-e.yaml`).
Lane E tasks (`MVP-E1`, `F-01` through `F-21`) are the canonical work units.
This document captures the convergence sequence and the architectural rationale
behind those tasks.
The dedicated F-04 boundary pack is tracked here:
[F-04 Frontend Data-Boundary Hexagonal Convergence Plan](f-04-frontend-data-boundary-hexagonal-convergence-plan-20260403.md).

Original analysis: 2026-02-19. Updated to reflect active state: 2026-04-03.

---

## Diagnosis

### Frontend reality today

`apps/web` is no longer just a visual prototype, but it is not yet an
operational frontend either.

What is already real:

- platform health uses a typed capability boundary backed by the real API;
- TanStack Query is already present in the shell and several views;
- the active canvas path runs through `Canvas.tsx`, `CanvasShell`, and
  `useCanvasController`.

What is still drifting:

- mock-backed services still shape large parts of the UI surface;
- `appStore` still mixes shell, canvas, run, and permission state;
- active route consumers still need broader read-model convergence beyond the
  new `F-07` snapshot/timeline baseline;
- `GraphCanvas.tsx` still exists as a dead legacy path;
- detailed frontend docs still contain target-state-only wording, stale route
  claims, and encoding drift;
- local frontend test files exist, but there is still no governed `test`
  script or dedicated CI lane for `@dvt/web`.

State: partially operational, architecturally inconsistent. The main problem is
not visual completeness anymore. It is convergence on one truthful runtime,
state, and documentation model.

---

## Guiding Principle

Move from "many visible views" to "one operational frontend whose contracts,
state boundaries, and docs match the real backend surface".

The sequence must be reality-first:

1. freeze the frontend contract baseline before feature wiring grows further;
2. finish mock-versus-API, state, and query boundary cleanup in the current UI;
3. deliver the real Plan -> Run -> Monitor flow on top of those boundaries;
4. only then expand secondary views and tighten frontend validation coverage.

---

## Convergence Phases

### Phase 0 - Contract truth and shell truth

- `MVP-E1`: write the frontend-facing backend contract baseline the UI is
  actually allowed to rely on.
- `F-03`: finish real degraded or offline health visibility in the shell.
- `F-07`: remove the current `/runs` versus `/runs/start` drift and align
  runtime DTOs to the protected route set using Fowler read-model composition
  with no legacy frontend aggregate in active route consumers.

`F-07` execution order is fixed:

1. docs-first baseline (technical manual + user manual + convergence plan);
2. TDD red phase for route and error behavior;
3. service alignment and consumer updates;
4. refactor and verification for handoff to `F-08..F-11`.

Canonical `F-07` baseline pack:

- [Frontend Fowler Implementation Pattern](../../../../architecture/frontend/frontend-fowler-implementation-pattern.md)
- [Frontend Runtime Contract Technical Manual](../../../../architecture/frontend/runs/frontend-runtime-contract-technical-manual.md)
- [Frontend Runtime Contract User Manual](../../../../architecture/frontend/runs/frontend-runtime-contract-user-manual.md)
- [F-07 Frontend Runtime Contract Baseline Plan](../../mandatory/runtime-and-contracts/f-07-frontend-runtime-contract-baseline-plan-20260404.md)

Canonical `MVP-E1` contract artifact:

- [Frontend-Facing Backend MVP Contract (MVP-E1)](../../../../architecture/frontend/runs/frontend-backend-mvp-contract.md)

### Phase 1 - Data and state convergence

- `F-04`: finish the `VITE_DATA_SOURCE` boundary so views stop owning mode
  decisions.
- `F-04` implementation and task decomposition are defined in the F-04
  convergence plan document.
- `F-05`: finish store decomposition so shell, graph, run, and status concerns
  stop leaking through `appStore`.
- `F-06`: standardize TanStack Query keys, mutation ownership, and invalidation
  rules across existing views.
- `F-12`: remove the legacy `GraphCanvas` path so the graph stack is singular.

### Phase 2 - Core runtime flow

- `F-08`: integrate Plan -> Run through the governed runtime contract.
- `F-09`: make RunsView operational on real list and detail data.
- `F-10`: converge the event timeline and console on real run events.

### Phase 3 - Surface expansion and hardening

- `F-01`: simplify the shell once the data and state boundaries are cleaner.
- `F-11`: activate Artifacts, Diff, and Level-C surfaces progressively behind
  real contracts and feature flags.
- `F-13`: keep frontend docs aligned with the real code and route posture.
- `F-14`: add a governed frontend test command and CI lane.
- `F-15`: formalize the workbench UX contract so the product converges on a
  stable VS Code-like shell grammar.
- `F-16`: move dense operational views to TanStack Table where card layouts stop
  scaling.
- `F-17`: adopt Monaco as an embedded review and generation surface for Diff,
  Artifacts, and Templates.
- `F-18`: converge the shell console and run-log story, using xterm.js only if
  terminal-grade streaming is truly required.
- `F-19`: formalize the `Marquez` visual direction for open-data and
  explanatory public-data surfaces.
- `F-20`: maintain per-screen user manuals and user stories as the UX
  acceptance baseline for the main workbenches.
- `F-21`: add a governed execution-template and source-generation workbench for
  provider-facing artifacts such as Snowflake tasks, procedures, and ETL
  scaffolds.

### Monaco adoption mini-roadmap

This slice is not a shell rewrite.

The governing decision is:

- keep the persistent shell and route-level workbenches;
- keep Canvas and Runs non-Monaco-centric;
- use Monaco only as an embedded read-only or diff surface where text-heavy
  review justifies it.

Execution order:

1. stabilize data and query boundaries through `F-04`, `F-05`, and `F-06`;
2. adopt Monaco in `Diff`;
3. adopt Monaco in `Artifacts`;
4. adopt Monaco in `Templates`;
5. add lazy loading and bundle guardrails;
6. converge Monaco panes on real backend contracts and artifact truth.

This sequence deliberately places Monaco after the current boundary cleanup and
before broader `F-21` generation hardening. `F-17` provides preview and diff
infrastructure to `F-21`; it does not own the route shell or the workbench
topology.

---

## Architectural Decisions

### Store decomposition

The target remains domain-scoped stores, but the work is now framed as
convergence from the current mixed surface instead of greenfield introduction:

- `shellStore` - layout, panels, focus, navigation;
- `sessionStore` - tenant, project, environment, git ref;
- `graphStore` - nodes, edges, selection;
- `runStore` - current plan, current run, event timeline;
- `statusStore` - backend health, connectivity, retry state.

### Data layer

TanStack Query is already installed. The real roadmap item is standardization:

- stable query keys by domain;
- mutations owned by service or capability boundaries instead of view-local
  orchestration;
- predictable invalidation for health, workspace, run, and operator surfaces.

### Data source separation

`VITE_DATA_SOURCE=mock|api` controls the data layer. Views never import mock
data directly; they consume `app/services/*` and typed view models. Mock mode
must remain usable for development and demos without letting mock behavior leak
into view composition.

### Service layer

```text
View -> useQuery/useMutation (TanStack Query)
     -> app/services/<domain>-service.ts
     -> app/services/platform-client.ts
     -> real API
```

No direct `fetch` calls in components.

### Workbench UX direction

The frontend should feel closer to a workbench than to a set of unrelated
dashboards:

- persistent shell;
- icon-first navigation;
- route-level primary surface;
- optional side panels;
- optional bottom drawer;
- dense operator views where needed;
- governed source-generation surfaces instead of ad hoc boilerplate editing;
- mature editor and diff primitives instead of bespoke viewers.

The shell grammar stays route-first:

- Canvas is the graph authoring workbench;
- Runs is the operational monitoring workbench;
- Diff and Artifacts are review workbenches;
- Templates is the future source-generation workbench.

Monaco supports review and generation inside those routes. It does not replace
the shell and it does not become the center of Canvas.

For open-data or public-data slices, the visual direction should not simply copy
the operator workbench. That slice should use the named `Marquez` theme:
editorial, curated, and explanatory, while still reusing the governed shell and
component stack where it makes sense. In this frontend context, `Marquez` names
the design direction, not the OpenLineage backend product.

That direction is now documented in:

- [Main Workspace Views And UX](../../../../architecture/frontend/main-workspace-views-and-ux.md)
- [Screen Manuals And User Stories](../../../../architecture/frontend/screen-manuals-and-user-stories.md)
- [UX Implementation Guide](../../../../architecture/frontend/ux-implementation-guide.md)
- [Library And Open-Source Reference Stack](../../../../architecture/frontend/library-and-open-source-reference-stack.md)

### Source generation direction

The frontend should not stop at graph authoring and artifact inspection. It
also needs a governed source-generation surface that lets users move from
workflow intent to executable scaffolding.

That surface should:

- start from templates and provider profiles rather than empty editors;
- support artifacts such as Snowflake tasks, procedures, and ETL scaffolds;
- preview and diff generated source through the same governed Monaco surface
  used by `Diff` and `Artifacts`;
- keep generation semantics in backend contracts and services, not in view-local
  string assembly.

---

## Contract Rule

Until `MVP-E1` and `F-07` are complete, the frontend must not treat a route as
authoritative just because a view or service currently calls it.

The protected runtime route map under `apps/api` is the implementation anchor,
but the UI still needs its own frontend-facing contract artifact that records:

- the routes the UI is allowed to rely on today;
- the request or response DTOs consumed by the UI;
- auth assumptions and known out-of-scope behavior;
- the difference between currently available routes and planned routes.

---

## Success Criteria

1. The UI contract for runtime work is explicit and matches the protected API
   routes the backend actually exposes.
2. The UI always reflects real backend state.
3. Store and query boundaries are explicit enough that the shell no longer acts
   as a god object.
4. A user can complete the main flow (Plan -> Run -> Monitor) without mock
   data.
5. Level-C views remain opt-in and contract-gated.
6. Frontend docs and validation commands describe the shipped behavior instead
   of a target-only architecture.
7. Execution-template and source-generation UX is modeled as a governed
   workbench slice instead of being left implicit in artifact viewers.

---

## Related Files

- [Agent Lane E](../../../state/agent-lane-e.yaml) - execution tracking
- [Frontend Architecture](../../../../architecture/frontend/index.md)
- [UI / Visualization Domain](../../../../architecture/domain-ui.md)
- [`apps/web/src/`](../../../../../apps/web/src/) - frontend source
- [`apps/api/`](../../../../../apps/api/) - backend source
