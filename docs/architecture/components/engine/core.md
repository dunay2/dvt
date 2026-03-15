# Engine Core

## Purpose

Summarizes the core orchestration role of `@dvt/engine` inside the component map.
The detailed normative and operational material stays in the canonical engine docs.

## Responsibilities

- workflow orchestration
- state management
- persistence and crash consistency
- validation and determinism
- aggregate-level execution invariants

## Canonical references

- [Canonical engine index](../../engine/index.md)
- [Canonical C4 architecture](../../engine/c4-engine.md)
- [Versioning policy](../../engine/VERSIONING.md)
- [Execution semantics](../../engine/contracts/engine/ExecutionSemantics.v1.md)
- [Workflow engine contract](../../engine/contracts/engine/IWorkflowEngine.v1.md)

## Local structure notes

- [Constraints and invariants](structure/engine-constraints.md)
- [DDD structure](structure/engine-ddd.md)
- [Functional notes](structure/engine-functional.md)
- [Sequence notes](structure/engine-sequence.md)
- [Metrics catalog](structure/metrics-catalog.md)

## Navigation

- [Adapters](adapters.md)
- [Workflows](workflows.md)
- [Security](security.md)
- [Operations](operations.md)
- [Contracts](contracts.md)
- [Capabilities](capabilities.md)
- [C4 Engine Diagram](c4-engine.md)
