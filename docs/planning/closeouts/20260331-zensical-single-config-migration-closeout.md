---
slice: zensical-single-config-migration
date: 2026-03-31
author: AI (GPT-5)
last_reviewed: 2026-03-31
status: Accepted
---

# Closeout: Zensical Single-Config Migration

## Summary

This slice removes the legacy compatibility layer from the repository docs
toolchain and leaves one docs configuration contract in place:
`zensical.yml`.

The repository no longer keeps a second docs config file, and repo docs
tooling no longer reads, rewrites, or validates a legacy config surface.

## Implementation

- promoted `zensical.yml` from adapter config to full standalone docs config
- removed the legacy compatibility config file from the repository
- updated docs tooling and checks so they read `zensical.yml` directly
- kept `pnpm docs:serve` and `pnpm docs:build` stable while changing the
  underlying contract to a single config file
- rewrote repository documentation to remove legacy docs-tool references,
  including active, planning, evidence, and archive material

## Touched Surfaces

- docs config and command contract:
  - `zensical.yml`
  - `package.json`
- docs tooling:
  - `scripts/sync-docs.cjs`
  - `scripts/docs-canonical-check.cjs`
  - `scripts/docs-canonical-fix.cjs`
  - `scripts/docs-quality-check.cjs`
- docs deployment workflow:
  - `.github/workflows/docs-deploy.yml`
  - removed `.github/workflows/mkdocs-deploy.yml`
- active and historical docs rewritten to the single-config model, including
  docs governance, archive references, evidence, and status pages

## Validation Evidence

- `pnpm docs:sync`
  - Passed.
- `pnpm docs:build`
  - Passed.
- `pnpm docs:quality:check`
  - Passed with existing repository warnings about likely non-English content
    in pre-existing planning/archive material.
- `pnpm docs:canonical:check`
  - Passed.
- `pnpm docs:doctor`
  - Passed with existing repository warnings about missing `last_reviewed`
    frontmatter in many older planning closeouts and archive docs.
- `pnpm docs:status:check`
  - Passed.
- `pnpm docs:capability:check`
  - Passed.
- `pnpm docs:gov:locations`
  - Passed.
- `pnpm docs:gov`
  - Passed with existing non-blocking frontmatter warnings in older ADR and
    evidence documents.
- `pnpm verify:prepush`
  - Passed.
- `pnpm docs:ci`
  - Passed after `docs:ci` was redefined as the local-friendly regenerate-and-validate flow.
  - Passed again on a second run without further edits; the command remained idempotent.
- `pnpm docs:sync:check`
  - Failed in the current dirty worktree as expected.
  - Cause: the command still compares generated docs against `HEAD`, and the
    intentional canonical `docs/index.md` diff remains uncommitted in this slice.

## Runtime Smoke

- `http://127.0.0.1:8000/index.html`
  - Returned `200`.
- `http://127.0.0.1:8000/architecture/system-delivery-status/`
  - Returned `200`.

## No-Debt / No-Stub Evidence

- No compatibility shim, alias config, or inherited fallback file was left in
  place.
- `mkdocs.yml` was removed entirely.
- No quality rules, docs gates, or hooks were disabled or bypassed.
- No placeholder implementation or fake runtime path was added.
