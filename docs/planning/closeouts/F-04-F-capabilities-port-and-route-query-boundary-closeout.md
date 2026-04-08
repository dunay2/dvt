---
slice: F-04-F-capabilities-port-and-route-query-boundary
date: 2026-04-07
lane: E
author: AI (Codex)
last_reviewed: 2026-04-07
---

# Closeout: F-04-F capabilities port and route/query boundary

## Think-First Analysis

### Problem summary

Lane E `F-04-F` requires route-level views and query hooks to stop owning
runtime mode, service-factory, and transport concerns. The service-factory
ownership is already centralized, but runtime capabilities still enter the app
through a singleton capability hook that sits outside the frontend composition
root.

### Root cause

The earlier `F-04-D/E` work formalized `Workspace`, `Runs`, `Plans`,
`SessionContext`, and `ShellFeedback` seams, but the capabilities read-path was
left on the older pattern: an app-level query alias simply re-exported the
runtime capability hook, which internally built its own default capability and
HTTP client. That keeps one transport seam outside the composition boundary.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, think-first before edits, no hidden
  debt, real validation, planning state kept truthful, and `pnpm verify:prepush`
  before ready claims.
- `docs/guides/ai-work-protocol.md`: architecture-affecting slices must record
  think-first analysis, a pre-implementation brief, and close with validation.
- `docs/planning/state/agent-lane-e.yaml`: `F-04-F` is the queued `P0` slice
  after `F-04-E` and explicitly targets route/query cleanup plus governed
  capability adapters.
- `docs/planning/proposals/nice-to-have/frontend-and-ux/f-04-frontend-data-boundary-hexagonal-convergence-plan-20260403.md`:
  route/view layers do not own mode selection, no raw fetch in route-level query
  hooks when a governed client exists, and `F-04-F` must be TDD-first.
- `docs/architecture/frontend/frontend-data-boundary-architecture.md`: the
  composition root is the only place that should own adapter wiring, and
  `CapabilitiesPort` is an explicit outbound port in the target model.
- `docs/architecture/frontend/frontend-runtime-modes-user-manual.md`: mode
  selection happens once at boot and must not leak back into route code.

### Options considered

- Leave runtime capabilities on the existing singleton query path.
  - Rejected because one outbound boundary would still bypass composition-root
    ownership.
- Move runtime capabilities fully into shell state without a formal port.
  - Rejected because it hides the boundary under presentation state instead of
    exposing a reusable governed seam.
- Formalize `CapabilitiesPort`, wire it in the composition root, and have
  app-level query surfaces consume that injected boundary.
  - Accepted because it closes the remaining seam with minimal disruption and
    keeps the route-level API stable.
- Libraries evaluated:
  - None evaluated. Existing TanStack Query and repo capability modules are
    sufficient.

### Selected option and rationale

Introduce a frontend `CapabilitiesPort`, build it inside
`app/services/composition/appServices.ts`, expose it through
`AppServicesContext`, and update `app/queries/useCapabilitiesQuery.ts` to read
that injected port instead of re-exporting a default singleton capability. This
keeps `Canvas`, `Plugins`, `Admin`, and shell consumers on a governed query
boundary without reopening mode or transport ownership in views.

### Rejected alternatives

- Add another global runtime singleton just for capabilities.
  - Rejected because it repeats the drift that `F-04` is removing.
- Force every route to import directly from `capabilities/runtime-capabilities`.
  - Rejected because it couples presentation code to capability module internals
    instead of the app composition seam.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - `apps/web/src/app/ports/**`
  - `apps/web/src/app/services/**`
  - `apps/web/src/app/queries/useCapabilitiesQuery.ts`
  - focused tests under `apps/web/src/app/**`
  - `docs/planning/state/agent-lane-e.yaml`
  - this closeout file
- Expected outcome:
  - runtime capabilities have an explicit frontend port
  - the composition root owns capability adapter construction
  - `useCapabilitiesQuery` consumes the governed seam instead of a hidden
    singleton transport path
- Risks and mitigations:
  - Risk: React Query tests may become flaky after the boundary swap
  - Mitigation: add RED tests that prove provider overrides drive the query
    result before rewiring production code
  - Risk: lane state could overstate closure
  - Mitigation: update `F-04-F` only after the port, tests, and docs are all
    real
- Out of scope:
  - Cypress expansion or route UX redesign
  - store decomposition outside the capabilities seam
  - platform-health capability refactoring
- Validation plan:
  - `pnpm --filter @dvt/web exec vitest run src/app/services/composition/appServices.test.ts src/app/services/AppServicesContext.test.tsx src/app/queries/useCapabilitiesQuery.test.tsx src/app/queries/queryKeyPolicy.architecture.test.ts --config vitest.config.ts`
  - `pnpm --filter @dvt/web typecheck`
  - `pnpm --filter @dvt/web test`
  - `pnpm --filter @dvt/web build`
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - negative path proving `useCapabilitiesQuery` cannot work without the app
    service provider
  - positive path proving an injected `CapabilitiesPort` override drives the
    query result
  - composition-root tests proving the default capabilities seam is built and
    override-able
  - architecture guard to keep app query surfaces away from raw capability
    transport shortcuts
- Libraries evaluated:
  - None evaluated -- existing repo primitives are sufficient

## Changes made

