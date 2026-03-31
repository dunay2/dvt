---
title: Lane A WS5-B engine test fixture modularization
status: Accepted
date: 2026-03-31
owners:
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/test/helpers/workflowEngine.fixture.ts
  - packages/@dvt/engine/test/core/WorkflowEngine.helpers.ts
  - packages/@dvt/engine/test/contracts/engine.test.ts
  - packages/@dvt/engine/test/contracts/capabilities.contract.test.ts
  - packages/@dvt/engine/test/contracts/executionPlan.contract.test.ts
  - packages/@dvt/engine/test/security/authorizer.deny.test.ts
  - packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts
  - packages/@dvt/engine/test/services/RunMaintenanceService.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine build
    - pnpm --filter @dvt/engine test
    - pnpm verify:prepush
---

# Summary

This slice closes `DHM-WS5-B` by promoting shared infrastructure-only engine
test setup into `packages/@dvt/engine/test/helpers/workflowEngine.fixture.ts`
and migrating the remaining helper-heavy `contracts`, `security`, `core`, and
`services` suites away from inline `WorkflowEngine` and
`WorkflowEngineCoreService` construction.

# Safety outcome

- Test semantics remain unchanged; the refactor only centralizes constructor
  wiring, clocks, stores, policy defaults, and adapter-map assembly.
- Remaining plan-specific, authorization-specific, and maintenance-specific
  fixtures stay local to the suites that own those semantics.
- Package build, package tests, and repository pre-push validation all stayed
  green after the migration.
