---
slice: F-04-RISK-A-QA-03-backend-owned-planref
date: 2026-04-07
lane: E
author: AI (Codex)
last_reviewed: 2026-04-07
---

# Closeout: F-04-RISK-A-QA-03 backend-owned PlanRef

## Think-First Analysis

### Problem summary

Lane E `F-04-RISK-A-QA-03` existed to remove frontend synthesis of `PlanRef`
from the API plans adapter. The hard-QA review opened this as a high-severity
contract-drift risk because the browser should not invent canonical plan
identity fields that the backend execution boundary owns.

### Current-truth finding

By the time this slice was picked up for execution, current `main` already
implemented the behavioral correction:

- `apps/api/src/entrypoints/http/planRoutes.ts` returns `{ plan, planRef }` for
  both preview and import;
- `apps/web/src/app/services/plans/plansService.api.ts` parses `planRef`
  directly and rejects payloads that omit it;
- `useCanvasExecutionActions` remains fail-closed when `currentPlan.planRef` is
  absent.

The remaining gap was governance drift: lane state, review status, and frontend
contract docs still described `QA-03` as open.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, doc-driven behavior changes, truthful
  planning state, no hidden debt, and real validation before readiness claims.
- `docs/guides/ai-work-protocol.md`: think first, then keep docs, tests, and
  implementation aligned.
- `docs/planning/state/agent-lane-e.yaml`: `F-04-RISK-A-QA-03` definition of
  done requires backend-owned `planRef`, no frontend synthesis, fail-closed
  start-run behavior, and green `@dvt/web` + pre-push validation.
- `docs/architecture/frontend/runs/frontend-backend-mvp-contract.md`: frontend
  contract surface must list the backend routes the web app is allowed to rely
  on.
- `docs/architecture/frontend/f04-frontend-data-boundary-technical-manual-20260404.md`:
  `startRun` remains `PlanRef`-driven and fail-closed.

### Selected option and rationale

Do not duplicate production code that already landed upstream. Close the slice
cleanly by:

1. aligning the canonical docs and lane registry to current repo truth;
2. adding the missing regression coverage for the API `importPlan` adapter
   path;
3. re-running targeted validation and the repo pre-push gate.

This preserves engineering truthfulness and avoids churn on an already-correct
runtime path.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - `docs/architecture/frontend/runs/frontend-backend-mvp-contract.md`
  - `docs/architecture/frontend/runs/frontend-runtime-contract-technical-manual.md`
  - `docs/architecture/frontend/f04-frontend-data-boundary-technical-manual-20260404.md`
  - `docs/planning/reviews/architecture-and-governance/20260405-f04-risk-a-hard-qa-review.md`
  - `docs/planning/reviews/review-status-board.md`
  - `docs/planning/state/agent-lane-e.yaml`
  - `apps/web/src/app/services/plans/plansService.test.ts`
- Expected outcome:
  - docs state that preview/import payloads provide backend-owned `planRef`
  - lane state no longer claims `QA-03` is open
  - adapter tests prove both preview and import consume backend-provided
    `planRef`
- Risks and mitigations:
  - Risk: documentary updates could overstate closure
  - Mitigation: anchor every claim to current code and tests already present on
    `main`
  - Risk: import-path coverage could still be asymmetric
  - Mitigation: add explicit `importPlan` success and fail-closed tests
- Out of scope:
  - new backend route behavior
  - changes to `useCanvasExecutionActions`
  - `F-04-RISK-B` mock-workspace determinism work
- Validation plan:
  - `pnpm --filter @dvt/web exec vitest run src/app/services/plans/plansService.test.ts src/app/views/canvas/useCanvasExecutionActions.test.tsx --config vitest.config.ts`
  - `pnpm --filter @dvt/web typecheck`
  - `pnpm --filter @dvt/api exec vitest run test/entrypoints/http/planRoutes.test.ts --config vitest.config.ts`
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - preserve existing hook-level fail-closed run-start guard
  - add explicit import-path mapping and missing-envelope rejection coverage

## Changes made

| File or path                                                                              | Change                                                                                  | Why                                                                                           |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `apps/web/src/app/services/plans/plansService.test.ts`                                    | Added `importPlan` success and missing-`planRef` regression tests.                      | Makes adapter coverage symmetric for preview and import under backend-owned `planRef`.        |
| `docs/architecture/frontend/runs/frontend-backend-mvp-contract.md`                        | Added `/plans/preview` and `/plans/import` to the frontend-facing backend contract.     | The web app already relies on these routes for the `PlanRef` handoff and the doc must say so. |
| `docs/architecture/frontend/runs/frontend-runtime-contract-technical-manual.md`           | Added the `PlanRef` handoff prerequisite section.                                       | Keeps runtime contract docs aligned with preview/import plus start-run sequencing.            |
| `docs/architecture/frontend/f04-frontend-data-boundary-technical-manual-20260404.md`      | Clarified that API-mode `planRef` is backend-owned and never reconstructed client-side. | Aligns the `F-04` technical manual with current code truth.                                   |
| `docs/planning/reviews/architecture-and-governance/20260405-f04-risk-a-hard-qa-review.md` | Added a 2026-04-07 resolution update and closed the `QA-03` checklist item.             | Keeps the original hard-QA artifact truthful without erasing the historical finding.          |
| `docs/planning/reviews/review-status-board.md`                                            | Registered the `F04-RISK-A` QA review in the canonical review board.                    | Makes the active review discoverable from the planning entrypoint.                            |
| `docs/planning/state/agent-lane-e.yaml`                                                   | Updated `F-04`, `F-04-RISK`, `F-04-RISK-A`, and `F-04-RISK-A-QA-03` to current truth.   | Removes the stale claim that `QA-03` is still open.                                           |
| `docs/planning/closeouts/F-04-RISK-A-QA-03-backend-owned-planref-closeout.md`             | Added this closeout artifact.                                                           | Records the rationale, evidence, and scope of the closure.                                    |

## TDD / Test Notes

No RED -> GREEN production-code cycle was required in this closeout because the
runtime behavior had already landed on `main` before this slice was executed.
This closeout adds regression evidence and documentary alignment for an
already-correct path.

## Docs synced

- [x] lane registry updated in `docs/planning/state/agent-lane-e.yaml`
- [x] review artifact and review board updated
- [x] runtime/frontend contract docs updated for backend-owned `planRef`
- [x] `pnpm docs:sync` required after adding this closeout file
- [x] `pnpm docs:workboard:generate` required after lane changes

## Test evidence

| Command                                                                                                                                                                | Result |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `pnpm --filter @dvt/web exec vitest run src/app/services/plans/plansService.test.ts src/app/views/canvas/useCanvasExecutionActions.test.tsx --config vitest.config.ts` | PASS   |
| `pnpm --filter @dvt/web typecheck`                                                                                                                                     | PASS   |
| `pnpm --filter @dvt/api exec vitest run test/entrypoints/http/planRoutes.test.ts --config vitest.config.ts`                                                            | PASS   |
| `pnpm docs:sync`                                                                                                                                                       | PASS   |
| `pnpm docs:workboard:generate`                                                                                                                                         | PASS   |
| `pnpm verify:prepush`                                                                                                                                                  | PASS   |

## Debt introduced

None. No rules were relaxed, no hook was bypassed, and no placeholder runtime
implementation was added.

## Residual follow-up

- `F-04-RISK-B` remains open for mock workspace determinism and cross-instance
  state isolation.
- `F-04-RESIDUAL-*` remains outside this closeout and continues to track
  non-blocking cleanup after the boundary refactor.
