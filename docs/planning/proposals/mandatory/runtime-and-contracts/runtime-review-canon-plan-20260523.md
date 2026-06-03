---
title: Runtime review canon plan 2026-05-23
status: Active
owner: Architecture / API / Runtime
last_reviewed: 2026-05-23
planning_type: mandatory
---

# Runtime Review Canon Plan 2026-05-23

## Owned Concern

This plan canonizes the active execution-runtime and API integration review
inputs into governed runtime follow-up work. It closes review-board drift by
making Planning DB, protected runtime rails, and closeouts the only execution
surfaces.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/planning/reviews/review-status-board.md`
- `docs/planning/domains/execution-runtime.md`
- `docs/architecture/components/api/protected-runtime-command-query-rail-design.md`
- `docs/planning/closeouts/20260505-ar-c10-protected-runtime-rail-closure-closeout.md`

## Fowler Analysis

### Improved Patterns

- Protected runtime route work already moved toward Published Language and
  Single Source of Truth through `PROTECTED_RUNTIME_COMMAND_QUERY_RAILS`.
- AR-C10 created an executable architecture guard instead of relying on a
  hand-maintained route matrix.
- TF-C2-B and runtime read-surface reviews now carry explicit task and closeout
  evidence instead of free-floating critique.

### Antipatterns

- Review-board backlog: reviews marked as open or current can look like work
  queues even when Planning DB is the operational source.
- Parallel semantics: API integration reviews can name gaps in a way that
  bypasses protected runtime command/query rails.
- Documentation drift: runtime domain navigation can omit the canonical
  disposition layer even after route rails are closed.
- Semantic diffusion: "reference" and "review" status can hide whether a
  finding is closed, future work, or merely rationale.

### Grouping Opportunities

- Group protected runtime rail closure, runtime read-surface evidence, and
  API integration review disposition under one runtime review canon component.
- Keep route-level behavior in API component guides and use review docs only as
  rationale.
- Keep future runtime/API work as Planning DB tasks with explicit
  command/query ownership.

### Lessons For Future Work

- A review is not an owner; every actionable item needs a rail and a task.
- A mature system keeps route behavior, component contract, and review intake
  separate but traceable.
- Architecture tests should validate semantic disposition and ownership, not
  only thin barrels or import direction.

## Review Disposition Matrix

| Review input                                                   | Disposition                                                                   | Owner                           |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------- |
| `20260321 Planner-backed StartRun QA review`                   | Reference rationale absorbed by planner ingress and start-run rail work       | Protected runtime rail catalog  |
| `20260326 RunMaintenanceService SRP review`                    | Reference rationale for runtime decomposition                                 | Execution runtime domain        |
| `20260326 S03 hard QA review`                                  | Superseded as active critique by AR-C10, TF-C2, and RC closeouts              | Runtime review canon            |
| `20260410 Runtime and shared-kernel risk triage review`        | Reference intake with linked tasks, not direct queue                          | Lane C/A/D Planning DB tasks    |
| `20260410 Contract pack and read boundary reset Fowler review` | Future/active work remains under AR-A12 task family                           | Lane A task family              |
| `20260409 TF-C2-B runtime read-surface hard QA review`         | Done and evidence-backed                                                      | TF-C2-B closeout                |
| `20260510 Web API integration gap review`                      | Runtime side must route through protected runtime rails before implementation | API/runtime command-query rails |

No runtime review remains an orphan execution queue after this plan. Any new
runtime/API finding must be classified by `ClassifyRuntimeReviewDisposition`
and either attached to an existing closeout or promoted into Planning DB before
implementation.

## Command And Query Rails

- `RecordRuntimeReviewCanon`: command owned by the runtime review canon
  aggregate. It records the canonical disposition and the task or closeout that
  owns the finding.
- `ClassifyRuntimeReviewDisposition`: query owned by the runtime review
  disposition read model. It returns `closed`, `reference`, `future-task`, or
  `superseded`.

## TDD Plan

1. Red: add `runtime-review-canon.test.mjs` before docs exist and verify it
   fails on the missing canon plan/component.
2. Green: add the component guide, user stories, review-board disposition,
   execution-runtime domain pointer, and buzón analysis.
3. Refactor: keep the slice docs-only so no ARC runtime package evidence is
   required.

## ADR Decision

No new ADR is required. This slice applies existing ADR and governance rules:
Planning DB is the operational source, command/query rails own behavior, and
reviews are rationale/evidence.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: C-REV-RUNTIME-CANON
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/runtime-review-canon-plan-20260523.md
componentGuides:
  - docs/architecture/components/api/runtime-review-canon-component.md
userStories:
  - docs/architecture/components/api/runtime-review-canon-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/state/planning-control-tower.md
  - docs/planning/reviews/review-status-board.md
  - docs/planning/domains/execution-runtime.md
allowedImplementationSurfaces:
  - buzon/20260523-codex-fowler-runtime-review-canon.md
  - docs/.manifest.json
  - docs/architecture/components/api/index.md
  - docs/architecture/components/api/runtime-review-canon-component.md
  - docs/architecture/components/api/runtime-review-canon-user-stories.md
  - docs/architecture/index.md
  - docs/planning/domains/execution-runtime.md
  - docs/planning/proposals/index.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/runtime-review-canon-plan-20260523.md
  - docs/planning/proposals/portfolio-map-20260403.md
  - docs/planning/reviews/review-status-board.md
  - docs/planning/state/agent-lane-c.md
  - docs/planning/state/execution-workboard.md
  - docs/planning/state/open-task-route.md
  - docs/planning/status/**
  - tools/ci/runtime-review-canon.test.mjs
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
commandQueryRails:
  - name: RecordRuntimeReviewCanon
    type: command
    dddOwner: Runtime review canon aggregate
  - name: ClassifyRuntimeReviewDisposition
    type: query
    dddOwner: Runtime review disposition read model
domainObjects:
  - name: RuntimeReviewCanon
    type: planning aggregate
    owner: Architecture / API / Runtime
  - name: RuntimeReviewDisposition
    type: read model
    owner: Architecture / API / Runtime
  - name: ProtectedRuntimeRailCatalog
    type: published language
    owner: Architecture / API / Runtime
fowlerSignals:
  - Review-board backlog
  - Parallel semantics
  - Documentation drift
  - Semantic diffusion
architectureGuards:
  - node --test tools/ci/runtime-review-canon.test.mjs
cypressFlows:
  - N/A - runtime review canonization is a docs and planning semantics guard.
completionGate:
  - node --test tools/ci/runtime-review-canon.test.mjs
  - pnpm test:ci-tools
  - pnpm docs:sync
  - pnpm docs:status:generate
  - node scripts/check-feature-mechanization.cjs --feature C-REV-RUNTIME-CANON
  - node scripts/check-feature-mechanization.cjs --implementation --feature C-REV-RUNTIME-CANON
  - pnpm lint:md:changed
  - pnpm verify:prepush
redGreenCycles:
  - id: runtime-review-canon-disposition
    redTest: node --test tools/ci/runtime-review-canon.test.mjs
    expectedFailure: Runtime review canon plan, component guide, user stories, and buzón analysis do not exist.
    patchSurfaces:
      - tools/ci/runtime-review-canon.test.mjs
      - docs/planning/proposals/mandatory/runtime-and-contracts/runtime-review-canon-plan-20260523.md
      - docs/architecture/components/api/runtime-review-canon-component.md
      - docs/architecture/components/api/runtime-review-canon-user-stories.md
      - docs/planning/reviews/review-status-board.md
      - docs/planning/domains/execution-runtime.md
      - buzon/20260523-codex-fowler-runtime-review-canon.md
    greenTest: node --test tools/ci/runtime-review-canon.test.mjs
symbols:
  - name: requiredFiles
    path: tools/ci/runtime-review-canon.test.mjs
    dddOwner: Runtime review canon semantic guard
    cqRails:
      - ClassifyRuntimeReviewDisposition
    fowlerSignals:
      - Required artifact set
    architectureGuard: node --test tools/ci/runtime-review-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs and planning semantic guard only
  - name: readRepoFile
    path: tools/ci/runtime-review-canon.test.mjs
    dddOwner: Runtime review canon semantic guard
    cqRails:
      - ClassifyRuntimeReviewDisposition
    fowlerSignals:
      - Semantic drift guard
    architectureGuard: node --test tools/ci/runtime-review-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs and planning semantic guard only
  - name: assertContains
    path: tools/ci/runtime-review-canon.test.mjs
    dddOwner: Runtime review canon semantic guard
    cqRails:
      - ClassifyRuntimeReviewDisposition
    fowlerSignals:
      - Documentation drift guard
    architectureGuard: node --test tools/ci/runtime-review-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs and planning semantic guard only
  - name: escapeRegExp
    path: tools/ci/runtime-review-canon.test.mjs
    dddOwner: Runtime review canon semantic guard
    cqRails:
      - ClassifyRuntimeReviewDisposition
    fowlerSignals:
      - Test determinism
    architectureGuard: node --test tools/ci/runtime-review-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs and planning semantic guard only
```
