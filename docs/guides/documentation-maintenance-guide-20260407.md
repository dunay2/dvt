---
title: Documentation maintenance guide
status: Active
owner: Architecture / Docs
last_reviewed: 2026-08-28
---

# Documentation maintenance guide

## Purpose

Keep active docs aligned with current code, planning state, and archive policy without turning every change into an unbounded docs sweep or accumulating historical packs that no longer add reader value.

## Minimum update rules by change type

| Change type | Required documentation action |
| --- | --- |
| Runtime behavior or contract change | update the canonical spec or status doc that owns the behavior, then repair supporting maps that route readers there |
| Code path rename or file move | update every active doc link that points to the old path; do not leave active docs pointing at renamed code |
| New or renamed doc under `docs/` | run `pnpm docs:sync` so governed indexes stay current |
| MVP task lifecycle change | update the governing GitHub issue; do not create a local task mirror |
| `docs:doctor` reports missing planning `last_reviewed` metadata | run `pnpm docs:planning:last-reviewed:backfill`, then explicitly re-review any doc whose content changed materially |
| Supersede a document | update the canonical replacement first; then archive or delete the old document according to the retention rule below |
| Add or remove workspaces under `apps/` or `packages/` | run DB-free `pnpm docs:status:generate --code-state-only`; do not create or commit a Repository Map copy |
| Explicitly publish documentation | run `pnpm docs:publish`; it imports Planning DB and assembles the untracked tree before `pnpm docs:serve` or `pnpm docs:build` |

## Architecture and design consultation

Before consulting architecture or design, import current state if needed and query its Planning DB authority:

```bash
pnpm planning:db:import --if-stale
pnpm planning:db:query architecture-designs --limit 100
```

Use the returned canonical evidence paths to choose authored context. Do not use directory names, search similarity, or a rendered page as authority. Publication is separate and on demand: run `pnpm docs:publish` only when requested. `docs:serve` and `docs:build` do not generate documentation; they consume the existing untracked publication tree.

## Retention and archive rules

The archive is **not** a landfill.

Apply this order:

1. **Update** an active document when it is still the canonical reader route and the underlying subject still exists.
2. **Consolidate** durable reasoning into the current canonical document when several documents describe the same decision.
3. **Archive** only when the historical artifact has unique evidence or context that is still deliberately useful to readers, auditors, or maintainers.
4. **Delete** a fully superseded pack when all useful rules have been promoted to active surfaces, it has no required backlinks/owner dependency, and Git history already preserves the historical snapshot.

Additional rules:

- Do not keep obsolete packs active just because they are detailed.
- Do not archive generated bundles merely to avoid deleting them.
- Do not preserve duplicate copies of policy/config/scripts inside documentation archives once the active repository surfaces own them.
- Before moving or deleting a subtree, verify backlinks, generated indexes, owner-active references, Planning DB authority, and evidence dependencies.
- ADRs, closeouts, evidence documents, generated indexes, and owner-active docs require explicit review; never delete or archive them mechanically.
- After a move or deletion, repair active navigation and run the applicable documentation governance checks.

## Code-alignment checklist

- Does the active doc reference the real file path that exists today?
- Does the doc use the current contract/version name?
- If a component page is only a summary, does it route to the canonical doc instead of carrying parallel design truth?
- If a planning proposal moved to archive, did every active reference move with it?
- If a runtime refactor renamed a service, did the repo map, component map, and canonical doc matrix stay aligned?
- If a historical pack was deleted, were all still-useful decisions first absorbed into canonical docs/config/code?

## Validation baseline

Run the applicable subset for the touched scope, and finish with the pre-push baseline:

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

Use [Documentation information architecture current vs target](../planning/status/documentation-information-architecture-current-vs-target-20260407.md) as the current-state and target-state map, and use this guide as the contributor procedure for keeping that map true.
