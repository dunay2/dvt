---
title: Issue 2915 Generated Model SQL Projection Authority Closeout
status: Draft
date: 2026-09-04
owners:
  - Web / Canvas Model Authoring
issue: https://github.com/dunay2/dvt/issues/2915
featureId: GH-2915-GENERATED-MODEL-SQL-PROJECTION-AUTHORITY
---

# Issue 2915 Generated Model SQL Projection Authority Closeout

## Think-First reconciliation

The reported screen is not a wording defect. The current Model Code section
accepts edits, stores them as `metadata.config.sql`, labels the resulting
artifact `authored`, and bypasses generated projection behavior. The proposed
hard cut removes that parallel authority and keeps SQL as a read-only artifact
projection through `GenerateDbtWorkspaceArtifacts`.

This issue deliberately does not claim that the legacy `dbt:model` node already
stores the canonical typed Substrait document. Full shared Model/Transform
semantic convergence remains visible in issue #2903. Closing the immediate SQL
authority leak and closing the node-species migration are different changes.

## Governing sources used

- `AGENTS.md`.
- `docs/planning/status/governance-document-rule-inventory.md`.
- `docs/guides/ai-work-protocol.md`.
- `docs/planning/state/github-mvp-issue-workflow.md`.
- `docs/architecture/command-query-rail-governance.md`.
- `docs/architecture/fowler-opportunity-planning-governance.md`.
- `docs/adr/ADR-0060-dbt-project-authoring-authority.md`.
- `docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md`.
- `docs/architecture/system/subsystems/semantic-transformation/index.md`.
- `docs/architecture/components/web/graph/canvas-inspector-authoring-component.md`.
- `docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md`.
- `docs/planning/proposals/mandatory/frontend-and-ux/generated-model-sql-projection-authority-plan-20260904.md`.

The Planning DB architecture-design and creation-intent authorities were
queried first. The result requires reuse of `ConfigureCanvasDbtNode` and
`GenerateDbtWorkspaceArtifacts`; no parallel rail is allowed.

## Delivery record

Implementation, acceptance reconciliation, exact validation results,
obsolete behavior, and no-debt/no-stub evidence will be recorded here before
the issue is closed.
