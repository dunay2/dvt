---
slice: F-04-RESIDUAL-B-provider-override-test-seams
date: 2026-04-08
lane: E
author: AI (Codex)
last_reviewed: 2026-04-08
---

# Closeout: F-04-RESIDUAL-B provider-override test seams

## Think-First Analysis

### Problem summary

Lane E `F-04-RESIDUAL-B` requires the `useCanvasController` test surface to
match the documented `F-04` boundary contract. The canonical shell boundary now
states that view and route tests inject runtime seams through
`AppServicesProvider` overrides, but the shared canvas-controller harness still
globally mocks `../../services/AppServicesContext` and replaces the service
hooks at module scope.

### Root cause

The original canvas-controller tests were written before `F-04-D/E/F` fully
centralized service composition. The harness kept its earlier strategy of
monkey-patching service hooks directly because that was the fastest way to
freeze controller behavior while the composition root was still moving. After
the provider boundary became canonical, that harness drifted into a policy
violation: consumer tests were no longer exercising the real provider seam that
the runtime owns.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, think-first before code, no hidden debt
  or stubbed completion, and real validation including `pnpm verify:prepush`.
- `docs/guides/ai-work-protocol.md`: this architecture-affecting slice must
  record think-first analysis, a pre-implementation brief, and close with
  validation evidence.
- `docs/planning/state/agent-lane-e.yaml`: `F-04-RESIDUAL-B` explicitly
  requires `useCanvasController` tests to stop mocking `AppServicesContext`
  exports globally and move to provider-level injection helpers.
- `docs/architecture/frontend/appshell/data-source-service-boundary.md`: tests
  inject seams through provider overrides, not global module mutation.

### Options considered

- Keep the global `vi.mock('../../services/AppServicesContext', ...)` seam and
  only document it as a test-only exception.
  - Rejected because `F-04-RESIDUAL-B` exists specifically to remove that
    exception and make consumer tests obey the same boundary as runtime code.
- Replace the service-hook mock with a custom test-only context module.
  - Rejected because it would create a second, non-runtime composition path and
    keep the test seam divergent from the production provider contract.
- Mount `AppServicesProvider` inside the shared harness, pass per-service
  overrides there, and keep the rest of the controller dependency freezing
  unchanged.
  - Accepted because it removes the seam-policy drift without broadening the
    slice into unrelated controller extraction work.
- Libraries evaluated:
  - None evaluated. Existing React/provider primitives are sufficient.

### Selected option and rationale

Refit the canvas-controller harness so it renders `useCanvasController` under a
real `AppServicesProvider` with explicit overrides for `workspaceService`,
`plansService`, `runsService`, `sessionContext`, and `shellFeedback`. Keep the
other controller collaborators frozen through their existing local mocks, since
`F-04-RESIDUAL-B` is about the app-services seam only. This brings consumer
tests back under the documented boundary contract while preserving deterministic
controller-focused assertions.

### Rejected alternatives

- Rewrite all canvas-controller collaborators to provider-owned seams now.
  - Rejected because that is `F-05` extraction work, not residual cleanup.
- Duplicate provider setup in every test file instead of fixing the shared
  harness.
  - Rejected because it would scatter seam policy and make later regressions
    harder to catch consistently.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - `apps/web/src/app/views/canvas/useCanvasController.test.harness.tsx`
  - `apps/web/src/app/views/canvas/useCanvasController.test.fixtures.ts`
  - `apps/web/src/app/views/canvas/useCanvasController.core.test.tsx`
  - `apps/web/src/app/views/canvas/useCanvasController.negative.test.tsx`
  - `apps/web/src/app/views/canvas/useCanvasController.persistence.test.tsx`
  - `docs/architecture/frontend/appshell/data-source-service-boundary.md`
  - `docs/planning/state/agent-lane-e.yaml`
  - this closeout file
