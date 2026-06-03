---
title: Engine Contracts
status: Active
owner: docs
last_reviewed: 2026-02-25
---

# Engine Contracts

Execution lifecycle, command, and event contracts for the workflow engine.

## Engine-owned behavior sources (`@dvt/engine`)

- `packages/@dvt/engine/src/ports/IWorkflowEngine.ts`
- `packages/@dvt/engine/src/adapters/IProviderAdapter.ts`
- `packages/@dvt/engine/src/ports/IRunStateStore.ts`
- `packages/@dvt/engine/src/ports/IProjector.ts`
- `packages/@dvt/engine/src/ports/IStartRunIntentStore.ts`
- `packages/@dvt/engine/src/domain/startRunIntentPolicy.ts`

## Serializable normative sources (`@dvt/contracts`)

- `packages/@dvt/contracts/src/contracts/engine/ExecutionSemantics.v1.ts`
- `packages/@dvt/contracts/src/contracts/engine/IOutboxStorage.v1.ts`
- `packages/@dvt/contracts/src/contracts/engine/RunEvents.v1.ts`
- `packages/@dvt/contracts/src/contracts/engine/RunExecutionContext.v1.ts`
- `packages/@dvt/contracts/src/contracts/engine/RunExecutionPolicy.v1.ts`
- `packages/@dvt/contracts/src/contracts/engine/RunStateVocabulary.v1.ts`
- `packages/@dvt/contracts/src/contracts/engine/SignalSemantics.v1.ts`
- `packages/@dvt/contracts/src/contracts/engine/StartRunBoundary.v1.ts`

## Reference Documentation

- [index.md](../../architecture/components/engine/contracts/capabilities/index.md)
- [README.md](../../architecture/components/engine/contracts/capabilities/README.md)
- [CONTRACT_TEMPLATE.v1.md](../../architecture/components/engine/contracts/CONTRACT_TEMPLATE.v1.md)
- [index.md](../../architecture/components/engine/contracts/engine/events/index.md)
- [ExecutionSemantics.v1.md](../../architecture/components/engine/contracts/engine/ExecutionSemantics.v1.md)
- [GlossaryContract.v1.md](../../architecture/components/engine/contracts/engine/GlossaryContract.v1.md)
- [index.md](../../architecture/components/engine/contracts/engine/index.md)
- [IProviderAdapter.v1.md](../../architecture/components/engine/contracts/engine/IProviderAdapter.v1.md)
- [IRunEnrichmentService.v1.md](../../architecture/components/engine/contracts/engine/IRunEnrichmentService.v1.md)
- [IWorkflowEngine.v1.md](../../architecture/components/engine/contracts/engine/IWorkflowEngine.v1.md)
- [RunEvents.v1.md](../../architecture/components/engine/contracts/engine/RunEvents.v1.md)
- [RunExecutionPolicy.v1.md](../../architecture/components/engine/contracts/engine/RunExecutionPolicy.v1.md)
- [runtime-provider-vocabulary-component.md](../../architecture/components/engine/contracts/engine/runtime-provider-vocabulary-component.md)
- [SignalsAndAuth.v1.md](../../architecture/components/engine/contracts/engine/SignalsAndAuth.v1.md)
- [start-run-boundary-component.md](../../architecture/components/engine/contracts/engine/start-run-boundary-component.md)
- [start-run-boundary.v1.md](../../architecture/components/engine/contracts/engine/start-run-boundary.v1.md)
- [StartRunProtocol.v1.md](../../architecture/components/engine/contracts/engine/StartRunProtocol.v1.md)
- [index.md](../../architecture/components/engine/contracts/extensions/index.md)
- [PluginSandbox.v1.md](../../architecture/components/engine/contracts/extensions/PluginSandbox.v1.md)
- [index.md](../../architecture/components/engine/contracts/index.md)
- [plan-admission-matrix.md](../../architecture/components/engine/contracts/plan-admission-matrix.md)
- [plan-admission-user-stories.md](../../architecture/components/engine/contracts/plan-admission-user-stories.md)
- [plan-schema-version-admission-component.md](../../architecture/components/engine/contracts/plan-schema-version-admission-component.md)
- [plan-schema-version-admission-user-stories.md](../../architecture/components/engine/contracts/plan-schema-version-admission-user-stories.md)
- [plan-store-records-component.md](../../architecture/components/engine/contracts/plan-store-records-component.md)
- [plan-store-records-user-stories.md](../../architecture/components/engine/contracts/plan-store-records-user-stories.md)
- [plan-verifier-admission-user-stories.md](../../architecture/components/engine/contracts/plan-verifier-admission-user-stories.md)
- [plan-verifier-admission.md](../../architecture/components/engine/contracts/plan-verifier-admission.md)
- [README.md](../../architecture/components/engine/contracts/README.md)
- [index.md](../../architecture/components/engine/contracts/schemas/index.md)
- [AuditLog.v1.md](../../architecture/components/engine/contracts/security/AuditLog.v1.md)
- [IAuthorization.v1.md](../../architecture/components/engine/contracts/security/IAuthorization.v1.md)
- [index.md](../../architecture/components/engine/contracts/security/index.md)
- [index.md](../../architecture/components/engine/contracts/state-store/index.md)
- [IRunStateStore.v1.md](../../architecture/components/engine/contracts/state-store/IRunStateStore.v1.md)
- [IRunStateStore.v2.0.md](../../architecture/components/engine/contracts/state-store/IRunStateStore.v2.0.md)
- [overview.md](../../architecture/components/engine/contracts/state-store/overview.md)
- [README.md](../../architecture/components/engine/contracts/state-store/README.md)
- [snapshot-rebuild-concurrency-component.md](../../architecture/components/engine/contracts/state-store/snapshot-rebuild-concurrency-component.md)
- [snapshot-rebuild-concurrency-user-stories.md](../../architecture/components/engine/contracts/state-store/snapshot-rebuild-concurrency-user-stories.md)
- [VERSIONING.md](../../architecture/components/engine/contracts/VERSIONING.md)

> This page is auto-generated by `pnpm docs:sync`. Do not edit manually.
