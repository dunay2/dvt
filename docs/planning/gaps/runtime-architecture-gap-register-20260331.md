---
title: Runtime Architecture Gap Register 2026-03-31
status: Review
owner: Lane C / Architecture
last_reviewed: 2026-04-17
planning_type: status
---

# Runtime Architecture Gap Register 2026-03-31

This register tracks high-impact runtime architecture gaps identified from
code-level verification on 2026-03-31.

It does not reopen legacy G1-G10 program gaps. It captures current tactical
gaps for future PR slicing.

This document was reviewed on 2026-04-17 to align the folder with current
planning governance. The validated gap rows below remain the 2026-03-31
snapshot; live execution truth now belongs to the lane registry and active
review set.

## Current routing

- [Planning Control Tower](../state/planning-control-tower.md)
- [Review Status Board](../reviews/review-status-board.md)
- [Agent Lane C YAML](../state/agent-lane-c.yaml)
- [Engine boundary current state, target state, and migration review](../reviews/architecture-and-governance/20260407-engine-boundary-current-target-and-migration-review.md)
- [Contract pack and read boundary reset Fowler review](../reviews/architecture-and-governance/20260410-contract-pack-and-read-boundary-reset-fowler-review.md)
- [Runtime and shared-kernel risk triage review](../reviews/architecture-and-governance/20260410-runtime-and-shared-kernel-risk-triage-review.md)
- [AR-A12-B status model split Fowler review](../reviews/architecture-and-governance/20260411-ar-a12-b-status-model-split-fowler-review.md)

## Gap list (validated 2026-03-31)

| Gap                                                                            | Validation status                                                               | Evidence                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core service remains broad (lifecycle + query + signal + observability)        | Confirmed (partial decomposition, still broad)                                  | `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts`                                                                                                                                                            |
| Workflow runtime mixes lifecycle/query/signal with telemetry concerns          | Confirmed                                                                       | `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts`                                                                                                                                                            |
| State-store "god interface" risk                                               | Confirmed as partial (segregated interfaces exist, aggregate still used)        | `packages/@dvt/engine/src/ports/IRunStateStore.ts`; shared DTO vocabulary lives in `packages/@dvt/contracts/src/contracts/engine/RunStateVocabulary.v1.ts`                                                              |
| `StartRunCoordinator` still constructs collaborators directly                  | Confirmed                                                                       | `packages/@dvt/engine/src/application/StartRunCoordinator.ts`                                                                                                                                                           |
| Observability patterns are repeated across flows                               | Confirmed as partial (maintenance already has facade)                           | `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts`, `packages/@dvt/engine/src/application/StartRunCoordinator.ts`, `packages/@dvt/engine/src/services/runMaintenance/RunMaintenanceObservabilityFacade.ts`    |
| Typed-error coverage is incomplete (`new Error(...)` in production paths)      | Confirmed                                                                       | multiple runtime files under `apps/api/src`, `packages/@dvt/engine/src`, `packages/@dvt/adapter-postgres/src`                                                                                                           |
| Freshness provenance not fully exposed (`snapshot` vs `rebuild` vs `provider`) | Confirmed as partial (`snapshotStaleness` is exposed, provenance source is not) | `apps/api/src/application/services/getRunStatusUseCase.ts`, `apps/api/src/application/ports/runtime.ts`, `packages/@dvt/contracts/src/types/contracts.ts`, `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts` |

## Scope guidance

Prioritize in this order:

1. Extract lifecycle/query/signal concerns from core runtime service.
2. Introduce explicit error taxonomy migration plan for `new Error(...)` paths.
3. Add status provenance field design (`snapshot`/`rebuild`/`provider`) behind
   a backward-compatible contract strategy.
4. Move start-run collaborator composition to an assembler/factory boundary.
5. Continue observability consolidation with reusable facades/policies.

## Notes

- This register is intended for incremental PR planning, not for one-shot
  refactors.
- Ownership routing should follow lane scope and CODEOWNERS boundaries.
- The malformed embedded second document that previously followed this register
  was removed during the 2026-04-17 governance refresh. Active architecture
  review material belongs under `docs/planning/reviews/**`, not inside an
  active gap register.
