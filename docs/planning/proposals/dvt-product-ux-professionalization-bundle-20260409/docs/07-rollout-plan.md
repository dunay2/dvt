# 07. Rollout Plan

## Rollout Goal

Raise product quality without rewriting the frontend or breaking the governed
route-workbench model.

This rollout should stay aligned with Lane E rather than becoming a parallel
roadmap.

## Phase 0. Freeze Grammar And Docks

Target outcome:

- official shell grammar decision;
- official route and dock posture;
- official plugin docking policy;
- explicit decision on how `Code` and `Diff` behave in the workbench model.

Primary task alignment:

- `F-15`
- `F-25`
- downstream consumers `F-01`, `F-18`, and `F-23`

Result:

Product, UX, and frontend stop arguing about shell ownership before code
changes spread.

## Phase 1. Converge The Visual System

Target outcome:

- route header and route frame primitives;
- token convergence for shell and main workbench surfaces;
- shared density posture;
- Monaco and React Flow alignment with the shell;
- lower visual noise in the operator path.

Primary task alignment:

- `F-24`

Result:

The product looks governed before every route is fully refactored.

## Phase 2. Tighten The Core Workbenches

Target outcome:

- Canvas, Runs, and review surfaces behave like one coherent product;
- contextual handoff between graph, review, and runtime becomes explicit;
- the transformation vertical keeps one operator story from preview to result.

Primary task alignment:

- `TF-E1`
- `F-23`
- `F-17`

Result:

DVT stops feeling like isolated routes and starts behaving like a coordinated
workbench.

## Phase 3. Productize Dense Supporting Routes

Target outcome:

- Runs list and detail gain stronger dense-surface posture;
- `PluginsView` evolves from diagnostics screen toward managed extension view;
- bottom diagnostics becomes a real governed supporting surface;
- admin and other dense routes inherit the same visual and shell rules.

Primary task alignment:

- `F-16`
- `F-18`
- `F-25`

Result:

Operational routes scale without inventing a second shell.

## Phase 4. Scale Through Governed Extension

Target outcome:

- command palette contributions are governed;
- bottom diagnostics contributions are formalized;
- route metadata and readiness states are reusable;
- future workbenches can plug in without deforming the shell.

Primary task alignment:

- `F-25`
- future plugin and template slices

Result:

The product can grow without losing coherence.

## Best ROI Quick Wins

1. Simplify top-bar noise.
2. Introduce a standard route header and route frame.
3. Reduce shell and Canvas visual hardcodes through token convergence.
4. Align Monaco and React Flow styling with the workbench.
5. Turn the bottom console into an explicitly governed diagnostics surface.
6. Reframe `Code` and `Diff` as supporting contextual review surfaces.

## Suggested Success Measures

- time to return to a frequent work zone;
- number of route changes needed per operator task;
- time to locate SQL or diff for a selected node;
- clicks needed to move from node selection to run evidence;
- time to understand whether a plugin is usable right now;
- layout and context retention across sessions.

## Phase Gates

Each phase should follow this order:

1. document the contract and rationale;
2. align Lane E ownership;
3. implement the smallest governed slice;
4. validate against shared workbench rules and route states.

## Success Criterion

The rollout succeeds when a user can:

- enter the product;
- understand where they are;
- find the current task surface quickly;
- move between authoring, review, and runtime without unnecessary context loss;
- return to the same working zone without reorientation.

That is the difference between a prototype UI and a professional operator
product.
