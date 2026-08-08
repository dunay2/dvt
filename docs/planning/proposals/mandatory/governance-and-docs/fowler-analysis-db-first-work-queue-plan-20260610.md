---
title: Fowler Analysis Knowledge Queue Current Contract
status: Accepted
owner: Documentation Governance
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
archived_record: docs/planning/archive/proposals/fowler-analysis-db-first-work-queue-plan-20260610.md
---

# Fowler analysis knowledge queue

Documentation Governance owns the Fowler-analysis knowledge read models exposed
by the current query modules. Its disposition application port records
knowledge classification and canonical targets, never delivery task status;
delivery is tracked in GitHub Issues. This contract does not elevate names that
are absent from the current command/query catalog.

DDL and query views live only in `tools/planning-db/schema.sql`; governed
knowledge facts are imported from documents. Validation is
`node --test scripts/planning-db-import.test.cjs scripts/planning-db-query.test.cjs scripts/planning-db-operate.test.cjs`
and `pnpm verify:prepush`.

The detailed delivery record is historical and remains at `archived_record`.
