---
title: Documentation maintenance guide
status: Active
owner: Architecture / Docs
last_reviewed: 2026-08-07
---

# Documentation maintenance guide

## Purpose

Keep active docs aligned with current code, planning state, and archive policy
without turning every change into an unbounded docs sweep.

## Minimum update rules by change type

| Change type                                                     | Required documentation action                                                                                                           |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime behavior or contract change                             | update the canonical spec or status doc that owns the behavior, then repair supporting maps that route readers there                    |
| Code path rename or file move                                   | update every active doc link that points to the old path; do not leave active docs pointing at renamed code                             |
| New or renamed doc under `docs/`                                | run `pnpm docs:sync` so governed indexes stay current                                                                                   |
| MVP task lifecycle change                                       | update the governing GitHub issue; do not create a local task mirror                                                                    |
| `docs:doctor` reports missing planning `last_reviewed` metadata | run `pnpm docs:planning:last-reviewed:backfill`, then explicitly re-review any doc whose content changed materially                     |
| Archive or supersede a doc pack                                 | move it to archive, add or update an archive index, and leave only a deliberate active pointer if readers still need historical context |
| Add or remove workspaces under `apps/` or `packages/`           | run DB-free `pnpm docs:status:generate --code-state-only`; do not create or commit a Repository Map copy                                |
| Explicitly publish documentation                                | run `pnpm docs:publish`; it imports Planning DB and assembles the untracked tree before `pnpm docs:serve` or `pnpm docs:build`          |

## Architecture and design consultation

Before consulting architecture or design, import current state if needed and
query its Planning DB authority:

```bash
pnpm planning:db:import --if-stale
pnpm planning:db:query architecture-designs --limit 100
```

Use the returned canonical evidence paths to choose authored context. Do not use
directory names, search similarity, or a rendered page as authority. Publication
is separate and on demand: run `pnpm docs:publish` only when requested.
`docs:serve` and `docs:build` do not generate documentation; they consume the
existing untracked publication tree.

## Archive rules

- Archive when the content is historical, superseded, draft-only, or no longer
  describes the shipped system.
- Do not keep obsolete packs active just because they are detailed.
- Before moving a subtree, verify it is not still the active reader route for a
  canonical surface.
- After moving a subtree, keep navigation explicit: add an archive index or
  update the active entrypoint to point at the archive deliberately.

## Code-alignment checklist

- Does the active doc reference the real file path that exists today?
- Does the doc use the current contract/version name?
- If a component page is only a summary, does it route to the canonical doc
  instead of carrying parallel design truth?
- If a planning proposal moved to archive, did every active reference move with
  it?
- If a runtime refactor renamed a service, did the repo map, component map, and
  canonical doc matrix stay aligned?

## Validation baseline

Run the applicable subset for the touched scope, and finish with the pre-push
baseline:

```bash
pnpm docs:sync
pnpm docs:doctor
pnpm docs:quality:check
pnpm docs:canonical:check
pnpm docs:gov:links
pnpm verify:prepush
```

If a command is intentionally not run, report that explicitly in the closeout.

## Navigation rule

Use [Documentation information architecture current vs target](../planning/status/documentation-information-architecture-current-vs-target-20260407.md)
as the current-state and target-state map, and use this guide as the
contributor procedure for keeping that map true.
