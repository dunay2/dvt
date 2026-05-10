---
title: Closeout - GOV-S3 W18 docs disposition queue
status: Review
owner: Product / Architecture / Docs / Delivery
last_reviewed: 2026-05-10
planning_type: closeout
slice: 20260510-gov-s3-w18-docs-disposition-queue
---

# Closeout: GOV-S3 W18 Docs Disposition Queue

## Think-First Analysis

### Problem Summary

The docs cleanup inventory proved that active documentation contains draft or
superseded posture, pending-style markers, and many task-like references that
are expensive to inspect by hand. That status snapshot was useful evidence, but
it could not become a second workboard or a manual queue.

### Root Cause

The planning and governance corpus already had a DB-backed operational source,
but docs disposition still lived as an ad hoc scan. That kept cleanup decisions
outside the query-store rails and made repeated scans reclassify the same
frontmatter, marker, and task-like-reference signals.

### Constraints And Invariants

- `AGENTS.md`: no hidden debt, no stubs, no skipped gates, and closeout evidence
  is mandatory.
- `docs/planning/status/governance-document-rule-inventory.md`: planning and
  docs changes must route through the governed documentation and validation
  surfaces.
- `docs/guides/ai-work-protocol.md`: planning DB work must use documented
  command/query rails and close with package plus pre-push validation.
- `docs/architecture/command-query-rail-governance.md`: externally observable
  operator queries must reuse or declare command/query rails before
  implementation.
- `docs/architecture/fowler-opportunity-planning-governance.md`: the slice
  addresses hidden query models and documentation drift through a planned
  matrix.
- `docs/adr/adr-0055-planning-db-canonical-operational-source.md`: the local
  Postgres database is the canonical operational source while Git remains the
  review, bootstrap, and recovery boundary.
- `docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md`:
  GOV-S3 W18 owns the docs-disposition query-store slice.

### Options Considered

1. Keep the disposition inventory as a status document.
   Rejected because it would become a stale parallel queue.
2. Create lane tasks for every suspicious task-like reference.
   Rejected because many references are valid non-task identifier classes.
3. Import docs disposition signals into Postgres and expose query rows.
   Selected because it keeps Git as the source corpus while making triage
   repeatable, filterable, and auditable.

### Selected Option And Rationale

W18 adds normalized docs-disposition tables and query views, imports tracked
Markdown frontmatter, pending markers, and task-like references during
`planning:db:import`, then exposes operator-facing queues through
`planning:db:query docs-disposition` and `planning:db:query task-references`.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - update the GOV-S3 proposal with W18 design and status;
  - add migration 017 for docs disposition documents, markers, references, and
    actions;
  - add import classification and insertion logic;
  - add query commands for docs-disposition and task-references;
  - add migration, import, query, and catalog test coverage;
  - close the slice with governed docs and DB validation.
- Touched files or paths:
  - `docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md`
  - `docs/planning/closeouts/20260510-gov-s3-w18-docs-disposition-queue-closeout.md`
  - `tools/planning-db/migrations/017_docs_disposition_queue.sql`
  - `scripts/planning-db-import.cjs`
  - `scripts/planning-db-import.test.cjs`
  - `scripts/planning-db-migrate.test.cjs`
  - `scripts/planning-db-query.cjs`
  - `scripts/planning-db-query.test.cjs`
- Expected outcome:
  - docs disposition is queryable from the planning/governance DB;
  - valid non-task identifier classes do not become cleanup actions;
  - unknown task-like references remain visible for later reconciliation.
- Risks and mitigations:
  - risk: false positives flood the queue
    mitigation: classify ARC levels, governance units, command references,
    PlanStore matrix references, algorithm references, and historical planning
    reference families separately from unknown IDs;
  - risk: archived or superseded paths create active cleanup actions
    mitigation: mark archive, archive-path, superseded-path, and `_archive`
    documents inactive for disposition actions;
  - risk: DB is treated as hidden authority
    mitigation: import from tracked docs and keep Git as review/bootstrap.
- Out-of-scope items:
  - archiving, promoting, or rewriting any document;
  - creating new lane tasks from unknown references;
  - replacing Git review with DB-only state.
- Validation plan:
  - `node --test scripts/planning-db-import.test.cjs scripts/planning-db-query.test.cjs scripts/planning-db-migrate.test.cjs`
  - `pnpm test:planning:db`
  - `node --test tools/ci/repository-command-catalog.test.mjs`
  - `pnpm docs:feature-mechanization -- --feature GOV-S3-PLANNING-STATE-QUERY-STORE`
  - `pnpm planning:db:migrate`
  - `pnpm planning:db:import`
  - `pnpm planning:db:query docs-disposition --limit 10`
  - `pnpm planning:db:query task-references --kind unknown_task_like_id --limit 10`
  - `pnpm planning:db:query task-references --kind arc_level --limit 5`
  - `pnpm test:planning:db:integration`
  - `pnpm docs:sync`
  - `pnpm governance:refresh`
  - `pnpm docs:feature-mechanization:implementation`
  - `pnpm verify:prepush`
