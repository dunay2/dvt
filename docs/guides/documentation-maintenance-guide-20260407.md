---
title: Documentation maintenance guide
status: Active
owner: Architecture / Docs
last_reviewed: 2026-04-07
---

# Documentation maintenance guide

## Purpose

Keep active docs aligned with current code, planning state, and archive policy
without turning every change into an unbounded docs sweep.

## Minimum update rules by change type

| Change type                                           | Required documentation action                                                                                                           |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime behavior or contract change                   | update the canonical spec or status doc that owns the behavior, then repair supporting maps that route readers there                    |
| Code path rename or file move                         | update every active doc link that points to the old path; do not leave active docs pointing at renamed code                             |
| New or renamed doc under `docs/`                      | run `pnpm docs:sync` so governed indexes stay current                                                                                   |
| Planning task or lane state change                    | edit `docs/planning/state/agent-lane-*.yaml`, then run `pnpm docs:workboard:generate`                                                   |
| Archive or supersede a doc pack                       | move it to archive, add or update an archive index, and leave only a deliberate active pointer if readers still need historical context |
| Add or remove workspaces under `apps/` or `packages/` | run `pnpm docs:status:generate` before closing the slice                                                                                |

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
pnpm docs:workboard:generate
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
