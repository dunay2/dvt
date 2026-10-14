---
title: Shell Workspace Context Component
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-05-06
planning_type: architecture
---

# Shell Workspace Context Component

## Purpose

Shell workspace context is the App Shell component that presents the active
tenant, project, environment, deployment adapter, and draft-scope posture
without allowing the main screen to change workspace ownership.

It is a shell-owned Presentation Model boundary. It projects existing session
scope into read-only identity labels and read-only context details. Project
changes belong to a separate governed project-selection screen, not to the App
Shell top bar or Canvas workbench.

## Owned Concern

The component owns shell presentation of workspace scope.

It does not own tenant switching, project selection, environment switching,
authorization, grants, project persistence, protected draft authority, Canvas
graph state, Git operations, or route-local workbench commands.

## Public API

| API                              | Kind                | Rail                           | Contract                                                                                     |
| -------------------------------- | ------------------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| `ProjectIdentityBadge`           | read model          | `GetEffectiveWorkspaceContext` | Carries active tenant, project, environment, deployment adapter, compact id, slug, and draft |
| `ProjectIdentityBadgeInput`      | query input         | `GetEffectiveWorkspaceContext` | Supplies session ids and bootstrap option labels                                             |
| `buildProjectIdentityBadge`      | projection function | `GetEffectiveWorkspaceContext` | Resolves labels and preserves raw ids when labels are unavailable                            |
| `ShellProjectIdentityBadge`      | passive view        | `GetEffectiveWorkspaceContext` | Renders breadcrumb-style identity labels with no mutation affordance                         |
| `ShellWorkspaceContextMenu`      | details UI          | shell context display          | Opens read-only workspace context details                                                    |
| `ShellWorkspaceContextDetails`   | passive view        | shell context display          | Displays tenant, project, environment, and deployment adapter without mutation controls      |
| `TopAppBar.architecture.test.ts` | semantic fitness    | semantic posture proof         | Guards ownership, docs, invariants, and read-only posture                                    |

The browser posture proof is the Canvas-first shell composition check.

## Invariants

- workspace context is breadcrumb-style read-only content on the main screen;
- the persistent top bar renders a read-only identity badge;
- the persistent top bar does not render tenant, project, or environment
  comboboxes;
- `ShellWorkspaceContextMenu` does not render tenant, project, or environment
  comboboxes;
- tenant, project, environment, and deployment adapter scope are read-only
  inside an active project context;
- project changes belong to a separate governed project-selection screen;
- `ProjectIdentityBadge` may display fallback ids, but must not fabricate
  unavailable labels or grants;
- the component must not introduce new auth, RBAC, tenant-admin, Git, save,
  export, import, environment-selection, project-selection, or protected draft
  semantics.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> SessionScope
  SessionScope --> IdentityProjection: buildProjectIdentityBadge
  IdentityProjection --> BadgeVisible: render ShellProjectIdentityBadge
  BadgeVisible --> ContextMenuClosed: context details hidden
  ContextMenuClosed --> ContextMenuOpen: user opens Context
  ContextMenuOpen --> ReadOnlyDetails: show tenant/project/environment
  ReadOnlyDetails --> ContextMenuClosed: close Context
```

## Consumers

| Consumer                        | Consumption rule                                                              |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `ShellTopBar`                   | Composes badge, context details, Git ref, health, and global shell menus      |
| `Root.shellChrome.test.support` | Verifies rendered shell posture from the mounted root shell                   |
| Canvas workbench                | Reads session scope through route-owned queries and controllers               |
| Runs and other routes           | React through existing session-aware data loading, not through this component |
| Cypress Stage 1 posture proof   | Verifies badge, no comboboxes, and read-only context details                  |
| F-28-A feature mechanization    | Tracks the public API, rails, Fowler signals, and closeout commands           |

## Component Flow

```mermaid
flowchart LR
  Store["sessionStore scope ids"] --> Input["ProjectIdentityBadgeInput"]
  Bootstrap["WorkspaceBootstrapConfig"] --> Input
  Input --> Projection["buildProjectIdentityBadge"]
  Projection --> Badge["ShellProjectIdentityBadge"]
  Projection --> Menu["ShellWorkspaceContextMenu"]
  Menu --> Details["ShellWorkspaceContextDetails"]
  Details --> Fields["tenant / project / environment / deployment adapter read-only fields"]
```

## Boundary Map

```mermaid
flowchart TB
  subgraph Shell["Web shell presentation"]
    BadgeModel["ProjectIdentityBadge"]
    BadgeView["ShellProjectIdentityBadge"]
    Menu["ShellWorkspaceContextMenu"]
    Details["ShellWorkspaceContextDetails"]
  end

  subgraph OutOfScope["Explicitly out of scope"]
    Tenant["tenant switching"]
    Project["project selection screen"]
    Environment["environment switching"]
    Auth["Auth and RBAC"]
    Draft["Protected draft API"]
    Git["Git command surface"]
    Persistence["Save / export / import"]
  end

  BadgeModel --> BadgeView
  BadgeView --> Menu
  Menu --> Details
  Shell -. "must not own" .-> OutOfScope
