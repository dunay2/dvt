# 05. Plugin UX Integration Contract

This document defines the proposal-level UX contract for plugin integration in
the DVT workbench.

It builds on the existing technical seams in:

- `apps/web/src/app/plugins/contracts/PluginManifest.ts`
- `apps/web/src/app/plugins/registry.ts`

The goal is not to replace those seams. The goal is to govern how plugin
contributions dock into the shell and route workbenches.

## 5.1. Current Baseline Is Strong

The repo already exposes useful plugin seams for:

- views and navigation;
- toolbar contributions;
- inspector contributions;
- overlays;
- badges;
- produces and consumes relationships.

That technical baseline should stay intact. What is missing is a governed UX
policy around it.

## 5.2. Governing Rule

**The plugin adapts to the shell. The shell does not deform around the plugin.**

Plugins extend DVT by using governed docks, route metadata, and readiness
signals. They do not invent local chrome rules.

## 5.3. Dock Map

| Dock or seam                    | Allowed use                                                         | Not allowed                                                   |
| ------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| Route contribution              | major workbench or secondary surface with a clear user job          | micro-features that should live inside an existing route      |
| Route header contribution       | title context, subtitle, route status, primary or secondary actions | full custom page chrome or permanent shell duplication        |
| Local toolbar contribution      | route-local commands, filters, toggles, mode switches               | shell-global settings or opaque actions with no tooltip       |
| Inspector contribution          | contextual metadata, config, runtime detail, plugin-specific detail | duplicate primary navigation or always-open decorative panels |
| Canvas overlay contribution     | named visual overlays with clear priority and semantics             | overlapping color-only overlays that fight each other         |
| Node badge contribution         | compact status or type signals with clear tooltip meaning           | noisy badges that dominate node readability                   |
| Bottom diagnostics contribution | logs, events, traces, problems, output                              | standalone floating consoles detached from route context      |
| Command palette contribution    | discoverable actions with keywords and availability context         | shadow navigation that bypasses route ownership               |

## 5.4. Required Behavior By Dock

### Navigation And Route Contributions

Use navigation contributions only when the plugin introduces a real route-level
surface with a stable user job.

Do not create top-level navigation for:

- minor utilities;
- local inspectors;
- one-off review helpers.

### Route Header Contributions

Plugins may contribute:

- route title and subtitle fragments;
- primary and secondary actions;
- route-scoped status badges;
- route metadata useful for quick interpretation.

This keeps actions near the active workbench instead of leaking them into the
global top bar.

### Local Toolbar Contributions

Rules:

- visible action count must stay bounded;
- icon plus tooltip is required;
- text is optional and should depend on available space;
- active or toggled state must be visible.

### Inspector Contributions

Rules:

- inspector content should answer a concrete question;
- panels should be ordered and contextual;
- duplicate detail panels should be avoided;
- selection-driven visibility is preferred over permanent noise.

### Bottom Diagnostics Contributions

The product should formalize a contribution seam for bottom diagnostics tabs,
such as:

- logs;
- events;
- diagnostics;
- traces;
- outputs.

This is where dense runtime detail belongs when it is not the primary route
surface.

### Command Palette Contributions

Command-palette actions should carry:

- discoverable title;
- keywords;
- optional shortcut metadata;
- explicit availability conditions.

## 5.5. Forbidden Plugin Behavior

Plugins should not be able to:

- inject arbitrary global top-bar chrome;
- create permanent floating panels without a governed dock;
- break common spacing, typography, or color rules;
- publish competing shell grammar;
- add primary navigation for a feature with no stable task model.

## 5.6. Plugin Readiness Truth Model

Each plugin-facing surface should be able to express at least these states:

1. Declared
2. Frontend available
3. Backend available
4. Compatible
5. Executable
6. Degraded or blocked

These states fit naturally into:

- `PluginsView`
- future readiness tables
- route badges and workbench detail panes

## 5.7. Recommended Frontend Contract Extensions

Potential extensions that stay aligned with the shell grammar:

- `routeHeaderContribution`
- `commandPaletteContributions`
- `bottomPanelContributions`
- `emptyStateContribution`
- `statusDescriptors`

Useful route metadata additions:

- category
- task family
- default opening mode such as `route`, `tab`, or `drawer`
- preferred dock such as `center`, `right`, or `bottom`
- feature maturity such as `core`, `beta`, or `experimental`

## 5.8. Notes On Current Plugins

### `dbt`

- stays central to Canvas and artifacts;
- should be reviewed carefully before treating `Code` and `Diff` as permanent
  core navigation just because dbt review exists.

### `monitoring`

- already fits overlays and badges well;
- can grow into richer bottom-diagnostics contributions.

### `cost`

- works well as an extended optional route or overlay surface;
- should remain subordinate to the core operator grammar.

## 5.9. Acceptance Checklist For New Plugin Surfaces

Before accepting a new plugin contribution, verify:

- does it solve a user task rather than exposing raw technology;
- does it fit a governed dock;
- does it compete with an existing surface;
- are availability and blocked states explicit;
- does it respect shared spacing, typography, color, and density;
- is it discoverable without saturating the shell;
- can it degrade without breaking the main flow.

## 5.10. Summary

DVT already has strong technical plugin seams.

The missing piece is a governed UX contract so plugins extend the product
predictably instead of multiplying ad hoc surfaces.
