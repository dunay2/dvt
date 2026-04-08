# Engine Core

## Purpose

Summarizes the shipped `@dvt/engine` core surface inside the component map.
Normative architecture, contracts, and target decomposition live under
`docs/architecture/engine/`.

## Responsibilities

- workflow lifecycle orchestration
- command and signal semantics
- snapshot projection and read-model updates
- authorization and runtime policy enforcement through explicit seams
- coordination of provider-facing execution from engine-owned contracts

## Canonical references

- [Canonical engine index](../../engine/index.md)
- [WorkflowEngine subsystem context](../../engine/workflow-engine-subsystem-context.md)
- [WorkflowEngine target architecture v1](../../engine/workflow-engine-target-architecture.v1.md)
- [Canonical C4 architecture](../../engine/c4-engine.md)
- [Execution semantics](../../engine/contracts/engine/ExecutionSemantics.v1.md)
- [Workflow engine contract](../../engine/contracts/engine/IWorkflowEngine.v1.md)

## Current code anchors

- `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts`
- `packages/@dvt/engine/src/application/StartRunApplicationService.ts`
- `packages/@dvt/engine/src/security/RunAccessPolicy.ts`

## Navigation

- [Adapters](adapters.md)
- [Workflows](workflows.md)
- [Security](security.md)
- [Operations](operations.md)
- [Contracts](contracts.md)
- [Capabilities](capabilities.md)
- [Canonical C4 architecture](../../engine/c4-engine.md)
