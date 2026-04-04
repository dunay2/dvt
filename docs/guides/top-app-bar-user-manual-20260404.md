---
title: Top App Bar User Manual
status: Draft
date: 2026-04-04
owner: Web
planning_type: guide
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

- `Checking`: health probe is still in-flight.
- `Healthy`: REST endpoint is available.
- `Offline`: backend is unreachable.
- `Degraded`: backend responds but reports degraded status.

Tooltips show additional detail when available.

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
- If toggles do not persist, inspect `uiLayoutStore` persistence settings.

## Definition Of Done

- [ ] Scope selectors are visible and selectable.
- [ ] Connection state indicator transitions correctly.
- [ ] Shell toggles update panels and focus mode.
- [ ] Spanish labels render under `es` browser locale.
- [ ] English labels render for non-`es` locale.
