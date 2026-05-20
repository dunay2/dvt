---
title: F-17-C Fowler Analysis - Artifacts Monaco Read-Only Viewer
status: Accepted
owner: Web / Architecture
date: 2026-05-20
planning_type: analysis
---

# F-17-C Fowler Analysis - Artifacts Monaco Read-Only Viewer

## Mature-System Comparison

Mature workbench systems keep text-heavy inspection surfaces behind route-local
presentation adapters. VS Code, Grafana, and dbt artifact tooling do not make
their editor primitive the product shell; they use it as an embedded inspection
surface with clear read-only posture, stable state transitions, and explicit
failure states.

The current Artifacts route already has the correct route skeleton:
`ArtifactsView` owns the route, `useArtifactsViewModel` owns workspace/imported
read-model derivation, and the existing workspace file rails provide artifact
truth. The drift is semantic: Monaco is present, but the ownership boundary is
not yet documented or guarded.

## Improved Patterns

| Area               | Pattern                   | Improvement                                                                       |
| ------------------ | ------------------------- | --------------------------------------------------------------------------------- |
| Route composition  | Application Controller    | `ArtifactsView` stays the route composer and does not import Monaco.              |
| Payload inspection | Presentation Model        | `ArtifactPreviewDocumentMap` is the route-local read model for artifact payloads. |
| Monaco boundary    | Gateway / Adapter         | `MonacoCodeViewer` hides lazy loading and the third-party `Editor` binding.       |
| Safety             | Semantic Fitness Function | Architecture tests guard read-only and route-safe behavior.                       |

## Antipatterns Detected

| Antipattern              | Evidence                                                                                   | Fix                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Documentation drift      | `F-17-C` is queued while Artifacts already renders Monaco.                                 | Add the plan, component guide, stories, and `buzon` analysis.       |
| Responsibility overload  | `ArtifactPreviewTabs` owns tab selection, formatting, Monaco wiring, and an inert command. | Extract `ArtifactMonacoPreviewPanel` as the payload adapter.        |
| Fake command             | The `View Full File` button has no command rail or handler.                                | Remove it from this slice instead of shipping a placeholder action. |
| Weak read-only invariant | Monaco `Editor` uses `readOnly` but lacks DOM-level read-only posture.                     | Add `domReadOnly: true` and guard absence of mutation callbacks.    |

## Component Grouping

- `ArtifactsView` - route application controller and workbench frame owner.
- `useArtifactsViewModel` - imported/workspace artifact read-model derivation.
- `ArtifactPreviewTabs` - tab composition for supported artifact files.
- `ArtifactMonacoPreviewPanel` - structured payload presentation adapter.
- `MonacoCodeViewer` - lazy gateway for a read-only code viewer.
- `MonacoCodeSurface` - third-party Monaco `Editor` binding.

This grouping keeps Artifacts separate from Diff and avoids a shared domain
model for unrelated route semantics. Only the Monaco primitive is shared.

## Repetitions

- Diff and Artifacts both need Monaco lazy gateways, but their route semantics
  differ. Reuse belongs in `MonacoCodeViewer` and `MonacoDiffViewer`, not in a
  combined route panel.
- JSON formatting should remain local to Artifacts via
  `formatStructuredArtifactContent`; Diff owns comparison documents instead.
- Route panel styling should continue through `RouteWorkbenchFrame` tokens
  rather than route-local Monaco hardcodes.

## Code And Documentation Drift

The code was ahead of planning:

- Artifacts already used `MonacoCodeViewer`.
- The accepted Monaco rationale already names Artifacts as the second Monaco
  route.
- The planning task still said Monaco had not landed.

The documentation was behind:

- no Artifacts Monaco component guide;
- no F-17-C user stories;
- no feature-mechanization plan;
- no architecture guard for read-only Artifacts semantics;
- no owned-concern docblocks on the affected Artifacts and Monaco modules.

## Opportunities

1. Use `F-17-C` to codify Artifacts as a read-only inspection route rather than
   an editing surface.
2. Remove the inert `View Full File` affordance before it becomes UX debt.
3. Make future `F-17-D` Templates work reuse the Monaco gateway without
   inheriting Artifacts route ownership.
4. Keep Canvas explicitly non-Monaco-centric through an architecture guard.

## Applied Patterns

- Application Controller for `ArtifactsView`.
- Presentation Model for `ArtifactPreviewDocumentMap`.
- Gateway for `MonacoCodeViewer`.
- Extract Component for `ArtifactMonacoPreviewPanel`.
- Semantic Fitness Function for architecture invariants.

## Lessons For Future Work

- A rendered test is not enough when a third-party primitive can change route
  meaning. The route must also prove ownership boundaries.
- Any new button must map to an existing command/query rail. If the rail does
  not exist, the right default is no visible command.
- Monaco adoption should progress route by route. Diff, Artifacts, and
  Templates share primitives but not route semantics.

## ADR Decision

No new ADR is required. The accepted Monaco rationale already decides that
Monaco is an embedded read-only/diff review primitive for Diff, Artifacts, and
Templates. This slice implements that decision for Artifacts without changing
contracts, adapters, or backend command/query rails.
