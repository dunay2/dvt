# Source-first architecture visibility spike

This directory is deliberately generated from Git rather than maintained as a second architecture truth.

## Authority

1. Current source, tests, configuration and composition remain authoritative.
2. `source-first.config.json` only selects bounded contexts to visualize.
3. `tools/generate-source-first.mjs` resolves `origin/main` to an exact commit SHA and derives:
   - package inventory;
   - source modules from the physical `src/` structure;
   - `@ownedConcern` / `@decision` metadata when it exists;
   - internal module dependencies from source imports;
   - dependencies among the selected DVT workspaces;
   - exact file/folder evidence with commit-pinned GitHub links.
4. LikeC4 is a projection and navigation layer, not a replacement for the codebase.

## Provenance labels

- `SOURCE-FIRST`: bounded-context description is anchored to the current package source.
- `STRUCTURE-DERIVED`: module/folder grouping is derived mechanically from the Git tree.
- `SOURCE-DERIVED`: file identity and links come directly from Git blobs.

No TARGET component is generated automatically. Future architecture must be modeled separately and explicitly.

## Current spike scope

- `@dvt/engine`
- `@dvt/planner`
- `@dvt/artifacts`
- `@dvt/state-store`
- `@dvt/run-domain`
- `@dvt/delivery`

The workflow validates the isolated generated model with LikeC4 before publishing any preview.
