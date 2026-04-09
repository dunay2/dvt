---
title: F-04-F capabilities-port hard QA review
status: Review
owner: Frontend / Architecture / QA
last_reviewed: 2026-04-07
planning_type: review
---

# F-04-F capabilities-port hard QA review

## Artifact Metadata

### Markdown Artifact Path Suggestion

- `docs/planning/reviews/20260407-f04-f-capabilities-port-hard-qa-review.md`

## Summary

This review records the hard, evidence-first QA pass for Lane E `F-04-F` after
the `CapabilitiesPort` seam was implemented. The goal is to verify that the
route/query boundary no longer owns mode or service-factory concerns and that
runtime capabilities now enter the app through the governed composition root.

Canonical execution tracking remains in:

- `docs/planning/state/agent-lane-e.yaml`
- `docs/planning/proposals/nice-to-have/frontend-and-ux/f-04-frontend-data-boundary-hexagonal-convergence-plan-20260403.md`
- `docs/planning/closeouts/F-04-F-capabilities-port-and-route-query-boundary-closeout.md`

## Governing Sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `AGENTS.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/planning/state/agent-lane-e.yaml`
- `docs/planning/proposals/nice-to-have/frontend-and-ux/f-04-frontend-data-boundary-hexagonal-convergence-plan-20260403.md`
- `docs/architecture/frontend/frontend-data-boundary-architecture.md`
- `docs/architecture/frontend/frontend-runtime-modes-user-manual.md`
- `docs/planning/closeouts/F-04-F-capabilities-port-and-route-query-boundary-closeout.md`

## Findings

### High

- No critical findings.

### Medium

- No medium-severity findings.

### Low

- Title: Direct route-level bypass of the governed capabilities seam is still
  prevented mainly by convention plus one architecture guard
  Why it matters:
  The active slice is correct today, but a future route or view could import
  `useRuntimeCapabilitiesQuery` directly from the capability module and bypass
  the app-level `useCapabilitiesQuery` seam.
  Evidence:
  - `apps/web/src/capabilities/runtime-capabilities/presentation/useRuntimeCapabilitiesQuery.ts`
  - `apps/web/src/app/queries/useCapabilitiesQuery.ts`
  - `apps/web/src/app/queries/queryKeyPolicy.architecture.test.ts`
    Risk:
    Low. Current app surfaces do not bypass the seam, and the shipped boundary is
    correct, but the preventive fence is not yet global.
    Recommendation:
    Consider a later architecture test that forbids route/view imports of
    `useRuntimeCapabilitiesQuery` outside approved boundaries if this drift risk
    reappears in subsequent slices.

## Alignment

- Doc vs code:
  Aligned. The active frontend architecture doc now matches the shipped
  composition-owned capabilities path.
- Promise vs implementation:
  Aligned for the stated `F-04-F` scope. Route/query surfaces no longer own
  `resolveDataSource` or service-factory construction, and capabilities are
  consumed through the app seam.
- Tests vs claims:
  Aligned. There is RED->GREEN evidence for the new seam plus package-wide web
  regression coverage.
- Current truth vs planned truth:
  Current truth now matches the `F-04-F` target, while `F-04` remains open for
  later residual and QA-risk work.
- Documentation update status:
  Updated in architecture, closeout, lane, and review surfaces.
- Evidence and risk-doc status when applicable:
  No ARC evidence or risk-register update is required because the touched paths
  do not trigger the engine/contracts/adapters/planner ARC-2 policy.

## Architecture Assessment

- SRP:
  Improved. Capabilities transport ownership moved out of the app query alias
  and into the composition root.
- DDD:
  Improved. `CapabilitiesPort` now exists as an explicit outbound frontend
  contract.
- Hexagonal:
  Improved. `useCapabilitiesQuery` depends on an app-owned port rather than on
  an internal default adapter singleton.
- CQRS if relevant:
  Maintained. This slice stays on the read side and does not blur command/query
  responsibilities.
