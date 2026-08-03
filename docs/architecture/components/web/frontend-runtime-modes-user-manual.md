---
title: Frontend API Runtime User Manual
status: Active
owner: Frontend / Product / Docs
last_reviewed: 2026-08-03
---

# Frontend API Runtime User Manual

## Purpose

This manual explains the single supported frontend runtime posture. Raven reads
and changes product data through governed API ports. There is no selectable
local or fixture-backed product mode.

## Runtime Posture

- `VITE_API_BASE_URL` selects the backend address, not a data authority.
- Views consume backend-backed data through the ports composed by
  `AppServicesProvider`.
- Unsupported or unavailable operations fail closed.
- Component and integration tests inject explicit port doubles; those doubles
  are not product runtime options.

## Capability Interpretation

Using the API does not imply that every operation is available. Operators must
distinguish:

- selected execution adapter;
- granted workspace and project scope;
- backend-reported capability;
- platform readiness;
- route startup or operability posture.

Canvas authoring requires protected workspace-draft authority and the relevant
capabilities. Source Import appears only when its governed connection,
discovery, probe, and import rails are available for the active context.

## Shell States

The shell exposes explicit states:

- `loading`: authoritative backend state is being resolved;
- `empty`: no data exists for the selected context;
- `degraded`: only part of the required backend surface is available;
- `offline`: the backend cannot be reached;
- `read-only`: inspection is allowed but mutation is not.

No route substitutes fixture data or fake success for these states.

## Route Behavior

- Canvas renders graph and planning actions through controller hooks and typed
  ports.
- Runs reads snapshots and events through `RunsPort`.
- Workspace files, diff, artifacts, and administration use their governed API
  queries and commands.
- Platform diagnostics display the literal API transport and resolved base URL.

## Failure Interpretation

An unavailable capability, authorization denial, readiness failure, or network
error is a product state. Retry and recovery actions must use the existing
governed rails and cannot switch the frontend to another data authority.
