---
title: DVT Workbench UX Canon Plan 2026-05-24
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-05-24
planning_type: mandatory
---

# DVT Workbench UX Canon Plan 2026-05-24

## Owned Concern

This plan canonizes the DVT workbench UX specification draft into governed
frontend delivery work. It keeps the draft as design input, affirms the active
workbench contract, and prevents a second UX backlog from competing with F-15,
F-24, F-25, F-28, and route-level component guides.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/ux-implementation-guide.md`
- `docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md`
- `docs/architecture/components/web/route-workbench-frame-component.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-specification-v0-4-20260505-draft.md`

## Fowler Analysis

### Improved Patterns

- F-15 established the route workbench frame and semantic shell slots instead
  of letting every route invent its own layout grammar.
- F-24 moved visual convergence into token-governed route surfaces, reducing
  one-off visual hardcodes.
- F-25 made plugin UX contributions extend governed docks instead of deforming
  shell chrome.
- F-28 and Canvas follow-up work moved save/export and Canvas chrome decisions
  into narrower execution plans instead of treating the UX draft as a monolith.

### Antipatterns

- Draft-as-backlog: the v0.4 UX draft contains many good decisions, but leaving
  it active as a draft makes it look like a second execution queue.
- Big-design coupling: top menus, command palette, context labels, Canvas
  affordances, export, runtime chrome, and route strips are different concerns
  and should not ship as one indivisible UX task.
- Label drift: draft labels such as `SQL` are product-facing terms and must be
  resolved through active route/tab read models, not copied into route IDs.
- Shell authority creep: global shell menus must not become graph editing
  panels or provider execution authorities.

### Grouping Opportunities

- Keep the active cross-route contract in
  `workbench-ui-contract-and-component-inventory.md`.
- Keep Canvas-specific tab and view-strip behavior under the Canvas graph
  component family.
- Keep shell context identity under the app-shell component family.
- Promote future command palette, menu, or route-toolbar implementation into
  Planning DB tasks when behavior changes are ready.

### Lessons For Future Work

- Mature workbench products split global command discovery from route-local
  projections. DVT should keep that split visible in every route guide.
- A UX specification can guide direction, but accepted behavior belongs in
  component guides, route contracts, and task-owned plans.
- Semantic architecture tests should verify ownership and disposition, not just
  whether a markdown link exists.

## Mature-System Comparison

Mature systems such as VS Code, GitHub, and NiFi separate shell grammar,
context, commands, and domain surfaces. DVT follows that pattern when:

- the top shell owns command discovery and context visibility;
- route workbenches own projections, panels, and route-specific commands;
- Canvas uses graph primitives without turning the app into a generic IDE;
- execution intent goes through planner and engine boundaries rather than UI
  shortcuts.

## Accepted Scope

Accepted now:

- the v0.4 draft is retained as historical design input;
- `workbench-ui-contract-and-component-inventory.md` remains the active
  cross-route component contract;
- `ux-implementation-guide.md` remains the implementation direction guide;
- future executable UX changes must name their command/query rail and Planning
  DB task before code changes.

Not accepted as direct implementation from this canon task:

- adding a full command palette;
- changing route IDs to draft labels;
- moving Canvas commands into the global shell;
- adding manual save semantics;
- introducing a permanent Canvas left navigation rail.

## Command And Query Rails

- `RecordWorkbenchUxCanon`: command owned by the Workbench UX canon aggregate.
  It records the draft disposition and active contract owner.
- `ClassifyWorkbenchUxDisposition`: query owned by the Workbench UX disposition
  read model. It returns whether a UX input is active contract, historical
  input, superseded, or future task material.
- `ValidateWorkbenchShellContract`: test-only query owned by the workbench shell
  contract read model. It proves that shell, route, and Canvas ownership stay
  semantically separated.

## TDD Plan

1. Red: add `workbench-ux-canon.test.mjs` and observe failure on missing plan,
   component guide, user stories, buzon analysis, and draft disposition.
2. Green: add this plan, local component guide, user stories, buzon analysis,
   portfolio link, web index link, and draft frontmatter disposition.
3. Refactor: keep runtime UI changes out of this canon task. Promote behavior
   changes to Planning DB tasks with their own rails.

## ADR Decision

No new ADR is required. Existing command/query rail governance and Fowler
opportunity planning governance already require the disposition, rail, and
semantic-fitness posture used here.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: F-MAND-WORKBENCH-UX
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-canon-plan-20260524.md
componentGuides:
  - docs/architecture/components/web/workbench-ux-canon-component.md
userStories:
  - docs/architecture/components/web/workbench-ux-canon-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/ux-implementation-guide.md
  - docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md
allowedImplementationSurfaces:
  - buzon/20260524-codex-fowler-workbench-ux-canon.md
  - docs/.manifest.json
  - docs/architecture/components/web/index.md
  - docs/architecture/components/web/workbench-ux-canon-component.md
  - docs/architecture/components/web/workbench-ux-canon-user-stories.md
  - docs/architecture/index.md
  - docs/planning/reviews/architecture-and-governance/20260527-frontend-ux-maturity-audit-review.md
  - docs/planning/proposals/index.md
  - docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-canon-plan-20260524.md
  - docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-specification-v0-4-20260505-draft.md
  - docs/planning/proposals/portfolio-map-20260403.md
  - docs/planning/state/agent-lane-e.md
  - docs/planning/state/execution-workboard.md
  - docs/planning/state/open-task-route.md
  - docs/planning/status/**
  - tools/ci/workbench-ux-canon.test.mjs
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
commandQueryRails:
  - name: RecordWorkbenchUxCanon
    type: command
    dddOwner: Workbench UX canon aggregate
  - name: ClassifyWorkbenchUxDisposition
    type: query
    dddOwner: Workbench UX disposition read model
  - name: ValidateWorkbenchShellContract
    type: query
    dddOwner: Workbench shell contract read model
domainObjects:
  - name: WorkbenchUxCanon
    type: planning aggregate
    owner: Frontend / Architecture
  - name: WorkbenchUxDisposition
    type: read model
    owner: Frontend / Architecture
fowlerSignals:
  - Draft-as-backlog
  - Big-design coupling
  - Label drift
  - Shell authority creep
architectureGuards:
  - node --test tools/ci/workbench-ux-canon.test.mjs
cypressFlows:
  - N/A - canonization only; runtime UX changes require separate Planning DB tasks.
completionGate:
  - node --test tools/ci/workbench-ux-canon.test.mjs
  - pnpm test:ci-tools
  - pnpm docs:sync
  - pnpm docs:status:generate
  - node scripts/check-feature-mechanization.cjs --feature F-MAND-WORKBENCH-UX
  - node scripts/check-feature-mechanization.cjs --implementation --feature F-MAND-WORKBENCH-UX
  - pnpm lint:md:changed
  - pnpm verify:prepush
redGreenCycles:
  - id: workbench-ux-canon-disposition
    redTest: node --test tools/ci/workbench-ux-canon.test.mjs
    expectedFailure: Workbench UX canon plan and component surfaces do not exist.
    patchSurfaces:
      - tools/ci/workbench-ux-canon.test.mjs
      - docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-canon-plan-20260524.md
      - docs/architecture/components/web/workbench-ux-canon-component.md
      - docs/architecture/components/web/workbench-ux-canon-user-stories.md
      - docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-specification-v0-4-20260505-draft.md
      - docs/architecture/components/web/index.md
      - docs/planning/proposals/portfolio-map-20260403.md
      - buzon/20260524-codex-fowler-workbench-ux-canon.md
    greenTest: node --test tools/ci/workbench-ux-canon.test.mjs
symbols:
  - name: requiredFiles
    path: tools/ci/workbench-ux-canon.test.mjs
    dddOwner: Workbench UX canon semantic guard
    cqRails:
      - ClassifyWorkbenchUxDisposition
    fowlerSignals:
      - Required artifact set
    architectureGuard: node --test tools/ci/workbench-ux-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - canonization only
  - name: readRepoFile
    path: tools/ci/workbench-ux-canon.test.mjs
    dddOwner: Workbench UX canon semantic guard
    cqRails:
      - ClassifyWorkbenchUxDisposition
    fowlerSignals:
      - Required artifact set
    architectureGuard: node --test tools/ci/workbench-ux-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - canonization only
  - name: assertContains
    path: tools/ci/workbench-ux-canon.test.mjs
    dddOwner: Workbench UX canon semantic guard
    cqRails:
      - ClassifyWorkbenchUxDisposition
    fowlerSignals:
      - Required artifact set
    architectureGuard: node --test tools/ci/workbench-ux-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - canonization only
  - name: escapeRegExp
    path: tools/ci/workbench-ux-canon.test.mjs
    dddOwner: Workbench UX canon semantic guard
    cqRails:
      - ClassifyWorkbenchUxDisposition
    fowlerSignals:
      - Required artifact set
    architectureGuard: node --test tools/ci/workbench-ux-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - canonization only
```
