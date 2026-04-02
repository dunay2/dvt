---
title: Lane A WS5 intent-log fixture modularization
status: Accepted
date: 2026-03-30
owners:
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
evidence_class: critical
code_refs:
  - packages/@dvt/engine/test/core/WorkflowEngine.intentLog.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine build
    - pnpm --filter @dvt/engine test
    - pnpm verify:prepush
---

# Summary

This slice modularizes `WorkflowEngine.intentLog.test.ts` to use the shared
`createEngine` and adapter helper builders instead of repeated inline engine
construction blocks.

# Safety outcome

- Test behavior remains equivalent; only fixture construction was refactored.
- Intent lifecycle assertions remain unchanged and still cover ADR-0030 paths.
- Validation stayed green for package tests and repository pre-push gates.