```

## Semantic Fitness Function

The architecture guard in
[`TopAppBar.architecture.test.ts`](../../../../../apps/web/src/app/components/TopAppBar.architecture.test.ts)
checks more than import shape. It validates:

- each module declares its owned concern;
- the top bar composes the read model, badge, and context details;
- no shell workspace context module imports selector primitives;
- no shell workspace context module dispatches tenant, project, or environment
  mutation commands;
- tenant, project, and environment scope stay read-only inside an active
  project context;
- local component docs, user stories, and mailbox analysis exist;
- API, invariants, transitions, consumers, and diagrams stay documented.

The browser posture proof in
[`canvas-workbench-screen-composition.cy.ts`](../../../../../apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts)
then checks the rendered Canvas-first shell behavior from the user surface.

## Drift Guard

Changes to this component must update this guide, the user-story guide, the
F-28-A manifest, and the architecture guard in the same PR when they alter:

- public API shape;
- command/query rail ownership;
- visible top-bar context behavior;
- read-only detail behavior;
- fallback or unavailable-state copy;
- any consumer listed above.

<a id="section-shell-workspace-context-user-stories"></a>

## Shell Workspace Context User Stories

### Purpose

These stories define the expected user-visible behavior for the App Shell
workspace context component.

They complement
[Shell Workspace Context Component](shell-workspace-context-component.md) and
keep Stage 1 acceptance tied to scenarios instead of only file structure.

### Scenario Matrix

| Scenario | User intent                         | Expected behavior                                               | Guard                 |
| -------- | ----------------------------------- | --------------------------------------------------------------- | --------------------- |
| S1       | Confirm current workspace           | Top bar shows breadcrumb-style project identity and environment | Unit, Cypress         |
| S2       | Avoid accidental scope switching    | Tenant/project/environment controls are hidden from top bar     | Unit, architecture    |
| S3       | Verify tenant context               | Context menu shows tenant as read-only content                  | Architecture, Cypress |
| S4       | Verify project context              | Context menu shows project as read-only content                 | Architecture, Cypress |
| S5       | Verify environment context          | Context menu shows environment as read-only content             | Architecture, Cypress |
| S6       | Work with unavailable option labels | Badge displays raw ids instead of inventing labels or grants    | Unit                  |
| S7       | Keep Git reference passive          | Git ref remains read-only and separate from workspace context   | Architecture          |
| S8       | Preserve route authority            | Canvas/Runs read session scope through existing route queries   | Regression tests      |

### User Stories

#### US-SWC-1: Read Current Workspace

As an operator, I want the persistent shell to show the active project and
environment as breadcrumb-style context so I can stay oriented while working in
Canvas.

Acceptance:

- given a selected tenant, project, and environment;
- when the shell top bar renders;
- then it shows `ShellProjectIdentityBadge`;
- and the badge has no mutation control.

#### US-SWC-2: Keep Scope Controls Out Of Main Chrome

As an operator focused on graph authoring, I want workspace selectors out of
the main top bar so workspace switching does not dominate or endanger the
authoring surface.

Acceptance:

- given the shell top bar renders on Canvas;
- when the persistent top bar is inspected;
- then it contains no tenant/project/environment comboboxes;
- and workspace context is presented as read-only content.

#### US-SWC-3: Keep Tenant Read-Only

As an operator inside an active project, I want tenant context to be read-only
so I cannot cross a tenant boundary from the main workbench.

Acceptance:

- given the Context menu is opened;
- when tenant context is shown;
- then it is rendered as read-only content;
- and no `setTenantId`, tenant selector, or tenant command mirror exists in
  the shell workspace context component.

#### US-SWC-4: Keep Project Read-Only

As an operator inside the main workbench, I want project context to be read-only
because changing project belongs to a separate governed project-selection
screen.

Acceptance:

- given the Context menu is opened;
- when project context is shown;
- then it is rendered as read-only content;
- and no `setProjectId`, project selector, or project command mirror exists in
  the shell workspace context component.

#### US-SWC-5: Keep Environment Read-Only

As an operator inside the main workbench, I want environment context to be
read-only so runtime context is not changed from ambient shell chrome.

Acceptance:

- given the Context menu is opened;
- when environment context is shown;
- then it is rendered as read-only content;
- and no `setEnvironmentId`, environment selector, or environment command
  mirror exists in the shell workspace context component.

#### US-SWC-6: Handle Missing Granted Labels Honestly

As an operator, I want unknown granted labels to show as raw ids so the UI does
not pretend to know unavailable tenant, project, or environment names.

Acceptance:

- given bootstrap options do not contain the selected id;
- when `buildProjectIdentityBadge` projects the badge;
- then the selected raw id is displayed as fallback;
- and no fabricated label or grant state is produced.

#### US-SWC-7: Keep Git Reference Passive

As an operator, I want the Git reference to remain a read-only context signal in
Stage 1 so branch management does not appear without a governed Git rail.

Acceptance:

- given the top bar renders Git branch and SHA context;
- when the workspace Context menu is opened;
- then Git controls are not part of the context details;
- and no branch-switch command is introduced.

#### US-SWC-8: Preserve Route Authority

As an operator moving between Canvas and Runs, I want routes to read workspace
context through their existing query/controller paths.

Acceptance:

- given Canvas or Runs needs workspace context;
- when the route reads session scope;
- then each route reacts through its existing query/controller path;
- and the shell context component does not own route data loading.

### Coverage Map

```mermaid
flowchart LR
  Stories["US-SWC stories"] --> Unit["TopAppBar and projectIdentityBadge unit tests"]
  Stories --> Arch["TopAppBar architecture guard"]
  Stories --> Browser["Canvas Stage 1 Cypress posture proof"]
  Arch --> Docs["Component guide and mailbox analysis"]
  Unit --> Model["ProjectIdentityBadge"]
  Browser --> Posture["No comboboxes + read-only Context details"]
```

### Drift Triggers

Update these stories when a change alters:

- where workspace identity is displayed;
- whether workspace context can mutate session scope;
- how missing labels or grants are represented;
- whether Git context becomes command-capable;
- how Canvas, Runs, or another route consumes session-scope context.

> Acceptance scope status: Active. Owner: Frontend / Architecture.
