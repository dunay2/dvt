---
title: Canvas Node Gestures
status: Active
owner: Frontend / Product
last_reviewed: 2026-09-14
---

# Canvas Node Gestures

The product-owner correction in [#3186](https://github.com/dunay2/dvt/issues/3186)
supersedes the native DVT Transform gesture policy in
[Canvas Node Workbench Hardening](../planning/proposals/mandatory/frontend-and-ux/canvas-node-workbench-hardening-plan-20260808.md).
File-backed dbt node entry is unchanged.

| Native DVT Transform gesture                                        | Result                                         |
| ------------------------------------------------------------------- | ---------------------------------------------- |
| Left single click on the card body                                  | Select its semantic output in Semantics        |
| Left double click on the card body, including its title and metrics | Open Data for that Transform, never Properties |
| Enter on the focused node                                           | Same entry as double click                     |
| Right click on the card                                             | Existing Properties operation                  |
| Embedded column control or field context menu                       | Its own action; do not enter the card          |

The adapter reuses `InspectCanvasNode`, the existing semantic contribution and
the existing Data drawer. No second navigation command, query, editor or store
is introduced. Field-scoped in-place editing is owned by
[#2923](https://github.com/dunay2/dvt/issues/2923), not by card entry.

Current defect: `CanvasShell` overrides Transform entry with
`onInspectNode(general)` and its regression test requires that wrong destination.
The correction changes the destination and extracts the existing sample-request
lifecycle into one presentation-only hook, leaving query ports unchanged.

```text
Left click --------> Semantics
Double click/Enter -> Data -> authoritative sample or explicit unavailable state
Right click -------> existing Properties operation
```

Semantic inspection compares the stored Substrait source identities with the
currently connected graph. When an input was removed or a new input was added,
the drawer shows one pending-composition state instead of presenting the stored
relation as current. Inspection does not guess a replacement JOIN and does not
destroy the recoverable semantic document; explicit confirmed dependency
removal remains owned by
[#3123](https://github.com/dunay2/dvt/issues/3123).

Opening Data must invalidate any earlier sample request: a late Source or Sink
response must never appear under a Transform's name. Navigation does not execute
SQL, start a run, write Graph Draft or change node geometry. If no authoritative
Transform result is available, show the existing unavailable state, never an
empty success or another node's rows. Result binding and real runtime execution
remain governed by [#2582](https://github.com/dunay2/dvt/issues/2582) and
[#2723](https://github.com/dunay2/dvt/issues/2723).

Regression proof covers single/double click, Enter, card context menu, embedded
controls, unchanged geometry/draft, absent query fallback, and suppression of late
responses. This guide does not claim that implementing navigation supplies the
missing Transform result capability.
