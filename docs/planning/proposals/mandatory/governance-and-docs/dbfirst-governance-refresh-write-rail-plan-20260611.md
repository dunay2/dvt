---
title: DB-First Governance Refresh Current Contract
status: Accepted
owner: Governance Automation
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
archived_record: docs/planning/archive/proposals/dbfirst-governance-refresh-write-rail-plan-20260611.md
---

# DB-first governance refresh

Governance Automation owns the verified `GovernanceRefresh` command and its
current run-ledger query module. One refresh transaction regenerates governed
projections, rebuilds/imports Planning DB when stale, validates the result, and
records the run. Callers must not prepend a second database rebuild.

Implementation is `scripts/governance-refresh.cjs`; DDL is owned by
`tools/planning-db/schema.sql`; current architecture data lives in Planning DB
and is read through governed queries. Validation is
`node --test scripts/governance-refresh.test.cjs scripts/pr-closeout.test.cjs`
and `pnpm verify:prepush`.

The detailed delivery record is historical and remains at `archived_record`.
