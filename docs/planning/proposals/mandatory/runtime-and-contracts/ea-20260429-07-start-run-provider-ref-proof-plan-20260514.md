---
title: EA-20260429-07 Start-Run ProviderRef Proof Plan
status: Active
owner: Runtime / Engine
last_reviewed: 2026-05-14
planning_type: mandatory-proposal
---

# EA-20260429-07 Start-Run ProviderRef Proof Plan

## Think-First Analysis

`EA-20260429-07` asks the engine to prove start-run `providerRef`
bootstrap and compensation behavior. The root risk is not a missing route or a
new product intent. It is a distributed-consistency proof gap in the existing
`WorkflowEngine.startRun(planRef, context)` command rail: when a provider
returns an `EngineRunRef` before `bootstrapRunTx`, the engine must either
persist that exact provider reference atomically or compensate against that
exact provider reference if bootstrap fails.

The governing rail remains `WorkflowEngine.startRun`. The DDD owner is the
engine runtime start-run lifecycle, with ADR-0030 defining the pre-dispatch
intent log and compensation model. The slice therefore adds semantic proof and
closeout evidence around the current rail instead of introducing a new service,
route, adapter, or compatibility path.

## Fowler Matrix

| Scenario                                                | Opportunity                    | Fowler pattern                              | DDD owner                           | Command/query rail        | Implementation surfaces                      | Required proof                                     | Out of scope                 |
| ------------------------------------------------------- | ------------------------------ | ------------------------------------------- | ----------------------------------- | ------------------------- | -------------------------------------------- | -------------------------------------------------- | ---------------------------- |
| Provider returns `EngineRunRef` before no-estimate boot | Make distributed boundary real | Transaction Script with compensating action | start-run lifecycle domain service  | `WorkflowEngine.startRun` | engine start-run tests and docs              | metadata stores the returned `providerRef` exactly | new provider adapter support |
| `bootstrapRunTx` fails after provider dispatch          | Prove compensation target      | Compensating Transaction                    | start-run lifecycle failure policy  | `WorkflowEngine.startRun` | engine start-run tests                       | `cancelRun` receives the returned `providerRef`    | process-crash simulation     |
| Future refactors weaken the proof into boolean checking | Prevent test-only confidence   | Semantic regression test                    | start-run intent/compensation tests | `WorkflowEngine.startRun` | `WorkflowEngine.intentLog.test.ts`           | test asserts provider fields and intent transition | route or API authorization   |
| ARC-2 package path touched                              | Keep governance evidence close | Evidence and risk register                  | engine package ownership            | N/A                       | docs evidence/risk and generated doc indexes | ARC check, docs sync, package tests, prepush       | broad engine audit closure   |

## Rail Declaration

- Type: command.
- Owning bounded context: engine runtime.
- Product intent: start a run through the selected provider and make the run
  observable through engine-owned state.
- DDD owner: start-run lifecycle application service and execution service.
- Application port: `IWorkflowEngine.startRun` via `WorkflowEngine.startRun`.
- Adapter surface: `IProviderAdapter.startRun` and `IProviderAdapter.cancelRun`.
- State surface: `IRunStateStoreWrite.bootstrapRunTx`,
  `IStartRunIntentStore.markDispatched`, and
  `IStartRunIntentStore.markResolved`.
- Negative tests: provider bootstrap failure preserves the bootstrap error,
  cancels the exact returned provider reference, leaves no bootstrapped run
  metadata, and resolves the intent best-effort.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: EA-20260429-07-START-RUN-PROVIDER-REF-PROOF
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/ea-20260429-07-start-run-provider-ref-proof-plan-20260514.md
componentGuides:
  - docs/adr/ADR-0030-pre-dispatch-intent-log.md
userStories:
  - docs/planning/reviews/architecture-and-governance/20260429-dvt-engine-package-audit-review.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/adr/ADR-0030-pre-dispatch-intent-log.md
  - docs/planning/reviews/architecture-and-governance/20260429-dvt-engine-package-audit-review.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/runtime-and-contracts/ea-20260429-07-start-run-provider-ref-proof-plan-20260514.md
  - docs/evidence/ed-20260514-ea-20260429-07-start-run-provider-ref-proof.md
  - docs/risk-register/quality/R-20260514-EA-20260429-07-START-RUN-PROVIDER-REF.yaml
  - docs/evidence/index.md
  - docs/risk-register/index.md
  - docs/risk-register/quality/index.md
  - docs/planning/index.md
  - docs/planning/proposals/index.md
  - packages/@dvt/engine/test/core/WorkflowEngine.intentLog.test.ts
  - buzon/20260514-codex-fowler-ea-20260429-07-provider-ref-proof-analysis.md
forbiddenImplementationSurfaces:
  - apps/**
  - packages/@dvt/engine/src/**
  - packages/@dvt/contracts/**
  - packages/@dvt/adapter-*/**
  - specs/**
  - tools/**
  - scripts/**
commandQueryRails:
  - name: WorkflowEngine.startRun
    type: command
    dddOwner: engine start-run lifecycle
domainObjects:
  - name: StartRunExecutionService
    type: domain service
    owner: packages/@dvt/engine/src/services/startRun/StartRunExecutionService.ts
  - name: IStartRunIntentStore
    type: lifecycle intent port
    owner: packages/@dvt/engine/src/ports/IStartRunIntentStore.ts
fowlerSignals:
  - Distributed consistency proof gap
  - Test-only confidence
  - Compensating transaction
architectureGuards:
  - pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.intentLog.test.ts
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - engine command rail only
completionGate:
  - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
  - pnpm docs:sync
  - pnpm docs:feature-mechanization -- --feature EA-20260429-07-START-RUN-PROVIDER-REF-PROOF
  - pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.intentLog.test.ts
  - pnpm --filter @dvt/engine typecheck
  - pnpm verify:prepush
redGreenCycles:
  - id: no-estimate-provider-ref-bootstrap-proof
    redTest: pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.intentLog.test.ts
    expectedFailure: test proof for exact no-estimate providerRef bootstrap does not exist yet
    patchSurfaces:
      - packages/@dvt/engine/test/core/WorkflowEngine.intentLog.test.ts
    greenTest: pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.intentLog.test.ts
  - id: bootstrap-failure-compensates-exact-provider-ref
    redTest: pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.intentLog.test.ts
    expectedFailure: compensation proof does not assert exact providerRef or no metadata residue yet
    patchSurfaces:
      - packages/@dvt/engine/test/core/WorkflowEngine.intentLog.test.ts
    greenTest: pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.intentLog.test.ts
symbols:
  - name: returnedProviderRef
    path: packages/@dvt/engine/test/core/WorkflowEngine.intentLog.test.ts
    dddOwner: engine start-run lifecycle
    cqRails: [WorkflowEngine.startRun]
    fowlerSignals: [Distributed consistency proof gap]
    architectureGuard: pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.intentLog.test.ts
    cypressCoverage: N/A - engine command rail only
    unitTests: [pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.intentLog.test.ts]
  - name: cancelledProviderRefs
    path: packages/@dvt/engine/test/core/WorkflowEngine.intentLog.test.ts
    dddOwner: engine start-run lifecycle
    cqRails: [WorkflowEngine.startRun]
    fowlerSignals: [Compensating transaction]
    architectureGuard: pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.intentLog.test.ts
    cypressCoverage: N/A - engine command rail only
    unitTests: [pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.intentLog.test.ts]
```
