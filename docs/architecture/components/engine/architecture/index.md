---
title: Engine architecture pack
status: Active
owner: Architecture / Engine
last_reviewed: 2026-04-29
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
- [Engine adapter circuit breaker component](./adapter-circuit-breaker-component.md)
- [Engine adapter circuit breaker user stories](./adapter-circuit-breaker-user-stories.md)
- [Workflow engine boundary ownership component](./workflow-engine-boundary-ownership-component.md)
- [Workflow engine facade use-cases component](./workflow-engine-facade-use-cases-component.md)
- [Workflow engine boundary ownership user stories](./workflow-engine-boundary-ownership-user-stories.md)
- [Workflow engine facade use-case user stories](./workflow-engine-facade-use-cases-user-stories.md)
- [Start-run application decomposition component](./start-run-application-decomposition-component.md)
- [Start-run application decomposition user stories](./start-run-application-decomposition-user-stories.md)
- [Start-run admission component](./start-run-admission-component.md)
- [Start-run admission user stories](./start-run-admission-user-stories.md)
- [Workflow engine runtime path decomposition component](./workflow-engine-runtime-path-decomposition-component.md)
- [Workflow engine runtime path decomposition user stories](./workflow-engine-runtime-path-decomposition-user-stories.md)
- [Workflow engine semantic closure component](./workflow-engine-semantic-closure-component.md)
- [Workflow engine semantic closure user stories](./workflow-engine-semantic-closure-user-stories.md)
- [Workflow engine boundary fitness component](./workflow-engine-boundary-fitness-component.md)
- [Workflow engine boundary fitness user stories](./workflow-engine-boundary-fitness-user-stories.md)
- [Engine public API surface component](./engine-public-api-surface-component.md)
- [Engine public API surface user stories](./engine-public-api-surface-user-stories.md)

## Related pages

- [Engine component home](../index.md)
- [Adapters](../adapters/index.md)
- [Contracts](../contracts/index.md)
- [Operations](../ops/index.md)
- [Security](../security/index.md)
