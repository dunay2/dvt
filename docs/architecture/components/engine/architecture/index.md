---
title: Engine architecture pack
status: Active
owner: Architecture / Engine
last_reviewed: 2026-04-14
---

# Engine architecture pack

This folder holds the current structural docs for `@dvt/engine`.

Use it when the question is:

- how the component is shaped today;
- which services own lifecycle and query behavior;
- what the target internal split is;
- how the component participates in the canonical run lifecycle.

## Primary pages

- [Core responsibilities](./core.md)
- [Run execution context admission policy component](./run-execution-context-admission-policy-component.md)
- [Distributed consistency model](../../../system/distributed-consistency-model.md)
- [Workflow references](./workflows.md)
- [C4 engine](./c4-engine.md)
- [Workflow engine subsystem context](./workflow-engine-subsystem-context.md)
- [Workflow engine target architecture](./workflow-engine-target-architecture.v1.md)
- [Start-run admission component](./start-run-admission-component.md)
- [Start-run admission user stories](./start-run-admission-user-stories.md)

## Related pages

- [Engine component home](../index.md)
- [Adapters](../adapters/index.md)
- [Contracts](../contracts/index.md)
- [Operations](../ops/index.md)
- [Security](../security/index.md)
