---
title: WorkflowEngine hexagonal derivation plan
status: Draft
owner: Architecture / Engine / API / Docs
last_reviewed: 2026-04-03
planning_type: proposal
---

# WorkflowEngine hexagonal derivation plan

## Summary

This proposal defines the canonical replacement plan for mapping and deriving
the full `WorkflowEngine` subsystem to a hardcut, narrower hexagonal model.

This is a **reconcile-and-replace** plan, not an additive docs layer.

## Governing sources

- `ADR-0003`
- `ADR-0004`
- `ADR-0012`
- `ADR-0015`
- `ADR-0030`
- `ADR-0034`
- `ADR-0042`
- `docs/guides/dvt-code-style-solid-hexagonal-cqrs.md`
- `docs/architecture/components/engine/reviews/engine-class-review-and-gaps-2026-03-31.md`
- `docs/planning/state/agent-lane-a.yaml`

## As-is findings

What is already strong:

- execution authority remains event-sourced and engine-owned
- clear adapter boundary for provider runtimes
- intent-log crash consistency on start-run path
- deterministic status read path is explicit

What is still drifting:

- `WorkflowEngine` remains a wide command/query boundary
- admission/coordinator/core services still mix concerns
- provider-resolution and telemetry logic are repeated
- docs are fragmented and partially stale for current subsystem reality
- ownership seam between engine resolver and artifacts reader is not yet one
  canonical narrative

## Target model

Hardcut target:

- keep `IWorkflowEngine` as the public command/query facade
- move behavior behind narrow use-case services
- enforce explicit engine-owned outbound ports
- keep artifacts behavior ownership in `@dvt/artifacts`
- adapt artifacts reader to engine resolver in composition root

No-go constraints:

- no runtime refactor in this docs/planning slice
- no shadow roadmap parallel to lane planning
- no peer-domain runtime behavior inside engine internals

### `DHM-WS2` Runtime composition root simplification

`DHM-WS2` executes the runtime composition-root slice from the DDD/hexagonal
modularization plan. It keeps the intent reconciler runtime behavior unchanged
while extracting the startup assembly order into a named API composition object:
config resolution, store creation, adapter resolution, maintenance service
creation, worker creation, and runtime handle publication.

```feature-mechanization
version: 1
featureId: DHM-WS2-RUNTIME-COMPOSITION-ROOT
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
componentGuides:
  - docs/architecture/components/engine/architecture/intent-reconciler-runtime-composition-component.md
userStories:
  - docs/architecture/components/engine/architecture/intent-reconciler-runtime-composition-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/reviews/architecture-and-governance/20260322-ddd-hexagonal-port-audit-review.md
  - docs/adr/ADR-0039-hexagonal-port-hardening-and-solid-remediation.md
allowedImplementationSurfaces:
  - apps/api/src/runtime/intentReconcilerRuntime.ts
  - apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
  - apps/api/test/server.test.ts
  - docs/.manifest.json
  - docs/architecture/components/engine/architecture/intent-reconciler-runtime-composition-component.md
  - docs/architecture/components/engine/architecture/intent-reconciler-runtime-composition-user-stories.md
  - docs/evidence/ed-20260512-dhm-ws2-runtime-composition-root.md
  - docs/evidence/index.md
  - docs/planning/closeouts/20260512-dhm-ws2-runtime-composition-root-closeout.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
  - docs/planning/status/**
  - docs/risk-register/quality/R-20260512-DHM-WS2-RUNTIME-COMPOSITION-ROOT.yaml
  - docs/risk-register/quality/index.md
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/engine/**
  - apps/web/**
  - specs/contracts/**
commandQueryRails:
  - name: IntentReconcilerRuntimeComposition
    type: command
    dddOwner: API runtime composition root
domainObjects:
  - name: IntentReconcilerRuntimeComposition
    type: composition object
    owner: API runtime
  - name: ReconcilerRuntimeConfig
    type: configuration value object
    owner: API runtime
  - name: IntentReconcilerRuntimeHandle
    type: runtime handle
    owner: API runtime
fowlerSignals:
  - Boundary drift
  - Responsibility overload
  - Documentation drift
architectureGuards:
  - pnpm --filter dvt-api test -- test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - Not applicable - API background runtime composition only
completionGate:
  - pnpm docs:feature-mechanization -- --feature DHM-WS2-RUNTIME-COMPOSITION-ROOT
  - pnpm --filter dvt-api test -- test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
  - pnpm --filter dvt-api test -- test/server.test.ts
  - pnpm --filter dvt-api typecheck
  - pnpm docs:status:generate
  - pnpm docs:sync
  - pnpm governance:refresh
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: dhm-ws2-runtime-composition-architecture-guard
    redTest: pnpm --filter dvt-api test -- test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
    expectedFailure: intentReconcilerRuntime still assembles config, stores, adapters, maintenance, worker, and handle directly in createIntentReconcilerRuntime without a named composition object and ordering guard.
    patchSurfaces:
      - apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
      - apps/api/src/runtime/intentReconcilerRuntime.ts
      - docs/architecture/components/engine/architecture/intent-reconciler-runtime-composition-component.md
      - docs/architecture/components/engine/architecture/intent-reconciler-runtime-composition-user-stories.md
    greenTest: pnpm --filter dvt-api test -- test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
symbols:
  - name: IntentReconcilerRuntimeComposition
    path: apps/api/src/runtime/intentReconcilerRuntime.ts
    dddOwner: API runtime composition root
    cqRails:
      - IntentReconcilerRuntimeComposition
    fowlerSignals:
      - Responsibility overload
    architectureGuard: pnpm --filter dvt-api test -- test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
    cypressCoverage: Not applicable - background runtime composition
    unitTests:
      - apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
  - name: createIntentReconcilerRuntimeComposition
    path: apps/api/src/runtime/intentReconcilerRuntime.ts
    dddOwner: API runtime composition root
    cqRails:
      - IntentReconcilerRuntimeComposition
    fowlerSignals:
      - Boundary drift
    architectureGuard: pnpm --filter dvt-api test -- test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
    cypressCoverage: Not applicable - background runtime composition
    unitTests:
      - apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
  - name: TEST_ROOT
    path: apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
    dddOwner: API runtime composition root
    cqRails:
      - IntentReconcilerRuntimeComposition
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm --filter dvt-api test -- test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
    cypressCoverage: Not applicable - background runtime composition
    unitTests:
      - apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
  - name: API_ROOT
    path: apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
    dddOwner: API runtime composition root
    cqRails:
      - IntentReconcilerRuntimeComposition
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm --filter dvt-api test -- test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
    cypressCoverage: Not applicable - background runtime composition
    unitTests:
      - apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
  - name: REPO_ROOT
    path: apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
    dddOwner: API runtime composition root
    cqRails:
      - IntentReconcilerRuntimeComposition
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm --filter dvt-api test -- test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
    cypressCoverage: Not applicable - background runtime composition
    unitTests:
      - apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
  - name: COMPONENT_GUIDE
    path: apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
    dddOwner: API runtime composition root
    cqRails:
      - IntentReconcilerRuntimeComposition
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm --filter dvt-api test -- test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
    cypressCoverage: Not applicable - background runtime composition
    unitTests:
      - apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
  - name: USER_STORIES
    path: apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
    dddOwner: API runtime composition root
    cqRails:
      - IntentReconcilerRuntimeComposition
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm --filter dvt-api test -- test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
    cypressCoverage: Not applicable - background runtime composition
    unitTests:
      - apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
  - name: readApiSource
    path: apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
    dddOwner: API runtime composition root
    cqRails:
      - IntentReconcilerRuntimeComposition
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm --filter dvt-api test -- test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
    cypressCoverage: Not applicable - background runtime composition
    unitTests:
      - apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
```

## Gap closure waves

### `WE-HX-0` Canonical map and doc replacement

- depends on `DOC-ARCH-01`
- deliver the hardcut subsystem context, target architecture spec, user manual,
  and navigation replacement
- close stale-engine-doc ambiguity without keeping retrocompatibility posture as
  current architecture truth

