---
title: Pending Source Output intent and shared Canvas Edit
status: draft
date: 2026-10-26
owners:
  - Web
  - Contracts
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtRelationalAuthoringDraft.v1.ts
  - apps/web/src/app/views/canvas/relational-source-occurrence/sourceOccurrenceActions.ts
  - apps/web/src/app/views/canvas/canvasSourceOutputDefaults.ts
  - apps/web/src/app/views/canvas/useCanvasSourceOutputInitialization.ts
  - apps/web/src/app/views/canvas/useCanvasRelationalTreeDraftState.ts
  - apps/web/src/app/views/canvas/CanvasPendingSourceOutputs.tsx
  - apps/web/src/app/views/canvas/CanvasRelationalTreeEditorFrame.tsx
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts schema:verify
    - pnpm validate:contracts
    - pnpm --dir apps/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasSourceOutputDefaults.test.ts src/app/views/canvas/canvasRelationalAuthoringDraft.test.ts src/app/views/canvas/canvasRelationalTreeSessionActionsModel.test.ts
    - pnpm --dir apps/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/useCanvasSourceOutputInitialization.test.tsx src/app/views/canvas/useCanvasRelationalTreeDraftState.test.tsx src/app/views/canvas/CanvasPendingSourceOutputs.test.tsx
    - pnpm --dir apps/web exec vitest run --config vitest.architecture.config.ts src/app/views/canvas/CanvasRelationalTreeWorkbench.architecture.test.ts src/app/views/canvas/canvasCompositionStyleOwnership.architecture.test.ts
---

# Pending Source Output And Shared Edit

[Issue #2937](https://github.com/dunay2/dvt/issues/2937) owns acceptance. Planning
DB design `GH-2937-SOURCE-OUTPUT-SELECTION-V11` and its
[preimplementation rationale](https://github.com/dunay2/dvt/issues/2937#issuecomment-6416688929)
own the admitted boundaries and test matrix. ADR-0061, ADR-0064, the existing
ConfigureCanvasDvtNode and RenderCanvasContextualGraphSurface rails, the Canvas
component/style contracts and workspace draft persistence govern implementation.

The user reproduced field removal on a detached pending Source. Its former
adapter invoked Model Input removal for a mapping that did not exist. The
correction records local root FieldIds on that occurrence in the existing
incomplete-authoring DTO. Creation and detached restoration resolve producer
publication defaults. Configured/retained ownership preserves consumed absence.
The physical Read, Input bindings, other occurrences and producer are unchanged.

Terminal initialization uses the canonical direct-origin query and root Output
command. Graph snapshot comparison, cancellation and current field eligibility
guard one atomic document/preference commit. Intermediate JOIN schemas and ON
predicates remain complete. Shared SET/aggregate partial intent rejects explicitly;
a complete default leaves an operation's authored Output unchanged. Calculation
definitions, including identity copies, retain their own authority. The configured
Source inspector follows its owning root even after terminal disconnect.

Canvas forms share the existing frame, literal Edit action, passive field rows,
inclusion control and semantic style tokens. Inspection shows included fields;
editing shows all admitted fields. The hide-excluded filter and pending Input
adapter are removed. Model transactions and existing atomic commands retain their
respective persistence ownership. No new CSS system or public rail is introduced.
Pending type labels resolve stable producer identities after supported producer
reordering and consumer reopen; saved Read ordinals do not index the current
catalogue. Existing tests enter the visible owning inspector's Edit mode and
retain their permission, transaction and semantic oracles.

An unconfigured terminal retains its preferences in the existing structural Save;
it has no executable Output to initialize. A configured terminal still waits for
canonical initialization. Rejected output ordering restores both canonical
document order and the corresponding local row presentation.

RED/GREEN evidence covers invalid/foreign/nested IDs, legacy payloads, publication
defaults, batched edits, duplicate instances, save/reopen, nested JOINs, shared
outputs, scalar definitions, cancellation, stale results, permission changes and
same-snapshot dependency recovery. The new native browser journey passes through
pending Edit, removal/recovery, duplicate isolation, protected draft-shaped
persistence/reopen and terminal JOIN selection with full physical Reads retained.

An earlier combined native run passed 10/11: the SVG edge helper sampled a stale
click point in the existing three-input empty-output case. This is recorded as a
test-targeting inference, not proof of a product regression. The helper queries an
actionable current path centre on Cypress retries and retains a real rightclick,
without forced actions, synthetic success or fixed sampled offsets. The first
full package run passed 2264 unit tests and exposed 14 presentation failures:
old Edit/hidden-inspector interactions and an incomplete-save gate regression.
Preserved rejection assertions additionally exposed optimistic ordering rollback.
These findings are corrected without weakening the assertions. Final exact-head
repository and browser acceptance is recorded in the issue after the required
gates run. Command lists identify evidence scope, not acceptance of unrun checks.

ARC evaluation of the committed slice returned ARC-2, evidence/risk required and
lint, test, schema-validate, contract-golden checks. No rollout or compatibility
artifact was required. No debt, stub, bypassed hook or relaxed rule was introduced.
