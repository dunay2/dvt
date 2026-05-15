---
title: Top App Bar User Manual
status: Active
date: 2026-04-04
owner: Web
planning_type: guide
last_reviewed: 2026-05-15
---

# Top App Bar User Manual

## What It Does

The top app bar controls workspace scope, shows platform connectivity, and
provides shell-level UI actions.

## Workspace Scope Selectors

The selectors control active:

- Tenant
- Project
- Environment

Changes apply immediately to frontend context and downstream queries.

## Git Reference

The app bar shows current branch and short SHA from bootstrap config.

## Connection Indicator States

- `Checking`: the first platform-health probe is still in-flight and the shell
  must not show an optimistic healthy state yet.
- `Healthy`: REST health is available and the platform snapshot is not
  degraded.
- `Offline`: the backend health snapshot is unreachable or the health query
  failed.
- `Degraded`: backend responds but reports degraded readiness or partial probe
  failure.

Tooltips show additional detail when available.

When the state is `Offline` or `Degraded`, the global shell banner appears
below the top bar. It shows the same single health projection as the top bar,
offers `Retry now`, and displays the next automatic refresh window. Stable
healthy polling uses the normal platform-health interval. Repeated offline
failures use capped exponential backoff.

## Shell Menu Actions

- Toggle Explorer panel
- Toggle Inspector panel
- Toggle Console
- Toggle Focus mode
- Change grid size

These controls update UI layout state only.

## Language Behavior

- Browser locale `es-*` shows Spanish labels in app bar controls.
- Any other locale falls back to English.

## Troubleshooting

- If selectors appear empty, verify workspace bootstrap options are configured.
- If status is always `Offline`, verify `/healthz` reachability from web app.
- If the banner stays in `Auto-refresh is waiting for the first completed
health check`, verify that the first `/healthz` query can settle instead of
  remaining pending.
- If toggles do not persist, inspect `uiLayoutStore` persistence settings.

## Definition Of Done

- [x] Scope context is visible through the project identity badge and workspace
      context menu.
- [x] Connection state indicator transitions through checking, healthy,
      degraded, and offline.
- [x] Shell toggles update panels and focus mode.
- [x] Spanish labels render under `es` browser locale.
- [x] English labels render for non-`es` locale.
