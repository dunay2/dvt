---
id: R-20260601-PLANNER-LOCAL-DOC-ARCHIVE
title: Planner local documentation archive can hide stale reference paths
status: Open
date: 2026-06-01
owners:
  - '@dvt/planner'
  - docs
severity: Low
probability: Low
---

# R-20260601-PLANNER-LOCAL-DOC-ARCHIVE

## Context

Historical planner-local documents are being moved from
`packages/@dvt/planner/docs/` into `docs/archive/planner/`. The move reduces
duplicate planner authority, but stale links or maintainer expectations can
still point at the old package-local paths.

## Risk

Future contributors could follow removed package-local documents from stale
links or local notes and miss the canonical repository-level planner governance
surfaces.

## Mitigation

- Keep generated archive indexes committed through `pnpm docs:sync`.
- Keep the planner archive under `docs/archive/planner/` with a dedicated
  index.
- Validate changed markdown and repository pre-push gates before merge.
- Treat any remaining package-local planner documentation as maintainer notes,
  not canonical planning authority.

## Evidence

- `docs/evidence/ed-20260601-planner-local-doc-archive.md`
- `docs/archive/planner/index.md`
