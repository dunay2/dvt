---
title: DB-First Architecture Authority Current Contract
status: Accepted
owner: Architecture Governance
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
archived_record: docs/planning/archive/proposals/db-first-architecture-authority-plan-20260515.md
---

# DB-first architecture authority

Architecture Governance owns the verified `CreateArchitectureDesign`,
`RecordArchitectureComponent`, and `RecordArchitectureRelation` commands. Read
access reuses the current architecture design and component query modules.

The application ports operate on the current Planning DB. Structural DDL lives
only in `tools/planning-db/schema.sql`; designs, scopes, components, relations,
and responsibilities live only in Planning DB and are read through governed
queries.
Validation is `node --test scripts/planning-db-operate.test.cjs scripts/planning-db-query.test.cjs scripts/planning-db-current-schema-policy.test.cjs`
and `pnpm verify:prepush`.

The detailed delivery record is historical and remains at `archived_record`.
