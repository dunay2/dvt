---
slice: 20260420-adapter-temporal-workflowhelpers-decomposition
date: 2026-04-20
last_reviewed: 2026-04-20
work_item: refactor(adapters)
status: Done
---

# Closeout: adapter-temporal workflowHelpers decomposition

## Think-First Analysis

### Problem summary

`packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts` contained 17
exported functions across three unrelated domains — gateway dependency
resolution, step payload/retry construction, and workflow input parsing — mixed
in a single file with no public API boundary. Six domain-specific replacement
modules had already been written (`workflowGatewayHelpers.ts`,
`workflowArtifactHelpers.ts`, `workflowCursorHelpers.ts`,
`workflowInputParsingHelpers.ts`, `workflowErrorHelpers.ts`,
`workflowRuntimePayloadHelpers.ts`) but the original file was still in place and
still the only import target for all consumers.

### Root cause

The new modules were created incrementally (likely as part of a prior slice) but
the old file was not removed and the consumer imports were not redirected. The
codebase therefore contained duplicate implementations, and the new modules were
unreachable dead code from the perspective of all src and test consumers.

### Constraints and invariants

- `AGENTS.md`: real validation, no hidden debt, no partial implementations.
- `docs/guides/ai-work-protocol.md`: Slim mode, closeout is mandatory.
- No ADR governs internal module layout directly; the change is a pure
  intra-package structural refactor with no public API surface change, no
  contract change, and no new external behavior.

### Options considered

1. Keep `workflowHelpers.ts` as a re-export barrel pointing to the new modules.
   - Rejected: perpetuates the misleading single-file facade, prevents editors
     from surfacing the domain boundaries, and leaves dead code in the new
     modules.
2. Redirect every import to the correct domain module and delete
   `workflowHelpers.ts`.
   - Selected: clean cut, no residual facade, consumers are explicit about which
     domain they depend on.

### Selected option and rationale

Delete `workflowHelpers.ts` after redirecting every src and test import to the
appropriate domain module. The six replacement modules already contained correct
and in some cases improved implementations (e.g. `buildContinueAsNewInput` now
validates payload size and uses a nested `cursor:` structure).

### Rejected alternatives

- Re-export barrel: see option 1 above.
- Partial migration (leave some functions in `workflowHelpers.ts`): rejected
  because it perpetuates the mixed-domain file and provides no improvement over
  the status quo.

## Pre-Implementation Brief

- **Mode**: Slim
- **Scope**:
  - `packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts` — deleted
  - `packages/@dvt/adapter-temporal/src/workflows/executionSegmentResolver.ts`
  - `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.activities.ts`
  - `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layerHelpers.ts`
  - `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layerResults.ts`
  - `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.state.ts`
  - `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.stepExecution.ts`
  - `packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.types.ts`
  - `packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts`
  - `packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts`
  - `packages/@dvt/adapter-temporal/test/workflow-retry-policy.test.ts`
- **Expected outcome**: `workflowHelpers.ts` no longer exists; every consumer
  imports from the correct domain module; all existing tests pass without
  modification to test assertions.
- **Risks and mitigations**:
  - Risk: signature mismatch between old and new module implementations (e.g.
    `buildContinueAsNewInput` changed shape across the split).
    Mitigation: read every new module before redirecting; confirm TypeScript
    compiles without error.
  - Risk: a consumer was missed.
    Mitigation: grep for `workflowHelpers` after all edits; confirm zero
    remaining references outside the file itself before deletion.
- **Out-of-scope items**:
  - Changes to the six destination modules.
  - Changes to test assertions.
  - Any change outside `packages/@dvt/adapter-temporal`.
- **Validation plan**:
  - `pnpm exec vitest run` inside `packages/@dvt/adapter-temporal` — all
    existing tests must pass.
- **Test coverage plan**:
  - No new tests required: this is import redirection only. All existing
    negative-path and edge-case assertions remain in place and pass.
- **Libraries evaluated**:
  - None evaluated — no custom implementation, pure import redirection.

## Traceability

- Baseline ADRs: none governing internal module layout.
- Governing operational sources:
  - `AGENTS.md`
  - `docs/planning/status/governance-document-rule-inventory.md`
  - `docs/guides/ai-work-protocol.md`

## Real Work Performed

Import sources redirected per consumer:

| Consumer                                  | Old import        | New import                                                                       |
| ----------------------------------------- | ----------------- | -------------------------------------------------------------------------------- |
| `executionSegmentResolver.ts`             | `workflowHelpers` | `workflowGatewayHelpers`, `workflowArtifactHelpers`                              |
| `runPlanWorkflow.activities.ts`           | `workflowHelpers` | `workflowArtifactHelpers`                                                        |
| `runPlanWorkflow.layerHelpers.ts`         | `workflowHelpers` | `workflowGatewayHelpers`, `workflowCursorHelpers`                                |
| `runPlanWorkflow.layerResults.ts`         | `workflowHelpers` | `workflowGatewayHelpers`                                                         |
| `runPlanWorkflow.state.ts`                | `workflowHelpers` | `workflowArtifactHelpers`, `workflowInputParsingHelpers`                         |
| `runPlanWorkflow.stepExecution.ts`        | `workflowHelpers` | `workflowArtifactHelpers`, `workflowGatewayHelpers`, `workflowErrorHelpers`      |
| `runPlanWorkflow.types.ts`                | `workflowHelpers` | `workflowCursorHelpers`                                                          |
| `test/workflow-compiled-code-ref.test.ts` | `workflowHelpers` | `workflowArtifactHelpers`                                                        |
| `test/workflow-retry-policy.test.ts`      | `workflowHelpers` | `workflowArtifactHelpers`                                                        |
| `test/workflow-continue-as-new.test.ts`   | `workflowHelpers` | `workflowCursorHelpers`, `workflowGatewayHelpers`, `workflowInputParsingHelpers` |

`workflowHelpers.ts` deleted after confirming zero remaining external references.

## Governing sources used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`

## Validation evidence

- `pnpm exec vitest run` inside `packages/@dvt/adapter-temporal`:
  - 24 test files passed, 188 tests passed.
  - 1 pre-existing failure: `integration.postgres.time-skipping.test.ts` —
    `ERR_MODULE_NOT_FOUND` for `@dvt/traceability-service`, unrelated to this
    slice.
- `pnpm verify:prepush` blocked by pre-existing `@dvt/engine` build errors
  (`InMemoryOutboxState.ts`, `InMemoryTxStore.ts` — cannot find `@dvt/delivery`
  module). These errors pre-date this slice and are out of scope.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No TODO/FIXME or temporary shim was introduced.
- No test assertion was removed or weakened.
- The six destination modules were not modified; only import sources were
  redirected.

## No-stub evidence

- No fake implementation was introduced.
- All production code paths call the same real implementations as before; only
  the module that owns those implementations changed.
