---
slice: tf-e2-handler-contracts-hardening
date: 2026-04-21
lane: E
task_id: TF-E2-B, TF-E2-C
mode: Slim
status: Accepted
author: AI (Codex)
last_reviewed: 2026-04-21
---

# TF-E2 handler contracts hardening closeout

## Phase 1. Think-First Analysis

### Problem summary

The recent graph-lifecycle hard cut improved semantic ownership, but the Canvas
adapter seams still pass parent-shaped parameter sets down through multiple
hooks.

The concrete smell is not hidden dependency injection. It is explicit, but it
is still structurally weak:

- child hooks depend on `UseCanvasGraphHandlersParams` through `Pick<>`
- mutation sub-hooks depend on `UseCanvasMutationHandlersArgs` through `Pick<>`
- the same state/effects bundles are manually re-threaded across multiple
  layers without semantic grouping

That keeps the sub-hooks coupled to the parent seam shape instead of to local
contracts with their own meaning.

### Root cause

The earlier refactor prioritized semantic graph-lifecycle ownership first and
stopped before the adapter-composition layer was normalized.

That left a halfway posture:

- lifecycle semantics are now local and named
- composition still inherits its vocabulary from parent hook parameter types

So the domain seam improved, but the adapter seam still carries technical
tramp-data drift.

### Constraints and invariants

- `AGENTS.md`: no compatibility wrappers, no hidden debt, and docs must stay
  aligned with the code shape.
- `docs/guides/ai-work-protocol.md`: think-first plus pre-implementation brief
  must exist before code changes.
- `docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md`:
  adapters must remain thin, and command/query seams must stay explicit.
- `docs/architecture/components/web/graph/canvas-graph-lifecycle-component.md`:
  graph lifecycle is already the semantic mutation component; this slice must
  not move semantics back into handlers.

### Options considered

- keep the current `Pick<>`-based composition and accept the param drift
- hide the problem behind one generic `params` bag everywhere
- introduce local semantic handler contracts and compose sub-hooks through
  `state`, `effects`, and `policy`

### Selected option and rationale

Introduce local semantic handler contracts and compose through `state`,
`effects`, and `policy`.

This preserves explicit dependencies without coupling every child seam to the
type of its parent. It also makes the adapter seams read in domain language
instead of in arbitrary field lists.

### Rejected alternatives

- keep the `Pick<>` chain:
  too coupled to parent shape, and the same clumps will keep moving around
- one giant `params` object:
  changes packaging, not ownership

## Phase 2. Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - `apps/web/src/app/views/canvas/*Handler*.ts`
  - `apps/web/src/app/views/canvas/*Handler*.test.ts*`
  - `apps/web/src/app/views/canvas/*contracts*.ts`
  - `docs/architecture/components/web/graph/*.md`
  - this closeout
- Expected outcome:
  - sub-hooks stop depending on parent hook arg types
  - local semantic contracts own adapter composition vocabulary
  - `useCanvasGraphHandlers` and `useCanvasMutationHandlers` compose through
    grouped `state/effects/policy` bundles
- Risks and mitigations:
  - risk: over-abstracting simple handlers
    mitigation: keep only the minimal three local bundles and do not add
    service-locator style context
  - risk: behavior changes accidentally during contract movement
    mitigation: architecture tests first, then rerun focused behavior tests
- Out of scope:
  - lifecycle semantic changes
  - Inspector feature work
  - backend or contract changes
- Validation plan:
  - focused Vitest architecture tests for handlers
  - focused behavior tests for touched handlers
  - `pnpm --filter @dvt/web typecheck`
  - focused ESLint on touched Canvas files
  - `pnpm verify:prepush`

## Phase 3. Normative Baseline Verification

Verified against the governing sources cited in Phase 1:

- `canvas-controller-current-to-target-architecture.md`
  still requires thin adapter seams and explicit command composition rather
  than parent-shaped helper bags.
- `canvas-graph-lifecycle-component.md`
  still keeps lifecycle semantics in `canvasGraphLifecycle`, so this slice only
  hardens handler contracts and test guardrails.
- `AGENTS.md`
  still requires no compatibility shim, no hidden debt, and aligned docs.

The implementation therefore stays within a slim architectural-hardening slice:

- no lifecycle semantics moved
- no public behavior changed
- no legacy compatibility path reintroduced

## Implementation summary

- `canvasGraphHandlerContracts.ts` now owns named local contracts for graph
  interaction sub-seams:
  `CanvasNodeAuthoringContracts`, `CanvasNodeDropContracts`,
  `CanvasNodeRemovalContracts`, `CanvasEdgeAuthoringContracts`,
  `CanvasLayoutContracts`, and `CanvasSelectionContracts`.
- `canvasMutationHandlerContracts.ts` now owns named local contracts for
  mutation sub-seams:
  `CanvasGraphChangeContracts`, `CanvasNodeChangeContracts`,
  `CanvasEdgeChangeContracts`, and `CanvasSourceImportContracts`.
- parent composition seams now build named contract objects before delegating:
  `useCanvasGraphHandlers.ts` and `useCanvasMutationHandlers.ts`.
- contract-mapping builders now own the verbose shape translation:
  `canvasGraphHandlerContractBuilders.ts` and
  `canvasMutationHandlerContractBuilders.ts`.
- child hooks no longer define their API through parent-derived `Pick<>` bags
  or parent result types.
- architecture tests now guard the contract posture directly so the drift does
  not reappear silently.

## Phase 6. Validation And Closeout

Validated directly on the affected `@dvt/web` slice:

- `pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/useCanvasGraphHandlers.architecture.test.ts src/app/views/canvas/useCanvasMutationHandlers.architecture.test.ts src/app/views/canvas/useCanvasNodeAuthoringHandlers.architecture.test.ts src/app/views/canvas/useCanvasGraphChangeHandlers.architecture.test.ts src/app/views/canvas/useCanvasNodeChangeHandlers.architecture.test.ts src/app/views/canvas/useCanvasEdgeChangeHandlers.architecture.test.ts src/app/views/canvas/useCanvasEdgeAuthoringHandlers.architecture.test.ts src/app/views/canvas/useCanvasLayoutHandlers.architecture.test.ts src/app/views/canvas/useCanvasSelectionHandlers.architecture.test.ts src/app/views/canvas/useCanvasSourceImportHandlers.architecture.test.ts`
  - passed
- `pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx src/app/views/canvas/useCanvasGraphHandlers.layout.test.tsx src/app/views/canvas/useCanvasGraphHandlers.nodeDrop.test.tsx src/app/views/canvas/useCanvasGraphHandlers.nodeRemoval.test.tsx src/app/views/canvas/useCanvasGraphHandlers.selection.test.tsx src/app/views/canvas/useCanvasNodeChangeHandlers.test.tsx src/app/views/canvas/useCanvasEdgeChangeHandlers.test.tsx`
  - passed
- `pnpm --filter @dvt/web typecheck`
  - passed
- focused ESLint over touched Canvas handler and contract files
  - passed
- `pnpm docs:status:generate`
  - passed
- `pnpm verify:prepush`
  - command passed
  - changed-only wrapper reported no changed files detected, so the direct
    package-level validations above are the effective evidence for this slice

No compatibility shim, placeholder, or legacy handler path was added.
