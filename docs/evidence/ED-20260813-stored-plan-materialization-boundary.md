---
title: Stored plan materialization boundary convergence
status: Accepted
date: 2026-08-13
owners:
  - packages/@dvt/engine
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts
  - apps/api/src/application/services/StoredExecutablePlanResolver.ts
  - apps/api/src/application/services/StoredPlanExecutabilityValidator.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine test -- workflowEngineBoundaryOwnership.architecture.test.ts
    - pnpm --filter dvt-api test:unit
    - pnpm --filter dvt-api test:integration:ci
    - pnpm arch:deps
    - pnpm verify:prepush
---

## Summary

Stored-plan artifact access remains owned by `@dvt/artifacts`, while API
materialization now has one implementation for reader-mode selection, hash
verification, canonical parsing and `PlanRef` alignment. The executability
validator consumes that materializer and retains adapter, step-kind and
capability decisions only.

The engine architecture guard now verifies this surviving boundary instead of
requiring the validator to import the artifact port directly. No engine runtime
code, public contract, plan format, adapter, migration or compatibility path
changed.
