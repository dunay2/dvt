---
slice: tf-e2-canvas-typed-authoring-port-hard-cut
date: 2026-04-20
lane: E
task_id: TF-E2-A
mode: Full
status: In progress
author: AI (Codex)
last_reviewed: 2026-04-20
---

# TF-E2 Canvas typed authoring-port hard cut closeout

## Phase 1. Think-First Analysis

### Problem summary

The active Canvas route still depended on the legacy projected
`WorkspaceGraphDraft` DTO carried by `IWorkspacePort.getGraphDraft` and
`saveGraphDraft`, even though the shared typed draft-authoring boundary already
existed.

### Root cause

Earlier TF-E2 refactors improved controller SRP, recovery, and working-set
ownership first, but left the actual persistence authority on the legacy
projected seam. That preserved an accidental dual-authority model:

- the protected typed draft contract existed
- the active route still read and wrote through a projected DTO
- the composition root did not yet expose the typed authoring port as the
  active Canvas dependency

### Constraints and invariants

- `AGENTS.md`: docs, planning, code, and validation must stay aligned; no debt,
  no hidden compatibility downgrade.
- `docs/guides/ai-work-protocol.md`: this is Full mode because it changes
  active route behavior and introduces new implementation artifacts.
- `docs/planning/state/planning-control-tower.md`: Lane E task state, plan, and
  closeout evidence must be updated in the same slice.
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a2-workspace-graph-draft-persistence-boundary-plan-20260416.md`:
  Lane E must adopt the shared typed workspace draft boundary, including CAS,
  idempotency, capability outcomes, and typed format posture, rather than
  inventing a Canvas-local contract.
- `docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-production-node-authoring-and-persistence-plan-20260416.md`:
  no retrocompatibility path is to be preserved on the active Canvas authoring
  route once the typed port is adopted.
- `docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-canvas-target-architecture-execution-plan-20260417.md`:
  `E2-ARCH-02` is the hard cut from the projected DTO seam to
  `IWorkspaceGraphDraftAuthoringPort`.
- `docs/architecture/components/web/frontend-data-boundary-architecture.md`:
  the composition root owns adapter wiring; the route must consume ports, not
  transport or mode-selection logic.
- `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`:
  `canvasDraftRepository` is the controller-local outbound boundary and must
  stop treating the projected DTO seam as the active persistence owner.

### Options considered

- keep the typed port behind the legacy `IWorkspacePort` seam and continue
  projecting saves from the route
- hard-cut the active Canvas read/write path to
  `IWorkspaceGraphDraftAuthoringPort`, keeping projection only as a route-local
  read model while downstream presentation work catches up

### Selected option and rationale

Hard-cut the active read/write path to `IWorkspaceGraphDraftAuthoringPort`.

This matches the governing plan set, removes the accidental compatibility phase
from the actual authoring flow, and keeps the remaining residual work explicit:
capability and typed format outcomes still need fuller presentation closure,
but the route no longer persists through the wrong authority.

## Phase 2. Pre-Implementation Brief

- Mode: `Full`
- Scope:
  - `apps/web/src/app/services/composition/appServices.ts`
  - `apps/web/src/app/services/AppServicesContext.tsx`
  - `apps/web/src/app/services/AppServicesContext.test.tsx`
  - `apps/web/src/app/services/workspace/workspaceGraphDraftAuthoring.mock.ts`
  - `apps/web/src/app/views/canvas/canvasDraftAuthoring.ts`
  - `apps/web/src/app/views/canvas/canvasGitProvenance.ts`
  - `apps/web/src/app/views/canvas/canvasDraftRepository.ts`
  - `apps/web/src/app/views/canvas/canvasDraftRepository.test.fixtures.ts`
  - `apps/web/src/app/views/canvas/canvasDraftRepository.readWrite.test.ts`
  - `apps/web/src/app/views/canvas/canvasDraftRepository.conflict.test.ts`
  - `apps/web/src/app/views/canvas/useCanvasAuthoringRuntime.ts`
  - `apps/web/src/app/views/canvas/useCanvasControllerEnvironment.ts`
  - `apps/web/src/app/views/canvas/useCanvasController.ts`
  - `apps/web/src/app/views/canvas/useCanvasCurrentDraftPayload.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftBaseline.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftAutosave.ts`
  - `apps/web/src/app/views/canvas/canvasDraftAutosaveExecution.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftPersistence.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftLifecycle.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftInitialBootstrap.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftReloadHydration.ts`
  - controller integration tests under `apps/web/src/app/views/canvas/`
  - planning and architecture docs updated in this slice
- Expected outcome:
  - composition root exposes the typed authoring port
  - active Canvas draft reads and writes use the typed port
  - save requests are built from governed authoring payloads, not legacy DTO
    heuristics
  - controller integration coverage proves conflict, reload, missing-remote,
    and layout-only no-save behavior on the new seam
- Risks and mitigations:
  - risk: the route loses deterministic reload behavior because typed reads do
    not carry legacy layout data
    mitigation: keep layout persistence local, prevent hydration from clearing
    positions when the remote projection has no positions, and extend reload
    guard tests
  - risk: tests become brittle because the harness still assumes legacy draft
    reads and writes
    mitigation: add a typed authoring-port seam to the harness and centralize
    the governed transformation fixture in shared support
  - risk: docs overclaim completion of TF-E2-A
    mitigation: keep the task `in_progress` and record residual capability and
    format-outcome presentation work explicitly
- Out of scope:
  - Inspector property-editing closure
  - full writable or read-only UI posture closure from typed capability outcomes
  - typed corrupt or unsupported draft recovery UX
  - Cypress and broader end-to-end proof matrix

## Phase 3. Normative Baseline Verification

Verified against the governing baseline:

- `TF-A2` requires Lane E to consume one typed workspace-family draft boundary
  with compare-and-swap and idempotency semantics instead of keeping a
  route-local contract.
- `TF-E2` requires a hard cut on the active Canvas authoring path and rejects a
  long-lived compatibility phase.
- the frontend data-boundary architecture keeps adapter selection in the
  composition root and route logic behind ports.

The implemented direction is consistent with those rules.

## Phase 4. Traceability And Artifact Recording

- Baseline ADRs and plans:
  - `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a2-workspace-graph-draft-persistence-boundary-plan-20260416.md`
  - `docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-production-node-authoring-and-persistence-plan-20260416.md`
  - `docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-canvas-target-architecture-execution-plan-20260417.md`
- Canonical architecture docs:
  - `docs/architecture/components/web/frontend-data-boundary-architecture.md`
  - `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`
- Generated or implementation artifacts:
  - `apps/web/src/app/services/workspace/workspaceGraphDraftAuthoring.mock.ts`
  - `apps/web/src/app/views/canvas/canvasDraftAuthoring.ts`
  - `apps/web/src/app/views/canvas/canvasGitProvenance.ts`
  - updated composition, repository, lifecycle, and controller files listed in
    Phase 2
- Proof anchors:
  - `apps/web/src/app/services/AppServicesContext.test.tsx`
  - `apps/web/src/app/views/canvas/canvasDraftRepository.readWrite.test.ts`
  - `apps/web/src/app/views/canvas/canvasDraftRepository.conflict.test.ts`
  - controller integration tests updated in this slice

## Phase 5. Documentation Update

Updated the canonical planning and architecture surfaces so they describe the
real branch state after the hard cut:

- `TF-E2` scope plan now states that the active read/write path already uses
  `IWorkspaceGraphDraftAuthoringPort`
- the TF-E2 execution companion now treats the hard cut as implemented in the
  current branch and moves the next work to capability and presentation closure
- the controller architecture doc now names
  `IWorkspaceGraphDraftAuthoringPort` as the active draft boundary
- Lane E task status now reflects the implemented hard cut and the residual
  work still open under `TF-E2-A`

## Implementation Summary

- composition root wiring:
  - added `workspaceGraphDraftAuthoringPort` to `AppServices`
  - exposed a dedicated `useWorkspaceGraphDraftAuthoringPort()` accessor
  - wired API and mock runtime modes to typed authoring-port implementations
- active Canvas draft boundary:
  - `canvasDraftRepository` now reads and saves through
    `IWorkspaceGraphDraftAuthoringPort`
  - snapshot and artifact reads remain on `IWorkspacePort`
  - the projected `WorkspaceGraphDraft` DTO now acts only as a local projection
    model returned from the repository, not as persistence authority
  - `IWorkspacePort` no longer exposes `getGraphDraft` or `saveGraphDraft`, so
    the projected graph-draft seam cannot be reintroduced through the workspace
    service contract by accident
- mock and composition hard cut:
  - `createMockWorkspaceGraphDraftAuthoringPort` now owns its own typed
    compare-and-swap and idempotency store
  - the mock authoring port no longer delegates draft persistence through
    `workspaceService.getGraphDraft` or `workspaceService.saveGraphDraft`
  - `createApiWorkspaceService` and `createMockWorkspaceService` no longer
    publish graph-draft read/write methods on the workspace service surface
- save payload hardening:
  - added `canvasDraftAuthoring.ts` to build governed `DesignGraphDraft` write
    payloads from scoped canonical nodes and edges
  - save payload construction now requires workspace scope and Git provenance
    data used by the preview and execution flows
  - layout-only moves no longer trigger draft autosave because node positions
    are not part of the active typed persistence boundary
- reload and hydration guards:
  - bootstrap and reload hydration no longer wipe local layout positions when
    the typed remote projection has no persisted positions
  - conflict and missing-remote recovery continue to fail closed on the new
    seam
- test support:
  - extended the controller harness to carry the typed authoring port
  - centralized the governed transformation-authoring fixture and used it to
    realign controller integration tests with the typed seam
  - split repository tests into smaller conflict and read-write files and added
    explicit coverage for `denied`, `unsupported_schema_version`, and
    `idempotency_mismatch`
  - split the lifecycle controller tests by concern so the scope/projection and
    conflict-state assertions no longer accumulate under one higher-complexity
    test seam

## Validation

- `pnpm --filter @dvt/web typecheck` - PASS
- `pnpm --filter @dvt/web test -- --run src/app/services/AppServicesContext.test.tsx src/app/views/canvas/canvasDraftRepository.readWrite.test.ts src/app/views/canvas/canvasDraftRepository.conflict.test.ts` - PASS
- `pnpm --filter @dvt/web test -- --run src/app/views/canvas/useCanvasController.activeDraftMutations.test.tsx src/app/views/canvas/useCanvasController.draftLifecycle.scopeAndProjection.test.tsx src/app/views/canvas/useCanvasController.draftLifecycle.conflictState.test.tsx src/app/views/canvas/useCanvasController.negative.test.tsx src/app/views/canvas/useCanvasController.reloadConflictRecovery.test.tsx src/app/views/canvas/useCanvasController.reloadHydrationGuards.test.tsx` - PASS

## Residuals

- `TF-E2-A` remains `in_progress`, not done:
  - route presentation still needs full typed capability closure for writable,
    read-only, and forbidden posture
  - typed corrupt or unsupported draft outcomes are not yet surfaced as the
    route's explicit degraded recovery UX
- `TF-E2-D` and `TF-E2-E` still remain open:
  - Inspector is not yet the full write-authoring surface
  - the wider Cypress and end-to-end proof matrix is not yet closed
- test harness follow-up remains open:
  - the mock typed-authoring store is module-scoped and keyed by composition
    root identity; it no longer calls the legacy workspace-service seam, but
    isolation still depends on distinct draft-store keys across tests
  - the harness still contains a lossy projection path from
    `WorkspaceGraphDraftRecord` through `buildProtectedDraftReadResult`; the
    direct typed-port reload regression added in this slice avoids that path on
    purpose, but a dedicated round-trip proof still belongs to `TF-E2-E`
- typed authoring payload generation still reads the transform SQL file on each
  save cycle in order to mint git-backed provenance for the protected draft
  boundary; that I/O cost is accepted in this slice and remains visible as a
  follow-up optimization, not a hidden behavior
