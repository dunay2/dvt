---
title: Planning Generated Artifacts Operations
status: Active
owner: Docs / Delivery / Architecture
last_reviewed: 2026-04-03
---

# Planning Generated Artifacts Operations

This runbook defines how to operate planning-generated pages that are
intentionally not tracked in git.

## Scope

Derived planning pages:

- `docs/planning/index.md`
- `docs/planning/proposals/index.md`
- `docs/planning/reviews/index.md`
- `docs/planning/status/index.md`
- `docs/planning/state/agent-lane-*.md`
- `docs/planning/state/execution-workboard.md`
- `docs/planning/state/open-task-route.md`

Canonical tracked inputs:

- `docs/planning/state/agent-lane-*.yaml`
- tracked planning docs (control tower, portfolio maps, proposals, reviews,
  closeouts, roadmap)

## Standard local workflow

1. Regenerate tracked docs indexes and lane views:
   `pnpm docs:sync`
2. Regenerate workboard views:
   `pnpm docs:workboard:generate`
3. Validate planning generated artifacts:
   `pnpm docs:workboard:check`
4. Validate pre-push baseline:
   `pnpm verify:prepush`

For isolated local preview that must not touch tracked docs files:

- `pnpm docs:planning:preview:isolated`

## CI expectations

- `PR Quality Gate` runs `pnpm docs:sync:check` for tracked generated docs.
- `PR Quality Gate` runs `pnpm docs:workboard:check` for planning-generated
  artifact integrity and determinism.
- planning-generated pages must not be tracked in git.

## Failure triage

When `pnpm docs:workboard:check` fails:

1. Confirm lane source files exist:
   `docs/planning/state/agent-lane-*.yaml`
2. Run:
   `pnpm docs:planning:generated:check`
3. If marker checks fail, compare generated pages with script expectations in
   `scripts/docs-planning-generated-check.cjs`.
4. If determinism fails, run the same command twice and diff outputs.
5. If "must not be tracked in git" fails, untrack files and commit the removal.

## Incident rollback mode (temporary)

Use only for incident containment when docs publication is blocked.

1. Open an incident PR documenting cause and rollback scope.
2. Temporarily re-track only the minimal generated planning pages required for
   release continuity.
3. Add a follow-up task to restore untracked mode within one sprint.
4. Re-enable `docs:planning:generated:check` fail-closed behavior before
   incident closure.

## Operational metrics

Track for two sprint cycles:

- merge conflicts touching extracted planning pages
- docs CI failures in `docs:workboard:check`
- docs-only PR lead time before/after extraction

Expected trend: lower merge conflict rate with stable CI pass rate.
