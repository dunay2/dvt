---
slice: F-04-RISK-B-mock-workspace-isolation
date: 2026-04-07
lane: E
author: AI (Codex)
last_reviewed: 2026-04-07
---

# Closeout: F-04-RISK-B mock workspace isolation

## Think-First Analysis

### Problem summary

Lane E `F-04-RISK-B` targets a determinism flaw in the frontend mock workspace
adapter. The current `createMockWorkspaceService()` creates multiple service
instances, but they all read and mutate the same module-level workspace graph.
An import performed through one mock service therefore leaks into every other
mock service instance created later in the same process.

### Root cause

`workspaceService.mock.ts` stores mutable runtime fixture state at module scope.
That means the adapter boundary is only superficially instance-based: the
factory returns different objects, but those objects close over the same
process-global graph state. The same pattern also exists for editable mock file
contents, so the real issue is shared mutable workspace state hidden behind an
apparently isolated service factory.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, think-first before code, planning state
  must remain truthful, and the slice must close with real validation plus
  `pnpm verify:prepush`.
- `docs/guides/ai-work-protocol.md`: architecture-affecting work must record
  think-first analysis, a pre-implementation brief, and validation evidence.
- `docs/planning/state/agent-lane-e.yaml`: `F-04-RISK-B` explicitly requires
  `createMockWorkspaceService` to stop mutating process-global graph state
  unless a shared-state policy is explicit and tested.
- `docs/planning/proposals/nice-to-have/frontend-and-ux/f-04-frontend-data-boundary-hexagonal-convergence-plan-20260403.md`:
  frontend seams should be deterministic, testable, and composition-owned.
- `docs/architecture/frontend/appshell/data-source-service-boundary.md`:
  tests inject seams through governed providers and should not depend on hidden
  global module mutation.

### Options considered

- Keep the global mutable graph and reset it between tests.
  - Rejected because it treats the symptom in test harnesses while preserving a
    misleading factory contract in production and local runtime mode.
- Isolate only the graph snapshot and leave other mutable workspace fixtures at
  module scope.
  - Rejected because the same hidden shared-state pattern would still exist for
    editable mock file contents.
- Move mutable workspace state behind an explicit state object, create isolated
  state by default, and allow shared state only when a caller passes the same
  state object intentionally.
  - Accepted because it removes hidden bleed, keeps the default factory simple,
    and gives tests an explicit shared-state seam when they truly need one.
- Libraries evaluated:
  - None evaluated. The fix is local state ownership inside an existing adapter.

### Selected option and rationale

Introduce an explicit mock workspace state seam owned by
`workspaceService.mock.ts`. `createMockWorkspaceService()` will allocate its own
state by default, so every service instance gets an isolated graph, discoverable
file tree, and editable file-content map. A helper state factory will exist for
tests or demos that want deliberate shared state across multiple service
instances.

### Rejected alternatives

- Add an implicit singleton cache keyed by mode.
  - Rejected because the drift is hidden mutable state, so another implicit
    cache would preserve the same class of bug.
- Push the reset responsibility into `AppServicesProvider` or view tests.
  - Rejected because the adapter itself owns the bug and should not require
    consumers to sanitize it.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - `apps/web/src/app/services/workspace/workspaceService.mock.ts`
  - `apps/web/src/app/services/workspace/workspaceService.test.ts`
  - `docs/architecture/frontend/appshell/data-source-service-boundary.md`
  - `docs/planning/state/agent-lane-e.yaml`
  - this closeout file
- Expected outcome:
  - default mock workspace service instances no longer share mutable workspace
    state
  - explicit shared state becomes opt-in and test-backed
  - lane E reflects `F-04-RISK-B` progress truthfully
- Risks and mitigations:
  - Risk: existing tests may accidentally rely on cross-instance bleed
  - Mitigation: add RED coverage for default isolation and explicit shared
    state before refactoring production code
  - Risk: fixing only graph state could leave adjacent hidden mutable seams
  - Mitigation: move both graph state and editable mock file contents behind
    the explicit state object
- Out of scope:
  - API-mode workspace endpoints
  - source-import UX changes
  - broader mock-data decommissioning outside this adapter
- Validation plan:
  - `pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspaceService.test.ts src/app/services/composition/appServices.test.ts --config vitest.config.ts`
  - `pnpm --filter @dvt/web typecheck`
  - `pnpm --filter @dvt/web test`
  - `pnpm --filter @dvt/web build`
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - negative path proving two default mock services do not observe each
    other's graph imports
  - positive path proving explicit shared state still shares mutations when
    requested
  - regression check proving per-instance file saves stay local by default
  - regression check proving newly saved mock files become discoverable through
    `listFiles()` only in the owning instance
- Libraries evaluated:
  - None evaluated -- existing repo primitives are sufficient

## Changes made

