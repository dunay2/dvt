---
title: S08-4 Postgres three-part model ARC-2 evidence
status: Accepted
date: 2026-04-03
owners:
  - '@dvt/adapter-postgres'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts
  - packages/@dvt/adapter-postgres/test/PostgresPlanStore.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-postgres build
    - pnpm --filter @dvt/adapter-postgres typecheck
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm verify:prepush
---

# Summary

This slice evolves `PostgresPlanStore` to persist the S08 three-part model
(`plan_records`, executability records, admission links) while preserving
compatibility with the existing plan validation lifecycle facade.

# Key checks

- Adapter package build and typecheck pass.
- Adapter test suite passes locally.
- Pre-push baseline (`pnpm verify:prepush`) passes.
- Integration smoke regression was addressed by fixing plan-store integration
  fixtures to satisfy canonical `PlanRecord` contract constraints
  (`planId` format and metadata version fields).

# Risk posture

Residual risk is tracked in
`docs/risk-register/quality/R-20260403-S08-4-POSTGRES-THREE-PART-MODEL.yaml`.
