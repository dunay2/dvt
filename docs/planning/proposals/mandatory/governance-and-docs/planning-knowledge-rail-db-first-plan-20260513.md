---
title: Planning Knowledge Rail Current Contract
status: Accepted
owner: Documentation Governance
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
archived_record: docs/planning/archive/proposals/planning-knowledge-rail-db-first-plan-20260513.md
---

# Planning knowledge rail

Documentation Governance owns the planning-knowledge importer and the current
document, action, and proposal-binding-gap query modules. Knowledge actions are
searchable facts; they are not local tasks and carry no execution state. This
contract does not declare rail names absent from the current catalog.

Knowledge DDL and views live only in `tools/planning-db/schema.sql`; extraction
is implemented in `tools/planning-db/knowledge`. Validation is
`node --test tools/planning-db/knowledge/documentSnapshot.test.cjs scripts/planning-db-import.test.cjs scripts/planning-db-query.test.cjs`
and `pnpm verify:prepush`.

The detailed delivery record is historical and remains at `archived_record`.
