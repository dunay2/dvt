---
title: Planning Review Canon Plan
status: Active
owner: Product / Architecture / Docs
last_reviewed: 2026-05-24
planning_type: proposal
---

# Planning Review Canon Plan

## Owned Concern

`GD-REV-PLANNING-CANON` owns canonization of the planning review board,
review-naming policy, and sprint-board intake rules into a DB-first follow-up
model. The concern is to prevent review and sprint files from becoming a
second execution queue.

## Fowler Analysis

<!-- markdownlint-disable MD060 -->

| Scenario                                        | Opportunity                          | Fowler pattern                            | DDD owner                        | Command/query rail                        | Implementation surfaces                     | Architecture test                         | Out of scope              |
| ----------------------------------------------- | ------------------------------------ | ----------------------------------------- | -------------------------------- | ----------------------------------------- | ------------------------------------------- | ----------------------------------------- | ------------------------- |
| Classify review findings by execution intent    | Review text carries hidden backlog   | Replace Type Code with Published Language | Planning review intake catalog   | `ClassifyPlanningReviewIntake`            | Review board, naming policy, sprint board   | `tools/ci/planning-review-canon.test.mjs` | Moving review files       |
| Record executable follow-up through Planning DB | Sprint boards become parallel queues | Repository plus Unit of Work              | Planning review follow-up ledger | `RecordPlanningReviewFollowUp`            | Plan, component guide, Planning DB task row | `tools/ci/planning-review-canon.test.mjs` | Creating product features |
| Validate board-to-task traceability             | Naming/index drift hides active work | Semantic fitness function                 | Planning board traceability      | `ValidatePlanningReviewBoardTraceability` | Semantic test, stories, mailbox analysis    | `tools/ci/planning-review-canon.test.mjs` | Full planning UI          |

<!-- markdownlint-enable MD060 -->

## Mature-System Comparison

Mature planning systems distinguish intake boards from execution queues. Review
boards classify context and rationale; the task registry owns lifecycle,
claiming, progress, dependencies, and evidence. Sprint boards may group review
work, but they do not own status truth.

The local implementation keeps that separation:

- `review-status-board.md` is the canonical review navigation and intake map.
- `review-naming-policy.md` owns filename and placement semantics.
- `reviews/sprints/index.md` owns board-file rules for review intake grouping.
- Planning DB is the write surface for claims, status, progress, dependencies,
  evidence, task creation, and closeout.

## Drift And Repetition Fixed

Planning review documents, sprint grouping notes, mailbox analysis, component
guidance, and semantic tests now use one published language: review boards are
intake, Planning DB tasks are executable work, and generated planning views are
read models rather than write surfaces.

## Disposition

`GD-REV-PLANNING-CANON` closes the governance gap where active review index and
sprint board documents could imply executable work without a Planning DB task.

Current disposition:

- review index semantics: closed by this plan and component guide;
- sprint board execution semantics: closed by this plan and sprint-board note;
- review filename semantics: retained by `review-naming-policy.md`;
- executable follow-up semantics: owned by Planning DB commands;
- product work selection: read from `pnpm planning:db:query open` and
  `pnpm planning:db:query next`.

## Applied Patterns

- **Intake Catalog:** review boards classify rationale and source documents.
- [Task: GOV-PROP-DISP-1] **DB-First Unit of Work:** task lifecycle state lives in Planning DB.
- [Task: GOV-PROP-DISP-1] **Published Language:** review, board, task, risk, evidence, and closeout
  remain distinct terms.
- **Semantic Fitness Function:** the CI guard checks review intake ownership,
  not only generated index shape.

## User Stories

1. As a review steward, I want to promote a finding to Planning DB before it is
   called executable work so that follow-up ownership is explicit.
2. As a sprint operator, I want board files to group review needs without
   becoming a parallel backlog so that sprint status and task status do not
   diverge.
3. As a reviewer, I want naming and linkage drift called out so that a renamed
   or moved review cannot become invisible.
4. As an agent, I want review/sprint continuation to route through DB state so
   that I can select the next task after context compaction.

## Decision

Keep review and sprint documents as intake and grouping surfaces. Planning DB
is the write surface for executable work. New review findings that require
execution must either update an existing Planning DB task or create a new task
through `pnpm planning:db:operate`.

No ADR is required because this slice changes documentation governance and
semantic validation only.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: GD-REV-PLANNING-CANON
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/planning-review-canon-plan-20260524.md
componentGuides:
  - docs/architecture/components/ci-governance/planning-review-canon-component.md
userStories:
  - docs/architecture/components/ci-governance/planning-review-canon-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/state/planning-control-tower.md
  - docs/planning/reviews/review-status-board.md
  - docs/planning/reviews/review-naming-policy.md
  - docs/planning/reviews/sprints/index.md
