---
title: DHM effective component ownership Fowler analysis
status: Draft
date: 2026-05-14
owner: codex
planning_type: analysis
---

# DHM effective component ownership Fowler analysis

## Governing sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/proposals/mandatory/governance-and-docs/create-governance-component-command-rail-design-20260514.md`
- `docs/planning/proposals/mandatory/governance-and-docs/component-engineering-composite-hierarchy-plan-20260513.md`

## Fowler analysis

The previous DHM slice created DB-authored child components, but file ownership
still came only from generated imports. That left a split brain: the DB knew the
semantic children, while the ownership projection still treated the parent as
the leaf owner for files.

The mature-system correction is to keep authored intent and generated evidence
separate, then compute effective ownership in the read model:

- local command definitions are the authored override
- generated governance files remain the exhaustive tracked-file baseline
- `component_engineering.file_ownership_query` reconciles both
- `component_engineering.component_quality_query` uses effective ownership for
  size and test counts

## Result

`SYS-RUNTIME-ENGINE-START-RUN-ADMISSION` now owns its matched files in the DB
query surface and reports size metrics from the effective ownership model.

The remaining `SYS-RUNTIME-ENGINE-START-RUN` drift is not the old service-file
noise. It is limited to test and fixture files that have not yet been assigned
to child components. That is a better Fowler signal: the next component split
should decide whether tests are owned by the same leaf components or by a
separate start-run verification component.

## Next opportunity

Add explicit DB-authored test ownership for start-run tests and fixtures, then
decide whether tests follow production components or are grouped under a
verification child component with its own invariants and consumers.
