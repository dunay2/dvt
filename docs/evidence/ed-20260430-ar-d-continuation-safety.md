---
title: AR-D continuation safety hardening
status: Accepted
date: 2026-04-30
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/schema-packs/run-events.ts
  - packages/@dvt/engine/src/security/planIntegrity.ts
  - packages/@dvt/adapter-temporal/src/workflows/workflowControlSignalRetentionPolicy.ts
  - packages/@dvt/adapter-temporal/src/workflows/workflowCursorHelpers.ts
  - packages/@dvt/adapter-temporal/src/workflows/workflowFailureReasonPolicy.ts
  - packages/@dvt/adapter-temporal/src/workflows/workflowRuntimePayloadHelpers.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.lifecycle.ts
  - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal exec vitest run ./test/workflow-continue-as-new.test.ts -t "retains only"
    - pnpm --filter @dvt/contracts exec vitest run ./test/compiled-code-ref.contract.test.ts -t "continuation safety reason"
    - pnpm --filter @dvt/engine exec vitest run ./test/contracts/engine.test.ts -t "expired PlanRef"
    - pnpm --filter @dvt/adapter-temporal exec vitest run ./test/workflowRuntimePayloadHelpers.test.ts
    - pnpm --filter @dvt/adapter-temporal exec vitest run ./test/workflow-component-semantics.architecture.test.ts
---

## Summary

This evidence records the AR-D continuation-safety hardening slice. The slice
adds governed `RunFailed.reason` values for cursor overflow, expired PlanRef,
and unavailable PlanRef artifacts; rejects expired `PlanRef` values before plan
bytes are fetched; and bounds control-signal id retention in the
continue-as-new cursor.

The follow-up Fowler pass also separates continuation failure classification
into `workflowFailureReasonPolicy.ts`, adds user stories for the runtime
scenarios, and guards the component guide, mailbox, and story traceability with
the semantic architecture test.
