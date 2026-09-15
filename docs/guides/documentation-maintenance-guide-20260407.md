---
title: Documentation maintenance guide
status: Active
owner: Architecture / Docs
last_reviewed: 2026-09-15
---

# Documentation maintenance guide

## Purpose

Keep active docs aligned with current code and the owning authorities. Historical
material belongs in Git, not in documentation archives or preservation summaries.

## Minimum update rules by change type

| Change type | Required documentation action |
| --- | --- |
| Runtime behavior or contract change | update the canonical spec or status doc that owns the behavior, then repair supporting maps that route readers there |
| Code path rename or file move | update every active doc link that points to the old path; do not leave active docs pointing at renamed code |
| New, renamed, or deleted doc under `docs/` | run `pnpm docs:sync` so governed indexes stay current |
| MVP task lifecycle change | update the governing GitHub issue; do not create a local task mirror |
| `docs:doctor` reports missing planning `last_reviewed` metadata | run `pnpm docs:planning:last-reviewed:backfill`, then explicitly re-review any doc whose content changed materially |
| Supersede a document | verify the current owning authority, reconcile consumers, then delete the obsolete document; do not create an archive copy |
| Add or remove workspaces under `apps/` or `packages/` | run DB-free `pnpm docs:status:generate --code-state-only`; do not create or commit a Repository Map copy |
| Explicitly publish documentation | run `pnpm docs:publish`; it queries current DB authority without importing and assembles the untracked tree |

## Architecture and design consultation

Before consulting architecture or design, query the existing Planning DB authority:

```bash
pnpm planning:db:query architecture-designs --limit 100
```

Use the returned canonical evidence paths to choose authored context. Do not use directory names, search similarity, or a rendered page as authority. If the DB is unavailable or stale, fail closed instead of importing as a side effect. Imports are explicit bootstrap or recovery operations. Publication is separate and on demand: run `pnpm docs:publish` only when requested. `docs:serve` and `docs:build` do not generate documentation; they consume the existing untracked publication tree.

## Retirement rules

1. **Update** a document only while it serves a current responsibility owned by
   code, contracts, Planning DB, or an active governance policy.
2. **Delete** obsolete reviews, completed one-off plans, duplicate snapshots, and
   superseded packs. Historical value alone is not a reason to keep a file.
3. **Reconcile** real consumers in the same change: links, generators, manifests,
   validators, and current evidence obligations. Do not keep a retired document
   just to satisfy a validator that only enforces the retired document itself.
4. **Preserve history in Git.** Do not move retired material to `archive/`,
   `_archive/`, `historical/`, or `superseded/`; do not create successor summaries
   or historical indexes solely to retain it.

Additional rules:

- Architecture remains in Planning DB. Do not reconstruct it from old Markdown.
- Check owner-active references, Planning DB, and evidence dependencies before
  deletion. A dated ADR, test fixture, contract, or evidence record can still
  enforce a current obligation; date or directory name alone is insufficient.
- Retire obsolete generators and their inputs together. Never disable unrelated
  product tests, integrity checks, hooks, or architecture gates to permit cleanup.
- Remove stale active navigation. When a current evidence obligation genuinely
  requires historical provenance, cite the exact Git revision from that existing
  record rather than retaining another document or creating a redirect.
- Record retirement scope and outstanding checks in the existing issue and PR,
  not in a new cleanup report or closeout file.

## Code-alignment checklist

- Does the active doc reference the real file path that exists today?
- Does the doc use the current contract/version name?
- Does a component page explain a current responsibility without becoming a
  second architecture authority?
- Have consumers of deleted proposals and snapshots been reconciled?
- Are maps and generated indexes derived from their existing owners?
- Is any retained evidence still required by a current obligation, rather than
  retained only for history?

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

If a command is intentionally not run, report that explicitly in the governing PR.

## Navigation rule

Use [Documentation information architecture current vs target](../planning/status/documentation-information-architecture-current-vs-target-20260407.md) as the current-state and target-state map, and use this guide as the contributor procedure for keeping that map true.
