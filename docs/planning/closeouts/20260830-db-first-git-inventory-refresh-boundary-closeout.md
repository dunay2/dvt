---
title: DB-First Git Inventory Refresh Boundary Closeout
status: Accepted
owner: Architecture / CI Governance / Planning DB
last_reviewed: 2026-08-30
planning_type: closeout
task_ids:
  - GH-2749
---

# DB-first Git inventory refresh boundary closeout

## Problem and decision

Routine documentation, governance, publication, closeout, and validation
commands rebuilt Planning DB before evaluating Git-owned repository state.
Stale checks reduced some work but preserved the wrong authority boundary and
made broad projection writes look like a read prerequisite.

The implemented split is explicit:

- Git owns physical repository inventory, tracked contents, hashes, symbols,
  documentation structure, and local generated indexes.
- Planning DB owns operated architecture, components, capabilities, relations,
  command/query rails, feature mechanization, overlays, and audit facts.
- Routine commands may query existing Planning DB authority and may write a
  bounded command audit, but they do not import or rebuild its projections.
- `planning:db:import` and `governance:db:import` remain explicit bootstrap or
  recovery commands, including declared empty-DB preparation in CI.

The alternatives, diagrams, Fowler analysis, rail mapping, negative paths, and
implementation surfaces are recorded in the
[implementation plan](../proposals/mandatory/governance-and-docs/db-first-git-inventory-refresh-boundary-plan-20260830.md).

## Work performed

- Reduced `docs:sync` to its owned index synchronization command. It still
  reads Planning DB lifecycle authority and fails closed, but it no longer
  starts, health-checks, or imports the database.
- Changed `governance:refresh` to converge Git-derived status, manifest,
  document/component indexes, fingerprints, coverage, and remediation. Its
  only Planning DB write is the bounded refresh-run audit.
- Removed import stages from PR closeout, focused validation, full pre-push
  planning checks, and documentation publication.
- Kept documentation publication DB-first by querying existing lifecycle and
  architecture authority without falling back to Git semantics or importing.
- Corrected Planning DB connection guidance so an unavailable server suggests
  starting the existing authority; import is described only as explicit
  bootstrap or recovery.
- Aligned `AGENTS.md`, canonical workflow architecture, contributor guides,
  component guidance, and the changed-slice closeout runbook with the same
  authority boundary.
- Recorded architecture design
  `GOV-DB-FIRST-GIT-INVENTORY-BOUNDARY-20260830` and revised the existing
  `GovernanceRefresh`, `ImportPlanningGovernanceQueryStore`, and
  `PublishPlanningDbDerivedProjections` rails through governed Planning DB
  commands. No SQL or import was used for those writes.

## Red/green evidence

- The initial command-graph suite failed at the intended old boundaries:
  `docs:sync`, governance database stages, closeout, pre-push, changed-slice
  validation, and publication still exposed import behavior.
- The connection-error negative test separately failed while a simple
  `ECONNREFUSED` still instructed the operator to rebuild Planning DB.
- After implementation, the combined targeted suite passed `330/330` and the
  focused connection-error test passed `1/1`.
- The real `pnpm governance:refresh` stabilized in two passes. Its complete
  trace contained Git-derived generators plus the bounded run audit and no
  `planning:db:import` or `governance:db:import` invocation.
- The scoped feature-mechanization implementation check passed against `213`
  DB manifests after the three reused rails were refreshed with the current
  plan hash and Fowler governance source.

## Validation executed

- `node --test tools/ci/sync-docs-status-policy.test.mjs tools/ci/workflow-pattern-parity.test.mjs scripts/governance-refresh.test.cjs scripts/pr-closeout.test.cjs scripts/verify-changed.test.cjs scripts/verify-prepush.test.cjs scripts/documentation-publication.test.cjs scripts/planning-db-query.test.cjs`
  — passed `330/330`.
- `pnpm docs:sync` — passed and performed no import.
- `pnpm governance:refresh` — passed after two convergence passes and performed
  no import.
- `node scripts/check-feature-mechanization.cjs --feature GOV-DB-FIRST-GIT-INVENTORY-BOUNDARY-20260830 --implementation`
  — passed against `213` DB manifests.
- `pnpm docs:ci` — reached the global ADR catalog check and failed because
  ADR-0016 and superseded ADR-0055 are absent from `docs/adr/index.md`; the same
  absence exists on `origin/main` and was not caused or hidden by this slice.

The committed-tree pre-push gate, ARC evaluation, PR-title validation, and
remote CI run after this closeout is hook-normalized and committed.

## Debt and stub evidence

No debt entry, stub, placeholder, fake implementation, TODO/FIXME, parallel
command/query rail, quality-rule relaxation, skipped hook, or SQL bypass was
introduced. Explicit import commands and ephemeral empty-DB preparation remain
available; only their hidden use in routine flows was removed.
