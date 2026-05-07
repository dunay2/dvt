---
title: AR-B5 Lineage Worker Runtime Decomposition Plan
status: Implemented
owner: Architecture / Traceability / Delivery
last_reviewed: 2026-05-07
planning_type: proposal
task_id: AR-B5
---

# AR-B5 Lineage Worker Runtime Decomposition Plan

## Purpose

`AR-B5` decomposes `LineageWorkerRuntime` after the `RC-G1-C` ownership
migration. The slice keeps lineage behavior inside
`@dvt/traceability-service`, preserves the public runtime API, and separates
tick orchestration from lifecycle loop mechanics.

The active execution evidence is recorded in
[AR-B5 closeout](../../closeouts/20260507-ar-b5-lineage-worker-runtime-decomposition-closeout.md).

## Declared Execution Route

This proposal is the canonical AR-B5 planning and mechanization surface. The
required route for this slice is:

1. inventory-first startup and governing-source selection;
2. mandatory proposal update with Think-First analysis, Fowler matrix,
   command/query posture, allowed surfaces, forbidden surfaces, red/green cycles,
   and symbol coverage;
3. `pnpm docs:feature-mechanization -- --feature AR-B5-LINEAGE-RUNTIME-DECOMPOSITION`
   before production code changes;
4. red tests from this manifest;
5. implementation only inside declared surfaces;
6. scope-expansion stop point: if another source, test, script, generated doc, or
   top-level symbol becomes necessary, update this proposal and rerun the
   feature-specific mechanization check before continuing;
7. `pnpm docs:feature-mechanization:implementation`, governance refresh, package
   validation, and `pnpm verify:prepush` before ready-for-review closeout.

The first AR-B5 pass violated this declared-step model by placing the
mechanization data in the closeout after implementation had started. That was a
process defect, not only a file-placement defect. This proposal is the corrective
source of truth, and the closeout records the deviation instead of acting as the
canonical mechanization manifest.

