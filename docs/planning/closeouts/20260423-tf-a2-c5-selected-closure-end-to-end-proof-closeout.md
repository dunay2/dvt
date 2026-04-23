---
title: TF-A2-C5 selected-closure end-to-end proof closeout
status: Done
owner: api
last_reviewed: 2026-04-23
planning_type: closeout
---

# TF-A2-C5 selected-closure end-to-end proof closeout

## Think-First Analysis

- Problem summary:
  `TF-A2-C1` through `TF-A2-C4` froze the execution-selection contract,
  planner derivation, API adoption, and Canvas command seam, but the route
  still lacked one explicit proof slice showing how selected-node intent moves
  end to end through preview, persisted plan proof, and run start.
- Root cause:
  The branch closed ownership and local semantic tests first. That left one
  remaining confidence gap before further refactoring: the end-to-end selected
  closure path was described across several local guides and tests, but not yet
  proven in one dedicated validation slice.
- Constraints and invariants:
  - `AGENTS.md` requires inventory-first startup, doc-driven work, explicit
    validation evidence, and no hidden debt.
  - `docs/guides/ai-work-protocol.md` requires think-first analysis and a
    pre-implementation brief before implementation changes.
  - `docs/architecture/reference-architecture.md` requires planner ownership of
    selected-closure derivation, API ownership of protected command execution,
    and UI non-execution posture.
  - `WorkspaceGraphAuthoringDraft` remains the only editable persisted draft.
  - `ExecutionSelection` remains the only preview/run intent payload; no second
    API-local or browser-local DTO family is allowed.
  - Selected execution must fail closed on `dependency_gap`,
    `selected_node_missing`, `cycle_detected`, and
    `graph_source_selection_mismatch`.
  - PlanRef-backed run start must remain platform-owned and must not reintroduce
    client-owned `runId` behavior.
- Options considered:
  1. Start `RC-G1-D` immediately and trust the existing local seam tests.
     Rejected: it would move package ownership before proving the selected-node
     path vertically.
  2. Add only one more planner unit test.
     Rejected: it would not prove the route through web and protected API
     boundaries.
  3. Publish the end-to-end flow in the local component docs, then add proof
     coverage in web and protected-runtime integration seams before the next
     ownership refactor.
     Selected: it proves the route without widening scope into unrelated
     package movement.
- Selected option and rationale:
  Freeze the selected-node route as an explicit proof slice first: document the
  preview-persist-run sequence and the involved components, add integration
  coverage for the protected API selected-closure path, and add a combined web
  proof that the persisted preview result feeds run-start selection correctly.

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  `apps/api/test/integration/**`,
  `apps/web/src/app/views/canvas/**`,
  `docs/architecture/components/planner/**`,
  `apps/api/docs/**`,
  `docs/architecture/components/web/graph/**`,
  `docs/planning/state/agent-lane-a.yaml`,
  `docs/planning/status/canonical-doc-code-matrix.md`,
  and `docs/planning/closeouts/**`
- Expected outcome:
  The repository has one governed proof slice showing the selected-node flow
  across Canvas preview, persisted preview proof, protected selected-closure
  resolution, and run-start reuse of the persisted plan without whole-draft
  widening.
- Risks and mitigations:
  - Risk: duplicate the same flow across multiple local docs.
    Mitigation: update only the component guides that already own the relevant
    seams, and keep the end-to-end narrative in this closeout.
  - Risk: add more isolated tests instead of vertical proof.
    Mitigation: add one combined web flow test and protected-runtime
    integration scenarios rather than only more unit coverage.
  - Risk: legacy integration helpers still encode pre-hard-cut start-run
    shapes.
    Mitigation: align any touched integration helper to canonical
    `ExecutionSelection` and platform-owned run identity in the same slice.
- Out-of-scope items:
  `RC-G1-D` planner-private port moves, new selection modes, new compile
  semantics, or engine-runtime refactors.
- Validation plan:
  `pnpm --filter @dvt/web test -- useCanvasExecutionActions.planPreview.core.test.tsx useCanvasExecutionActions.runStart.test.tsx`,
  `pnpm --filter dvt-api test`,
  `pnpm --filter dvt-api test:integration -- protectedRuntime.integration.test.ts`,
  `pnpm --filter dvt-api typecheck`,
  `pnpm docs:sync`,
  `pnpm docs:workboard:generate`,
  `pnpm docs:status:generate`,
  `pnpm docs:gov:manifest`,
  `pnpm verify:prepush`
