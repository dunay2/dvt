---
title: Component Engineering Composite Hierarchy Current Contract
status: Accepted
owner: Architecture Governance
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
archived_record: docs/planning/archive/proposals/component-engineering-composite-hierarchy-plan-20260513.md
---

# Component engineering composite hierarchy

The Component Engineering bounded context owns the component-tree, rule,
evaluation, and quality read models implemented by the current query modules.
Its cross-cutting integrity rail is `ValidateComponentIntegrity`; this contract
does not revive names that are absent from the current catalog.

Hierarchy DDL and query views are declared only in
`tools/planning-db/schema.sql`; current components, relations, ownership, and
rules live in Planning DB and are read through governed queries.
Validation is `node --test scripts/planning-db-import.test.cjs scripts/planning-db-query.test.cjs scripts/planning-db-integrity-check.test.cjs`
and `pnpm verify:prepush`.

The detailed delivery record is historical and remains at `archived_record`.
