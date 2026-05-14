---
title: EA-20260429-07 start-run providerRef proof
status: Accepted
date: 2026-05-14
owners:
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/test/core/WorkflowEngine.intentLog.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.intentLog.test.ts
    - pnpm --filter @dvt/engine typecheck
    - pnpm verify:prepush
---

# EA-20260429-07 Start-Run ProviderRef Proof

## Summary

This evidence records the `EA-20260429-07` proof that
`WorkflowEngine.startRun` preserves provider-reference semantics across the
no-estimate bootstrap and bootstrap-failure compensation paths.

## Proof

- The no-estimate start path persists the exact `EngineRunRef` returned by
  `IProviderAdapter.startRun` as run metadata `providerRef`.
- When `bootstrapRunTx` fails after provider dispatch, the engine calls
  `IProviderAdapter.cancelRun` with the exact returned provider reference.
- The failed bootstrap path leaves no run metadata residue.
- The ADR-0030 intent is resolved best-effort with the returned provider
  reference recorded for reconciliation.

## Validation

The closeout validation for this evidence is the targeted engine intent-log
suite, engine typecheck, ARC check, docs synchronization, and repository
pre-push validation.
