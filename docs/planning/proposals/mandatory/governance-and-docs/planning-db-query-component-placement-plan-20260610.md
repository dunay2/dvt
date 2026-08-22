---
title: Planning DB Query Component Placement Current Contract
status: Accepted
owner: Architecture Governance
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
archived_record: docs/planning/archive/proposals/planning-db-query-component-placement-plan-20260610.md
---

# Planning DB query component placement

Every Planning DB query module belongs to the component that owns its read
model. Current catalog, creation-intent, feature-mechanization, and knowledge
queries are routed by `scripts/planning-db-query.cjs`; the router contains no
business semantics.

Query structures live only in `tools/planning-db/schema.sql`; component and
rail evidence lives in Planning DB and is read through governed queries.
Validation is `node --test scripts/planning-db-query.test.cjs scripts/planning-db-import.test.cjs`
and `pnpm verify:prepush`.

The detailed delivery record is historical and remains at `archived_record`.
