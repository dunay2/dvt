---
title: AR-A12-C read-boundary purity plan
author: Codex
status: Active
owner: Architecture / Engine / API / Docs
last_reviewed: 2026-04-11
planning_type: proposal
---

# AR-A12-C read-boundary purity plan

## Purpose

Finish the remaining `AR-A3` intent through `AR-A12-C` / `WE-HX`
convergence by removing provider-backed enrichment from the
`IWorkflowEngine` facade and converging code plus current docs on a pure
read boundary.

## Governing sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/adr/ADR-0003-execution-model.md`
- `docs/adr/ADR-0014-run-driven-adapter-model.md`
- `docs/adr/ADR-0015-getRunStatus-read-model-separation.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/contract-pack-and-read-boundary-reset-plan-20260410.md`
- `docs/architecture/components/engine/contracts/engine/IWorkflowEngine.v1.md`

## Problem

`AR-A12-B` made the status-model split explicit. `AR-A12-C1` and `AR-A12-C2`
have now landed the public-boundary cutover in docs and code.

That leaves three architectural weaknesses active:

1. Current subsystem docs and diagrams still need to explain the shipped split
   instead of a mixed facade.
2. `WorkflowEngine` still carries recover-run preflight and health probing
   locally instead of delegating them through dedicated services.
3. Hardening guards and ARC closeout still need to prevent regression on the
   narrowed facade.

`WE-HX-4` closed the structural decomposition wave, but not the remaining
facade-purity intent previously carried by `AR-A3`.

## Decision

Do not reopen `AR-A3` as a standalone task.

Land its remaining intent through `AR-A12-C` / `WE-HX` convergence with a
single active cutover:

- `IWorkflowEngine` keeps commands plus canonical read only
- provider-backed enrichment moves behind a dedicated
  `IRunEnrichmentService`
- API enrichment callers depend on `IRunEnrichmentService`, not on
  `IWorkflowEngine`
- current docs and diagrams converge in the same execution wave

## Target boundary

### `IWorkflowEngine`

```ts
interface IWorkflowEngine {
  startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;
  recoverRun(sourceRunId: string, planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;
  cancelRun(engineRunRef: EngineRunRef): Promise<void>;
  getRunStatus(engineRunRef: EngineRunRef): Promise<CanonicalRunStatus>;
  signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void>;
}
```

Rules:

- canonical read authority remains on `getRunStatus()`
- no enrichment method remains on the engine facade
- no compatibility alias of `getRunEnrichment()` stays behind on
  `IWorkflowEngine`

### `IRunEnrichmentService`

```ts
interface IRunEnrichmentService {
  getRunEnrichment(engineRunRef: EngineRunRef): Promise<RunStatusEnrichment>;
}
```

Rules:

- enrichment remains an explicit optional read path
- enrichment failure MUST fail closed and MUST NOT silently degrade to
  canonical-only success
- provider-backed diagnostics remain separate from canonical lifecycle truth

## Execution slices

### `AR-A12-C1` Docs/contracts-first facade purity cutover

Deliver:

- active planning and contract docs updated so the target boundary no longer
  treats enrichment as an `IWorkflowEngine` responsibility
- `AR-A12-C` sequencing aligned with `WE-HX` without reopening `AR-A3`
- target architecture docs updated so they stop presenting
  `getRunEnrichment()` as a facade method

Status:

- delivered on 2026-04-11

### `AR-A12-C2` Code move and imports cutover

Deliver:

- owner-local `IRunEnrichmentService` introduced in engine/application code
- `WorkflowEngine` facade drops `getRunEnrichment()`
- API composition and use cases inject `IRunEnrichmentService` directly
- residual references to `IWorkflowEngine['getRunEnrichment']` in active code
  reduced to `0`

Status:

- delivered on 2026-04-11

### `AR-A12-C3` Current docs and diagram convergence

Deliver:

- read subsystem current page describes the real split between canonical
  status and enrichment service paths
- engine subsystem current docs and implementation diagrams reflect the
  narrowed facade
- current docs stop using the engine facade to narrate provider-backed
  enrichment

Status:

- delivered on 2026-04-11

### `AR-A12-C4` Facade-width residual extraction

Deliver:

- `WorkflowEngine` delegates recover-run orchestration to a dedicated recovery
  service
- `WorkflowEngine` delegates platform health probing to a dedicated health
  service
- facade responsibilities reduce to contract normalization, trace context, and
  delegation
- current docs and diagrams describe the narrower shipped facade truth

Status:

- delivered on 2026-04-11

### `AR-A12-C5` Hardening and closeout

Deliver:

- regression guards prevent reintroduction of enrichment on
  `IWorkflowEngine`
- regression guards prevent `WorkflowEngine` from silently re-growing private
  collaborator construction or local recover/health orchestration
- ARC-2 evidence and risk updates for engine/api/adapter impact
- touched-package validation plus `pnpm verify:prepush`

## Acceptance

- `IWorkflowEngine` no longer exposes provider-backed enrichment
- `IRunEnrichmentService` is the only active enrichment boundary
- API, engine, and current docs describe the same read boundary
- `WorkflowEngine` is reduced to normalization, trace context, and delegation
- `WE-HX` remains the canonical subsystem thread and `AR-A3` stays closed as a
  standalone task
- no compatibility alias or dual facade survives the cutover

## Validation baseline

```bash
pnpm docs:sync
pnpm docs:workboard:generate
pnpm docs:planning:generated:check
pnpm verify:prepush
```