| File or path                                                                              | Change                                                                                                                                                   | Why                                                                                                                              |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/app/services/workspace/workspaceService.mock.ts`                            | Introduced `MockWorkspaceState`, `createMockWorkspaceState()`, instance-local graph/file-tree/file-content state, and deep-clone helpers.                | Removes hidden process-global mutable state while preserving an explicit opt-in shared-state seam.                               |
| `apps/web/src/app/services/workspace/workspaceService.test.ts`                            | Added RED->GREEN regression tests for default graph isolation, explicit shared state, local file-save isolation, and new-path file-tree discoverability. | Proves the adapter no longer leaks state across independent mock service instances and now surfaces newly saved paths correctly. |
| `apps/web/src/app/services/composition/appServices.test.ts`                               | Added a composition-root regression proving two `buildAppServices({ mode: 'mock' })` calls do not share workspace graph mutations.                       | Verifies the real app composition path preserves isolation instead of accidentally reusing singleton state.                      |
| `docs/architecture/frontend/appshell/data-source-service-boundary.md`                     | Documented instance-local mock workspace state and the explicit `createMockWorkspaceState()` test seam.                                                  | Keeps the canonical frontend boundary doc aligned with the hardened adapter behavior.                                            |
| `docs/planning/state/agent-lane-e.yaml`                                                   | Moved `F-04-RISK-B` and its parent `F-04-RISK` to evidence-backed review state.                                                                          | Keeps planning truth aligned with the shipped slice instead of leaving the risk queued after implementation.                     |
| `docs/planning/reviews/architecture-and-governance/20260405-f04-risk-a-hard-qa-review.md` | Removed stale wording that still described `F-04-RISK-B` as open.                                                                                        | Prevents governance drift across sibling hard-QA artifacts.                                                                      |
| `docs/planning/closeouts/F-04-RISK-B-mock-workspace-isolation-closeout.md`                | Recorded think-first analysis, implementation rationale, and validation evidence for the slice.                                                          | Makes the slice auditable and lane-traceable.                                                                                    |

## TDD evidence

- RED:
  - `pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspaceService.test.ts --config vitest.config.ts`
  - Failed before implementation because default mock services shared imported graph nodes, file-content saves leaked across instances, and `createMockWorkspaceState()` did not exist.
- GREEN:
  - `pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspaceService.test.ts src/app/services/composition/appServices.test.ts --config vitest.config.ts`
  - Passed after the adapter moved mutable state behind an explicit per-instance seam.

## Docs synced

- [x] `docs/planning/state/agent-lane-e.yaml` updated with the live `F-04-RISK-B` state.
- [x] `pnpm docs:sync` executed after adding this closeout file.
- [x] `pnpm docs:workboard:generate` executed after the lane update.

## Validation note

`pnpm verify:prepush` was executed and passed, but its diff-based subchecks
reported "No changed files detected" because the branch still carries an
uncommitted worktree delta. To avoid hiding that limitation, direct
`prettier --check`, `eslint`, and `markdownlint-cli2` commands were also run on
the full modified file set.

## Test evidence

| Command                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Result                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspaceService.test.ts --config vitest.config.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | FAIL (expected RED before implementation) |
| `pnpm --filter @dvt/web exec vitest run src/app/services/workspace/workspaceService.test.ts src/app/services/composition/appServices.test.ts --config vitest.config.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | PASS                                      |
| `pnpm --filter @dvt/web typecheck`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | PASS                                      |
| `pnpm docs:sync`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | PASS                                      |
| `pnpm docs:workboard:generate`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | PASS                                      |
| `pnpm --filter @dvt/web test`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | PASS                                      |
| `pnpm --filter @dvt/web build`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | PASS                                      |
| `pnpm exec prettier --check apps/web/src/app/services/composition/appServices.test.ts apps/web/src/app/services/plans/plansService.test.ts apps/web/src/app/services/workspace/workspaceService.mock.ts apps/web/src/app/services/workspace/workspaceService.test.ts docs/architecture/frontend/appshell/data-source-service-boundary.md docs/architecture/frontend/f04-frontend-data-boundary-technical-manual-20260404.md docs/architecture/frontend/runs/frontend-backend-mvp-contract.md docs/architecture/frontend/runs/frontend-runtime-contract-technical-manual.md docs/planning/reviews/architecture-and-governance/20260405-f04-risk-a-hard-qa-review.md docs/planning/reviews/review-status-board.md docs/planning/state/agent-lane-e.yaml docs/planning/closeouts/F-04-RISK-A-QA-03-backend-owned-planref-closeout.md docs/planning/closeouts/F-04-RISK-B-mock-workspace-isolation-closeout.md` | PASS                                      |
| `pnpm exec eslint apps/web/src/app/services/composition/appServices.test.ts apps/web/src/app/services/plans/plansService.test.ts apps/web/src/app/services/workspace/workspaceService.mock.ts apps/web/src/app/services/workspace/workspaceService.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | PASS                                      |
| `pnpm exec markdownlint-cli2 --ignore-path .markdownlintignore docs/architecture/frontend/appshell/data-source-service-boundary.md docs/architecture/frontend/f04-frontend-data-boundary-technical-manual-20260404.md docs/architecture/frontend/runs/frontend-backend-mvp-contract.md docs/architecture/frontend/runs/frontend-runtime-contract-technical-manual.md docs/planning/reviews/architecture-and-governance/20260405-f04-risk-a-hard-qa-review.md docs/planning/reviews/review-status-board.md docs/planning/closeouts/F-04-RISK-A-QA-03-backend-owned-planref-closeout.md docs/planning/closeouts/F-04-RISK-B-mock-workspace-isolation-closeout.md`                                                                                                                                                                                                                                             | PASS                                      |
| `pnpm verify:prepush`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | PASS                                      |

## Debt introduced

None. No rule was relaxed, no hook was bypassed, and no placeholder
implementation was added.

## Residual follow-up

- `F-04-RISK` is now closed at the code-and-review level; remaining `F-04`
  work sits under `F-04-RESIDUAL`.
- This branch still contains the earlier uncommitted `F-04-RISK-A-QA-03`
  documentary/test delta, so publication should separate or intentionally group
  the two slices before PR creation.
