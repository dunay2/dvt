---
title: AR-B5 Lineage Worker Runtime Decomposition Current Contract
status: Accepted
owner: Engine / Temporal
last_reviewed: 2026-08-08
planning_type: mandatory-proposal
archived_record: docs/planning/archive/proposals/ar-b5-lineage-worker-runtime-decomposition-plan-20260507.md
---

# AR-B5 lineage worker runtime decomposition

The lineage runtime bounded context owns its internal orchestration application
port. Production behavior remains in the engine and Temporal adapters; this
contract does not assert a Planning DB rail for that runtime-only behavior.
Planning DB contains current component, relation, responsibility, and evidence
facts and exposes them through governed queries.

Validation is the affected engine and Temporal package tests, architecture
integrity checks, and `pnpm verify:prepush`. Product runtime persistence remains
outside the Planning DB boundary.

The detailed delivery record is historical and remains at `archived_record`.
