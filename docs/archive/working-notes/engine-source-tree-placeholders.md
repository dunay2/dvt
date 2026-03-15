---
title: Engine Source Tree Placeholders
status: Historical
owner: Engine
last_reviewed: 2026-03-15
---

# Engine Source Tree Placeholders

This note preserves placeholder README content that used to live inside code
directories under `packages/@dvt/engine/**`. Those local Markdown files were
removed so code directories stay prose-free; canonical documentation should live
under `docs/`.

## `src/composition/`

Target folder for wiring and composition root.

Phase 1 note:

- Skeleton only (no code moved yet).
- Existing wiring remains in current folders until Phase 2.

## `src/domain/`

Target folder for engine domain semantics.

Phase 1 note:

- Skeleton only (no code moved yet).
- Existing runtime remains in `src/core/` until Phase 2.

## `src/generated/`

Target folder for generated artifacts (types/code derived from
schemas/contracts).

Phase 1 note:

- Skeleton only.
- Do not place manual source code here.

## `cli/src/`

CLI entrypoints for module-level tooling.

Planned commands (target template):

- `smoke.ts`
- `validate-schemas.ts`
- `codegen.ts`

Phase 1 note:

- Skeleton only.
- No executable logic added yet.

## `schemas/commands/`

Canonical JSON Schemas for command payloads.

Phase 1 note:

- Skeleton only.
- Concrete schemas will be introduced in a later phase.

## `schemas/envelope/`

Canonical JSON Schemas for event envelope definitions.

Phase 1 note:

- Skeleton only.
- Concrete schemas will be introduced in a later phase.

## `schemas/events/`

Canonical JSON Schemas for event payloads.

Phase 1 note:

- Skeleton only.
- Concrete schemas will be introduced in a later phase.
