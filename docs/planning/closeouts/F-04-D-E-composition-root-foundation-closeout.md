---
slice: F-04-D-E-composition-root-foundation
date: 2026-04-07
lane: E
author: AI (Codex)
last_reviewed: 2026-04-07
---

# Closeout: F-04-D/E composition-root foundation

## Think-First Analysis

### Problem summary

Lane E `F-04` requires frontend data-boundary ownership to move into one
composition root, but the current implementation still concentrates
composition, React context, and some runtime-global seams in the same surface.
The result is partial convergence rather than a clean application boot boundary.

### Root cause

The first migration step introduced ports for `Workspace`, `Runs`, and `Plans`
plus a provider-level service context, but session context and shell feedback
still leak through runtime globals, and the composition logic still lives inside
the React context module rather than in a dedicated composition module.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, think-first before edits, no hidden
  debt, real validation, and planning surfaces updated when execution state
  changes.
- `docs/guides/ai-work-protocol.md`: this architecture-affecting slice must
  record think-first analysis, a pre-implementation brief, and validation
  evidence.
- `docs/planning/state/agent-lane-e.yaml`: `F-04-D` and `F-04-E` are the
  canonical lane tasks for explicit frontend ports and composition-root wiring.
- `docs/planning/proposals/nice-to-have/frontend-and-ux/f-04-frontend-data-boundary-hexagonal-convergence-plan-20260403.md`:
  `VITE_DATA_SOURCE` must be read only in one composition boundary and TDD must
  lead the slice.
- `docs/architecture/frontend/frontend-data-boundary-architecture.md`: the
  frontend remains a browser client, route-level code must not own mode
  selection, and adapters belong behind ports.
- `docs/architecture/frontend/frontend-runtime-modes-user-manual.md`: mode
  selection happens once at boot and views should not branch on runtime mode.

### Options considered

- Keep the current `AppServicesContext` as both composition root and React
  provider.
  - Rejected because it keeps boot-time wiring and React delivery coupled.
- Add a full dependency-injection container.
  - Rejected because it is heavier than the governed slice requires.
- Extract a composition module, formalize runtime seams as ports, and keep the
  React provider as a thin delivery wrapper.
  - Accepted because it matches the `F-04` plan with minimal migration cost.
- Libraries evaluated:
  - None evaluated. Existing React, Zustand, and TanStack Query primitives are
    sufficient for this slice.

### Selected option and rationale

Introduce a dedicated composition module under `apps/web/src/app/services/composition/`,
move app-service construction there, formalize `SessionContextPort` and
`ShellFeedbackPort`, and rewire the affected route/controller hooks to consume
those ports from composition instead of runtime globals.

### Rejected alternatives

- Close `F-04-E` without touching runtime-global seams. Rejected because
  service wiring would still depend on hidden `sessionStore` and `toast`
  ownership.
- Update the lane to claim `F-04-D` complete without formalizing the missing
  ports. Rejected because that would overstate implementation truth.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - `apps/web/src/app/services/composition/**`
  - `apps/web/src/app/services/AppServicesContext.tsx`
  - `apps/web/src/app/ports/**`
  - affected `runs`, `canvas`, and session-backed service files under
    `apps/web/src/app/**`
  - `docs/planning/state/agent-lane-e.yaml`
  - this closeout file
- Expected outcome:
  - app-service construction lives in one composition module
  - route-safe accessors expose runtime seams through ports
  - `Runs` and `Canvas` paths stop depending on hidden runtime globals for
    session context or shell feedback
- Risks and mitigations:
  - Risk: frontend tests may fail due to React-context rewiring
  - Mitigation: add RED tests for composition-root behavior and keep the
    provider API stable
  - Risk: planning surfaces drift from code truth
  - Mitigation: update lane state only after code and validation are real
- Out of scope:
  - full `CapabilitiesPort` formalization across the runtime-capabilities
    capability
  - store decomposition beyond the session/runtime seams needed for this slice
  - Cypress E2E expansion beyond regression validation already present
- Validation plan:
  - `pnpm --filter @dvt/web typecheck`
  - `pnpm --filter @dvt/web test`
  - `pnpm docs:workboard:generate` if lane state changes
  - `pnpm docs:status:generate` because frontend source files are added
  - `pnpm docs:sync` because this closeout file is new
  - `pnpm verify:prepush`
- Test coverage plan:
  - composition-root tests for mode ownership and override wiring
  - architecture test for `resolveDataSource` and service-factory ownership
  - controller-hook regression tests for session-context and shell-feedback
    wiring in the Canvas flow
- Libraries evaluated:
  - None evaluated -- no custom implementation needed

## Changes made

