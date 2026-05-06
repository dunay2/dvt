---
title: Governed Changed Slice Closeout
status: Active
owner: Architecture / Delivery / Docs
last_reviewed: 2026-05-06
---

# Governed Changed Slice Closeout

Use this runbook when a local slice is ready for closeout and the changed files
may require generated docs, governance hashes, workboard views, or prepush
validation.

The canonical helper is:

```bash
pnpm closeout:changed
```

Preview the exact sequence first with:

```bash
pnpm closeout:changed --dry-run
```

## What It Runs

The helper reads the local changed-file set and builds a deterministic closeout
sequence:

- `pnpm docs:sync` when files under `docs/` changed;
- `pnpm docs:workboard:generate` when lane YAML changed;
- `pnpm docs:status:generate` when `apps/` or `packages/` source structure
  changed;
- governance regeneration for manifest, document-unit map, file-component
  index, fingerprints, impact, coverage report, and remediation queue;
- a final file-component and fingerprint stabilization pass before validation;
- `git diff --check` and `git diff --cached --check`;
- an internal unresolved-conflict-marker scan over changed text files;
- `pnpm verify:prepush`.

The helper does not commit, push, create a PR, bypass hooks, relax checks, or
replace package-specific tests required by the active slice. It only removes
manual ordering and memory from the standard closeout path.

## Before Running

Check the worktree:

```bash
git status --short --branch
```

If unrelated untracked docs are present, isolate or resolve them before running
the closeout helper. Documentation generators scan the filesystem, so an
untracked local snapshot under `docs/` can legitimately affect generated
indexes even when it is not part of the intended slice.

## Closeout Evidence

After the helper passes, record:

- governing sources used for the slice;
- files actually changed;
- exact validation commands run, including `pnpm closeout:changed`;
- whether package-specific tests were also required and run;
- no debt, no stubs, no skipped checks, and no hook bypass.
