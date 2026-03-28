---
id: R-20260328-PLANNER-SCHEMA-VERSION-SYNC
title: Planner schema version and emitted plan version can drift without explicit governance checks
status: Open
date: 2026-03-28
owners:
  - planner
  - contracts
  - docs
severity: Low
probability: Medium
---

# R-20260328-PLANNER-SCHEMA-VERSION-SYNC

## Context

The planner version reset changed emitted `planVersion` semantics to `1.0`.
When schema contracts and emitted versions evolve separately, drift can compile
locally but break CI quality gates and downstream validation assumptions.

## Risk

If the schema constant and emitted version diverge again, CI and consumers can
observe contradictory plan version truth.

## Mitigation

- Keep planner contract schema and version registry updates in the same change
  set.
- Require ARC evidence and quality-risk traceability for planner-core version
  changes.
- Validate with `pnpm verify:prepush` and PR quality checks before merge.

## Evidence

- `packages/@dvt/planner/docs/contracts/PlanCore.schema.json`
- `docs/evidence/ED-20260328-planner-version-reset-signal-policy-wiring.md`