```feature-mechanization
version: 1
featureId: WE-HX-0-HARDCUT-CANONICAL-MAP
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
componentGuides:
  - docs/architecture/components/engine/architecture/workflow-engine-subsystem-context.md
  - docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md
userStories:
  - docs/guides/workflow-engine-user-manual.v1.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/adr/ADR-0003-execution-model.md
  - docs/adr/ADR-0004-event-sourcing-strategy.md
  - docs/adr/ADR-0012-plan-integrity-ownership.md
  - docs/adr/ADR-0015-query-read-model-separation.md
  - docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md
allowedImplementationSurfaces:
  - buzon/20260514-codex-fowler-we-hx-0-hardcut-map-analysis.md
  - docs/.manifest.json
  - docs/architecture/components/engine/architecture/index.md
  - docs/architecture/components/engine/architecture/workflow-engine-facade-use-cases-component.md
  - docs/architecture/components/engine/architecture/workflow-engine-runtime-path-decomposition-component.md
  - docs/architecture/components/engine/architecture/workflow-engine-runtime-path-decomposition-user-stories.md
  - docs/architecture/components/engine/architecture/workflow-engine-semantic-closure-component.md
  - docs/architecture/components/engine/architecture/workflow-engine-semantic-closure-user-stories.md
  - docs/architecture/components/engine/architecture/start-run-application-decomposition-component.md
  - docs/architecture/components/engine/architecture/start-run-application-decomposition-user-stories.md
  - docs/architecture/components/engine/architecture/workflow-engine-subsystem-context.md
  - docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md
  - docs/evidence/ed-20260514-we-hx-0-hardcut-canonical-map.md
  - docs/evidence/index.md
  - docs/guides/workflow-engine-user-manual.v1.md
  - docs/planning/closeouts/20260514-we-hx-0-hardcut-canonical-map-closeout.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
  - docs/planning/status/**
  - docs/risk-register/quality/R-20260514-WE-HX-0-HARDCUT-CANONICAL-MAP.yaml
  - docs/risk-register/quality/index.md
  - packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts
  - packages/@dvt/engine/src/services/runControl/RunCommandService.ts
  - packages/@dvt/engine/src/services/runControl/RunSignalService.ts
  - packages/@dvt/engine/test/architecture/workflowEngineCanonicalMapHardcut.architecture.test.ts
  - packages/@dvt/engine/test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
  - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - apps/web/**
  - apps/api/**
  - specs/**
commandQueryRails:
  - name: IWorkflowEngine.startRun
    type: command
    dddOwner: WorkflowEngine public boundary
  - name: IWorkflowEngine.recoverRun
    type: command
    dddOwner: WorkflowEngine public boundary
  - name: IWorkflowEngine.cancelRun
    type: command
    dddOwner: WorkflowEngine public boundary
  - name: IWorkflowEngine.getRunStatus
    type: query
    dddOwner: WorkflowEngine public boundary
  - name: IWorkflowEngine.signal
    type: command
    dddOwner: WorkflowEngine public boundary
domainObjects:
  - name: WorkflowEngineCanonicalMap
    type: architecture map
    owner: Engine architecture
  - name: WorkflowEngineCoreService
    type: combined run-control delegator
    owner: Engine run-control boundary
fowlerSignals:
  - Documentation drift
  - Duplicate semantics
  - Test-only confidence
architectureGuards:
  - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineCanonicalMapHardcut.architecture.test.ts test/architecture/workflowEngineSemanticClosure.architecture.test.ts test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - Not applicable - engine architecture documentation and semantic guard only
completionGate:
  - pnpm docs:feature-mechanization --feature WE-HX-0-HARDCUT-CANONICAL-MAP
  - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineCanonicalMapHardcut.architecture.test.ts test/architecture/workflowEngineSemanticClosure.architecture.test.ts test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
  - pnpm --filter @dvt/engine typecheck
  - pnpm docs:sync
  - pnpm governance:refresh
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: we-hx-0-hardcut-canonical-map-guard
    redTest: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineCanonicalMapHardcut.architecture.test.ts
    expectedFailure: active WE-HX-0 docs and run-control headers still contain migration-safety posture instead of hardcut command/query ownership.
    patchSurfaces:
      - packages/@dvt/engine/test/architecture/workflowEngineCanonicalMapHardcut.architecture.test.ts
      - docs/architecture/components/engine/architecture/workflow-engine-subsystem-context.md
      - docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md
      - docs/guides/workflow-engine-user-manual.v1.md
      - docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
      - packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts
      - packages/@dvt/engine/src/services/runControl/RunCommandService.ts
      - packages/@dvt/engine/src/services/runControl/RunSignalService.ts
    greenTest: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineCanonicalMapHardcut.architecture.test.ts
symbols:
  - name: WorkflowEngineCanonicalMapHardcutGuard
    path: packages/@dvt/engine/test/architecture/workflowEngineCanonicalMapHardcut.architecture.test.ts
    dddOwner: Engine architecture map
    cqRails:
      - IWorkflowEngine.startRun
      - IWorkflowEngine.recoverRun
      - IWorkflowEngine.cancelRun
      - IWorkflowEngine.getRunStatus
      - IWorkflowEngine.signal
    fowlerSignals:
      - Documentation drift
      - Duplicate semantics
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineCanonicalMapHardcut.architecture.test.ts
    cypressCoverage: Not applicable - architecture documentation guard
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineCanonicalMapHardcut.architecture.test.ts
```

### `WE-HX-1` Boundary ownership closure

- depends on `S08-5-B`, `RC-G1-B`
- lock ownership mapping for `PlanRef`, `runExecutionContextRef`, engine
  resolver seam, and artifacts reader seam

### `WE-HX-2` Facade use-case narrowing

- depends on `WE-HX-1`
- document `WorkflowEngine` as a hardcut delegation facade over use-case
  services

### `WE-HX-3` Start-run application decomposition

- depends on `WE-HX-2`
- split admission, provider/capability resolution, intent creation, execution
  dispatch, and failure policy
