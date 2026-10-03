---
title: Transform LIVE preview provenance and explicit refresh
status: Draft
date: 2026-10-03
owners:
  - '@dvt/contracts'
  - dvt-api
  - web
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/canvas/TransformDataSample.v1.ts
  - apps/api/src/application/services/previewCanvasTransformRowsUseCase.ts
  - apps/api/src/application/services/dvtPostgresTransformProjection.ts
  - apps/web/src/app/views/canvas/useCanvasTransformDataSample.ts
  - apps/web/src/app/components/shell/OperationalDrawerLivePreviewFacts.tsx
evidence:
  tests:
    - packages/@dvt/contracts/test/canvas/TransformDataSample.v1.test.ts
    - apps/api/test/application/services/previewCanvasProducerRows.test.ts
    - apps/api/test/integration/sourceLivePreviewPostgres.proof.ts
    - apps/web/src/app/views/canvas/CanvasShell.modelDataRevision.test.tsx
    - apps/web/cypress/e2e/canvas/canvas-dvt-terminal-transform-preview-live.cy.ts
---

# Transform LIVE preview

## Governing boundary

[#3555](https://github.com/dunay2/dvt/issues/3555), the existing
`PreviewCanvasTransformRows` query authority under
[#3237](https://github.com/dunay2/dvt/issues/3237), ADR-0064, and
[data-access-modes](../contracts/data-access-modes.md) govern this slice.
Planning DB design `GH-3555-TRANSFORM-LIVE-PREVIEW` references the existing rail;
there is no parallel query or route. The governance inventory, command/query
rail governance, Fowler consultation, PR preflight and `.arc-policy.yaml`
remain applicable. The complete code diff evaluates as ARC-2, requiring this
evidence and an update to the existing data-mode risk.

## Implementation and compatibility

Transform responses require the same LIVE provenance contract as Source:
actual projected physical inputs, query time, limit and bounded-first-page
navigation. The projection, not the browser or the first graph edge, owns the
source list. Selecting a nested relation excludes unrelated downstream sources;
repeated logical occurrences of one physical source retain their semantics but
report one physical provenance entry. Mixed connections remain rejected.

The old Transform `sampledAt`-only response is rejected. Deploy API and Web
together; there is no compatibility parser, migration or versioned replacement.
The read-only PostgreSQL transaction, statement timeout, authorization, protected
revision check and bounded row count remain in place.

Main Canvas and compact operation previews render the shared LIVE facts view.
Refresh is explicit and retains keyboard focus while suppressing repeat activation.
Opening a tab or moving a card does not query. Graph query-input changes and
model removal invalidate old rows and late responses; stale callbacks cannot
query a withdrawn revision. Model sample lifecycle is separated from the node
composition hook and from presentation. Technical source/binding IDs remain in
collapsed details. Empty results retain typed headers and provenance.

## Verification and limits

Contract TDD first rejected provenance and accepted the obsolete shape; it then
passed all ten cases. Lifecycle tests first exposed missing Refresh and rows
surviving model removal, then passed after the admission/invalidation correction.
Focused API coverage checks actual selected-relation sources and physical-source
deduplication, alongside existing authorization and unsupported-profile negatives.

The real PostgreSQL proof reuses the terminal runner's disposable database lease.
Transform observes controlled source changes, bounded/truncated results, then an
empty result with columns and LIVE facts. Source and Transform provider proofs
both passed. Only UUID-namespaced proof tables were changed; no user tables or
application database schema were recreated.

The existing native terminal browser suite passed all fifteen scenarios, with
zero failures, pending or skipped tests. It checks Source and Transform refresh,
keyboard focus, no implicit tab query, compact operation facts, and protected
Transform HTTP provenance before the existing Preview/Run/Temporal/publication
flow. No new browser spec, CI job or database bootstrap was introduced.

Exact candidate SHAs and final lint, typecheck, package, pre-push and CI outcomes
are recorded on the governing issue and implementation PR. Intermediate failures
are not claimed as successful evidence. This does not complete parent issues
#3512/#3516, LOCAL acquisition/readiness, or stable/deep pagination. No rule was
relaxed, hook bypassed, production stub introduced, or Planning DB imported/rebuilt.
