---
title: Command Query Rail Catalog Current Contract
status: Accepted
owner: Architecture Governance
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
---

# Command/query rail catalog

Architecture Governance owns the verified `ImportCommandQueryRailCatalog`
command. The catalog query modules derive documented rails and source
references; they must not invent a parallel rail for existing intent.

DDL, functions, and read views live only in `tools/planning-db/schema.sql`.
Current DB-authored rail facts live only in Planning DB and are read through
governed queries. Validation is
`node --test scripts/planning-db-import.test.cjs scripts/planning-db-query.test.cjs`
and `pnpm verify:prepush`.
