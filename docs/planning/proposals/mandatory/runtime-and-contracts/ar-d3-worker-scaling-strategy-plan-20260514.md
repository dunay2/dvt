---
title: AR-D3 Worker Scaling Strategy Plan
status: Accepted
owner: Runtime / SRE / Delivery
last_reviewed: 2026-05-14
planning_type: proposal
---

# AR-D3 Worker Scaling Strategy Plan

## Purpose

Close AR-D3 by making the Temporal worker scaling strategy explicit, measurable,
and mechanically guarded. The slice documents the supported queue-local worker
pool model and prevents future docs from implying a global shared worker pool
that the current `TemporalWorkerHost` does not implement.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: AR-D3-WORKER-SCALING-STRATEGY
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/ar-d3-worker-scaling-strategy-plan-20260514.md
componentGuides:
  - docs/architecture/components/engine/adapters/temporal/temporal-worker-scaling-strategy.md
  - docs/runbooks/temporal-worker-scaling-operations.md
userStories:
  - buzon/20260514-codex-fowler-ar-d3-worker-scaling-analysis.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/adr/ADR-0001-temporal-integration-test-policy.md
  - docs/adr/ADR-0003-execution-model.md
allowedImplementationSurfaces:
  - buzon/20260514-codex-fowler-ar-d3-worker-scaling-analysis.md
  - docs/.manifest.json
  - docs/planning/proposals/mandatory/runtime-and-contracts/ar-d3-worker-scaling-strategy-plan-20260514.md
  - docs/planning/closeouts/20260514-ar-d3-worker-scaling-strategy-closeout.md
  - docs/architecture/components/engine/adapters/temporal/temporal-worker-scaling-strategy.md
  - docs/runbooks/temporal-worker-scaling-operations.md
  - docs/evidence/ed-20260514-ar-d3-worker-scaling-strategy.md
  - docs/evidence/index.md
  - docs/risk-register/quality/R-20260514-AR-D3-WORKER-SCALING.yaml
  - docs/risk-register/quality/index.md
  - packages/@dvt/adapter-temporal/vitest.config.ts
  - packages/@dvt/adapter-temporal/test/worker-scaling-strategy.architecture.test.ts
