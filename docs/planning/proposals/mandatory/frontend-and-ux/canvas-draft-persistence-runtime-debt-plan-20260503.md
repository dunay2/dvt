---
title: Canvas Draft Persistence Runtime Debt Plan
status: Proposed
owner: Frontend / Architecture
last_reviewed: 2026-05-03
planning_type: proposal
---

# Canvas Draft Persistence Runtime Debt Plan

## Debt Summary

`apps/web/src/app/views/canvas/canvasDraftPersistenceRuntime.ts` currently owns
multiple concerns in one module:

1. debounce timer lifecycle (`clearSaveDebounce`, `DRAFT_SAVE_DEBOUNCE_MS`)
2. persistence readiness policy (`shouldWaitForPersistenceReadiness`)
3. save-attempt identity and stale resolution (`startNextSaveAttempt`,
   `isStaleSaveResolution`)
4. session state mutation orchestration
   (`markDraftSaving`, `applyConflictResolution`, `applySavedDraftResolution`,
   `restoreEditingAfterSaveFailure`)

That aggregation is a design debt because the runtime helper is not a single
semantic boundary and depends on both query cache and draft read model shapes.

## Fowler / DDD Classification

| Signal           | Finding                                                               | Target pattern                          |
| ---------------- | --------------------------------------------------------------------- | --------------------------------------- |
| Divergent change | Timer policy and state transition rules evolve for different reasons. | Extract Class by concern.               |
| Feature envy     | Runtime helper reaches into read model and query cache details.       | Move behavior near owning model/policy. |
| Boundary drift   | One helper behaves as policy + transition service + cache writer.     | Explicit application service split.     |

## Command-Query Rail Alignment

| Rail                                  | Type    | DDD owner                           |
| ------------------------------------- | ------- | ----------------------------------- |
| `ScheduleCanvasDraftAutosave`         | command | `CanvasDraftAutosaveSchedulePolicy` |
| `ResolveCanvasDraftSaveAttempt`       | command | `CanvasDraftSaveAttemptLedger`      |
| `ProjectCanvasDraftPersistenceResult` | query   | `CanvasDraftPersistenceProjection`  |
| `ApplyCanvasDraftConflictRecovery`    | command | `CanvasDraftConflictRecoveryPolicy` |

## Proposed Fix Slice

Refactor this surface into explicit modules:

- `canvasDraftAutosaveSchedulePolicy.ts` for debounce/timer readiness rules.
- `canvasDraftSaveAttemptLedger.ts` for save attempt id/generation lifecycle.
- `canvasDraftPersistenceResolution.ts` for conflict/success/failure projection
  logic.
- Keep `canvasDraftPersistenceRuntime.ts` as a thin orchestration façade or
  remove it if no façade is needed.

No compatibility alias should be kept once the split is complete.

```feature-mechanization
version: 1
featureId: CANVAS-DRAFT-PERSISTENCE-RUNTIME-DEBT
mechanizationStatus: closed
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/canvas-draft-persistence-runtime-debt-plan-20260503.md
componentGuides:
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-draft-persistence-runtime-debt-plan-20260503.md
userStories:
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-draft-persistence-runtime-debt-plan-20260503.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-draft-persistence-runtime-debt-plan-20260503.md
forbiddenImplementationSurfaces:
  - .github/**
  - apps/**
  - packages/**
  - scripts/**
  - specs/**
commandQueryRails:
  - name: ScheduleCanvasDraftAutosave
    type: command
    dddOwner: CanvasDraftAutosaveSchedulePolicy
  - name: ResolveCanvasDraftSaveAttempt
    type: command
    dddOwner: CanvasDraftSaveAttemptLedger
  - name: ProjectCanvasDraftPersistenceResult
    type: query
    dddOwner: CanvasDraftPersistenceProjection
  - name: ApplyCanvasDraftConflictRecovery
    type: command
    dddOwner: CanvasDraftConflictRecoveryPolicy
domainObjects:
  - name: CanvasDraftAutosaveSchedulePolicy
    type: policy
    owner: Canvas Draft Persistence
  - name: CanvasDraftSaveAttemptLedger
    type: value-object aggregate
    owner: Canvas Draft Persistence
  - name: CanvasDraftPersistenceProjection
    type: projection
    owner: Canvas Draft Persistence
fowlerSignals:
  - Divergent change
  - Feature envy
  - Boundary drift
architectureGuards:
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - debt registration only
completionGate:
  - pnpm exec markdownlint-cli2 docs/planning/proposals/mandatory/frontend-and-ux/canvas-draft-persistence-runtime-debt-plan-20260503.md --config .markdownlint-cli2.jsonc
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: runtime-debt-registration-mechanization
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: New runtime debt planning file is outside allowedImplementationSurfaces before this manifest exists.
    patchSurfaces:
      - docs/planning/proposals/mandatory/frontend-and-ux/canvas-draft-persistence-runtime-debt-plan-20260503.md
    greenTest: pnpm docs:feature-mechanization:implementation
symbols:
  - name: CanvasDraftPersistenceRuntimeDebtPlan
    path: docs/planning/proposals/mandatory/frontend-and-ux/canvas-draft-persistence-runtime-debt-plan-20260503.md
    dddOwner: Canvas Draft Persistence debt governance
    cqRails:
      - ScheduleCanvasDraftAutosave
      - ResolveCanvasDraftSaveAttempt
      - ProjectCanvasDraftPersistenceResult
      - ApplyCanvasDraftConflictRecovery
    fowlerSignals:
      - Divergent change
      - Feature envy
      - Boundary drift
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - debt registration only
    unitTests:
      - pnpm docs:feature-mechanization:implementation
```
