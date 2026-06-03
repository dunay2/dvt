---
title: Canvas Fowler canon plan 2026-05-23
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-05-23
planning_type: mandatory
---

# Canvas Fowler Canon Plan 2026-05-23

## Owned Concern

This plan canonizes the Canvas workbench Fowler remediation proposal into
executable frontend governance. It preserves the existing Canvas workbench
rails, turns the proposal into explicit Planning DB ownership, and prevents
Fowler review prose from becoming a hidden backlog.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/frontend-fowler-implementation-pattern.md`
- `docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md`
- `docs/architecture/components/web/graph/canvas-workbench-tabs-component.md`
- `docs/architecture/components/web/graph/canvas-layout-persistence-component.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-fowler-remediation-plan-20260504.md`
- `docs/planning/reviews/review-status-board.md`

## Fowler Analysis

### Improved Patterns

- Canvas workbench tabs already use a separated presentation model rather than
  treating shell navigation as the owner of route-local workbench views.
- Canvas layout behavior is documented as route-local projection state, not as
  protected graph draft authority.
- The command/query catalog already names the visual-posture proof rail so
  Cypress assertions do not define product semantics ad hoc.

### Antipatterns

- Orphan proposal backlog: the 2026-05-04 mandatory plan had implementation
  evidence but did not itself become a Planning DB-owned closure task.
- Review-as-queue drift: older Canvas Fowler reviews can look actionable even
  after their findings were absorbed into TF-E2, TF-E2-L, TF-E2-POL, F-15, and
  the workbench tab/layout component guides.
- Duplicate rail naming: without a canon component, the remediation proposal,
  command/query catalog, tab guide, layout guide, and Cypress proof can repeat
  the same intent under different names.
- Acceptance ambiguity: browser proof, semantic architecture proof, and
  documentation proof need one closure surface that says which scenarios are
  already owned and which become future Planning DB tasks.

### Grouping Opportunities

- Group Canvas Fowler proposal disposition under one Canvas Fowler canon
  component.
- Keep runtime behavior ownership in existing components:
  `CanvasWorkbenchTabs`, `CanvasLayoutPersistence`,
  `CanvasWorkbenchCommandQueryCatalog`, `CanvasRuntimePolicy`, and
  `CanvasGraphStrategy`.
- Keep future UI delivery work in Planning DB tasks instead of extending this
  canon document into an execution queue.

### Lessons For Future Work

- A mandatory proposal is not closed until it has task ownership, component
  ownership, user stories, semantic fitness proof, and generated docs alignment.
- Mature workbench systems separate global shell navigation from local
  workbench tabs; Canvas must keep that distinction visible in docs and tests.
- Browser visual proof is a query read model, not a source of product truth.

## Review Disposition Matrix

| Input                                                                                      | Disposition                                                                     | Owner                              |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------- |
| `canvas-workbench-fowler-remediation-plan-20260504.md`                                     | canonized by this plan and task `F-MAND-CANVAS-FOWLER`                          | Canvas Fowler canon component      |
| `20260421 Canvas route composition Fowler review`                                          | reference; route-composition findings remain under TF-E2-I/J and component docs | Canvas route composition component |
| `20260421 Canvas handler seams Fowler review`                                              | reference; handler-contract findings remain under TF-E2-B/C/D                   | Canvas handler contracts component |
| `20260422 Canvas component governance follow-up review`                                    | reference; local guide and semantic-fitness expectation retained                | Canvas component guide family      |
| `20260425 Canvas graph strategy Fowler hard QA review`                                     | accepted; closed by TF-E2-L                                                     | Canvas graph strategy owner        |
| `20260426 Canvas runtime policy architecture review`                                       | accepted; closed by TF-E2-POL                                                   | Canvas runtime policy owner        |
| `buzon/20260504-codex-fowler-canvas-workbench-tabs-and-layout-analysis-and-remediation.md` | accepted analysis; superseded for execution routing by this canon component     | Canvas Fowler canon component      |

No Canvas Fowler remediation proposal remains an orphan execution queue after
this plan.

## Command And Query Rails

- `RecordCanvasFowlerCanon`: command owned by the Canvas Fowler canon aggregate.
  It records whether a Canvas Fowler proposal or review is closed, reference,
  accepted, superseded, or promoted to a Planning DB task.
- `ClassifyCanvasFowlerDisposition`: query owned by the Canvas Fowler
  disposition read model. It returns the canonical owner, component guide, and
  proof expectation for a Canvas Fowler input.
- `VerifyCanvasWorkbenchVisualPosture`: test-only query owned by the Canvas
  workbench visual-posture read model. It remains the browser proof rail for
  tab placement, readability, and route locality.

## TDD Plan

1. Red: add `canvas-fowler-canon.test.mjs` before this plan and component docs
   exist; verify it fails on missing canonical surfaces.
2. Green: add this plan, the Canvas Fowler canon component guide, user stories,
   review-board disposition, graph index links, command/query catalog entries,
   and buzon analysis.
3. Refactor: keep this slice governance-only. Runtime web changes belong to
   follow-up Planning DB tasks if a concrete UI behavior remains unimplemented.

## ADR Decision

No new ADR is required. Existing command/query rail governance and Fowler
opportunity planning governance already require the ownership, rail, and
semantic-fitness posture used here.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: F-MAND-CANVAS-FOWLER
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/canvas-fowler-canon-plan-20260523.md
componentGuides:
  - docs/architecture/components/web/graph/canvas-fowler-canon-component.md
userStories:
  - docs/architecture/components/web/graph/canvas-fowler-canon-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-fowler-remediation-plan-20260504.md
allowedImplementationSurfaces:
  - buzon/20260523-codex-fowler-canvas-workbench-canon.md
  - docs/.manifest.json
  - docs/architecture/components/web/graph/canvas-fowler-canon-component.md
  - docs/architecture/components/web/graph/canvas-fowler-canon-user-stories.md
  - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
  - docs/architecture/components/web/graph/index.md
  - docs/architecture/index.md
  - docs/planning/proposals/index.md
  - docs/planning/proposals/mandatory/frontend-and-ux/canvas-fowler-canon-plan-20260523.md
  - docs/planning/proposals/portfolio-map-20260403.md
  - docs/planning/reviews/review-status-board.md
  - docs/planning/state/agent-lane-e.md
  - docs/planning/state/execution-workboard.md
  - docs/planning/state/open-task-route.md
  - docs/planning/status/**
  - tools/ci/canvas-fowler-canon.test.mjs
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
commandQueryRails:
  - name: RecordCanvasFowlerCanon
    type: command
    dddOwner: Canvas Fowler canon aggregate
  - name: ClassifyCanvasFowlerDisposition
    type: query
    dddOwner: Canvas Fowler disposition read model
  - name: VerifyCanvasWorkbenchVisualPosture
    type: query
    dddOwner: Canvas workbench visual-posture read model
domainObjects:
  - name: CanvasFowlerCanon
    type: planning aggregate
    owner: Frontend / Architecture
  - name: CanvasFowlerDisposition
    type: read model
    owner: Frontend / Architecture
fowlerSignals:
  - Orphan proposal backlog
  - Review-as-queue drift
  - Duplicate rail naming
  - Acceptance ambiguity
architectureGuards:
  - node --test tools/ci/canvas-fowler-canon.test.mjs
cypressFlows:
  - N/A - canonization only; visual proof remains under VerifyCanvasWorkbenchVisualPosture
completionGate:
  - node --test tools/ci/canvas-fowler-canon.test.mjs
  - pnpm test:ci-tools
  - pnpm docs:sync
  - pnpm docs:status:generate
  - node scripts/check-feature-mechanization.cjs --feature F-MAND-CANVAS-FOWLER
  - node scripts/check-feature-mechanization.cjs --implementation --feature F-MAND-CANVAS-FOWLER
  - pnpm lint:md:changed
  - pnpm verify:prepush
redGreenCycles:
  - id: canvas-fowler-canon-disposition
    redTest: node --test tools/ci/canvas-fowler-canon.test.mjs
    expectedFailure: Canvas Fowler canon plan, component guide, user stories, and buzon analysis do not exist.
    patchSurfaces:
      - tools/ci/canvas-fowler-canon.test.mjs
      - docs/planning/proposals/mandatory/frontend-and-ux/canvas-fowler-canon-plan-20260523.md
      - docs/architecture/components/web/graph/canvas-fowler-canon-component.md
      - docs/architecture/components/web/graph/canvas-fowler-canon-user-stories.md
      - docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md
      - docs/architecture/components/web/graph/index.md
      - docs/planning/reviews/review-status-board.md
      - buzon/20260523-codex-fowler-canvas-workbench-canon.md
    greenTest: node --test tools/ci/canvas-fowler-canon.test.mjs
symbols:
  - name: requiredFiles
    path: tools/ci/canvas-fowler-canon.test.mjs
    dddOwner: Canvas Fowler canon semantic guard
    cqRails:
      - ClassifyCanvasFowlerDisposition
    fowlerSignals:
      - Required artifact set
    architectureGuard: node --test tools/ci/canvas-fowler-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - canonization only
  - name: readRepoFile
    path: tools/ci/canvas-fowler-canon.test.mjs
    dddOwner: Canvas Fowler canon semantic guard
    cqRails:
      - ClassifyCanvasFowlerDisposition
    fowlerSignals:
      - Semantic drift guard
    architectureGuard: node --test tools/ci/canvas-fowler-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - canonization only
  - name: assertContains
    path: tools/ci/canvas-fowler-canon.test.mjs
    dddOwner: Canvas Fowler canon semantic guard
    cqRails:
      - ClassifyCanvasFowlerDisposition
    fowlerSignals:
      - Documentation drift guard
    architectureGuard: node --test tools/ci/canvas-fowler-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - canonization only
  - name: escapeRegExp
    path: tools/ci/canvas-fowler-canon.test.mjs
    dddOwner: Canvas Fowler canon semantic guard
    cqRails:
      - ClassifyCanvasFowlerDisposition
    fowlerSignals:
      - Test determinism
    architectureGuard: node --test tools/ci/canvas-fowler-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - canonization only
```
