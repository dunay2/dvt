---
title: Web Auth Project Onboarding User Stories
status: Review
owner: Frontend / Product Architecture
last_reviewed: 2026-05-23
planning_type: user-stories
task_ids:
  - E-MAND-WEB-AUTH-ONBOARDING-CANON
---

# Web Auth Project Onboarding User Stories

## WAPO-1: Protected Routes Require Identity

As an unauthenticated operator, I want protected product routes to send me to
login so that tenant and project data never render without identity.

Acceptance:

- Opening `/`, `/canvas`, `/plugins`, or `/admin` without a valid session
  resolves through `/login`.
- The return route is preserved.
- No workspace graph draft request occurs before session admission.

## WAPO-2: Runtime Missing Is Not Treated As Login Success

As an operator, I want missing session runtime to show recovery posture so that
the shell does not reveal protected UI behind a broken backend.

Acceptance:

- `/session` returning `404` maps to `runtime_unavailable`.
- `AuthRouteGate` sends the user to login/recovery rather than rendering `Root`.
- The route bootstrap gate can complete because the public recovery route owns
  its own startup posture.

## WAPO-3: Workspace Denial Is Distinct From Authentication Failure

As an authenticated user without workspace grants, I want a specific denied
workspace posture so that I do not retry login for a permission problem.

Acceptance:

- `/workspace/context` denial with `workspace_context_not_granted` renders the
  workspace access required state.
- The UI does not call Canvas authoring or run-start rails.
- The denial remains tenant/project scoped.

## WAPO-4: Stale Browser Scope Cannot Invent Authority

As a security owner, I want persisted browser scope ignored when grants change
so that `localStorage` cannot resurrect deleted or revoked projects.

Acceptance:

- `dvt-web-session` is only a projection cache.
- The selected workspace is replaced with the server effective workspace when
  the persisted scope is absent from grants.
- Negative tests cover revoked tenant, deleted project, and changed environment.

## WAPO-5: Empty Tenant Opens Project Onboarding

As a first-time user, I want an empty tenant to show project onboarding so that
the product starts honestly instead of showing sample graph data.

Acceptance:

- `ListProjects` can return an empty list.
- Empty state does not call `GetWorkspaceGraphDraft`.
- `src_orders`, `model_orders`, and `orders_dashboard` are absent unless an
  explicit demo seed or fixture rail created them.

## WAPO-6: Project Creation Starts With An Empty Canvas

As a data engineer, I want to create a project and then create an empty typed
canvas so that my graph starts from my own resources.

Acceptance:

- `CreateProject` is tenant scoped.
- `GetWorkspaceManifest` returns an honest empty project manifest.
- `CreateCanvas` creates the first canvas without hidden sample nodes.

## WAPO-7: Disabled Actions Are Backlog-Linked

As a product owner, I want unavailable UI actions to name their story,
capability, and backend contract so that incomplete product surfaces are not
hidden behind vague copy.

Acceptance:

- Each disabled action maps to `RegisterDisabledActionGap`.
- Copy avoids "pending backend" as a terminal explanation.
- Negative tests cover missing story, missing capability, and missing contract.

## WAPO-8: Fixture Seed Remains Test/Demo Only

As a maintainer, I want Cypress seed helpers to stay outside product startup so
that tests cannot silently define the user onboarding model.

Acceptance:

- `apps/web/cypress/support/canvasDraftAuthoring.ts` remains the fixture seed
  owner.
- Product startup docs state that fixture nodes are not product seed data.
- Architecture tests fail if clean startup documentation stops naming the
  fixture-node boundary.
