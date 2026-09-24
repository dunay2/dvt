---
title: S08 plan-store operations inventory drift guard
status: Accepted
date: 2026-05-14
owners:
  - '@dvt/contracts'
  - docs
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/test/plan-store-records.architecture.test.ts
  - docs/planning/status/system-operations-inventory-20260501.md
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- plan-store-records.architecture.test.ts
    - pnpm verify:prepush
---

# Summary

This evidence covers the S08 documentation drift fix that prevents the system
operations inventory from restating closed scoped plan-store drift as current
truth.

# Key checks

- The semantic architecture guard now rejects stale inventory claims that
  describe the scoped plan-store record family, Postgres repositories, or DDL as
  unscoped.
- The inventory now names the current scoped contract, schema pack, public
  re-export, engine integrity, and Postgres adapter posture.

# Risk posture

Residual drift risk is tracked in
`docs/risk-register/quality/R-20260514-S08-PLAN-STORE-INVENTORY-DRIFT.yaml`.