- canonical implementation manifest: `WE-HX-3-START-RUN-DECOMPOSITION`
  in [WE-HX-3 feature mechanization](#we-hx-3-feature-mechanization)

### `WE-HX-4` Runtime query/command decomposition

- depends on `WE-HX-2`
- split `WorkflowEngineCoreService` into dedicated query, command, signal, and
  enrichment paths
- fold `AR-A3` into this wave
- once that structural split lands, finish the remaining `AR-A3` facade-purity
  intent through `AR-A12-C` by removing enrichment from `IWorkflowEngine`

```feature-mechanization
version: 1
featureId: DHM-WS4-RUNTIME-PATH-DECOMPOSITION
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
componentGuides:
  - docs/architecture/components/engine/architecture/workflow-engine-subsystem-context.md
  - docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md
  - docs/architecture/components/engine/architecture/workflow-engine-runtime-path-decomposition-component.md
userStories:
  - docs/architecture/components/engine/architecture/workflow-engine-runtime-path-decomposition-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/reviews/architecture-and-governance/20260322-ddd-hexagonal-port-audit-review.md
  - docs/adr/ADR-0039-hexagonal-port-hardening-and-solid-remediation.md
allowedImplementationSurfaces:
  - apps/api/src/application/services/WorkflowEngineFactory.ts
  - apps/api/test/integration/plannerEngineContract.test.ts
  - docs/.manifest.json
  - docs/architecture/components/engine/architecture/workflow-engine-facade-use-cases-component.md
  - docs/architecture/components/engine/architecture/workflow-engine-facade-use-cases-user-stories.md
  - docs/architecture/components/engine/architecture/workflow-engine-runtime-path-decomposition-component.md
  - docs/architecture/components/engine/architecture/workflow-engine-runtime-path-decomposition-user-stories.md
  - docs/architecture/components/engine/architecture/workflow-engine-subsystem-context.md
  - docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md
  - docs/evidence/ed-20260512-dhm-ws4-runtime-path-decomposition.md
  - docs/evidence/index.md
  - docs/planning/closeouts/20260512-dhm-ws4-runtime-path-decomposition-closeout.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
  - docs/planning/status/**
  - docs/risk-register/quality/R-20260512-DHM-WS4-RUNTIME-PATH-DECOMPOSITION.yaml
  - docs/risk-register/quality/index.md
  - packages/@dvt/engine/src/application/workflow-engine-use-cases/**
  - packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts
  - packages/@dvt/engine/src/domain/IRunCommandService.ts
  - packages/@dvt/engine/src/domain/IRunSignalService.ts
  - packages/@dvt/engine/src/index.ts
  - packages/@dvt/engine/src/services/runControl/**
  - packages/@dvt/engine/test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
  - packages/@dvt/engine/test/application/workflowEngineUseCases.factory.test.ts
  - packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts
  - packages/@dvt/engine/test/helpers/workflowEngine.fixture.ts
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/adapter-*/**
  - apps/web/**
  - specs/contracts/**
commandQueryRails:
  - name: RuntimeRunCommandDecomposition
    type: command
    dddOwner: Engine runtime command service
  - name: RuntimeRunSignalDecomposition
    type: command
    dddOwner: Engine runtime signal service
domainObjects:
  - name: RunCommandService
    type: domain service
    owner: Engine runtime
  - name: RunSignalService
    type: domain service
    owner: Engine runtime
  - name: WorkflowEngineCoreService
    type: combined run-control assembler
    owner: Engine runtime
fowlerSignals:
  - Boundary drift
  - Responsibility overload
  - Documentation drift
architectureGuards:
  - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts test/core/WorkflowEngineCoreService.test.ts
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - Not applicable - internal engine runtime-control decomposition only
completionGate:
  - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts test/core/WorkflowEngineCoreService.test.ts
  - pnpm --filter @dvt/engine typecheck
  - pnpm --filter dvt-api typecheck
  - pnpm --filter @dvt/engine test
  - pnpm --filter dvt-api test -- test/integration/plannerEngineContract.test.ts
  - pnpm docs:status:generate
  - pnpm docs:sync
  - pnpm governance:refresh
  - pnpm docs:feature-mechanization -- --feature DHM-WS4-RUNTIME-PATH-DECOMPOSITION
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: dhm-ws4-runtime-path-decomposition-architecture-guard
    redTest: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts test/core/WorkflowEngineCoreService.test.ts
    expectedFailure: WorkflowEngineCoreService still owns cancel adapter dispatch, signal adapter dispatch, signal transition guard construction, and facade use cases still share one run-control dependency.
    patchSurfaces:
      - packages/@dvt/engine/test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
      - packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts
      - packages/@dvt/engine/src/domain/IRunCommandService.ts
      - packages/@dvt/engine/src/domain/IRunSignalService.ts
      - packages/@dvt/engine/src/services/runControl/RunCommandService.ts
      - packages/@dvt/engine/src/services/runControl/RunSignalService.ts
      - packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts
      - packages/@dvt/engine/src/application/workflow-engine-use-cases/buildWorkflowEngineUseCases.ts
      - packages/@dvt/engine/src/application/workflow-engine-use-cases/WorkflowCancelRunUseCase.ts
      - packages/@dvt/engine/src/application/workflow-engine-use-cases/WorkflowSignalRunUseCase.ts
      - packages/@dvt/engine/test/helpers/workflowEngine.fixture.ts
      - apps/api/src/application/services/WorkflowEngineFactory.ts
      - apps/api/test/integration/plannerEngineContract.test.ts
    greenTest: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts test/core/WorkflowEngineCoreService.test.ts
symbols:
  - name: IRunCommandService
    path: packages/@dvt/engine/src/domain/IRunCommandService.ts
    dddOwner: Engine runtime command service
    cqRails:
      - RuntimeRunCommandDecomposition
    fowlerSignals:
      - Responsibility overload
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: Not applicable - internal engine runtime-control decomposition
    unitTests:
      - packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts
  - name: IRunSignalService
    path: packages/@dvt/engine/src/domain/IRunSignalService.ts
    dddOwner: Engine runtime signal service
    cqRails:
      - RuntimeRunSignalDecomposition
    fowlerSignals:
      - Responsibility overload
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: Not applicable - internal engine runtime-control decomposition
    unitTests:
      - packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts
  - name: IRunControlService
    path: packages/@dvt/engine/src/domain/IRunControlService.ts
    dddOwner: Engine runtime run-control service
    cqRails:
      - RuntimeRunCommandDecomposition
      - RuntimeRunSignalDecomposition
    fowlerSignals:
      - Boundary drift
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: Not applicable - internal engine runtime-control decomposition
    unitTests:
      - packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts
  - name: buildRunCommandService
    path: packages/@dvt/engine/src/index.ts
    dddOwner: Engine runtime command service root export
    cqRails:
      - RuntimeRunCommandDecomposition
    fowlerSignals:
      - Boundary drift
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: Not applicable - internal engine runtime-control decomposition
    unitTests:
      - packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts
  - name: buildRunSignalService
    path: packages/@dvt/engine/src/index.ts
    dddOwner: Engine runtime signal service root export
    cqRails:
      - RuntimeRunSignalDecomposition
    fowlerSignals:
      - Boundary drift
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: Not applicable - internal engine runtime-control decomposition
    unitTests:
      - packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts
  - name: RunCommandServiceDeps
    path: packages/@dvt/engine/src/services/runControl/RunCommandService.ts
    dddOwner: Engine runtime command service
    cqRails:
      - RuntimeRunCommandDecomposition
    fowlerSignals:
      - Boundary drift
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: Not applicable - internal engine runtime-control decomposition
    unitTests:
      - packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts
  - name: RunCommandService
    path: packages/@dvt/engine/src/services/runControl/RunCommandService.ts
    dddOwner: Engine runtime command service
    cqRails:
      - RuntimeRunCommandDecomposition
    fowlerSignals:
      - Responsibility overload
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: Not applicable - internal engine runtime-control decomposition
    unitTests:
      - packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts
  - name: buildRunCommandService
    path: packages/@dvt/engine/src/services/runControl/RunCommandService.ts
    dddOwner: Engine runtime command service
    cqRails:
      - RuntimeRunCommandDecomposition
    fowlerSignals:
      - Boundary drift
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: Not applicable - internal engine runtime-control decomposition
    unitTests:
      - packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts
  - name: RunSignalServiceDeps
    path: packages/@dvt/engine/src/services/runControl/RunSignalService.ts
    dddOwner: Engine runtime signal service
    cqRails:
      - RuntimeRunSignalDecomposition
    fowlerSignals:
      - Boundary drift
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: Not applicable - internal engine runtime-control decomposition
    unitTests:
      - packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts
  - name: RunSignalService
    path: packages/@dvt/engine/src/services/runControl/RunSignalService.ts
    dddOwner: Engine runtime signal service
    cqRails:
      - RuntimeRunSignalDecomposition
    fowlerSignals:
      - Responsibility overload
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: Not applicable - internal engine runtime-control decomposition
    unitTests:
      - packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts
  - name: buildRunSignalService
    path: packages/@dvt/engine/src/services/runControl/RunSignalService.ts
    dddOwner: Engine runtime signal service
    cqRails:
      - RuntimeRunSignalDecomposition
    fowlerSignals:
      - Boundary drift
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: Not applicable - internal engine runtime-control decomposition
    unitTests:
      - packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts
  - name: RUNTIME_PATH_COMPONENT_GUIDE
    path: packages/@dvt/engine/test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
    dddOwner: Engine runtime architecture guard
    cqRails:
      - RuntimeRunCommandDecomposition
      - RuntimeRunSignalDecomposition
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
    cypressCoverage: Not applicable - internal engine architecture guard
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
  - name: RUNTIME_PATH_USER_STORIES
    path: packages/@dvt/engine/test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
    dddOwner: Engine runtime architecture guard
    cqRails:
      - RuntimeRunCommandDecomposition
      - RuntimeRunSignalDecomposition
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
    cypressCoverage: Not applicable - internal engine architecture guard
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
  - name: ENGINE_ROOT
    path: packages/@dvt/engine/test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
    dddOwner: Engine runtime architecture guard
    cqRails:
      - RuntimeRunCommandDecomposition
      - RuntimeRunSignalDecomposition
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
    cypressCoverage: Not applicable - internal engine architecture guard
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
  - name: REPO_ROOT
    path: packages/@dvt/engine/test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
    dddOwner: Engine runtime architecture guard
    cqRails:
      - RuntimeRunCommandDecomposition
      - RuntimeRunSignalDecomposition
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
    cypressCoverage: Not applicable - internal engine architecture guard
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
  - name: TEST_ROOT
    path: packages/@dvt/engine/test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
    dddOwner: Engine runtime architecture guard
    cqRails:
      - RuntimeRunCommandDecomposition
      - RuntimeRunSignalDecomposition
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
    cypressCoverage: Not applicable - internal engine architecture guard
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
  - name: readEngineSource
    path: packages/@dvt/engine/test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
    dddOwner: Engine runtime architecture guard
    cqRails:
      - RuntimeRunCommandDecomposition
      - RuntimeRunSignalDecomposition
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
    cypressCoverage: Not applicable - internal engine architecture guard
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
```

### `DHM-WS6` Semantic closure and component engineering record

`DHM-WS6` closes the modularization stream after WS2, WS3, and WS4 by
mechanizing semantic encapsulation. The slice does not add runtime behavior. It
adds the component engineering record, owned-concern module headers, user
stories, and an architecture guard that proves API composition, engine
run-control, command, signal, and documentation ownership stay aligned.

```feature-mechanization
version: 1
featureId: DHM-WS6-SEMANTIC-CLOSURE
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
componentGuides:
  - docs/architecture/components/engine/architecture/workflow-engine-semantic-closure-component.md
userStories:
  - docs/architecture/components/engine/architecture/workflow-engine-semantic-closure-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
  - docs/adr/ADR-0003-execution-model.md
  - docs/adr/ADR-0039-hexagonal-port-hardening-and-solid-remediation.md
allowedImplementationSurfaces:
  - apps/api/src/application/services/WorkflowEngineFactory.ts
  - apps/api/src/runtime/intentReconcilerRuntime.ts
  - buzon/20260512-codex-fowler-dhm-ws6-semantic-closure-analysis.md
  - docs/.manifest.json
  - docs/architecture/components/engine/architecture/index.md
  - docs/architecture/components/engine/architecture/workflow-engine-semantic-closure-component.md
  - docs/architecture/components/engine/architecture/workflow-engine-semantic-closure-user-stories.md
  - docs/evidence/ed-20260512-dhm-ws6-semantic-closure.md
  - docs/evidence/index.md
  - docs/planning/closeouts/20260512-dhm-ws6-semantic-closure-closeout.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
  - docs/planning/status/**
  - docs/risk-register/quality/R-20260512-DHM-WS6-SEMANTIC-CLOSURE.yaml
  - docs/risk-register/quality/index.md
  - packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts
  - packages/@dvt/engine/src/domain/IRunCommandService.ts
  - packages/@dvt/engine/src/domain/IRunSignalService.ts
  - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - apps/web/**
  - specs/contracts/**
commandQueryRails:
  - name: WorkflowEngineSemanticClosure
    type: command
    dddOwner: Engine architecture governance
domainObjects:
  - name: WorkflowEngineSemanticClosureComponent
    type: component engineering record
    owner: Architecture / Engine
  - name: WorkflowEngineSemanticClosureGuard
    type: architecture fitness function
    owner: Architecture / Engine
  - name: WorkflowEngineCoreService
    type: combined run-control delegator
    owner: Engine runtime
fowlerSignals:
  - Documentation drift
  - Hidden authority
  - Duplicate semantics
  - Boundary drift
architectureGuards:
  - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - Not applicable - architecture semantic closure only
completionGate:
  - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts
  - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts test/architecture/startRunApplicationDecomposition.architecture.test.ts
  - pnpm --filter dvt-api test -- test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
  - pnpm --filter @dvt/engine typecheck
  - pnpm --filter dvt-api typecheck
  - pnpm docs:status:generate
  - pnpm docs:sync
  - pnpm governance:refresh
  - pnpm docs:feature-mechanization -- --feature DHM-WS6-SEMANTIC-CLOSURE
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: dhm-ws6-semantic-closure-architecture-guard
    redTest: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    expectedFailure: composition and run-control modules lack owned concern headers and the DHM-WS6 component guide does not exist.
    patchSurfaces:
      - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
      - apps/api/src/runtime/intentReconcilerRuntime.ts
      - apps/api/src/application/services/WorkflowEngineFactory.ts
      - packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts
      - packages/@dvt/engine/src/domain/IRunCommandService.ts
      - packages/@dvt/engine/src/domain/IRunSignalService.ts
      - docs/architecture/components/engine/architecture/workflow-engine-semantic-closure-component.md
      - docs/architecture/components/engine/architecture/workflow-engine-semantic-closure-user-stories.md
      - buzon/20260512-codex-fowler-dhm-ws6-semantic-closure-analysis.md
    greenTest: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts
symbols:
  - name: WorkflowEngineSemanticClosureComponent
    path: docs/architecture/components/engine/architecture/workflow-engine-semantic-closure-component.md
    dddOwner: Engine architecture governance
    cqRails:
      - WorkflowEngineSemanticClosure
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    cypressCoverage: Not applicable - architecture semantic closure only
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
  - name: workflowEngineSemanticClosure
    path: packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    dddOwner: Engine architecture governance
    cqRails:
      - WorkflowEngineSemanticClosure
    fowlerSignals:
      - Hidden authority
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    cypressCoverage: Not applicable - architecture semantic closure only
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
  - name: WorkflowEngineCoreService
    path: packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts
    dddOwner: Engine runtime run-control service
    cqRails:
      - WorkflowEngineSemanticClosure
    fowlerSignals:
      - Hidden authority
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    cypressCoverage: Not applicable - internal engine run-control delegator
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
  - name: IntentReconcilerRuntimeComposition
    path: apps/api/src/runtime/intentReconcilerRuntime.ts
    dddOwner: API runtime composition root
    cqRails:
      - WorkflowEngineSemanticClosure
    fowlerSignals:
      - Boundary drift
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    cypressCoverage: Not applicable - API background runtime composition
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
  - name: CLOSEOUT
    path: packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    dddOwner: Engine architecture governance
    cqRails:
      - WorkflowEngineSemanticClosure
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    cypressCoverage: Not applicable - architecture semantic closure only
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
  - name: COMPONENT_GUIDE
    path: packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    dddOwner: Engine architecture governance
    cqRails:
      - WorkflowEngineSemanticClosure
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    cypressCoverage: Not applicable - architecture semantic closure only
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
  - name: ENGINE_ROOT
    path: packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    dddOwner: Engine architecture governance
    cqRails:
      - WorkflowEngineSemanticClosure
    fowlerSignals:
      - Hidden authority
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    cypressCoverage: Not applicable - architecture semantic closure only
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
  - name: FOWLER_MAILBOX
    path: packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    dddOwner: Engine architecture governance
    cqRails:
      - WorkflowEngineSemanticClosure
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    cypressCoverage: Not applicable - architecture semantic closure only
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
  - name: REPO_ROOT
    path: packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    dddOwner: Engine architecture governance
    cqRails:
      - WorkflowEngineSemanticClosure
    fowlerSignals:
      - Boundary drift
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    cypressCoverage: Not applicable - architecture semantic closure only
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
  - name: TEST_ROOT
    path: packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    dddOwner: Engine architecture governance
    cqRails:
      - WorkflowEngineSemanticClosure
    fowlerSignals:
      - Hidden authority
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    cypressCoverage: Not applicable - architecture semantic closure only
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
  - name: USER_STORIES
    path: packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    dddOwner: Engine architecture governance
    cqRails:
      - WorkflowEngineSemanticClosure
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    cypressCoverage: Not applicable - architecture semantic closure only
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
  - name: readEngineSource
    path: packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    dddOwner: Engine architecture governance
    cqRails:
      - WorkflowEngineSemanticClosure
    fowlerSignals:
      - Hidden authority
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    cypressCoverage: Not applicable - architecture semantic closure only
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
  - name: readRepoSource
    path: packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    dddOwner: Engine architecture governance
    cqRails:
      - WorkflowEngineSemanticClosure
    fowlerSignals:
      - Boundary drift
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    cypressCoverage: Not applicable - architecture semantic closure only
    unitTests:
      - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
```

### `WE-HX-5` Provider and telemetry standardization

- depends on `WE-HX-3`, `WE-HX-4`
- consolidate provider-resolution seam and telemetry/decorator policy

```feature-mechanization
version: 1
featureId: WE-HX-5-PROVIDER-TELEMETRY-SEAMS
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
componentGuides:
  - docs/architecture/components/engine/architecture/workflow-engine-provider-telemetry-seams-component.md
  - docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md
userStories:
  - docs/architecture/components/engine/architecture/workflow-engine-provider-telemetry-seams-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
  - docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md
  - docs/adr/ADR-0003-execution-model.md
  - docs/adr/ADR-0014-run-driven-adapter-model.md
  - docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md
allowedImplementationSurfaces:
  - buzon/20260512-codex-fowler-we-hx-5-provider-telemetry-seams-analysis-and-remediation.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
  - docs/planning/closeouts/20260512-we-hx-5-provider-telemetry-seams-closeout.md
  - docs/planning/status/generated-code-state.md
  - docs/planning/status/system-operations-inventory-20260501.md
  - docs/architecture/components/engine/architecture/index.md
  - docs/architecture/components/engine/architecture/workflow-engine-provider-telemetry-seams-component.md
  - docs/architecture/components/engine/architecture/workflow-engine-provider-telemetry-seams-user-stories.md
  - docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md
  - docs/evidence/ed-20260512-we-hx-5-provider-telemetry-seams.md
  - docs/evidence/index.md
  - docs/risk-register/quality/R-20260512-WE-HX-5-PROVIDER-TELEMETRY-SEAMS.yaml
  - docs/risk-register/quality/index.md
  - traceability.manifest.json
  - packages/@dvt/engine/src/application/providerSelection.ts
  - packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts
  - packages/@dvt/engine/src/application/StartRunApplicationService.ts
  - packages/@dvt/engine/src/services/RunEnrichmentService.ts
  - packages/@dvt/engine/src/services/runControl/RunCommandService.ts
  - packages/@dvt/engine/src/services/runControl/RunSignalService.ts
  - packages/@dvt/engine/src/services/startRun/StartRunTelemetryPolicy.ts
  - packages/@dvt/engine/test/application/providerSelection.test.ts
  - packages/@dvt/engine/test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
  - packages/@dvt/engine/test/services/StartRunApplicationService.test.ts
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - apps/web/**
  - apps/api/**
  - specs/**
commandQueryRails:
  - name: EngineProviderResolution
    type: command
    dddOwner: Workflow engine runtime provider seam
  - name: StartRunTelemetryPolicy
    type: command
    dddOwner: Workflow engine start-run observability policy
domainObjects:
  - name: IEngineProviderResolver
    type: application port
    owner: packages/@dvt/engine/src/application/providerSelection.ts
  - name: MapBackedEngineProviderResolver
    type: application service
    owner: packages/@dvt/engine/src/application/providerSelection.ts
  - name: StartRunTelemetryPolicy
    type: policy service
    owner: packages/@dvt/engine/src/services/startRun/StartRunTelemetryPolicy.ts
fowlerSignals:
  - Repeated provider lookup replaced by one resolver seam.
  - Start-run telemetry extracted from the application coordinator.
  - Documentation drift closed with local component API, invariants, transitions, consumers, and diagrams.
  - Semantic architecture guard validates ownership rather than barrel thinness.
architectureGuards:
  - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - engine-internal provider and telemetry seam
completionGate:
  - pnpm docs:feature-mechanization -- --feature WE-HX-5-PROVIDER-TELEMETRY-SEAMS
  - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
  - pnpm --filter @dvt/engine test -- test/application/providerSelection.test.ts test/services/StartRunApplicationService.test.ts
  - pnpm --filter @dvt/engine typecheck
  - pnpm --filter @dvt/engine test
  - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
  - pnpm docs:status:generate
  - pnpm docs:sync
  - pnpm governance:refresh
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: provider-telemetry-semantic-architecture-guard
    redTest: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    expectedFailure: Provider resolution is still repeated through adapter maps and getAdapterOrThrow, start-run telemetry is still owned by StartRunApplicationService, and the WE-HX-5 local component guide is not yet enforced.
    patchSurfaces:
      - packages/@dvt/engine/test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
      - packages/@dvt/engine/src/application/providerSelection.ts
      - packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts
      - packages/@dvt/engine/src/application/StartRunApplicationService.ts
      - packages/@dvt/engine/src/services/RunEnrichmentService.ts
      - packages/@dvt/engine/src/services/runControl/RunCommandService.ts
      - packages/@dvt/engine/src/services/runControl/RunSignalService.ts
      - packages/@dvt/engine/src/services/startRun/StartRunTelemetryPolicy.ts
      - docs/architecture/components/engine/architecture/workflow-engine-provider-telemetry-seams-component.md
      - docs/architecture/components/engine/architecture/workflow-engine-provider-telemetry-seams-user-stories.md
      - buzon/20260512-codex-fowler-we-hx-5-provider-telemetry-seams-analysis-and-remediation.md
    greenTest: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
symbols:
  - name: IEngineProviderResolver
    path: packages/@dvt/engine/src/application/providerSelection.ts
    dddOwner: Workflow engine runtime provider seam
    cqRails:
      - EngineProviderResolution
    fowlerSignals:
      - Names provider resolution as an application-owned seam.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    cypressCoverage: N/A - engine-internal seam
    unitTests:
      - pnpm --filter @dvt/engine test -- test/application/providerSelection.test.ts
  - name: MapBackedEngineProviderResolver
    path: packages/@dvt/engine/src/application/providerSelection.ts
    dddOwner: Workflow engine runtime provider seam
    cqRails:
      - EngineProviderResolution
    fowlerSignals:
      - Removes repeated map lookup and error mapping.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    cypressCoverage: N/A - engine-internal seam
    unitTests:
      - pnpm --filter @dvt/engine test -- test/application/providerSelection.test.ts
  - name: StartRunTelemetryPolicy
    path: packages/@dvt/engine/src/services/startRun/StartRunTelemetryPolicy.ts
    dddOwner: Workflow engine start-run observability policy
    cqRails:
      - StartRunTelemetryPolicy
    fowlerSignals:
      - Moves non-blocking telemetry behavior out of the application coordinator.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    cypressCoverage: N/A - engine-internal telemetry policy
    unitTests:
      - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationService.test.ts
  - name: StartRunTelemetryPolicyDeps
    path: packages/@dvt/engine/src/services/startRun/StartRunTelemetryPolicy.ts
    dddOwner: Workflow engine start-run observability policy
    cqRails:
      - StartRunTelemetryPolicy
    fowlerSignals:
      - Makes telemetry dependencies explicit.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    cypressCoverage: N/A - engine-internal telemetry policy
    unitTests:
      - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationService.test.ts
  - name: StartRunTelemetrySuccessInput
    path: packages/@dvt/engine/src/services/startRun/StartRunTelemetryPolicy.ts
    dddOwner: Workflow engine start-run observability policy
    cqRails:
      - StartRunTelemetryPolicy
    fowlerSignals:
      - Names the success telemetry transition payload.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    cypressCoverage: N/A - engine-internal telemetry policy
    unitTests:
      - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationService.test.ts
  - name: TEST_ROOT
    path: packages/@dvt/engine/test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    dddOwner: Workflow engine provider telemetry architecture guard
    cqRails:
      - EngineProviderResolution
      - StartRunTelemetryPolicy
    fowlerSignals:
      - Locates architecture test package root.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
  - name: ENGINE_ROOT
    path: packages/@dvt/engine/test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    dddOwner: Workflow engine provider telemetry architecture guard
    cqRails:
      - EngineProviderResolution
      - StartRunTelemetryPolicy
    fowlerSignals:
      - Locates engine source for semantic inspections.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
  - name: REPO_ROOT
    path: packages/@dvt/engine/test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    dddOwner: Workflow engine provider telemetry architecture guard
    cqRails:
      - EngineProviderResolution
      - StartRunTelemetryPolicy
    fowlerSignals:
      - Locates repository documentation evidence.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
  - name: COMPONENT_GUIDE
    path: packages/@dvt/engine/test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    dddOwner: Workflow engine provider telemetry architecture guard
    cqRails:
      - EngineProviderResolution
      - StartRunTelemetryPolicy
    fowlerSignals:
      - Requires local component API and invariants documentation.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
  - name: USER_STORIES
    path: packages/@dvt/engine/test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    dddOwner: Workflow engine provider telemetry architecture guard
    cqRails:
      - EngineProviderResolution
      - StartRunTelemetryPolicy
    fowlerSignals:
      - Requires scenario coverage before implementation.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
  - name: MAILBOX
    path: packages/@dvt/engine/test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    dddOwner: Workflow engine provider telemetry architecture guard
    cqRails:
      - EngineProviderResolution
      - StartRunTelemetryPolicy
    fowlerSignals:
      - Requires Fowler analysis evidence in buzon.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
  - name: readEngineSource
    path: packages/@dvt/engine/test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    dddOwner: Workflow engine provider telemetry architecture guard
    cqRails:
      - EngineProviderResolution
      - StartRunTelemetryPolicy
    fowlerSignals:
      - Reads source ownership semantics for the architecture guard.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    cypressCoverage: N/A - architecture test helper
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
```

### `WE-HX-6` Test-double and fitness-function hardening

- depends on `WE-HX-5`
- narrow in-memory doubles, split heavy fixtures, and add architecture-boundary
  regression guards

```feature-mechanization
version: 1
featureId: WE-HX-6-BOUNDARY-FITNESS
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
componentGuides:
  - docs/architecture/components/engine/architecture/workflow-engine-boundary-fitness-component.md
  - docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md
userStories:
  - docs/architecture/components/engine/architecture/workflow-engine-boundary-fitness-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
  - docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md
  - docs/adr/ADR-0000-Code-generation-with-normative-traceability-required.en.md
  - docs/adr/ADR-0003-execution-model.md
  - docs/adr/ADR-0004-event-sourcing-strategy.md
  - docs/adr/ADR-0014-run-driven-adapter-model.md
  - docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md
allowedImplementationSurfaces:
  - buzon/20260512-codex-fowler-we-hx-6-boundary-fitness-analysis-and-remediation.md
  - docs/.manifest.json
  - docs/index.md
  - docs/**/index.md
  - docs/architecture/components/engine/architecture/workflow-engine-boundary-fitness-component.md
  - docs/architecture/components/engine/architecture/workflow-engine-boundary-fitness-user-stories.md
  - docs/architecture/components/engine/architecture/workflow-engine-provider-telemetry-seams-user-stories.md
  - docs/architecture/components/engine/architecture/workflow-engine-provider-telemetry-seams-component.md
  - docs/architecture/components/engine/architecture/workflow-engine-semantic-closure-user-stories.md
  - docs/architecture/components/engine/architecture/workflow-engine-semantic-closure-component.md
  - docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md
  - docs/architecture/components/engine/roadmap/engine-phases.md
  - docs/evidence/ed-20260512-we-hx-6-boundary-fitness.md
  - docs/planning/closeouts/20260512-we-hx-6-boundary-fitness-closeout.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
  - docs/planning/state/**
  - docs/planning/status/**
  - docs/risk-register/quality/R-20260512-WE-HX-6-BOUNDARY-FITNESS.yaml
  - packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
  - packages/@dvt/engine/test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - packages/@dvt/engine/test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
  - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
  - packages/@dvt/engine/test/core/WorkflowEngine.helpers.ts
  - packages/@dvt/engine/test/helpers/runLifecycle.fixture.ts
  - packages/@dvt/engine/test/helpers/workflowEngine.fixture.ts
  - traceability.manifest.json
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - apps/web/**
  - apps/api/**
  - specs/**
commandQueryRails:
  - name: WorkflowEngineBoundaryFitness
    type: query
    dddOwner: Engine architecture fitness read model
  - name: WorkflowEngineTestDoubleBoundary
    type: query
    dddOwner: Engine test fixture boundary
domainObjects:
  - name: EngineArchitectureTestSupport
    type: test support component
    owner: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
  - name: WorkflowEngineBoundaryFitnessGuard
    type: semantic architecture fitness function
    owner: packages/@dvt/engine/test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - name: WorkflowEngineTestFixtureBoundary
    type: test double boundary
    owner: packages/@dvt/engine/test/helpers/workflowEngine.fixture.ts
fowlerSignals:
  - Test-only confidence replaced by semantic fixture and documentation checks.
  - Duplicate architecture-test readers centralized behind one support module.
  - Hidden adapter authority blocked in engine test doubles.
  - Documentation drift closed with component guide, stories, mailbox, target architecture, and roadmap updates.
architectureGuards:
  - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - engine-internal architecture and test-double boundary only
completionGate:
  - pnpm docs:feature-mechanization -- --feature WE-HX-6-BOUNDARY-FITNESS
  - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts test/architecture/workflowEngineSemanticClosure.architecture.test.ts
  - pnpm --filter @dvt/engine typecheck
  - pnpm --filter @dvt/engine test
  - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
  - pnpm docs:status:generate
  - pnpm docs:sync
  - pnpm governance:refresh
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: boundary-fitness-docs-and-fixture-semantics
    redTest: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    expectedFailure: WE-HX-6 component docs, user stories, mailbox analysis, architecture support helper, fixture owned-concern headers, and forbidden runtime-bleed checks are missing.
    patchSurfaces:
      - packages/@dvt/engine/test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
      - packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
      - packages/@dvt/engine/test/helpers/workflowEngine.fixture.ts
      - packages/@dvt/engine/test/helpers/runLifecycle.fixture.ts
      - packages/@dvt/engine/test/core/WorkflowEngine.helpers.ts
      - docs/architecture/components/engine/architecture/workflow-engine-boundary-fitness-component.md
      - docs/architecture/components/engine/architecture/workflow-engine-boundary-fitness-user-stories.md
      - buzon/20260512-codex-fowler-we-hx-6-boundary-fitness-analysis-and-remediation.md
    greenTest: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - id: architecture-test-support-repetition-removal
    redTest: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    expectedFailure: Recent WE-HX architecture tests still declare local source/document readers instead of importing engineArchitectureTestSupport.
    patchSurfaces:
      - packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
      - packages/@dvt/engine/test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
      - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
    greenTest: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts test/architecture/workflowEngineSemanticClosure.architecture.test.ts
symbols:
  - name: ENGINE_ARCHITECTURE_TEST_ROOT
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: Engine architecture fitness read model
    cqRails:
      - WorkflowEngineBoundaryFitness
    fowlerSignals:
      - Centralizes architecture-test path discovery.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    cypressCoverage: N/A - engine architecture test support
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - name: ENGINE_PACKAGE_ROOT
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: Engine architecture fitness read model
    cqRails:
      - WorkflowEngineBoundaryFitness
    fowlerSignals:
      - Centralizes architecture-test path discovery.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    cypressCoverage: N/A - engine architecture test support
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - name: ENGINE_SRC_ROOT
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: Engine architecture fitness read model
    cqRails:
      - WorkflowEngineBoundaryFitness
    fowlerSignals:
      - Centralizes source discovery.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    cypressCoverage: N/A - engine architecture test support
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - name: ENGINE_TEST_ROOT
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: Engine test fixture boundary
    cqRails:
      - WorkflowEngineTestDoubleBoundary
    fowlerSignals:
      - Centralizes test fixture discovery.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    cypressCoverage: N/A - engine architecture test support
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - name: REPO_ROOT
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: Engine architecture fitness read model
    cqRails:
      - WorkflowEngineBoundaryFitness
    fowlerSignals:
      - Centralizes repository document discovery.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    cypressCoverage: N/A - engine architecture test support
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - name: ENGINE_ARCHITECTURE_DOC_ROOT
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: Engine architecture fitness read model
    cqRails:
      - WorkflowEngineBoundaryFitness
    fowlerSignals:
      - Centralizes component-guide discovery.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    cypressCoverage: N/A - engine architecture test support
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - name: repoPath
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: Engine architecture fitness read model
    cqRails:
      - WorkflowEngineBoundaryFitness
    fowlerSignals:
      - Removes repeated repository path joins.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    cypressCoverage: N/A - engine architecture test support
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - name: engineArchitectureDocPath
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: Engine architecture fitness read model
    cqRails:
      - WorkflowEngineBoundaryFitness
    fowlerSignals:
      - Removes repeated component-doc path joins.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    cypressCoverage: N/A - engine architecture test support
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - name: readEngineSource
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: Engine architecture fitness read model
    cqRails:
      - WorkflowEngineBoundaryFitness
    fowlerSignals:
      - Removes repeated source readers.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    cypressCoverage: N/A - engine architecture test support
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - name: readEngineTestSource
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: Engine test fixture boundary
    cqRails:
      - WorkflowEngineTestDoubleBoundary
    fowlerSignals:
      - Reads test fixture boundary semantics.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    cypressCoverage: N/A - engine architecture test support
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - name: readRepoSource
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: Engine architecture fitness read model
    cqRails:
      - WorkflowEngineBoundaryFitness
    fowlerSignals:
      - Reads repository documentation evidence.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    cypressCoverage: N/A - engine architecture test support
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - name: readEngineArchitectureDoc
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: Engine architecture fitness read model
    cqRails:
      - WorkflowEngineBoundaryFitness
    fowlerSignals:
      - Reads component-guide evidence.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    cypressCoverage: N/A - engine architecture test support
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - name: expectFileExists
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: Engine architecture fitness read model
    cqRails:
      - WorkflowEngineBoundaryFitness
    fowlerSignals:
      - Names file-presence evidence.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    cypressCoverage: N/A - engine architecture test support
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - name: expectMarkdownSections
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: Engine architecture fitness read model
    cqRails:
      - WorkflowEngineBoundaryFitness
    fowlerSignals:
      - Names documentation coverage checks.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    cypressCoverage: N/A - engine architecture test support
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - name: expectOwnedConcernHeader
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: Engine test fixture boundary
    cqRails:
      - WorkflowEngineTestDoubleBoundary
    fowlerSignals:
      - Names semantic module ownership checks.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    cypressCoverage: N/A - engine architecture test support
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - name: expectForbiddenTokensAbsent
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: Engine test fixture boundary
    cqRails:
      - WorkflowEngineTestDoubleBoundary
    fowlerSignals:
      - Names negative boundary checks for hidden adapter authority.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
    cypressCoverage: N/A - engine architecture test support
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - name: getClassConstructorParameterPropertyTypes
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: Engine architecture fitness read model
    cqRails:
      - WorkflowEngineBoundaryFitness
    fowlerSignals:
      - Replaces source-string facade structure checks with TypeScript AST semantics.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/workflowEngineFacadeUseCases.architecture.test.ts
    cypressCoverage: N/A - engine architecture test support
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/engineArchitectureTestSupport.test.ts
      - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineFacadeUseCases.architecture.test.ts
  - name: isParameterProperty
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: Engine architecture fitness read model
    cqRails:
      - WorkflowEngineBoundaryFitness
    fowlerSignals:
      - Encapsulates TypeScript parameter-property detection for semantic architecture guards.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/engineArchitectureTestSupport.test.ts
    cypressCoverage: N/A - engine architecture test support
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/engineArchitectureTestSupport.test.ts
```

## Lane mapping

Lane A execution mapping:

- create umbrella `WE-HX` with child tasks `WE-HX-0..6`
- reference this proposal and the two canonical docs:
  - `docs/architecture/components/engine/architecture/workflow-engine-subsystem-context.md`
  - `docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md`
- update dependency notes so `AR-A3` is explicitly merged into `WE-HX-4`
- route the remaining post-`WE-HX-4` facade-purity convergence through
  `AR-A12-C` instead of reopening `AR-A3`

## Risks and tradeoffs

Key tradeoffs:

- keeping backward-compatible facade posture would slow internal cleanup
- strict ownership seams increase clarity but require composition-root adapter
  discipline
- replacing stale docs now has short-term churn but removes long-term drift

Primary risks:

- "partial decomposition" risk if waves stop after docs
- accidental parallel architecture narratives if old docs remain "active"
- hidden coupling surfacing late during service extraction

Mitigation:

- enforce wave sequencing in Lane A
- keep canonical navigation explicit in engine and components indexes
- add architecture fitness checks in `WE-HX-6`

## Non-goals

- changing public `IWorkflowEngine` contract outside the governed pre-stable
  `AR-A12-C` / contract-reset slice
- implementing runtime service extraction in this documentation slice
- replacing event-sourcing model or provider adapter model

## Doc replacement rationale

The engine docs already contain historical and partially stale structures.
Keeping this as additive docs would create two active truths. This proposal
requires replacing navigation and canonical references so new docs become the
single active architecture narrative for this subsystem.

## Validation baseline

```bash
pnpm docs:workboard:generate
pnpm docs:sync
pnpm verify:prepush
```

## WE-HX-3 feature mechanization

```feature-mechanization
version: 1
featureId: WE-HX-3-START-RUN-DECOMPOSITION
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
componentGuides:
  - docs/architecture/components/engine/architecture/start-run-application-decomposition-component.md
  - docs/architecture/components/engine/architecture/start-run-application-decomposition-diagrams.md
  - docs/architecture/components/engine/contracts/engine/StartRunProtocol.v1.md
  - docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md
userStories:
  - docs/architecture/components/engine/architecture/start-run-application-decomposition-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
  - docs/architecture/components/engine/contracts/engine/StartRunProtocol.v1.md
  - docs/adr/ADR-0003-execution-model.md
  - docs/adr/ADR-0004-event-sourcing-strategy.md
  - docs/adr/ADR-0012-plan-integrity-ownership.md
  - docs/adr/ADR-0014-run-driven-adapter-model.md
  - docs/adr/ADR-0030-pre-dispatch-intent-log.md
  - docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md
allowedImplementationSurfaces:
  - buzon/20260518-dhm-ws3-fowler-admission-semantics-analysis.md
  - buzon/20260512-codex-fowler-we-hx-3-start-run-decomposition-analysis-and-remediation.md
  - buzon/20260515-codex-fowler-we-hx-3-hardcut-analysis.md
  - buzon/20260515-codex-we-hx-3-qa-hardening-tasks.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md
  - docs/planning/closeouts/**
  - docs/planning/closeouts/20260512-we-hx-3-start-run-application-decomposition-closeout.md
  - docs/planning/status/generated-code-state.md
  - docs/planning/status/system-operations-inventory-20260501.md
  - docs/architecture/components/engine/architecture/**
  - docs/architecture/components/engine/architecture/index.md
  - docs/architecture/components/engine/architecture/start-run-application-decomposition-component.md
  - docs/architecture/components/engine/architecture/start-run-application-decomposition-diagrams.md
  - docs/architecture/components/engine/architecture/start-run-application-decomposition-user-stories.md
  - docs/architecture/components/engine/architecture/workflow-engine-subsystem-context.md
  - docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md
  - docs/architecture/components/engine/contracts/engine/StartRunProtocol.v1.md
  - docs/evidence/**
  - docs/evidence/ed-20260512-we-hx-3-start-run-decomposition.md
  - docs/evidence/index.md
  - docs/risk-register/quality/**
  - docs/risk-register/quality/R-20260512-WE-HX-3-START-RUN-DECOMPOSITION.yaml
  - docs/risk-register/quality/index.md
  - scripts/lib/feature-mechanization-manifest.cjs
  - scripts/feature-mechanization-manifest.test.cjs
  - traceability.manifest.json
  - packages/@dvt/engine/src/application/StartRunApplicationService.ts
  - packages/@dvt/engine/src/services/startRun/StartRunAdmissionService.ts
  - packages/@dvt/engine/src/services/startRun/StartRunDomainConstants.ts
  - packages/@dvt/engine/src/services/startRun/StartRunEventFactory.ts
  - packages/@dvt/engine/src/services/startRun/StartRunExecutionService.ts
  - packages/@dvt/engine/src/services/startRun/StartRunFailurePolicy.ts
  - packages/@dvt/engine/src/services/startRun/StartRunIntentService.ts
  - packages/@dvt/engine/src/services/startRun/StartRunTypes.ts
  - packages/@dvt/engine/src/services/startRun/StartRunValidationPolicy.ts
  - packages/@dvt/engine/test/architecture/**
  - packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
  - packages/@dvt/engine/test/architecture/startRunApplicationDecomposition.architecture.test.ts
  - packages/@dvt/engine/test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
  - packages/@dvt/engine/test/services/StartRunApplicationDecomposition.test.ts
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - apps/web/**
  - apps/api/**
  - specs/**
commandQueryRails:
  - name: IWorkflowEngine.startRun
    type: command
    dddOwner: StartRunApplicationFlow
domainObjects:
  - name: StartRunApplicationFlow
    type: application service
    owner: packages/@dvt/engine/src/application/StartRunApplicationService.ts
  - name: StartRunAdmissionPhase
    type: application service / policy coordinator
    owner: packages/@dvt/engine/src/services/startRun/StartRunAdmissionService.ts
  - name: StartRunIntentPhase
    type: domain service
    owner: packages/@dvt/engine/src/services/startRun/StartRunIntentService.ts
fowlerSignals:
  - Responsibility overload reduced in StartRunApplicationService.
  - Deterministic intent creation moved behind an intention-revealing service.
  - Scoped plan integrity conversion moved to the admission phase owner.
  - Architecture guard validates semantic phase ownership.
  - Hardcut removes duplicate DHM-named active start-run decomposition identity.
  - QA hardening separates semantic architecture guards from documentation-pack guards.
architectureGuards:
  - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
  - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
cypressFlows:
  - N/A - internal engine start-run decomposition
completionGate:
  - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationDecomposition.test.ts
  - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
  - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
  - node --test scripts/feature-mechanization-manifest.test.cjs
  - pnpm --filter @dvt/engine typecheck
  - pnpm --filter @dvt/engine test
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: start-run-admission-seam-injection
    redTest: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts test/services/StartRunApplicationService.test.ts
    expectedFailure: StartRunApplicationService still constructs StartRunAdmissionService internally instead of depending on IStartRunAdmissionService.
    patchSurfaces:
      - packages/@dvt/engine/src/application/StartRunApplicationService.ts
      - packages/@dvt/engine/src/services/startRun/StartRunTypes.ts
      - packages/@dvt/engine/src/services/startRun/StartRunAdmissionService.ts
      - packages/@dvt/engine/test/architecture/startRunApplicationDecomposition.architecture.test.ts
      - packages/@dvt/engine/test/services/StartRunApplicationService.test.ts
    greenTest: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts test/services/StartRunApplicationService.test.ts
  - id: start-run-phase-service-behavior
    redTest: pnpm --filter @dvt/engine test -- test/services/StartRunApplicationDecomposition.test.ts
    expectedFailure: StartRunAdmissionService and StartRunIntentService are missing, so admission and intent creation cannot be tested as independent phases.
    patchSurfaces:
      - packages/@dvt/engine/src/services/startRun/StartRunAdmissionService.ts
      - packages/@dvt/engine/src/services/startRun/StartRunIntentService.ts
      - packages/@dvt/engine/src/application/StartRunApplicationService.ts
      - packages/@dvt/engine/test/services/StartRunApplicationDecomposition.test.ts
    greenTest: pnpm --filter @dvt/engine test -- test/services/StartRunApplicationDecomposition.test.ts
  - id: start-run-semantic-architecture-guard
    redTest: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    expectedFailure: StartRunApplicationService still owns scoped plan integrity and private intent creation, WE-HX-3 docs do not exist, or the active plan declares more than one start-run decomposition feature identity.
    patchSurfaces:
      - packages/@dvt/engine/test/architecture/startRunApplicationDecomposition.architecture.test.ts
      - docs/architecture/components/engine/architecture/start-run-application-decomposition-component.md
      - docs/architecture/components/engine/architecture/start-run-application-decomposition-user-stories.md
      - buzon/20260512-codex-fowler-we-hx-3-start-run-decomposition-analysis-and-remediation.md
      - buzon/20260515-codex-fowler-we-hx-3-hardcut-analysis.md
    greenTest: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
  - id: start-run-qa-hardening-parser-api
    redTest: node --test scripts/feature-mechanization-manifest.test.cjs
    expectedFailure: Feature mechanization extraction still lives inside the CLI script instead of a stable parser module.
    patchSurfaces:
      - scripts/lib/feature-mechanization-manifest.cjs
      - scripts/feature-mechanization-manifest.test.cjs
      - scripts/check-feature-mechanization.cjs
    greenTest: node --test scripts/feature-mechanization-manifest.test.cjs
  - id: start-run-qa-hardening-doc-pack-guard
    redTest: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    expectedFailure: WE-HX-3 component documentation lacks a structured componentDocContract and the docs guard still depends on human heading text.
    patchSurfaces:
      - packages/@dvt/engine/test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
      - packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
      - packages/@dvt/engine/test/architecture/startRunApplicationDecomposition.architecture.test.ts
      - docs/architecture/components/engine/architecture/start-run-application-decomposition-component.md
      - docs/architecture/components/engine/architecture/start-run-application-decomposition-diagrams.md
    greenTest: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
symbols:
  - name: IStartRunAdmissionService
    path: packages/@dvt/engine/src/services/startRun/StartRunTypes.ts
    dddOwner: StartRunAdmissionPhase
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Makes the admission phase a first-class injected semantic seam.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - engine-internal phase port
    unitTests:
      - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationService.test.ts
  - name: StartRunAdmissionGuardPort
    path: packages/@dvt/engine/src/services/startRun/StartRunTypes.ts
    dddOwner: StartRunAdmissionPhase
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Defines an intention-revealing internal admission port.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - engine-internal phase port
    unitTests:
      - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationDecomposition.test.ts
  - name: StartRunAdmissionRequest
    path: packages/@dvt/engine/src/services/startRun/StartRunTypes.ts
    dddOwner: StartRunAdmissionPhase
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Replaces an implicit parameter train with a phase request object.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - engine-internal phase request
    unitTests:
      - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationDecomposition.test.ts
  - name: StartRunAdmissionResult
    path: packages/@dvt/engine/src/services/startRun/StartRunTypes.ts
    dddOwner: StartRunAdmissionPhase
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Names the pre-dispatch admission output.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - engine-internal phase result
    unitTests:
      - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationDecomposition.test.ts
  - name: StartRunAdmissionService
    path: packages/@dvt/engine/src/services/startRun/StartRunAdmissionService.ts
    dddOwner: StartRunAdmissionPhase
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Extracts pre-dispatch admission from the application coordinator.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - engine-internal phase service
    unitTests:
      - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationDecomposition.test.ts
  - name: StartRunAdmissionServiceDeps
    path: packages/@dvt/engine/src/services/startRun/StartRunAdmissionService.ts
    dddOwner: StartRunAdmissionPhase
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Makes phase dependencies explicit.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - engine-internal phase deps
    unitTests:
      - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationDecomposition.test.ts
  - name: StartRunExecutionPolicyAdmission
    path: packages/@dvt/engine/src/services/startRun/StartRunTypes.ts
    dddOwner: StartRunAdmissionPhase
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Names the capability-check handoff.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - engine-internal phase DTO
    unitTests:
      - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationDecomposition.test.ts
  - name: StartRunVerifiedArtifact
    path: packages/@dvt/engine/src/services/startRun/StartRunTypes.ts
    dddOwner: StartRunAdmissionPhase
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Names the verified plan artifact returned by admission.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - engine-internal phase DTO
    unitTests:
      - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationDecomposition.test.ts
  - name: toScopedPlanRef
    path: packages/@dvt/engine/src/services/startRun/StartRunAdmissionService.ts
    dddOwner: StartRunAdmissionPhase
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Moves scoped artifact conversion to the admission phase owner.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - pure helper
    unitTests:
      - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationDecomposition.test.ts
  - name: StartRunIntentService
    path: packages/@dvt/engine/src/services/startRun/StartRunIntentService.ts
    dddOwner: StartRunIntentPhase
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Extracts deterministic intent creation from the application coordinator.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - engine-internal phase service
    unitTests:
      - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationDecomposition.test.ts
  - name: StartRunIntentServiceDeps
    path: packages/@dvt/engine/src/services/startRun/StartRunIntentService.ts
    dddOwner: StartRunIntentPhase
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Makes deterministic intent dependencies explicit.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - engine-internal phase deps
    unitTests:
      - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationDecomposition.test.ts
  - name: ENGINE_ROOT
    path: packages/@dvt/engine/test/architecture/startRunApplicationDecomposition.architecture.test.ts
    dddOwner: StartRunArchitectureGuard
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Locates package sources for semantic inspection.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
  - name: REPO_ROOT
    path: packages/@dvt/engine/test/architecture/startRunApplicationDecomposition.architecture.test.ts
    dddOwner: StartRunArchitectureGuard
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Locates repository docs for semantic inspection.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
  - name: START_RUN_SOURCE
    path: packages/@dvt/engine/test/architecture/startRunApplicationDecomposition.architecture.test.ts
    dddOwner: StartRunArchitectureGuard
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Locates phase modules for owned-concern checks.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
  - name: TEST_ROOT
    path: packages/@dvt/engine/test/architecture/startRunApplicationDecomposition.architecture.test.ts
    dddOwner: StartRunArchitectureGuard
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Locates architecture test package root.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
  - name: readEngineSource
    path: packages/@dvt/engine/test/architecture/startRunApplicationDecomposition.architecture.test.ts
    dddOwner: StartRunArchitectureGuard
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Reads current implementation truth for semantic guard assertions.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - architecture test helper
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
  - name: readStartRunPhaseSources
    path: packages/@dvt/engine/test/architecture/startRunApplicationDecomposition.architecture.test.ts
    dddOwner: StartRunArchitectureGuard
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Reads all phase sources to verify declared component API.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - architecture test helper
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
  - name: require
    path: packages/@dvt/engine/test/architecture/startRunApplicationDecomposition.architecture.test.ts
    dddOwner: StartRunArchitectureGuard
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Imports the stable feature-mechanization parser module instead of the CLI script.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - architecture test helper
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
  - name: ComponentDocContract
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: StartRunDocumentationPackGuard
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Names the structured component-document contract for QA hardening.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    cypressCoverage: N/A - architecture test support type
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
  - name: extractComponentDocContract
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: StartRunDocumentationPackGuard
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Reads structured component-document semantics instead of prose headings.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    cypressCoverage: N/A - architecture test support helper
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
  - name: expectComponentDocContract
    path: packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts
    dddOwner: StartRunDocumentationPackGuard
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Validates stable component semantics without requiring exact heading text.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    cypressCoverage: N/A - architecture test support helper
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
  - name: CLOSEOUT_PATH
    path: packages/@dvt/engine/test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    dddOwner: StartRunDocumentationPackGuard
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Requires closeout evidence in the documentation pack.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
  - name: COMPONENT_GUIDE_PATH
    path: packages/@dvt/engine/test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    dddOwner: StartRunDocumentationPackGuard
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Requires the component guide in the documentation pack.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
  - name: COMPONENT_DIAGRAMS_PATH
    path: packages/@dvt/engine/test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    dddOwner: StartRunDocumentationPackGuard
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Requires the component diagram pack in the documentation pack.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
  - name: EVIDENCE_PATH
    path: packages/@dvt/engine/test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    dddOwner: StartRunDocumentationPackGuard
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Requires ARC-2 evidence in the documentation pack.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
  - name: PLAN_PATH
    path: packages/@dvt/engine/test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    dddOwner: StartRunDocumentationPackGuard
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Locates the WE-HX-3 mechanization manifest for doc-pack declaration checks.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
  - name: RISK_PATH
    path: packages/@dvt/engine/test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    dddOwner: StartRunDocumentationPackGuard
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Requires ARC-2 risk coverage in the documentation pack.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
  - name: USER_STORIES_PATH
    path: packages/@dvt/engine/test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    dddOwner: StartRunDocumentationPackGuard
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Requires user-story coverage in the documentation pack.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
    cypressCoverage: N/A - architecture test constant
    unitTests:
      - pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
  - name: extractFeatureMechanizationManifests
    path: scripts/lib/feature-mechanization-manifest.cjs
    dddOwner: FeatureMechanizationParser
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Provides a stable parser API shared by CLI validation and architecture guards.
    architectureGuard: node --test scripts/feature-mechanization-manifest.test.cjs
    cypressCoverage: N/A - repository parser helper
    unitTests:
      - node --test scripts/feature-mechanization-manifest.test.cjs
  - name: manifestFencePattern
    path: scripts/lib/feature-mechanization-manifest.cjs
    dddOwner: FeatureMechanizationParser
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Defines the stable feature-mechanization fenced-block grammar.
    architectureGuard: node --test scripts/feature-mechanization-manifest.test.cjs
    cypressCoverage: N/A - repository parser helper
    unitTests:
      - node --test scripts/feature-mechanization-manifest.test.cjs
  - name: yaml
    path: scripts/lib/feature-mechanization-manifest.cjs
    dddOwner: FeatureMechanizationParser
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Parses feature-mechanization YAML through the shared parser API.
    architectureGuard: node --test scripts/feature-mechanization-manifest.test.cjs
    cypressCoverage: N/A - repository parser helper
    unitTests:
      - node --test scripts/feature-mechanization-manifest.test.cjs
  - name: assert
    path: scripts/feature-mechanization-manifest.test.cjs
    dddOwner: FeatureMechanizationParserTest
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Verifies parser behavior with direct Node assertions.
    architectureGuard: node --test scripts/feature-mechanization-manifest.test.cjs
    cypressCoverage: N/A - repository parser test
    unitTests:
      - node --test scripts/feature-mechanization-manifest.test.cjs
  - name: test
    path: scripts/feature-mechanization-manifest.test.cjs
    dddOwner: FeatureMechanizationParserTest
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Defines parser red/green fixture cases.
    architectureGuard: node --test scripts/feature-mechanization-manifest.test.cjs
    cypressCoverage: N/A - repository parser test
    unitTests:
      - node --test scripts/feature-mechanization-manifest.test.cjs
  - name: makeResolvedContext
    path: packages/@dvt/engine/test/services/StartRunApplicationDecomposition.test.ts
    dddOwner: StartRunPhaseBehaviorTest
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Provides canonical resolved context fixture for phase tests.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - unit test helper
    unitTests:
      - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationDecomposition.test.ts
  - name: makeTemporalAdapter
    path: packages/@dvt/engine/test/services/StartRunApplicationDecomposition.test.ts
    dddOwner: StartRunPhaseBehaviorTest
    cqRails:
      - IWorkflowEngine.startRun
    fowlerSignals:
      - Provides provider adapter fixture for admission phase tests.
    architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
    cypressCoverage: N/A - unit test helper
    unitTests:
      - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationDecomposition.test.ts
```