- Complexity:
  Moderate but justified. One new seam removed a cross-cutting ownership leak.
- Modularity:
  Improved. App wiring, app query boundary, and runtime capability
  infrastructure are more clearly separated.

## Test Assessment

- Negative paths present:
  - `useCapabilitiesQuery` fails without `AppServicesProvider`
  - shell/root regression path covered after provider dependency change
  - architecture guard prevents the old direct re-export pattern
- Negative paths missing:
  - no dedicated global import fence yet for every route/view bypass of
    `useRuntimeCapabilitiesQuery`
- Regression status:
  Green on targeted tests, `@dvt/web` package tests, build, typecheck, and
  repo pre-push gate.
- Determinism:
  No nondeterministic behavior introduced in the reviewed seam.
- Local suite vs meaningful global confidence:
  Good. The review used both focused seam tests and the full `@dvt/web` suite.
- Global system view applied:
  Yes. The review checked composition, shell, route/query surfaces, docs, and
  planning truth together.
- Harness or shared fixture need:
  Current harnessing is sufficient for this slice.
- Test grouping by type (`unit` / `integration` / `contract` / `e2e` /
  regression) and rationale:
  - `unit`: `appServices.test.ts`, `AppServicesContext.test.tsx`
  - `regression`: `useCapabilitiesQuery.test.tsx`, `Root.test.tsx`
  - `architecture`: `queryKeyPolicy.architecture.test.ts`
  - `package confidence`: `pnpm --filter @dvt/web test`

## Quality Gates

- Commands executed:
  - `rg -n "resolveDataSource|createRunsService|createWorkspaceService|createPlansService" apps/web/src/app/views apps/web/src/app/queries apps/web/src/app/shell`
  - `rg -n "useRuntimeCapabilitiesQuery|capabilities/runtime-capabilities" apps/web/src/app apps/web/src/capabilities -g "*.ts" -g "*.tsx"`
  - `pnpm --filter @dvt/web exec vitest run src/app/services/composition/appServices.test.ts src/app/services/AppServicesContext.test.tsx src/app/queries/useCapabilitiesQuery.test.tsx src/app/queries/queryKeyPolicy.architecture.test.ts --config vitest.config.ts`
  - `pnpm --filter @dvt/web exec vitest run src/app/Root.test.tsx src/app/queries/useCapabilitiesQuery.test.tsx src/app/services/composition/appServices.test.ts --config vitest.config.ts`
  - `pnpm --filter @dvt/web typecheck`
  - `pnpm --filter @dvt/web test`
  - `pnpm --filter @dvt/web build`
  - `pnpm verify:prepush`
- What passed:
  - no direct `resolveDataSource` or `create*Service` usage found in
    route/query/shell source surfaces
  - targeted seam tests passed
  - root/shell regression tests passed
  - package-level web test suite passed
  - package build and typecheck passed
  - repo pre-push gate passed
- What failed:
  - Nothing in the final review baseline
- What could not be verified:
  - Nothing material for the active slice

## Unblock Roadmap

### Wave 0 - Truth and documentation baseline

Tasks: `[TASK-1]`

Target:

- the active docs and lane reflect the shipped capabilities seam truth;
- the QA artifact becomes part of the governed planning surface.

### Wave 1 - Boundary and ownership hardening

Tasks: `[TASK-2]`

Target:

- preserve the composition-owned capabilities seam;
- optionally harden the import fence if later slices re-open the risk.

### Wave 2 - Runtime and regression closure

Tasks: `[TASK-3]`

Target:

- the slice can proceed to commit/PR with documentary QA attached;
- later residual cleanup remains explicitly outside this slice.

## Action Artifact

### Task Checklist

- [x] `TASK-1` Reconcile docs, lane truth, and closeout references with the shipped seam
- [x] `TASK-2` Re-run targeted and package-level validation for the capabilities boundary
- [ ] `TASK-3` Optionally add a broader import-fence test if future route-level bypass appears
- [ ] `TASK-4` Commit and publish the reviewed slice with this QA artifact attached