- Test coverage plan:
  - migration test for the new tables and views;
  - import tests for active and archived documents, marker counts, identifier
    classification, and action creation;
  - query tests for argument parsing, DB view SQL, summary counts, and output
    formatting.
- Libraries evaluated:
  - None evaluated - no new external library needed.
- Command/query rail impact:
  - reused `ImportGovernanceStateQueryStore` for import;
  - reused `QueryGovernanceStateReadModel` and added
    `QueryDocsDispositionQueue` for operator query access.

## Final Closeout

### Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/DOCS_README.md`
- `docs/guides/ai-work-protocol.md`
- `docs/guides/testing-and-ci-capabilities.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/adr/adr-0055-planning-db-canonical-operational-source.md`
- `docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md`

### Real Work Performed

- Added the W18 docs-disposition queue design and implementation status to the
  GOV-S3 proposal.
- Added migration 017 for docs disposition documents, markers, task-like
  references, actions, and query views.
- Extended planning DB import to build and insert docs disposition snapshots.
- Extended planning DB query output with `docs-disposition` and
  `task-references`.
- Added focused migration, import, and query coverage for the new DB read model.
- Added this closeout as the governed completion record.

### Validation Evidence

- `node --test scripts/planning-db-import.test.cjs scripts/planning-db-query.test.cjs scripts/planning-db-migrate.test.cjs`
  - passed; 62/62 tests.
- `pnpm test:planning:db`
  - passed; 120/120 tests.
- `pnpm planning:db:health`
  - passed; local Postgres accepted connections.
- `node --test tools/ci/repository-command-catalog.test.mjs`
  - passed; 7/7 tests.
- `pnpm docs:feature-mechanization -- --feature GOV-S3-PLANNING-STATE-QUERY-STORE`
  - passed.
- `pnpm planning:db:migrate`
  - passed; `applied=0 skipped=17`.
- `pnpm planning:db:import`
  - passed after the classifier hardening; imported 5 lanes, 336 tasks, 4326
    governance files, 342 repository commands, and 1250 docs disposition
    actions.
- `pnpm planning:db:query docs-disposition --limit 10`
  - passed; returned draft, superseded, and unknown-reference actions from the
    DB queue.
- `pnpm planning:db:query task-references --kind unknown_task_like_id --limit 10`
  - passed; returned remaining unknown task-like references for future
    reconciliation.
- `pnpm planning:db:query task-references --kind arc_level --limit 5`
  - passed; confirmed `ARC-*` references are classified as `arc_level`, not
    unknown cleanup actions.
- `pnpm planning:db:query`
  - passed before adding this closeout; summary reported
    `docs.disposition_actions: 1250` and
    `docs.task_like_references.unknown: 1115`.
- `pnpm test:planning:db:integration`
  - passed; 3/3 live DB integration tests.
- `pnpm docs:sync`
  - passed; docs indexes and generated planning lane views were already up to
    date.
- `pnpm governance:refresh`
  - first run failed at `governance:db:check` with stale governance source
    hashes after generated surface stabilization.
- `pnpm planning:db:import`
  - passed after the failed refresh; reimported 5 lanes, 336 tasks, 4327
    governance files, 342 repository commands, and 1252 docs disposition
    actions.
- `pnpm governance:db:check`
  - passed after the reimport, confirming the failed refresh was stale DB state
    rather than a drift defect.
- `pnpm governance:refresh`
  - passed on rerun; ran docs sync/status/capability/manifest generation,
    governance indexes, planning DB import, workboard generation,
    planning DB check, planning DB export check, governance DB check, and
    governance DB export check.
- `pnpm planning:db:query`
  - passed after final refresh; summary reported
    `docs.disposition_documents: 1534`, `docs.disposition_actions: 1252`,
    `docs.task_like_references: 5810`, and
    `docs.task_like_references.unknown: 1117`.
- `pnpm docs:feature-mechanization:implementation`
  - passed; 48 feature-mechanization manifests checked.
- `pnpm governance:refresh`
  - final rerun after closeout evidence update passed.
- `pnpm verify:prepush`
  - passed.

### No-Debt Evidence

- No debt entry was created.
- No rule, hook, lint, type, test, docs, or quality gate was disabled or
  relaxed.
- No `--no-verify` or equivalent bypass was used.
- Remaining unknown task-like references are surfaced as deliberate follow-up
  query output, not hidden or converted to fake tasks.

### No-Stub Evidence

- No stubs, placeholders, fake adapters, fake success paths, TODO/FIXME markers,
  or unfinished branches were added.
- The import and query paths execute against the real planning DB schema and
  live local Postgres query store.

### Residual Scope

- Future cleanup PRs should reconcile the remaining unknown task-like references
  by class before creating new lane tasks.
- This slice does not archive, promote, or rewrite any affected docs.