```feature-mechanization
version: 1
featureId: AR-B5-LINEAGE-RUNTIME-DECOMPOSITION
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/ar-b5-lineage-worker-runtime-decomposition-plan-20260507.md
componentGuides:
  - docs/architecture/reference-architecture.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/reviews/architecture-and-governance/20260419-post-rc-g1-c-architecture-review.md
userStories:
  - docs/planning/closeouts/20260507-ar-b5-lineage-worker-runtime-decomposition-closeout.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/reference-architecture.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/state/agent-lane-b.yaml
  - docs/planning/reviews/architecture-and-governance/20260419-post-rc-g1-c-architecture-review.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/runtime-and-contracts/ar-b5-lineage-worker-runtime-decomposition-plan-20260507.md
  - docs/planning/closeouts/20260507-ar-b5-lineage-worker-runtime-decomposition-closeout.md
  - docs/planning/state/agent-lane-b.yaml
  - docs/planning/state/agent-lane-b.md
  - docs/planning/state/execution-workboard.md
  - docs/planning/state/open-task-route.md
  - docs/guides/ai-work-protocol.md
  - docs/planning/index.md
  - docs/planning/proposals/index.md
  - docs/planning/closeouts/index.md
  - docs/planning/status/**
  - docs/.manifest.json
  - packages/@dvt/traceability-service/src/lineage/LineageWorkerRuntime.ts
  - packages/@dvt/traceability-service/src/lineage/runtime/LineageWorkerLoopController.ts
  - packages/@dvt/traceability-service/src/lineage/runtime/lineageWorkerTick.ts
  - packages/@dvt/traceability-service/test/lineage/LineageWorkerRuntime.architecture.test.ts
  - packages/@dvt/traceability-service/test/lineage/lineageWorkerTick.test.ts
  - scripts/planning-db-migrate.cjs
  - scripts/planning-db-migrate.test.cjs
forbiddenImplementationSurfaces:
  - apps/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/planner/**
  - packages/@dvt/adapter-*/**
commandQueryRails:
  - name: LineageWorkerInternalOrchestration
    type: command
    dddOwner: TraceabilityLineageWorkerApplicationService
  - name: ValidatePlanningQueryStoreMigrationChecksum
    type: query
    dddOwner: PlanningQueryStoreMigrationReadModel
domainObjects:
  - name: TraceabilityLineageWorkerApplicationService
    type: application service
    owner: Traceability service
  - name: PlanningQueryStoreMigrationReadModel
    type: read model
    owner: Planning governance query store
fowlerSignals:
  - Responsibility overload
  - Documentation drift
  - Test-only confidence
architectureGuards:
  - pnpm exec vitest run packages/@dvt/traceability-service/test/lineage/LineageWorkerRuntime.architecture.test.ts
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - Not applicable - internal lineage worker runtime decomposition only
completionGate:
  - pnpm exec vitest run packages/@dvt/traceability-service/test/lineage/LineageWorkerRuntime.architecture.test.ts packages/@dvt/traceability-service/test/lineage/lineageWorkerTick.test.ts
  - pnpm --filter @dvt/traceability-service test
  - pnpm --filter @dvt/traceability-service build
  - node --test scripts/planning-db-migrate.test.cjs
  - pnpm governance:refresh
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: lineage-runtime-facade-decomposition
    redTest: pnpm exec vitest run packages/@dvt/traceability-service/test/lineage/LineageWorkerRuntime.architecture.test.ts packages/@dvt/traceability-service/test/lineage/lineageWorkerTick.test.ts
    expectedFailure: The tick module does not exist and the runtime facade still imports direct record/dead-letter helpers.
    patchSurfaces:
      - packages/@dvt/traceability-service/src/lineage/LineageWorkerRuntime.ts
      - packages/@dvt/traceability-service/src/lineage/runtime/LineageWorkerLoopController.ts
      - packages/@dvt/traceability-service/src/lineage/runtime/lineageWorkerTick.ts
      - packages/@dvt/traceability-service/test/lineage/LineageWorkerRuntime.architecture.test.ts
      - packages/@dvt/traceability-service/test/lineage/lineageWorkerTick.test.ts
    greenTest: pnpm exec vitest run packages/@dvt/traceability-service/test/lineage/LineageWorkerRuntime.architecture.test.ts packages/@dvt/traceability-service/test/lineage/lineageWorkerTick.test.ts
  - id: planning-db-migration-line-ending-checksum
    redTest: node --test scripts/planning-db-migrate.test.cjs
    expectedFailure: CRLF and LF variants of the same migration SQL produce incompatible checksums.
    patchSurfaces:
      - scripts/planning-db-migrate.cjs
      - scripts/planning-db-migrate.test.cjs
    greenTest: node --test scripts/planning-db-migrate.test.cjs
symbols:
  - name: LineageWorkerRuntime
    path: packages/@dvt/traceability-service/src/lineage/LineageWorkerRuntime.ts
    dddOwner: TraceabilityLineageWorkerApplicationService
    cqRails:
      - LineageWorkerInternalOrchestration
    fowlerSignals:
      - Responsibility overload
    architectureGuard: pnpm exec vitest run packages/@dvt/traceability-service/test/lineage/LineageWorkerRuntime.architecture.test.ts
    cypressCoverage: Not applicable - internal lineage worker runtime decomposition only
    unitTests:
      - pnpm --filter @dvt/traceability-service test
  - name: LineageWorkerLoopController
    path: packages/@dvt/traceability-service/src/lineage/runtime/LineageWorkerLoopController.ts
    dddOwner: TraceabilityLineageWorkerApplicationService
    cqRails:
      - LineageWorkerInternalOrchestration
    fowlerSignals:
      - Responsibility overload
    architectureGuard: pnpm exec vitest run packages/@dvt/traceability-service/test/lineage/LineageWorkerRuntime.architecture.test.ts
    cypressCoverage: Not applicable - internal lineage worker runtime decomposition only
    unitTests:
      - pnpm --filter @dvt/traceability-service test
  - name: LineageWorkerLoopControllerOptions
    path: packages/@dvt/traceability-service/src/lineage/runtime/LineageWorkerLoopController.ts
    dddOwner: TraceabilityLineageWorkerApplicationService
    cqRails:
      - LineageWorkerInternalOrchestration
    fowlerSignals:
      - Responsibility overload
    architectureGuard: pnpm exec vitest run packages/@dvt/traceability-service/test/lineage/LineageWorkerRuntime.architecture.test.ts
    cypressCoverage: Not applicable - internal lineage worker runtime decomposition only
    unitTests:
      - pnpm --filter @dvt/traceability-service test
  - name: runLineageWorkerTick
    path: packages/@dvt/traceability-service/src/lineage/runtime/lineageWorkerTick.ts
    dddOwner: TraceabilityLineageWorkerApplicationService
    cqRails:
      - LineageWorkerInternalOrchestration
    fowlerSignals:
      - Responsibility overload
    architectureGuard: pnpm exec vitest run packages/@dvt/traceability-service/test/lineage/LineageWorkerRuntime.architecture.test.ts
    cypressCoverage: Not applicable - internal lineage worker runtime decomposition only
    unitTests:
      - pnpm exec vitest run packages/@dvt/traceability-service/test/lineage/lineageWorkerTick.test.ts
  - name: LineageWorkerTickOutcome
    path: packages/@dvt/traceability-service/src/lineage/runtime/lineageWorkerTick.ts
    dddOwner: TraceabilityLineageWorkerApplicationService
    cqRails:
      - LineageWorkerInternalOrchestration
    fowlerSignals:
      - Responsibility overload
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: Not applicable - internal lineage worker runtime decomposition only
    unitTests:
      - pnpm exec vitest run packages/@dvt/traceability-service/test/lineage/lineageWorkerTick.test.ts
  - name: RunLineageWorkerTickArgs
    path: packages/@dvt/traceability-service/src/lineage/runtime/lineageWorkerTick.ts
    dddOwner: TraceabilityLineageWorkerApplicationService
    cqRails:
      - LineageWorkerInternalOrchestration
    fowlerSignals:
      - Responsibility overload
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: Not applicable - internal lineage worker runtime decomposition only
    unitTests:
      - pnpm exec vitest run packages/@dvt/traceability-service/test/lineage/lineageWorkerTick.test.ts
  - name: runtimeSourcePath
    path: packages/@dvt/traceability-service/test/lineage/LineageWorkerRuntime.architecture.test.ts
    dddOwner: TraceabilityLineageWorkerApplicationService
    cqRails:
      - LineageWorkerInternalOrchestration
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm exec vitest run packages/@dvt/traceability-service/test/lineage/LineageWorkerRuntime.architecture.test.ts
    cypressCoverage: Not applicable - internal lineage worker runtime decomposition only
    unitTests:
      - pnpm exec vitest run packages/@dvt/traceability-service/test/lineage/LineageWorkerRuntime.architecture.test.ts
  - name: normalizeSqlForChecksum
    path: scripts/planning-db-migrate.cjs
    dddOwner: PlanningQueryStoreMigrationReadModel
    cqRails:
      - ValidatePlanningQueryStoreMigrationChecksum
    fowlerSignals:
      - Documentation drift
    architectureGuard: node --test scripts/planning-db-migrate.test.cjs
    cypressCoverage: Not applicable - planning DB migration checksum helper only
    unitTests:
      - node --test scripts/planning-db-migrate.test.cjs
  - name: buildLineEndingCompatibleChecksums
    path: scripts/planning-db-migrate.cjs
    dddOwner: PlanningQueryStoreMigrationReadModel
    cqRails:
      - ValidatePlanningQueryStoreMigrationChecksum
    fowlerSignals:
      - Documentation drift
    architectureGuard: node --test scripts/planning-db-migrate.test.cjs
    cypressCoverage: Not applicable - planning DB migration checksum helper only
    unitTests:
      - node --test scripts/planning-db-migrate.test.cjs
```
