# Engine Core

## Purpose

Summarizes the shipped `@dvt/engine` core surface inside the component map.
Normative architecture, contracts, and target decomposition live under this
component tree, while end-to-end lifecycle flow lives under
`docs/architecture/system/subsystems/`.

## Responsibilities

- workflow lifecycle orchestration
- command and signal semantics
- snapshot projection and read-model updates
- authorization and runtime policy enforcement through explicit seams
- coordination of provider-facing execution from engine-owned contracts

## Canonical references

- [Canonical engine index](../index.md)
- [WorkflowEngine subsystem context](./workflow-engine-subsystem-context.md)
- [WorkflowEngine target architecture v1](./workflow-engine-target-architecture.v1.md)
- [WorkflowEngine boundary ownership component](./workflow-engine-boundary-ownership-component.md)
- [WorkflowEngine boundary ownership user stories](./workflow-engine-boundary-ownership-user-stories.md)
- [Canonical C4 architecture](./c4-engine.md)
- [Distributed consistency model](../../../system/distributed-consistency-model.md)
- [Execution semantics](../contracts/engine/ExecutionSemantics.v1.md)
- [Workflow engine contract](../contracts/engine/IWorkflowEngine.v1.md)

## Current code anchors

- `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts`
- `packages/@dvt/engine/src/application/StartRunApplicationService.ts`
- `packages/@dvt/engine/src/ports/IPlanIntegrityValidator.ts`
- `packages/@dvt/engine/src/security/RunAccessPolicy.ts`

## Navigation

- [Engine component home](../index.md)
- [Adapters](../adapters/index.md)
- [Workflows](./workflows.md)
- [Security](../security/index.md)
- [Operations](../ops/index.md)
- [Contracts](../contracts/index.md)
- [Capabilities](../contracts/capabilities/index.md)
- [Canonical C4 architecture](./c4-engine.md)
