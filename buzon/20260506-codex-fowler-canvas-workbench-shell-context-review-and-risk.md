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

- moving tenant, project, and environment selectors out of the main top bar;
- projecting project identity into a read-only top-bar badge;
- keeping scope changes behind the existing session commands;
- adding semantic architecture and browser posture guards;
- documenting local component API, invariants, transitions, and consumers.

It does not cover Save, Export, Import, protected draft authority, backend
contracts, adapter changes, RBAC, tenant administration, or browser Git
commands.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/appshell/app-shell.md`
- `docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-1-chrome-simplification-implementation-plan-20260506.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-shell-save-export-sequence-plan-20260505.md`

## Mature-System Comparison

Mature operator workbenches treat workspace identity as context, not as a
dominant editing surface. Systems such as VS Code and data-platform consoles
usually keep the active workspace visible while making workspace switching
explicit, on-demand, and bounded by existing authorization semantics.

The previous top bar looked functional, but the visible dropdown trio gave
scope switching the same visual weight as authoring work. That blurred shell
context with route-local Canvas work and made the top bar look like a form
instead of persistent chrome.

The fix moves closer to mature systems:

- `ProjectIdentityBadge` is a read-only Presentation Model for active scope.
- `ShellProjectIdentityBadge` is a passive renderer with no command authority.
- `ShellWorkspaceContextMenu` exposes scope changes only after explicit user
  intent.
- `ShellWorkspaceSelectors` still dispatches the existing `setTenantId`,
  `setProjectId`, and `setEnvironmentId` commands.
- `VerifyCanvasWorkbenchVisualPosture` now checks that top-bar selectors are
  relocated and still reachable.

## Patterns Improved

- Presentation Model: session scope is projected into `ProjectIdentityBadge`
  before render.
- Passive View: `ShellProjectIdentityBadge` renders labels only.
- Command Query Separation: selectors remain command-backed, while the badge is
  query/read-model output.
- Application Controller: `ShellTopBar` composes shell surfaces without owning
  selector internals.
- Semantic Fitness Function: Vitest and Cypress assert behavior-level posture:
  no top-bar comboboxes, badge visible, and selector reachability preserved.

## Antipatterns Detected

- Boundary drift: tenant, project, and environment selectors were visually
  owned by the main top bar instead of a bounded shell context surface.
- Responsibility overload: `TopAppBar` composed brand, selectors, Git, health,
  Canvas portal, and view menu in one visual row.
- Hidden authority risk: direct top-bar dropdowns implied instant scope changes
  as ambient chrome rather than explicit shell commands.
- Documentation drift: the App Shell guide said compact labels, but the active
  implementation still rendered dominant dropdown controls.
- Test drift: prior shell tests asserted the old three-combobox top-bar shape.

## Patterns Applied

- Extracted `buildProjectIdentityBadge(...)` as the read-model boundary for
  shell identity labels.
- Extracted `ShellProjectIdentityBadge` to keep read-only identity display
  separate from command controls.
- Extracted `ShellWorkspaceContextMenu` so scope selectors live behind one
  explicit shell-context trigger.
- Kept `ShellWorkspaceSelectors` as the command view and reused existing
  session aggregate commands.
- Updated architecture tests to validate semantic ownership, docblocks, local
  component docs, and mailbox evidence.

## Component Grouping

The shell context now groups by owned concern:

| Component                   | Concern                                      |
| --------------------------- | -------------------------------------------- |
| `projectIdentityBadge.ts`   | pure shell identity projection               |
| `ShellProjectIdentityBadge` | read-only top-bar identity display           |
| `ShellWorkspaceContextMenu` | bounded on-demand scope command surface      |
| `ShellWorkspaceSelectors`   | existing tenant/project/environment commands |
| `ShellTopBar`               | shell composition adapter                    |

## Repetitions Fixed

- Removed repeated top-bar selector layout from the persistent chrome.
- Collapsed tenant/project/environment switching into one shell context menu
  instead of three always-visible controls.
- Reused the existing selector component and session commands rather than
  inventing parallel scope mutation semantics.

## Drift Fixed

- Code now matches the Stage 1 plan statement that global context belongs in
  compact labels, not dominant dropdowns.
- `Root.shellChrome` tests no longer encode the retired top-bar combobox shape.
- Cypress posture proof now covers relocated context, not only Canvas tabs.
- The App Shell guide now has a local component section with API, invariants,
  transitions, consumers, and diagrams.
- The Stage 1 manifest now names the mailbox evidence for this shell-context
  slice.

## Recommendations And Risks

Recommendations:

- Keep future grant refresh behind `RefreshSessionGrants`; do not add parallel
  selector data sources.
- If workspace switching becomes privileged, add an auth/RBAC rail before
  changing selector availability.
- Keep Git branch switching out of `ShellGitRef` until an accepted Git command
  rail exists.
- Move any future command palette work into a named shell command model rather
  than expanding `TopAppBar`.

Risks:

- Medium: `ProjectIdentityBadge` currently resolves labels from bootstrap
  options, so richer unavailable-state copy still depends on future grants
  integration.
- Low: the top-bar badge uses a generic `Draft scope` label until Canvas route
  draft posture is exposed through an accepted read-model handoff.
- Low: responsive proof covers the Stage 1 Canvas viewports, but later top-menu
  growth could reintroduce top-bar density.

No residual risk requires a risk-register entry in this slice because no
contracts, adapters, engine, planner, protected draft API, RBAC, or persistence
authority changed.

## Teachings For Future Work

- Visible controls imply authority. If a control changes security or workspace
  scope, put it behind a named command surface.
- A read-only context badge needs its own Presentation Model; otherwise render
  code quietly becomes the model.
- Browser tests should verify semantic posture and reachability, not just that
  the route loads.
- Local component guides are useful only when they name public API, invariants,
  transitions, and consumers for the exact component boundary being changed.

## ADR Decision

No ADR is required for this slice. The decision is an implementation of the
accepted F-28/F-28-A Stage 1 plan and reuses existing command/query rails.