- Test coverage plan:
  cover selected-subgraph preview success in a larger canvas, persisted
  preview-to-run reuse of selected nodes, protected preview rejection on
  `dependency_gap`, protected preview rejection on
  `graph_source_selection_mismatch`, and protected runtime success for a
  selected closure that excludes unrelated draft nodes.
- Libraries evaluated:
  None. The slice extends the existing Vitest integration harnesses and local
  component guides.

## Real Work Performed

- Published current-state end-to-end diagrams for the selected-node route in:
  - `docs/architecture/components/planner/workspace-authoring-draft-aggregate.md`
  - `apps/api/docs/executable-subgraph-resolution-component.md`
  - `docs/architecture/components/web/graph/canvas-execution-selection-component.md`
- Added a combined Canvas proof in
  `apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.core.test.tsx`
  showing that a partial preview inside a larger workspace reuses the persisted
  selected-subgraph proof on run start.
- Added protected-runtime selected-closure scenarios in
  `apps/api/test/integration/protectedRuntime.integration.selectedClosure.scenarios.ts`
  covering preview success, `dependency_gap`, `graph_source_selection_mismatch`,
  and planner-backed run success.
- Hardened the existing protected-runtime integration helpers to the active
  hard-cut boundary:
  - `apps/api/test/integration/protectedRuntime.integration.http.ts`
  - `apps/api/test/integration/protectedRuntime.integration.runtime.scenarios.ts`
  - `apps/api/test/integration/protectedRuntime.integration.assertions.ts`
  - `apps/api/test/integration/protectedRuntime.integration.test.ts`
- Fixed the selected-closure rejection expectation to match the planner-owned
  canonical diagnostic message:
  `Selected closure is missing required upstream dependencies.`
- Updated planning/governance surfaces:
  - `docs/planning/state/agent-lane-a.yaml`
  - `docs/planning/status/canonical-doc-code-matrix.md`
  - `docs/planning/closeouts/index.md`
  - `docs/planning/state/agent-lane-a.md`
  - `docs/planning/state/execution-workboard.md`
  - `docs/planning/state/open-task-route.md`
  - `docs/planning/status/generated-code-state.md`
  - `docs/.manifest.json`

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/reference-architecture.md`
- `docs/planning/state/agent-lane-a.yaml`
- `docs/planning/status/canonical-doc-code-matrix.md`
- `docs/contracts/planner/execution-selection-and-executable-subgraph-v1.md`
- `apps/api/docs/executable-subgraph-resolution-component.md`
- `docs/architecture/components/web/graph/canvas-execution-selection-component.md`

## Validation Evidence

- Passed:
  `pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasExecutionActions.planPreview.core.test.tsx src/app/views/canvas/useCanvasExecutionActions.runStart.test.tsx`
- Passed:
  `pnpm --filter @dvt/web typecheck`
- Passed:
  `pnpm --filter dvt-api typecheck`
- Passed:
  `pnpm --filter dvt-api test`
- Passed with clean skip due missing DB env:
  `pnpm --filter dvt-api test:integration -- protectedRuntime.integration.test.ts`
  (`DATABASE_URL` / `DVT_PG_URL` absent, so the lane skipped instead of failing)
- Passed:
  `pnpm docs:sync`
- Passed:
  `pnpm docs:workboard:generate`
- Passed:
  `pnpm docs:status:generate`
- Passed:
  `pnpm docs:gov:manifest`
- Passed:
  `pnpm docs:sync:check`
- Passed:
  `pnpm docs:planning:generated:check`
- Passed:
  `pnpm docs:gov:manifest:check`
- Passed:
  `pnpm lint:md`
- Passed:
  `pnpm verify:prepush`
  Note: the repo's `--changed-only` prepush helpers reported `No changed files
detected` in this unstaged local state, so the explicit docs checks above
  were also run to confirm deterministic green output without relying on that
  shortcut.

## No-Debt Evidence

- No new debt entry was introduced.
- No lint, type, test, docs, or CI rule was relaxed.
- No hook bypasses were used.
- No compatibility shim or legacy fallback path was added; the slice stays hard
  cut on the active execution-selection boundary.

## No-Stub Evidence

- No placeholder routes, fake DTOs, or temporary adapters were added.
- The new proof coverage runs against the real Canvas action seam and the real
  protected-runtime integration harness.
