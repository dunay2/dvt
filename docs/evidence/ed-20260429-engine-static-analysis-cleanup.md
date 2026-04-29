---
title: Engine static analysis cleanup for admission and error-message seams
status: Accepted
date: 2026-04-29
owners:
  - dvt/engine
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/application/RecoverRunApplicationService.ts
  - packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts
  - packages/@dvt/engine/src/application/StartRunApplicationService.ts
  - packages/@dvt/engine/src/contracts/errors/errorMessages.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine typecheck
    - pnpm --filter @dvt/engine test -- StartRunApplicationService.test.ts errorI18n.contract.test.ts
    - pnpm verify:prepush
---

This ARC-2 evidence records a behavior-preserving cleanup of engine application
and error-message seams after static-analysis review.

The change keeps admission policy behavior and default engine error messages
stable while replacing high-argument and large-method shapes with typed request
objects and an exhaustive renderer registry. No compatibility shim, placeholder,
or runtime bypass was introduced.
