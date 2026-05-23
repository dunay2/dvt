---
title: Fowler analysis for web auth and project onboarding canon
status: Accepted
date: 2026-05-23
owner: Codex
task_ids:
  - E-MAND-WEB-AUTH-ONBOARDING-CANON
---

# Fowler Analysis: Web Auth And Project Onboarding

## Context

The accepted proposal defines a mature product posture: identity first, then
tenant/project scope, then workspace and Canvas. The current branch already
contains a public `/login`, `AuthRouteGate`, and server-owned
`/session` plus `/workspace/context` resolution, so the highest-value slice is
not another route. The useful work is to canonize the semantic boundary and make
future regressions mechanically visible.

## Fowler View

- Application Service: `resolveProtectedRouteSessionContext` coordinates
  session, workspace context, permission projection, and scope projection.
- Gateway: `createApiClient` remains the transport boundary for authenticated
  runtime calls.
- Presentation Model: `sessionStore` and `authorizationStore` are browser
  projections, not domain authority.
- Domain Model: the proposal names the future aggregates and policies for
  `GrantSet`, `SelectedScope`, `Project`, `WorkspaceManifest`,
  `WorkspaceGraphDraft`, and `DemoSeedPolicy`.
- Anti-Corruption Layer: API DTOs and Cypress fixtures must map into product
  vocabulary instead of becoming product vocabulary.

## Comparison With Mature Systems

Mature SaaS products separate login, authorization, workspace selection, and
project creation. They also keep demo content behind explicit sample/demo
switches. This repository is moving toward that model: protected routes now
resolve server context before rendering, but project onboarding is still mostly
specified rather than implemented as a full UI journey.

## Improved Patterns

- Route protection now sits above product shell rendering.
- Session and workspace context are separate rails.
- Browser persistence is documented as projection, reducing authority drift.
- Canvas authoring remains downstream of workspace admission.

## Anti-patterns

- Generic route components can still absorb too much orchestration if future
  project onboarding lands directly in `routes.ts`.
- Cypress seed helpers can be mistaken for product startup truth because they
  carry realistic node names.
- The proposal is broad enough to invite a large-bang implementation unless
  future slices stay vertical.
- Capability-gap copy can drift if disabled actions do not require story,
  capability, and contract metadata.

## Grouping Opportunities

- `apps/web/src/app/bootstrap/**`: session admission and public recovery.
- `apps/web/src/app/services/session/**`: session/workspace context
  application-service boundary.
- Future `apps/web/src/app/services/project-onboarding/**`: project catalog,
  creation, and empty workspace manifest.
- Future `apps/web/src/app/views/project-onboarding/**`: route-independent
  project onboarding UI.
- Future `apps/web/src/app/capabilities/**`: disabled-action gap registry and
  copy governance.

## Repetitions

- The proposal, app shell docs, effective workspace docs, and protected route
  gate docs all describe the same `localStorage is projection` rule. The new
  component doc centralizes that rule for onboarding and links it to tests.
- Fixture-node warnings appear across Canvas docs and Cypress support. The new
  component doc names the product boundary so future implementation can reuse
  one phrase.

## Drift

- Historical finding: the proposal says no `/login` route existed. Current code
  now has `/login`.
- Implementation drift: project onboarding remains a planned route/UI, not yet
  a completed user journey.
- Documentation drift: several docs mention auth and workspace context, but no
  local component page owned the combined identity-scope-project transition.

## Opportunities And Lessons

- Keep each future slice vertical: one rail, one policy, one route/view state,
  and one Cypress proof.
- Add semantic architecture tests whenever a proposal is canonized; barrel
  thinness alone would not catch fixture-as-product regressions.
- Treat browser state as cache/projection by default.
- Require demo seed to be explicit and named in the rail catalog.

## Applied Pattern In This Slice

This slice applies a semantic architecture guard and a local component guide.
It does not add a fake onboarding view or stub backend route. The next code
slice should implement real project catalog/onboarding behavior behind the
existing command/query rail.