allowedImplementationSurfaces:
  - buzon/20260524-codex-fowler-planning-review-canon.md
  - docs/.manifest.json
  - docs/architecture/components/ci-governance/index.md
  - docs/architecture/components/ci-governance/planning-review-canon-component.md
  - docs/architecture/components/ci-governance/planning-review-canon-user-stories.md
  - docs/planning/proposals/mandatory/governance-and-docs/planning-review-canon-plan-20260524.md
  - docs/planning/proposals/portfolio-map-20260403.md
  - docs/planning/reviews/architecture-and-governance/20260525-buzon-fowler-canonization-inventory.md
  - docs/planning/reviews/architecture-and-governance/20260525-backlog-intake-reconciliation-review.md
  - docs/planning/reviews/architecture-and-governance/20260525-architecture-buzon-fowler-canonization-review.md
  - docs/planning/reviews/architecture-and-governance/20260525-frontend-buzon-fowler-canonization-review.md
  - docs/planning/reviews/review-status-board.md
  - docs/planning/reviews/sprints/index.md
  - tools/ci/planning-review-canon.test.mjs
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
commandQueryRails:
  - name: ClassifyPlanningReviewIntake
    type: query
    dddOwner: Planning review intake catalog
  - name: RecordPlanningReviewFollowUp
    type: command
    dddOwner: Planning review follow-up ledger
  - name: ValidatePlanningReviewBoardTraceability
    type: query
    dddOwner: Planning board traceability
domainObjects:
  - name: PlanningReviewIntake
    type: value object
    owner: Product / Architecture / Docs
  - name: PlanningReviewFollowUp
    type: ledger entry
    owner: Product / Architecture / Docs
  - name: PlanningReviewBoardTraceability
    type: policy
    owner: Product / Architecture / Docs
fowlerSignals:
  - Review text carries hidden backlog
  - Sprint boards become parallel queues
  - Naming and index drift hide active work
architectureGuards:
  - node --test tools/ci/planning-review-canon.test.mjs
cypressFlows:
  - N/A - planning governance semantic guard only
completionGate:
  - node --test tools/ci/planning-review-canon.test.mjs
  - node scripts/check-feature-mechanization.cjs --feature GD-REV-PLANNING-CANON
  - node scripts/check-feature-mechanization.cjs --implementation --feature GD-REV-PLANNING-CANON
  - pnpm docs:sync
  - pnpm docs:status:generate
  - pnpm docs:workboard:generate
  - pnpm lint:md:changed
  - pnpm test:ci-tools
  - pnpm verify:prepush
redGreenCycles:
  - id: planning-review-canon-db-first-intake
    redTest: node --test tools/ci/planning-review-canon.test.mjs
    expectedFailure: Planning review canon plan, component guide, stories, and buzon analysis do not exist.
    patchSurfaces:
      - tools/ci/planning-review-canon.test.mjs
      - docs/planning/proposals/mandatory/governance-and-docs/planning-review-canon-plan-20260524.md
      - docs/planning/reviews/review-status-board.md
      - docs/planning/reviews/sprints/index.md
      - docs/architecture/components/ci-governance/planning-review-canon-component.md
      - docs/architecture/components/ci-governance/planning-review-canon-user-stories.md
      - docs/architecture/components/ci-governance/index.md
      - docs/planning/proposals/portfolio-map-20260403.md
      - buzon/20260524-codex-fowler-planning-review-canon.md
    greenTest: node --test tools/ci/planning-review-canon.test.mjs
symbols:
  - name: requiredFiles
    path: tools/ci/planning-review-canon.test.mjs
    dddOwner: Planning review canon semantic guard
    cqRails:
      - ValidatePlanningReviewBoardTraceability
    fowlerSignals:
      - Required artifact set
    architectureGuard: node --test tools/ci/planning-review-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - planning governance semantic guard only
  - name: readRepoFile
    path: tools/ci/planning-review-canon.test.mjs
    dddOwner: Planning review canon semantic guard
    cqRails:
      - ValidatePlanningReviewBoardTraceability
    fowlerSignals:
      - Deterministic repository artifact reads
    architectureGuard: node --test tools/ci/planning-review-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - planning governance semantic guard only
  - name: assertContains
    path: tools/ci/planning-review-canon.test.mjs
    dddOwner: Planning review canon semantic guard
    cqRails:
      - ValidatePlanningReviewBoardTraceability
    fowlerSignals:
      - Required semantic marker validation
    architectureGuard: node --test tools/ci/planning-review-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - planning governance semantic guard only
  - name: escapeRegExp
    path: tools/ci/planning-review-canon.test.mjs
    dddOwner: Planning review canon semantic guard
    cqRails:
      - ValidatePlanningReviewBoardTraceability
    fowlerSignals:
      - Test determinism
    architectureGuard: node --test tools/ci/planning-review-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - planning governance semantic guard only
```

## Validation

- `node --test tools/ci/planning-review-canon.test.mjs`
