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
the full `WorkflowEngine` subsystem to a narrower hexagonal model without a
flag-day API break.

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

- `WorkflowEngine` remains a wide compatibility center
- admission/coordinator/core services still mix concerns
- provider-resolution and telemetry logic are repeated
- docs are fragmented and partially stale for current subsystem reality
- ownership seam between engine resolver and artifacts reader is not yet one
  canonical narrative

## Target model

Compatibility-first target:

- keep `IWorkflowEngine` as public compatibility facade
- move behavior behind narrow use-case services
- enforce explicit engine-owned outbound ports
- keep artifacts behavior ownership in `@dvt/artifacts`
- adapt artifacts reader to engine resolver in composition root

No-go constraints:

- no runtime refactor in this docs/planning slice
- no shadow roadmap parallel to lane planning
- no peer-domain runtime behavior inside engine internals

## Gap closure waves

### `WE-HX-0` Canonical map and doc replacement

- depends on `DOC-ARCH-01`
- deliver new subsystem context, target architecture spec, user manual,
  and navigation replacement
- close stale-engine-doc ambiguity

### `WE-HX-1` Boundary ownership closure

- depends on `S08-5-B`, `RC-G1-B`
- lock ownership mapping for `PlanRef`, `runExecutionContextRef`, engine
  resolver seam, and artifacts reader seam

### `WE-HX-2` Compatibility facade narrowing

- depends on `WE-HX-1`
- document `WorkflowEngine` as thin compatibility adapter over use-case
  services

### `WE-HX-3` Start-run application decomposition

- depends on `WE-HX-2`
- split admission, provider/capability resolution, intent creation, execution
  dispatch, and failure policy

### `WE-HX-4` Runtime query/command decomposition

- depends on `WE-HX-2`
- split `WorkflowEngineCoreService` into dedicated query, command, signal, and
  enrichment paths
- fold `AR-A3` into this wave

### `WE-HX-5` Provider and telemetry standardization

- depends on `WE-HX-3`, `WE-HX-4`
- consolidate provider-resolution seam and telemetry/decorator policy

### `WE-HX-6` Test-double and fitness-function hardening

- depends on `WE-HX-5`
- narrow in-memory doubles, split heavy fixtures, and add architecture-boundary
  regression guards

## Lane mapping

Lane A execution mapping:

- create umbrella `WE-HX` with child tasks `WE-HX-0..6`
- reference this proposal and the two canonical docs:
  - `docs/architecture/components/engine/architecture/workflow-engine-subsystem-context.md`
  - `docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md`
- update dependency notes so `AR-A3` is explicitly merged into `WE-HX-4`

## Risks and tradeoffs

Key tradeoffs:

- keeping compatibility facade reduces rollout risk but slows internal cleanup
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

- changing public `IWorkflowEngine` contract in this proposal
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
