---
title: Pending source identity and authoring responsibility boundaries
status: final
date: 2026-09-29
owners:
  - apps/web
  - packages/@dvt/contracts
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtRelationalAuthoringDraft.v1.ts
  - apps/web/src/app/views/canvas/relational-source-occurrence/pendingSourceOccurrence.ts
  - apps/web/src/app/views/canvas/canvasRelationalAuthoringDraft.ts
  - apps/web/src/app/views/canvas/canvasRelationalTreeApplyDraft.ts
  - apps/web/src/app/views/canvas/canvasRelationalTreeCatalogue.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasRelationalAuthoringDraft.test.ts src/app/views/canvas/canvasRelationalDraftApply.test.ts src/app/views/canvas/canvasSourceOccurrencePublication.test.ts src/app/views/canvas/relational-source-occurrence/occurrenceReopen.test.ts src/app/views/canvas/CanvasRelationalTreeWorkbench.reopen.test.tsx src/app/views/canvas/CanvasRelationalTreeWorkbench.operation-unary-drag.test.tsx src/app/views/canvas/CanvasRelationalTreeWorkbench.architecture.test.ts
    - pnpm --filter @dvt/web test:e2e:native --spec cypress/e2e/canvas/canvas-relational-workbench-chain-persistence.cy.ts
---

# Pending source identity and authoring responsibility boundaries

## Authority and cause

Issue [#3458](https://github.com/dunay2/dvt/issues/3458), ADR-0064 and the
[workspace draft contract](../contracts/planner/workspace-graph-draft-persistence-v1.md)
govern this slice. Existing ConfigureCanvasDvtNode, SaveWorkspaceGraphDraft and
ProjectCanvasRelationalTree rails are reused. Planning DB design authorities are
GH-3342-COMPOSABLE-RELATION-ANALYSIS-V4 and
GH-3342-SOURCE-OCCURRENCE-AUTHORING-V2; these design identities do not introduce
a new persistence version.

Pending sources previously stored only positional FieldIds and reconstructed a
Read from the current producer. Reordering fields could silently bind a saved ID
to a different column. The current authoring contract now stores the canonical
single Read, its sidecar and provenance. Restore validates the current producer
against that saved Read without changing its identities or emitting a save.

Physical source reorder is admitted only when names, types and source identity
match. Model producer reorder, alias changes and added fields are admitted by the
existing producer-input resolver; removal or type drift of referenced fields is
rejected. An incompatible pending source makes authoring explicitly unavailable.

## In-place cut and responsibility review

The existing v1 contract is corrected in place at the user's request: no v2 file,
parallel DTO, compatibility reader or migration. Old positional source payloads
are rejected; snapshots without pending sources retain their existing meaning.
No saved application data is rewritten. Rolling back requires keeping any newly
saved pending-source payloads with the matching reader; the previous positional
reader must not interpret them.

The React session no longer owns serialization, incomplete/cleared decisions or
canonical dirty comparison. The pure apply-draft module owns those decisions;
the existing command adapter only dispatches and handles the result. Its false
`use` prefix is removed because it is not a hook. Catalogue selection and
participation are projected independently of React. Pending source identity no
longer imports tree presentation; rendering moved to the existing authoring
projector. Moved bodies and old imports are removed, not retained as wrappers.

No new hooks, persistence authority, AST or domain DTO were added. The React
review retained derived state during render and existing lifecycle dependencies;
it introduced no new effects, component keys or remount paths.

## Validation

- Identity regression tests failed before the fix (four failures), then passed.
- Responsibility guards failed before extraction (including the existing hook
  size bound); the same bounds pass after extraction, without raising limits.
- Contracts: 68 files and 693 tests passed, including corrupt binary rejection
  without throwing and rejection of positional source snapshots.
- Affected Web tests: seven files and 38 tests passed. These include direct Apply
  preparation/dispatch, explicit clearing and output disconnection, catalogue
  participation versus selection, stable dependent expressions, source drift,
  reopen and unary-operation drag.
- Web lint and typecheck, contract build and typecheck passed.
- Browser checks: three passed, zero failed, pending or skipped in 26 seconds.
  They cover pending-source reorder/reopen, incompatible rename/reopen
  and the existing multi-source JOIN chain with explicit Preview. The transport
  is controlled; this is browser regression evidence, not a new live PostgreSQL
  vertical. Editing/reopening asserts no implicit data query or save.

ARC evaluates the contracts change as ARC-2: evidence and a risk update are
required. Final committed-tree pre-push and implementation validation results
are recorded on #3458 before integration. No new debt, stubs, disabled rules,
relaxed thresholds or bypassed hooks are part of this slice. Application tables
and the user's retained review environment are untouched.
