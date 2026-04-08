---
title: Execution subsystem architecture
status: Active
owner: Architecture / Engine
last_reviewed: 2026-04-09
---

# Execution subsystem architecture

This pack documents execution flow, lifecycle semantics, and WorkflowEngine
subsystem context.

It is not the canonical component home for `@dvt/engine`. Use
[@dvt/engine](../components/engine/index.md) first when the question is about
the engine package surface.

## Use This Page For

1. execution-lifecycle flow and subsystem context;
2. provider, state, and security narratives that span more than one engine
   class;
3. roadmap and architectural target material for the execution subsystem.

## Canonical Component Home

- [@dvt/engine](../components/engine/index.md)

## Canonical Reading Order

1. [@dvt/engine](../components/engine/index.md)
2. [WorkflowEngine subsystem context](workflow-engine-subsystem-context.md)
3. [WorkflowEngine target architecture v1](workflow-engine-target-architecture.v1.md)
4. [Engine roadmap](roadmap/engine-phases.md)
5. [Engine contracts index](../../contracts/engine/index.md)
6. [Engine C4 architecture](c4-engine.md)
7. [Engine class review and gaps](engine-class-review-and-gaps-2026-03-31.md)

## What This Pack Owns

- subsystem context and target architecture;
- execution-specific contracts, adapters, security, and ops narratives;
- roadmap and architecture rationale that span more than one engine module.

## Related Pages

- [System Architecture](../system/index.md)
- [Subsystem Architecture](../subsystems/index.md)
- [DVT Component Map](../component-map.md)
- [Execution Domain](../domain-execution.md)
