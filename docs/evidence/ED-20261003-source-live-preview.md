---
title: Source LIVE preview provenance and explicit refresh
status: Draft
date: 2026-10-03
owners:
  - '@dvt/contracts'
  - dvt-api
  - web
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/source-import/SourceDataSample.v1.ts
  - apps/api/src/application/services/previewWarehouseSourceObjectRowsUseCase.ts
  - apps/web/src/app/views/canvas/useCanvasNodeDataSample.ts
  - apps/web/src/app/components/shell/OperationalDrawerLivePreviewFacts.tsx
evidence:
  tests:
    - packages/@dvt/contracts/test/source-import/SourceDataSample.v1.test.ts
    - apps/api/test/integration/sourceLivePreviewPostgres.proof.ts
    - apps/web/src/app/views/canvas/CanvasShell.sourcePreview.test.tsx
    - apps/web/cypress/e2e/canvas/canvas-dvt-terminal-transform-preview-live.cy.ts
---

# Source LIVE preview

## Governing boundary

[#3553](https://github.com/dunay2/dvt/issues/3553), the existing
`PreviewWarehouseSourceObjectRows` rail under ADR-0058, and
[data-access-modes](../contracts/data-access-modes.md) govern this cut.
Planning DB design `GH-3553-SOURCE-LIVE-PREVIEW` references that rail; it creates
no second query authority. The governance inventory, command/query rail rule,
Fowler consultation, PR preflight and `.arc-policy.yaml` remain applicable.
The ARC evaluator classified the implementation as ARC-2, requiring evidence
and a risk update, not ARC-3 artifacts.

## Implementation and compatibility

The Source response requires shared LIVE provenance consistent with its single
authorized connection/object binding and limit. The provider probe supplies query
time after its read-only bounded transaction. Empty responses preserve these facts.
The old Source `sampledAt` shape is rejected: deploy API and Web together, with no
legacy parser or migration. Transform preview is unchanged.

The main Canvas Source drawer renders provider, UTC query time, limit and the
first-page/no-order guarantee. Refresh explicitly reads the current publication;
tab selection does not query. Publication changes, removal, rebinding and late
responses cannot restore withdrawn fields. Loading blocks another activation
without removing keyboard focus. Presentation neither authorizes queries nor
fabricates freshness. Nested operation preview retains its existing action.

The obsolete Web Run/Sink materialization-row query and its loading UI are removed.
Sink execution evidence is projected separately and retained; destination rows
are not treated as historical Run evidence. No retired API is restored.

## Verification and limits

The strict Source contract first failed without provenance, and the drawer tests
first failed without facts/actions. Focused contract, API and Web suites then
passed. The PostgreSQL proof uses the terminal runner's existing disposable lease:
real reads observe `before`, then `after` following a controlled provider change,
then an empty result with typed columns and provenance. It does not mutate user
tables or introduce another database bootstrap.

The twelve UI scenarios formerly in the standalone data-action spec register in
the existing terminal proof. Routing requires their real runtime, guards exclusive
registration and rejects reappearance of the retired spec. The real terminal flow
also reads and refreshes Source data through the protected HTTP boundary before
its existing Preview/Run/Temporal/publication assertions.

Browser verification exposed an old fixture leaving a pending JOIN before
navigation; the fixture now cancels through the real UI. It also exposed focus
loss when Refresh was natively disabled; the view now uses an accessible disabled
state and suppresses repeat activation without blurring. Failed attempts are not
counted as successful evidence. The issue and implementation PR record exact
candidate SHAs, final native browser results, package lint/types, pre-push and CI
results. A diagnostic Docker run passed the real terminal flows but failed mocked
setup; it is not evidence of a successful full suite.

This cut does not complete #3512/#3516, LOCAL acquisition/readiness, multi-input
Transform provenance or stable/deep pagination. No rule was relaxed, hook bypassed,
production stub introduced, or Planning DB imported/rebuilt.
