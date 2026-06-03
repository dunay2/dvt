---
title: Canvas Workbench Stage 1 Shell Context Fowler Review And Risk
status: Review
owner: Frontend / Architecture
last_reviewed: 2026-05-06
planning_type: review
---

# Canvas Workbench Stage 1 Shell Context Fowler Review And Risk

## Scope

This mailbox records the Fowler/DDD review for the Stage 1 shell-context
relocation fix.

It covers:

- moving tenant, project, and environment controls out of the main top bar;
- projecting project identity into a read-only top-bar badge;
- keeping workspace context breadcrumb-style and read-only on the main screen;
- preventing tenant, project, or environment mutation from shell chrome;
- adding semantic architecture and browser posture guards;
- documenting local component API, invariants, transitions, and consumers.

It does not cover Save, Export, Import, protected draft authority, backend
contracts, adapter changes, RBAC, tenant administration, project-selection
screen implementation, or browser Git commands.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/appshell/app-shell.md`
- `docs/architecture/components/web/appshell/shell-workspace-context-component.md`
- `docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-1-chrome-simplification-implementation-plan-20260506.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-shell-save-export-sequence-plan-20260505.md`

## Mature-System Comparison

Mature operator workbenches treat workspace identity as context, not as a
dominant editing or switching surface. Systems such as IDEs and data-platform
consoles usually keep the active workspace visible while moving project or
account changes into explicit selection flows.

The previous top bar looked functional, but the visible dropdown trio gave
workspace switching the same visual weight as authoring work. Moving those
controls behind another shell surface still left hidden authority. The corrected
fix makes the main screen read-only for tenant, project, and environment.

The fix moves closer to mature systems:

- `ProjectIdentityBadge` is a read-only Presentation Model for active scope.
- `ShellProjectIdentityBadge` is a passive renderer with no command authority.
- `ShellWorkspaceContextMenu` exposes read-only context details only.
- `ShellWorkspaceContextDetails` renders tenant, project, and environment
  without selectors.
- `VerifyCanvasWorkbenchVisualPosture` checks that top-bar controls are gone
  and read-only context remains visible.

## Patterns Improved

- Presentation Model: session scope is projected into `ProjectIdentityBadge`
  before render.
- Passive View: `ShellProjectIdentityBadge` and
  `ShellWorkspaceContextDetails` render labels only.
- Command Query Separation: the main shell workspace context is query/display
  only; project selection is outside this component.
- Application Controller: `ShellTopBar` composes shell surfaces without owning
  selector internals.
- Semantic Fitness Function: Vitest and Cypress assert behavior-level posture:
  no comboboxes, badge visible, and read-only details preserved.

## Antipatterns Detected

- Boundary drift: tenant, project, and environment selectors were visually
  owned by the main top bar instead of a governed project-selection flow.
- Responsibility overload: `TopAppBar` composed brand, selectors, Git, health,
  Canvas portal, and view menu in one visual row.
- Hidden authority risk: direct shell controls implied workspace ownership
  changes from ambient chrome.
- Documentation drift: the App Shell guide said compact labels, but the active
  implementation still rendered dominant dropdown controls.
- Test drift: prior shell tests asserted the old three-combobox top-bar shape.

## Patterns Applied

- Extracted `buildProjectIdentityBadge(...)` as the read-model boundary for
  shell identity labels.
- Extracted `ShellProjectIdentityBadge` to keep read-only identity display
  separate from command controls.
- Extracted `ShellWorkspaceContextMenu` as an on-demand read-only detail
  surface.
- Added `ShellWorkspaceContextDetails` to render tenant, project, and
  environment as read-only fields.
- Updated architecture tests to validate semantic ownership, docblocks, local
  component docs, mailbox evidence, and absence of mutation controls.

## Component Grouping

The shell context now groups by owned concern:

| Component                      | Concern                                      |
| ------------------------------ | -------------------------------------------- |
| `projectIdentityBadge.ts`      | pure shell identity projection               |
| `ShellProjectIdentityBadge`    | read-only top-bar identity display           |
| `ShellWorkspaceContextMenu`    | bounded on-demand read-only context surface  |
| `ShellWorkspaceContextDetails` | read-only tenant/project/environment details |
| `ShellTopBar`                  | shell composition adapter                    |

## Repetitions Fixed

- Removed repeated top-bar selector layout from the persistent chrome.
- Removed tenant/project/environment selector semantics from the main shell
  workspace context boundary.
- Reused the existing identity projection instead of inventing parallel
  workspace labels in render code.

## Drift Fixed

- Code now matches the Stage 1 rule that global context belongs in compact
  labels and read-only details, not dominant dropdowns.
- `Root.shellChrome` tests no longer encode the retired top-bar combobox shape.
- Cypress posture proof now covers read-only context, not only Canvas tabs.
- The App Shell guide now has a local component section with API, invariants,
  transitions, consumers, and diagrams.
- The Stage 1 manifest now names the mailbox evidence for this shell-context
  slice.

## Recommendations And Risks

Recommendations:

- Keep project changes in a separate governed project-selection screen.
- Keep future grant refresh behind `RefreshSessionGrants`; do not add parallel
  selector data sources to the main shell.
- Keep Git branch switching out of `ShellGitRef` until an accepted Git command
  rail exists.
- Move any future command palette entry for project selection into a named
  project-selection model rather than expanding `TopAppBar`.

Risks:

- Medium: `ProjectIdentityBadge` currently resolves labels from bootstrap
  options, so richer unavailable-state copy still depends on future grants
  integration.
- Low: the top-bar badge uses a generic `Draft scope` label until Canvas route
  draft posture is exposed through an accepted read-model handoff.
- Low: the project-selection screen is outside this slice and remains a
  separate governed product task.

No residual risk requires a risk-register entry in this slice because no
contracts, adapters, engine, planner, protected draft API, RBAC, or persistence
authority changed.

## Teachings For Future Work

- Visible controls imply authority. If the main screen only owns context,
  render breadcrumbs or read-only details, not selectors.
- A read-only context badge needs its own Presentation Model; otherwise render
  code quietly becomes the model.
- Browser tests should verify semantic posture and absence of mutation, not
  just that the route loads.
- Local component guides are useful only when they name public API, invariants,
  transitions, and consumers for the exact component boundary being changed.

## ADR Decision

No ADR is required for this slice. The decision is an implementation hardening
of the accepted F-28/F-28-A Stage 1 plan and does not add backend, RBAC,
project-selection, persistence, or Git command authority.
