# DVT source-first architecture spike

This spike treats the repository source tree as evidence and LikeC4 as a navigable projection, not as a competing source of truth.

## Current contexts

- `@dvt/planner`
- `@dvt/plan-verifier`
- `@dvt/plan-interpreter`
- `@dvt/engine`
- `@dvt/run-domain`
- `@dvt/artifacts`
- `@dvt/state-store`
- `@dvt/delivery`
- `@dvt/adapter-temporal`
- `@dvt/adapter-postgres`

All current context baselines are pinned to `main@42504563629f0b998d8a3382ea839eead99a36d1`.

## Provenance

- `SOURCE-DERIVED`: tracked file identity and source metadata extracted from the pinned Git tree.
- `STRUCTURE-DERIVED`: directory hierarchy observed in that tree.
- `ARCHITECTURE-DECLARED`: logical component-to-file mappings used only to create human-scale views.

The machine-readable inventory remains available alongside each generated view so declared architecture can always be checked against source evidence.

## Generation and validation

`architecture/tools/generate-source-first-context.mjs <context>` produces:

- `architecture/generated/<context>-inventory.json`
- `architecture/generated/<context>-source.c4`

CI stages all declared contexts into one isolated LikeC4 workspace, runs `likec4 validate`, builds the static site, publishes the evidence bundle and finally updates the disposable `gh-pages` preview.

A context is not considered complete unless validation and build both pass.
