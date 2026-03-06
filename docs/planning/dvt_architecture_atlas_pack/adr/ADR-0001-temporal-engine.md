# ADR-0001 Execution Engine

Status: Accepted
Date: 2026-03-06

## Navigation

- [Pack Home](../README.md)
- [Pack Index](../index.md)
- [Architecture Atlas](../architecture/architecture_atlas.md)
- [Engineering Playbook](../engineering/engineering_playbook.md)
- [Completion Assessment](../status/code_completion_assessment_2026-03-06.md)

## Context

DVT needs deterministic orchestration with replay-safe workflow semantics,
strong retry behavior, and run lifecycle controls.

## Decision

Use Temporal as the primary provider adapter for workflow execution.
Keep provider coupling behind `IProviderAdapter` so engine core remains provider-agnostic.

## Consequences

Positive:

- deterministic workflow runtime with native history/replay model
- mature retry/timer/signal primitives
- clear adapter boundary (`@dvt/adapter-temporal`)

Negative:

- extra operational dependency (Temporal cluster/client lifecycle)
- adapter + worker process lifecycle management complexity
- feature parity work still needed for non-temporal providers

## Code Evidence

- Temporal provider package exists: `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts`
- Engine provider boundary exists: `packages/@dvt/engine/src/adapters/IProviderAdapter.ts`
- Temporal workflow implementation exists: `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`

## Next

- Continue with [Roadmap](../roadmap/roadmap_2026Q2.md)
