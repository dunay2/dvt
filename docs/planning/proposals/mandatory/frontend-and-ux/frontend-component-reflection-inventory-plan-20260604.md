---
title: Frontend Component Reflection Inventory Current Contract
status: Accepted
owner: Web / Governance
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
archived_record: docs/planning/archive/proposals/frontend-component-reflection-inventory-plan-20260604.md
---

# Frontend component reflection inventory

The frontend-governance read model owns `ListFrontendComponentReflection`.
Source extraction is implemented by `scripts/planning-db/frontend-component-inventory.cjs`
and imported through the existing Planning DB import rail. Its tables and views
are declared in `tools/planning-db/schema.sql`; current architecture facts live
in Planning DB and are read through governed queries.

Validation is `node --test scripts/planning-db-frontend-component-inventory.test.cjs scripts/planning-db-import.test.cjs scripts/planning-db-query.test.cjs`
and `pnpm verify:prepush`.

The detailed delivery record is historical and remains at `archived_record`.
