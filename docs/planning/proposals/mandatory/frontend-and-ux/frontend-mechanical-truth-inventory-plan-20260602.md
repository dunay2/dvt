---
title: Frontend Mechanical Truth Inventory Current Contract
status: Accepted
owner: Web / Governance
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
archived_record: docs/planning/archive/proposals/frontend-mechanical-truth-inventory-plan-20260602.md
---

# Frontend mechanical truth inventory

The frontend-governance read model owns `ListFrontendMechanicalTruthSurfaces`.
The extractor and importer derive facts from the current frontend source; the
Planning DB structures are declared in `tools/planning-db/schema.sql`, while
current architectural facts live in Planning DB and are read through governed
queries.

Validation is `node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs scripts/planning-db-import.test.cjs scripts/planning-db-query.test.cjs`
and `pnpm verify:prepush`.

The detailed delivery record is historical and remains at `archived_record`.
