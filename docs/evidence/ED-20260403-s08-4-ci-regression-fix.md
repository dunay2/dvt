---
title: S08-4 CI regression fix evidence
status: Accepted
date: 2026-04-03
owners:
  - '@dvt/adapter-postgres'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-core.integration.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresPlanStore.records-guards.integration.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-postgres exec vitest run --config vitest.config.ts test/PostgresPlanStore.records-core.integration.test.ts test/PostgresPlanStore.records-guards.integration.test.ts
---

# Summary

This evidence records the fix for PR 758 integration-smoke regressions after
main merge updates.

# What was fixed

- Isolated Postgres schemas per integration test case to remove cross-test
  state leakage for repeated `plan_id` values.
- Updated `createPlanRecord` missing-lineage fixture to remain contract-valid
  before asserting repository-level lineage errors.
- Updated supersession retry expectation to match current invariant evaluation
  order (`PLAN_RECORD_SUPERSEDER_ALREADY_LINKED`).

# Validation

- Targeted adapter-postgres integration suites now pass with
  `DVT_PG_INTEGRATION=1` against PostgreSQL 15.
