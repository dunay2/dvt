---
title: Canvas Workbench Shell Context Semantic Hardening Fowler Review
status: Review
owner: Frontend / Architecture
last_reviewed: 2026-05-06
planning_type: review
---

# Canvas Workbench Shell Context Semantic Hardening Fowler Review

## Fowler Architecture Analysis

The Stage 1 shell-context work initially improved visual density by moving
tenant, project, and environment controls out of the persistent top bar. The
Fowler review found a stronger semantic requirement: the main workbench must
not change workspace ownership at all.

The corrected architecture treats shell workspace context as breadcrumb-style
read-only content. The App Shell may show tenant, project, environment, and
draft posture, but it must not own tenant switching, project selection, or
environment switching. Project changes belong to a separate governed
project-selection screen.

## Mature-System Comparison

Mature operator workbenches keep the current workspace visible while moving
workspace ownership changes into explicit project or account selection flows.
They do not let ambient shell chrome cross tenant or project boundaries while a
user is inside an active project.

DVT now follows that shape more closely:

- `ProjectIdentityBadge` projects active scope into read-only labels.
- `ShellProjectIdentityBadge` behaves like breadcrumb-style top-bar context.
- `ShellWorkspaceContextMenu` opens read-only details, not selectors.
- `ShellWorkspaceContextDetails` displays tenant, project, and environment
  without mutation controls.
- `TopAppBar.architecture.test.ts` blocks `setTenantId`, `setProjectId`,
  `setEnvironmentId`, selector primitives, and value-change handlers from the
  shell workspace context modules.

## Patterns Improved

- **Presentation Model**: `ProjectIdentityBadge` remains the read-only identity
  projection before rendering.
- **Passive View**: both the badge and context details render scope without
  command authority.
- **Command Query Separation**: the main shell context is query/display only;
  project-selection commands are outside this component.
- **Semantic Fitness Function**: the architecture guard validates docs,
  owned-concern docblocks, and absence of mutation signals.
- **Component Guide**: the local guide names API, invariants, transitions,
  consumers, diagrams, and drift triggers for the exact read-only boundary.

## Antipatterns Detected

| Antipattern                  | Detection                                                                              | Fix                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Hidden authority             | A Scope menu still implied tenant/project/environment mutation from the main workbench | Convert it to read-only Context details                  |
| Repeated selector contract   | Menu and selector components declared command props for scope mutation                 | Remove shell workspace selectors from this boundary      |
| Documentation dilution       | API and invariants were embedded in the broad App Shell page only                      | Add a local component guide                              |
| Scenario drift               | User stories still described tenant/project/environment switching                      | Rewrite stories around read-only context                 |
| Fitness function shallowness | Architecture test checked symbols but not forbidden command authority                  | Guard absence of selectors and session mutation commands |

## Component Grouping

| Group                     | Files                                                                | Owned concern                                                            |
| ------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Identity projection       | `apps/web/src/app/shell/projectIdentityBadge.ts`                     | Convert session scope and bootstrap labels into read-only shell identity |
| Identity rendering        | `apps/web/src/app/components/shell/ShellProjectIdentityBadge.tsx`    | Render passive top-bar identity                                          |
| Context details surface   | `apps/web/src/app/components/shell/ShellWorkspaceContextMenu.tsx`    | Open read-only workspace context details                                 |
| Context details rendering | `apps/web/src/app/components/shell/ShellWorkspaceContextDetails.tsx` | Display tenant, project, and environment without mutation controls       |
| Shell composition         | `apps/web/src/app/components/TopAppBar.tsx`                          | Compose global shell context, health, Git ref, and menus                 |
| Semantic guard            | `apps/web/src/app/components/TopAppBar.architecture.test.ts`         | Freeze ownership, docs, read-only posture, and drift signals             |

## Repetitions Fixed

- Removed repeated tenant/project/environment command props from the shell
  context boundary.
- Replaced selector semantics with one read-only details component.
- Component API, invariants, transitions, consumers, and diagrams now live in a
  local guide instead of only inside the broad App Shell page.
- Scenario coverage now states where project changes do not belong.

## Drift Fixed

- Code and docs now agree that shell workspace context is breadcrumb-style
  read-only content on the main screen.
- User stories no longer claim tenant or project can be changed from the Scope
  menu.
- Architecture tests now validate absence of `setTenantId`, `setProjectId`,
  `setEnvironmentId`, selector imports, and `onValueChange`.
- The Workbench inventory links the dedicated component and story guides.
- The F-28-A manifest tracks the hardening mailbox, local guides, and
  `ShellWorkspaceContextDetails` symbol.

## Opportunities

- The separate governed project-selection screen can later own project change
  commands, authorization copy, and unavailable-state handling.
- Future grant refresh can enrich read-only labels through
  `RefreshSessionGrants` without turning the shell into a mutation surface.
- A future command palette can link to the project-selection screen without
  placing project mutation in the main workbench chrome.
- If Git becomes mutable, it should get its own accepted command/query rail and
  local guide before a branch-switch UI appears.

## Teachings For Future Work

- Moving controls out of the top bar is insufficient if the destination still
  mutates workspace ownership inside the main workbench.
- Breadcrumb context and project selection are separate product concepts.
- Architecture tests should block forbidden authority, not only prove the new
  component exists.
- Scenario guides are valuable because they catch false user stories before
  they become accepted behavior.

## Recommendations And Risks

Recommendations:

- Keep shell workspace context display-only until a governed project-selection
  screen exists.
- Keep missing labels honest by displaying raw ids until grants can provide a
  richer unavailable-state model.
- Do not add Git branch switching to this component without a Git command rail
  and ADR-level review if it changes repository mutation authority.
- Keep Canvas and Runs reactions route-owned; the shell should not subscribe to
  or orchestrate route data refresh beyond session-scope display.

Risks:

- Low: `Draft scope` remains a generic label because Canvas draft posture is
  not yet exposed through a dedicated accepted read-model handoff.
- Low: the project-selection destination is documented as separate but not
  implemented in this slice; that is intentional because this PR hardens the
  main-screen shell boundary only.

## ADR Decision

No ADR is required. This change hardens the accepted F-28-A Stage 1 shell
context implementation by removing unintended command authority from the main
workbench shell. It does not introduce a new backend contract, adapter,
planner, engine behavior, RBAC rule, persistence authority, or Git command
authority.