forbiddenImplementationSurfaces:
  - apps/**
  - packages/@dvt/adapter-temporal/src/**
  - packages/@dvt/engine/**
  - packages/@dvt/contracts/**
  - specs/**
  - scripts/**
  - tools/**
commandQueryRails:
  - name: TemporalWorkerScalingStrategy
    type: query
    dddOwner: Runtime / SRE worker topology policy
domainObjects:
  - name: TemporalWorkerScalingPolicy
    type: operational policy
    owner: docs/architecture/components/engine/adapters/temporal/temporal-worker-scaling-strategy.md
fowlerSignals:
  - Documentation drift
  - Boundary drift
  - Primitive obsession
  - Test-only confidence
architectureGuards:
  - pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - operator documentation and architecture guard only
completionGate:
  - pnpm docs:feature-mechanization -- --feature AR-D3-WORKER-SCALING-STRATEGY
  - pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts
  - pnpm --filter @dvt/adapter-temporal typecheck
  - pnpm docs:sync
  - pnpm docs:status:generate
  - pnpm governance:refresh
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: worker-scaling-doc-semantics
    redTest: pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts
    expectedFailure: strategy and runbook lack AR-D3 closure decision sections
    patchSurfaces:
      - docs/architecture/components/engine/adapters/temporal/temporal-worker-scaling-strategy.md
      - docs/runbooks/temporal-worker-scaling-operations.md
      - packages/@dvt/adapter-temporal/test/worker-scaling-strategy.architecture.test.ts
    greenTest: pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts
symbols:
  - {name: REPO_ROOT, path: packages/@dvt/adapter-temporal/test/worker-scaling-strategy.architecture.test.ts, dddOwner: Temporal worker scaling architecture test, cqRails: [N/A - test helper], fowlerSignals: [documentation drift guard], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: N/A, unitTests: [pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts]}
  - {name: STRATEGY_DOC, path: packages/@dvt/adapter-temporal/test/worker-scaling-strategy.architecture.test.ts, dddOwner: Temporal worker scaling architecture test, cqRails: [N/A - test helper], fowlerSignals: [documentation drift guard], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: N/A, unitTests: [pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts]}
  - {name: RUNBOOK_DOC, path: packages/@dvt/adapter-temporal/test/worker-scaling-strategy.architecture.test.ts, dddOwner: Temporal worker scaling architecture test, cqRails: [N/A - test helper], fowlerSignals: [documentation drift guard], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: N/A, unitTests: [pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts]}
  - {name: WORKER_HOST_SOURCE, path: packages/@dvt/adapter-temporal/test/worker-scaling-strategy.architecture.test.ts, dddOwner: Temporal worker scaling architecture test, cqRails: [N/A - test helper], fowlerSignals: [executable topology binding], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: N/A, unitTests: [pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts]}
  - {name: WORKFLOW_MAPPER_SOURCE, path: packages/@dvt/adapter-temporal/test/worker-scaling-strategy.architecture.test.ts, dddOwner: Temporal worker scaling architecture test, cqRails: [N/A - test helper], fowlerSignals: [tenant queue assignment binding], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: N/A, unitTests: [pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts]}
  - {name: expectMarkdownSections, path: packages/@dvt/adapter-temporal/test/worker-scaling-strategy.architecture.test.ts, dddOwner: Temporal worker scaling architecture test, cqRails: [N/A - test helper], fowlerSignals: [semantic documentation guard], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: N/A, unitTests: [pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts]}
  - {name: adapterTemporalSourceEntry, path: packages/@dvt/adapter-temporal/vitest.config.ts, dddOwner: Temporal adapter test harness, cqRails: [N/A - test harness], fowlerSignals: [public-boundary source resolution], architectureGuard: pnpm docs:feature-mechanization:implementation, cypressCoverage: N/A, unitTests: [pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts]}
```

## Fowler Matrix

| scenario                                                                            | opportunity         | Fowler pattern              | DDD owner                            | command/query rail                 | implementation surfaces                     | unit or package test                       | architecture test                              | user-flow test | out of scope                       |
| ----------------------------------------------------------------------------------- | ------------------- | --------------------------- | ------------------------------------ | ---------------------------------- | ------------------------------------------- | ------------------------------------------ | ---------------------------------------------- | -------------- | ---------------------------------- |
| Operators need worker scaling guidance that matches the executable Temporal adapter | Documentation drift | Explicit operational policy | Runtime / SRE worker topology policy | none - operator documentation only | strategy, runbook, closeout, evidence       | none - no runtime behavior change          | `worker-scaling-strategy.architecture.test.ts` | none           | multi-queue worker host            |
| Tenant queue assignment must stay bound to the adapter mapping                      | Boundary drift      | Intention-revealing policy  | Temporal adapter queue mapping       | existing adapter queue mapping     | strategy/runbook docs and architecture test | existing adapter tests cover queue mapping | `worker-scaling-strategy.architecture.test.ts` | none           | tenant-to-queue assignment service |
| Autoscaling must react to queue pressure instead of CPU-only heuristics             | Primitive obsession | Threshold policy            | Runtime / SRE scaling policy         | none - operations policy           | strategy/runbook docs                       | none                                       | `worker-scaling-strategy.architecture.test.ts` | none           | KEDA manifest implementation       |

## Residual Work

- Implement tenant-to-queue assignment automation if DVT later needs pooled
  low-volume tenant queues.
- Add Kubernetes/KEDA deployment artifacts when infrastructure ownership is
  ready.
- Collect production load evidence for the target tenant count before claiming
  a specific environment is scale-ready.