| File or path                                                                        | Change                                                                                          | Why                                                                                                          |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `apps/web/src/app/ports/capabilities.ts`                                            | Added the explicit frontend `CapabilitiesPort` contract.                                        | Formalizes the missing outbound seam called for by the active F-04 architecture.                             |
| `apps/web/src/app/services/capabilities/capabilitiesPort.ts`                        | Added the composition-owned capabilities adapter builder.                                       | Keeps runtime capabilities on the same governed adapter-wiring path as the other frontend ports.             |
| `apps/web/src/app/services/composition/appServices.ts`                              | Added `capabilitiesPort` to the app-services composition root and overrides surface.            | Makes `buildAppServices()` the single owner of capabilities adapter construction.                            |
| `apps/web/src/app/services/AppServicesContext.tsx`                                  | Exposed `useCapabilitiesPort()` and threaded the new override through the provider.             | Lets route-safe hooks consume capabilities through the governed app-services context.                        |
| `apps/web/src/app/queries/useCapabilitiesQuery.ts`                                  | Replaced the direct re-export with a real app query hook that consumes `useCapabilitiesPort()`. | Removes the hidden singleton transport path and keeps the app query boundary composition-owned.              |
| `apps/web/src/app/queries/queryKeyPolicy.architecture.test.ts`                      | Added an architecture guard against reverting to the old re-export pattern.                     | Keeps the capabilities query on the governed boundary.                                                       |
| `apps/web/src/app/queries/useCapabilitiesQuery.test.tsx`                            | Added RED->GREEN tests for provider ownership and injected capabilities-port overrides.         | Proves the query seam is controlled by composition rather than by an internal singleton.                     |
| `apps/web/src/app/services/composition/appServices.test.ts`                         | Extended composition-root tests to cover capabilities-port construction and override behavior.  | Verifies that the composition root owns both the default seam and explicit overrides.                        |
| `apps/web/src/app/services/AppServicesContext.test.tsx`                             | Extended provider tests to expose the capabilities port through route-safe hooks.               | Confirms the React delivery wrapper carries the new seam correctly.                                          |
| `apps/web/src/app/Root.test.tsx`                                                    | Wrapped shell tests with `AppServicesProvider` and injected a stable capabilities seam.         | Prevents shell regression after `useShellRuntime()` started depending on the governed capabilities boundary. |
| `docs/architecture/frontend/frontend-data-boundary-architecture.md`                 | Updated the active frontend architecture doc to reflect composition-owned capabilities wiring.  | Keeps the canonical architecture doc aligned with shipped behavior.                                          |
| `docs/architecture/frontend/graph/canvas-component-map-and-modernization-review.md` | Updated the review note for `useCapabilitiesQuery()`.                                           | Removes a stale claim that the hook still used raw `fetch`.                                                  |
| `docs/planning/state/agent-lane-e.yaml`                                             | Moved `F-04-D/E/F` and the parent `F-04` entry to their new evidence-backed state.              | Keeps lane truth aligned with the implemented slice.                                                         |
| `docs/planning/status/generated-code-state.md`                                      | Regenerated generated code status after adding frontend source files.                           | Keeps the generated status surface in sync for CI.                                                           |

## TDD evidence

- RED:
  - `pnpm --filter @dvt/web exec vitest run src/app/services/composition/appServices.test.ts src/app/services/AppServicesContext.test.tsx src/app/queries/useCapabilitiesQuery.test.tsx src/app/queries/queryKeyPolicy.architecture.test.ts --config vitest.config.ts`
  - Failed before implementation because `AppServicesProvider` exposed no capabilities seam, `buildAppServices()` had no `capabilitiesPort`, and `useCapabilitiesQuery` still re-exported the singleton runtime hook.
- GREEN:
  - The same targeted command passed after the composition-owned capabilities seam was implemented.

## Docs synced

- [x] `docs/planning/state/agent-lane-e.yaml` updated with the live `F-04-D/E/F` state.
- [x] `pnpm docs:sync` executed after adding the closeout file.
- [x] `pnpm docs:workboard:generate` executed after lane changes.
- [x] `pnpm docs:status:generate` executed after adding frontend source files.

## Test evidence

| Command                                                                                                                                                                                                                                                            | Result |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `pnpm --filter @dvt/web exec vitest run src/app/services/composition/appServices.test.ts src/app/services/AppServicesContext.test.tsx src/app/queries/useCapabilitiesQuery.test.tsx src/app/queries/queryKeyPolicy.architecture.test.ts --config vitest.config.ts` | PASS   |
| `pnpm --filter @dvt/web exec vitest run src/app/Root.test.tsx src/app/queries/useCapabilitiesQuery.test.tsx src/app/services/composition/appServices.test.ts --config vitest.config.ts`                                                                            | PASS   |
| `pnpm --filter @dvt/web typecheck`                                                                                                                                                                                                                                 | PASS   |
| `pnpm --filter @dvt/web test`                                                                                                                                                                                                                                      | PASS   |
| `pnpm --filter @dvt/web build`                                                                                                                                                                                                                                     | PASS   |
| `pnpm docs:sync`                                                                                                                                                                                                                                                   | PASS   |
| `pnpm docs:workboard:generate`                                                                                                                                                                                                                                     | PASS   |
| `pnpm docs:status:generate`                                                                                                                                                                                                                                        | PASS   |
| `pnpm verify:prepush`                                                                                                                                                                                                                                              | PASS   |

## Debt introduced

None. No rule was relaxed, no hook was bypassed, and no placeholder implementation was added.

## Residual follow-up

- `F-04` remains open because the next governed work is the hard-QA follow-up chain under `F-04-RISK`.
- Query and store standardization outside this capabilities seam still belongs to later frontend convergence slices such as `F-05` and `F-06`.
