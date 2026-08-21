---
title: Create Governance Component Rail Current Contract
status: Accepted
owner: Architecture Governance
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
archived_record: docs/planning/archive/proposals/create-governance-component-command-rail-design-20260514.md
---

# Create governance component rail

Architecture Governance owns the verified `CreateGovernanceComponent` command.
Writes go through its existing architecture application port and are exported
as current state; reads reuse the current component query modules.

DDL and validation functions live only in `tools/planning-db/schema.sql`.
Components, relations, responsibilities, and rail evidence live only in
Planning DB and are read through governed queries. Validation is
`node --test scripts/planning-db-operate.test.cjs scripts/planning-db-query.test.cjs scripts/planning-db-current-schema-policy.test.cjs`
and `pnpm verify:prepush`.

The detailed delivery record is historical and remains at `archived_record`.