### Task Details

#### `TASK-1` Reconcile docs, lane truth, and closeout references with the shipped seam

- Objective: Keep the canonical planning and architecture surfaces aligned with
  the actual `CapabilitiesPort` implementation.
- Scope: `docs/planning/**`, `docs/architecture/frontend/**`, and the `F-04`
  lane registry entry.
- Recommended owner: Lane E owner.
- Dependencies: Current code truth in `apps/web`.
- Documentation impact: Direct.
- Evidence / risk-doc impact: Review artifact becomes explicit QA evidence for
  the slice; risk-doc impact is none for the current scope.
- Comment with rationale: A hard QA pass is only useful if the canonical docs
  say what the code now does.
- Definition of Done:
  - lane entry references the QA artifact;
  - active architecture notes no longer claim raw capability fetch ownership in
    the app layer;
  - the slice closeout and review can be discovered from planning surfaces.

#### `TASK-2` Re-run targeted and package-level validation for the capabilities boundary

- Objective: Confirm the seam works locally and does not regress unrelated web
  flows.
- Scope: targeted Vitest suites, package `typecheck`, package `test`, package
  `build`, and repo pre-push gate.
- Recommended owner: Slice owner.
- Dependencies: `TASK-1`
- Documentation impact: Validation evidence recorded in the review and closeout.
- Evidence / risk-doc impact: Direct evidence for the reviewed slice.
- Comment with rationale: Documentary QA without fresh validation is only a
  narrative, not a gate.
- Definition of Done:
  - targeted seam tests pass;
  - `Root`/shell regressions pass;
  - `pnpm --filter @dvt/web test`, `typecheck`, and `build` pass;
  - `pnpm verify:prepush` passes.

#### `TASK-3` Optionally add a broader import-fence test if future route-level bypass appears

- Objective: Strengthen prevention against future direct route/view imports of
  `useRuntimeCapabilitiesQuery`.
- Scope: frontend architecture tests only.
- Recommended owner: Lane E owner when or if the drift risk resurfaces.
- Dependencies: none for this slice.
- Documentation impact: none unless the rule becomes a declared invariant.
- Evidence / risk-doc impact: none today.
- Comment with rationale: The current slice is correct, but preventive fences
  should grow only when real drift pressure justifies them.
- Definition of Done:
  - a broader guard exists only if a real bypass pressure appears;
  - the guard targets route/view drift rather than blocking legitimate internal
    capability-module tests.

#### `TASK-4` Commit and publish the reviewed slice with this QA artifact attached

- Objective: Move the slice from validated worktree state to publishable change
  control.
- Scope: commit, branch publication, PR, and CI follow-through.
- Recommended owner: Slice owner.
- Dependencies: `TASK-1`, `TASK-2`
- Documentation impact: QA artifact remains linked from lane and PR narrative.
- Evidence / risk-doc impact: none beyond normal PR evidence.
- Comment with rationale: Review value is fully realized only when the reviewed
  state is the one that gets published.
- Definition of Done:
  - the slice is committed with the governed helper;
  - the review artifact is part of the published diff;
  - CI sees the same state validated by this QA pass.

## Mermaid Diagram

```mermaid
flowchart LR
  View["Route / View"] --> Query["useCapabilitiesQuery()"]
  Query --> Hook["useCapabilitiesPort()"]
  Hook --> Context["AppServicesContext"]
  Context --> Composition["buildAppServices()"]
  Composition --> Port["CapabilitiesPort"]
  Port --> Client["governed ApiClient"]
  Client --> Api["/capabilities"]
```

## Final Verdict

`F-04-F` passes this hard QA review with no blocking findings. The shipped seam
is aligned with the lane target, the active docs now match the code, and the
validation baseline is green. The only residual noted here is a low-priority
future hardening option around broader import-fence coverage. This slice is
acceptable for commit/PR, while the parent `F-04` epic remains open for later
QA-risk and residual work outside the `F-04-F` scope.