- Expected outcome:
  - controller consumer tests stop globally mocking `AppServicesContext`
  - the shared harness mounts a real `AppServicesProvider` with explicit
    overrides
  - lane evidence reflects `F-04-RESIDUAL-B` progress truthfully
- Risks and mitigations:
  - Risk: controller tests may accidentally depend on the old global-hook
    mocks and fail noisily once the provider seam is made real
  - Mitigation: add a RED regression proving the harness no longer exports
    service-hook mocks, then wire provider overrides centrally in one harness
  - Risk: changing the harness could mask regressions if tests still pass only
    because the provider resolves default services
  - Mitigation: keep explicit override objects in the harness state and assert
    identity where useful
- Out of scope:
  - `F-04-RESIDUAL-C` console copy normalization
  - `F-05` controller decomposition and new seam extraction
  - broader store or query ownership cleanup outside the app-services seam
- Validation plan:
  - `pnpm --filter @dvt/web exec vitest run src/app/views/canvas/useCanvasController.core.test.tsx src/app/views/canvas/useCanvasController.negative.test.tsx src/app/views/canvas/useCanvasController.persistence.test.tsx src/app/services/AppServicesContext.test.tsx --config vitest.config.ts`
  - `pnpm --filter @dvt/web typecheck`
  - `pnpm --filter @dvt/web test`
  - `pnpm --filter @dvt/web build`
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm verify:prepush`
- Test coverage plan:
  - RED coverage proving the harness uses provider-owned service overrides
    instead of hook-level mocks
  - regression coverage that core, negative, and persistence controller tests
    still pass through the provider-owned seam
  - regression coverage that `AppServicesContext` explicit overrides remain the
    supported injection path
- Libraries evaluated:
  - None evaluated -- existing repo primitives are sufficient

## Changes made

- `apps/web/src/app/views/canvas/useCanvasController.test.harness.tsx`
  Changed: removed the global `AppServicesContext` module mock and mounted the
  real `AppServicesProvider` with explicit service overrides inside the shared
  canvas-controller harness.
  Why: makes consumer tests exercise the same provider seam that runtime code
  owns.
- `apps/web/src/app/views/canvas/useCanvasController.test.fixtures.ts`
  Changed: moved controller-service doubles into explicit `services` override
  state typed against the real workspace, plans, runs, session, and shell
  feedback ports.
  Why: keeps service injection deterministic without reintroducing hook-level
  monkey patching.
- `apps/web/src/app/views/canvas/useCanvasController.core.test.tsx`
  Changed: added an assertion that `useCanvasExecutionActions` receives the
  exact provider-owned plans, runs, session, and feedback dependencies from the
  harness overrides.
  Why: freezes the seam-policy regression that originally allowed `undefined`
  service dependencies to slip through the harness.
- `apps/web/src/app/services/AppServicesContext.test.tsx`
  Changed: expanded explicit override coverage to include plans, runs, session,
  and shell feedback ports, not only workspace and capabilities.
  Why: proves the provider contract used by the controller harness is formally
  supported by the app-services boundary itself.
- `docs/architecture/frontend/appshell/data-source-service-boundary.md`
  Changed: documented that shared canvas-controller harnesses mount the real
  provider with explicit overrides rather than globally mocking
  `AppServicesContext` exports.
  Why: keeps the canonical architecture surface aligned with the implemented
  seam policy.
- `docs/planning/state/agent-lane-e.yaml`
  Changed: moved `F-04-RESIDUAL-B` to evidence-backed review state and updated
  the parent residual status to reflect that only `F-04-RESIDUAL-C` remains.
  Why: planning truth must match shipped implementation, not stale queue state.
- `docs/planning/closeouts/F-04-RESIDUAL-B-provider-override-test-seams-closeout.md`
  Changed: recorded think-first analysis, implementation rationale, and
  validation evidence for the slice.
  Why: makes the residual seam cleanup auditable before follow-on hard QA.

## TDD evidence

- RED:
  - `pnpm --filter @dvt/web exec vitest run src/app/views/canvas/useCanvasController.core.test.tsx src/app/views/canvas/useCanvasController.negative.test.tsx src/app/views/canvas/useCanvasController.persistence.test.tsx --config vitest.config.ts`
  - Failed before the harness refactor because `useCanvasExecutionActions`
    received `plansService`, `runsService`, `sessionContext`, and
    `shellFeedback` as `undefined`, proving the controller tests were still
    bypassing the provider-owned seam.
- GREEN:
  - `pnpm --filter @dvt/web exec vitest run src/app/views/canvas/useCanvasController.core.test.tsx src/app/views/canvas/useCanvasController.negative.test.tsx src/app/views/canvas/useCanvasController.persistence.test.tsx --config vitest.config.ts`
  - Passed after the harness mounted `AppServicesProvider` with explicit
    overrides.

## Docs synced

- [x] `docs/planning/state/agent-lane-e.yaml` updated with the live
      `F-04-RESIDUAL-B` state.
- [x] `pnpm docs:sync` executed after adding this closeout file.
- [x] `pnpm docs:workboard:generate` executed after the lane update.

## Test evidence

- `pnpm --filter @dvt/web exec vitest run src/app/views/canvas/useCanvasController.core.test.tsx src/app/views/canvas/useCanvasController.negative.test.tsx src/app/views/canvas/useCanvasController.persistence.test.tsx --config vitest.config.ts`
  Result: FAIL (expected RED before implementation)
- `pnpm --filter @dvt/web exec vitest run src/app/views/canvas/useCanvasController.core.test.tsx src/app/views/canvas/useCanvasController.negative.test.tsx src/app/views/canvas/useCanvasController.persistence.test.tsx src/app/services/AppServicesContext.test.tsx --config vitest.config.ts`
  Result: PASS
- `pnpm --filter @dvt/web typecheck`
  Result: PASS
- `pnpm --filter @dvt/web test`
  Result: PASS
- `pnpm --filter @dvt/web build`
  Result: PASS
- `pnpm docs:sync`
  Result: PASS
- `pnpm docs:workboard:generate`
  Result: PASS
- `pnpm exec eslint apps/web/src/app/services/AppServicesContext.test.tsx apps/web/src/app/views/canvas/useCanvasController.core.test.tsx apps/web/src/app/views/canvas/useCanvasController.test.fixtures.ts apps/web/src/app/views/canvas/useCanvasController.test.harness.tsx`
  Result: PASS
- `pnpm exec prettier --check apps/web/src/app/services/AppServicesContext.test.tsx apps/web/src/app/views/canvas/useCanvasController.core.test.tsx apps/web/src/app/views/canvas/useCanvasController.test.fixtures.ts apps/web/src/app/views/canvas/useCanvasController.test.harness.tsx docs/architecture/frontend/appshell/data-source-service-boundary.md docs/planning/state/agent-lane-e.yaml docs/planning/closeouts/F-04-RESIDUAL-B-provider-override-test-seams-closeout.md`
  Result: PASS
- `pnpm exec markdownlint-cli2 --ignore-path .markdownlintignore docs/architecture/frontend/appshell/data-source-service-boundary.md docs/planning/closeouts/F-04-RESIDUAL-B-provider-override-test-seams-closeout.md`
  Result: PASS
- `pnpm verify:prepush`
  Result: PASS

## Validation note

`pnpm verify:prepush` passed on the live worktree, but its `changed-only`
subchecks did not inspect the new closeout file because it is still an
uncommitted path. Direct `prettier --check` and `markdownlint-cli2` runs were
therefore executed on the touched files to close that gap explicitly.

## Debt introduced

None. No rule was relaxed, no hook was bypassed, and no placeholder
implementation was added.

## Residual follow-up

- `F-04-RESIDUAL-C` remains next: API-mode console copy still needs product
  language normalization.
- Hard QA for `F-04-RESIDUAL-B` remains a separate follow-up slice; this
  closeout records implementation and baseline validation only.
