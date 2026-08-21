---
title: Feature Mechanization Read Model Current Contract
status: Accepted
owner: Architecture Governance
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
archived_record: docs/planning/archive/proposals/feature-mechanization-db-first-read-model-plan-20260605.md
---

# Feature mechanization read model

Architecture Governance owns the verified `RecordFeatureMechanizationRail` and
`ValidateFeatureMechanizationImplementation` commands plus the existing
feature-mechanization list queries. Markdown manifests are imported evidence;
DB-authored current decisions remain authoritative.

DDL and read views live only in `tools/planning-db/schema.sql`. Current
DB-authored decisions live only in Planning DB and are read through governed
queries.
Validation is `pnpm docs:feature-mechanization:implementation`,
`node --test scripts/planning-db-import.test.cjs scripts/planning-db-query.test.cjs scripts/planning-db-operate.test.cjs`,
and `pnpm verify:prepush`.

The detailed delivery record is historical and remains at `archived_record`.