| File or path                                                                                                                                                                                                                                                | Change                                                                                                                                         | Why                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `apps/web/src/app/services/composition/appServices.ts`                                                                                                                                                                                                      | Added a dedicated composition module that owns `resolveDataSource`, runtime mode publication, and service construction.                        | Moves boot-time wiring out of the React context layer and gives `F-04-E` a real composition root.          |
| `apps/web/src/app/services/AppServicesContext.tsx`                                                                                                                                                                                                          | Reduced the provider to a thin React delivery wrapper over composition-built services and exposed `useSessionContext` plus `useShellFeedback`. | Keeps route-facing accessors in one governed place instead of mixing React and construction logic.         |
| `apps/web/src/app/ports/sessionContext.ts`, `apps/web/src/app/services/session/sessionContextPort.ts`                                                                                                                                                       | Added an explicit session-context port and adapter.                                                                                            | Makes run-context and workspace-scope ownership explicit instead of hiding it behind `sessionStore` calls. |
| `apps/web/src/app/ports/shellFeedback.ts`, `apps/web/src/app/services/feedback/shellFeedbackPort.ts`                                                                                                                                                        | Added an explicit shell-feedback port backed by `sonner`.                                                                                      | Lets controller hooks consume feedback through composition rather than import `toast` directly.            |
| `apps/web/src/app/services/runs/runsService.ts`, `apps/web/src/app/services/runs/runsService.api.ts`, `apps/web/src/app/services/runs/runsService.mock.ts`                                                                                                  | Injected session context into Runs adapters and removed hidden `sessionStore` reads from those service factories.                              | Makes adapter wiring composition-owned instead of service-internal.                                        |
| `apps/web/src/app/views/canvas/useCanvasController.ts`, `apps/web/src/app/views/canvas/useCanvasExecutionActions.ts`, `apps/web/src/app/views/runs/useRunWorkspace.ts`                                                                                      | Rewired `Canvas` and `Runs` controller seams to consume composition-owned session and feedback accessors.                                      | Converts live route/controller paths to the governed model instead of leaving globals in place.            |
| `apps/web/src/app/queries/queryKeyPolicy.architecture.test.ts`, `apps/web/src/app/services/composition/appServices.test.ts`, `apps/web/src/app/views/canvas/useCanvasExecutionActions.test.tsx`, `apps/web/src/app/views/canvas/useCanvasController.test.*` | Added and updated RED->GREEN tests for composition ownership and runtime-seam wiring.                                                          | Keeps the migration TDD-backed and protects against regressions.                                           |
| `docs/planning/state/agent-lane-e.yaml`                                                                                                                                                                                                                     | Updated `F-04`, `F-04-D`, and `F-04-E` with real progress and evidence references.                                                             | Keeps lane truth aligned with the actual implementation state.                                             |

## Libraries evaluated

None evaluated -- existing repo primitives were sufficient.

## Docs synced

- [x] `docs/planning/state/agent-lane-e.yaml` updated with new `F-04`/`F-04-D`/`F-04-E` progress.
- [x] `pnpm docs:sync` executed to refresh governed docs indexes and rendered lane views.
- [x] `pnpm docs:workboard:generate` executed to refresh workboard surfaces.
- [x] `docs/planning/status/generated-code-state.md` regenerated after adding frontend source files.

## Test evidence

| Command                                                                                                                                                                                                                         | Result |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `pnpm --filter @dvt/web exec vitest run src/app/services/composition/appServices.test.ts src/app/queries/queryKeyPolicy.architecture.test.ts src/app/views/canvas/useCanvasExecutionActions.test.tsx --config vitest.config.ts` | PASS   |
| `pnpm --filter @dvt/web typecheck`                                                                                                                                                                                              | PASS   |
| `pnpm --filter @dvt/web test`                                                                                                                                                                                                   | PASS   |
| `pnpm --filter @dvt/web build`                                                                                                                                                                                                  | PASS   |
| `pnpm docs:workboard:generate`                                                                                                                                                                                                  | PASS   |
| `pnpm docs:status:generate`                                                                                                                                                                                                     | PASS   |
| `pnpm docs:sync`                                                                                                                                                                                                                | PASS   |
| `pnpm verify:prepush`                                                                                                                                                                                                           | PASS   |

## Debt introduced

None. No rule was relaxed, no hook was bypassed, and no placeholder implementation was added.

## Residual follow-up

- `F-04-D` still needs full `CapabilitiesPort` formalization and broader adapter parity before closure.
- `F-04-E` still has remaining route/controller migration outside the `Canvas` and `Runs` seams updated here.
- Direct `toast` and `useSessionStore` consumers still exist in other frontend slices and belong to later `F-04`/`F-04-F` follow-up work.
