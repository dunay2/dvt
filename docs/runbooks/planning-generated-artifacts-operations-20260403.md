---
title: Planning Generated Artifacts Operations
status: Active
owner: Docs / Delivery / Architecture
last_reviewed: 2026-07-31
---

# Planning Generated Artifacts Operations

This runbook operates documentation indexes and governance projections that are
derived from canonical repository or Planning DB architecture state.

It does not define or project task lifecycle state. GitHub Issues are the sole
MVP task authority under
[ADR-0061](../adr/ADR-0061-github-mvp-task-authority-and-planning-db-architecture-boundary.md).

## Scope

Retained generated surfaces:

- documentation indexes produced by `pnpm docs:sync`;
- `docs/.manifest.json`;
- `docs/planning/status/generated-code-state.md`;
- governance indexes and DB exports produced by `pnpm governance:refresh`.

Retired surfaces:

- local lane snapshots;
- `execution-workboard.md`;
- `open-task-route.md`;
- Planning DB task and assignment projections.

## Rails

`ClassifyGeneratedDocsSurface` identifies whether a generated documentation
surface must remain tracked or can be artifact-only.

`ExtractGeneratedDocsSurface` removes an eligible projection from tracked
documentation without changing its canonical source.

`ValidateGeneratedDocsArtifact` checks marker integrity, deterministic output,
and discoverability for retained generated surfaces.

## Standard Workflow

1. Run `pnpm docs:sync` after adding, removing, or renaming files under `docs/`.
2. Run `pnpm docs:status:generate` after structural source changes under
   `apps/` or `packages/`.
3. Run `pnpm governance:refresh` after changing governance sources,
   generators, scripts, or package commands.
4. Run `pnpm verify:prepush` before publishing the branch.

## Failure Triage

1. Use the failing check to identify the owning generator.
2. Run that generator once.
3. Run its check command without editing the generated output manually.
4. If a second generation changes output again, treat it as a determinism
   defect in the generator.
5. If a retired task surface reappears, remove the producer or stale DB seed;
   do not restore a local planning authority.

## CI Expectations

- `docs:sync:check` validates tracked documentation indexes.
- generated code-state checks validate source inventory.
- governance refresh checks validate DB-first architecture projections.
- no CI path may require retired lane or workboard state.
