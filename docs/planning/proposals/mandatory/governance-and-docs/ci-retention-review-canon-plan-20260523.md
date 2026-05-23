---
title: CI retention review canon plan 2026-05-23
status: Active
owner: Engineering / CI Governance / Delivery / Retention
last_reviewed: 2026-05-23
planning_type: mandatory
---

# CI Retention Review Canon Plan 2026-05-23

## Owned Concern

This plan canonizes active CI, delivery, and event-retention review documents
into governed follow-up work. It keeps Planning DB, measured adoption gates,
component guides, and closeouts as the only execution authorities.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/reviews/review-status-board.md`
- `docs/planning/status/ai-efficiency-adoption-status.md`
- `docs/architecture/components/ci-governance/index.md`
- `docs/planning/domains/event-lifecycle-and-retention.md`
- `docs/architecture/components/engine/adapters/state-store/postgres/run-event-retention-policy-component.md`

## Fowler Analysis

### Improved Patterns

- `RC-C2` already separates shipped tooling from measured adoption closure.
- CI audit findings are decomposed into explicit `CI-AUDIT-*` tasks.
- Run-event retention behavior is now owned by a component guide and AR-D5
  closeout evidence rather than review prose.

### Antipatterns

- Review-board backlog: CI reviews with `review` status can look like active
  executable queues outside Planning DB.
- Measurement drift: adoption-cycle closure can be implied by shipped tooling
  even though the canonical log still records `0/3`.
- Duplicate retention semantics: retention kickoff, Fowler QA, risk, and AR-D5
  docs can repeat policy rationale unless the component owner is explicit.
- Status ambiguity: reference reviews with no owner can hide whether work is
  closed, blocked, future, or rationale only.

### Grouping Opportunities

- Group CI efficiency, CI audit, delivery process, and event-retention review
  disposition under one CI retention review canon component.
- Keep RC-C2 measurement truth in the adoption status/log.
- Keep retention behavior under the run-event retention policy component.

### Lessons For Future Work

- Shipped tooling does not close adoption gates without measured cycles.
- Review documents are evidence and rationale, not work queues.
- Event-retention behavior needs one policy component, not repeated review
  ownership.

## Review Disposition Matrix

| Review input                                                   | Disposition                                                            | Owner                                |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------ |
| `20260328 Lane C AI efficiency and cost review`                | blocked on measurement; still feeds `RC-C2`                            | AI efficiency adoption status        |
| `20260330 CI, prepush, and PR process observations`            | blocked on measurement; shipped tooling evidence remains closeout-only | `RC-C2`                              |
| `20260401 Lane C RC-C2 efficiency institutionalization review` | blocked on measurement; no closure without 3 qualifying cycles         | `RC-C2`                              |
| `20260402 RC-C2 operational friction intake review`            | blocked on measurement; friction fixes are closeout evidence           | `RC-C2`                              |
| `20260330 CI performance review and action plan`               | reference rationale for CI throughput                                  | CI governance component              |
| `20260401 CI process review`                                   | reference baseline for CI process                                      | CI governance component              |
| `20260422 Environment configuration audit`                     | reference intake for config/build posture                              | CI governance and CI-AUDIT tasks     |
| `20260506 CI build config audit`                               | reference intake routed to `CI-AUDIT-*` tasks                          | CI-AUDIT task family                 |
| `20260329 Run event retention TTL kickoff review`              | done/reference; component owner is run-event retention policy          | Event lifecycle and retention domain |
| `20260329 Run event retention Fowler hard review`              | done/reference; QA rationale absorbed by retention policy component    | Event lifecycle and retention domain |
| `20260329 Run event retention risks and mitigations`           | done/reference; residual risk handled by retention closeouts           | Event lifecycle and retention domain |
| `20260330 MVP-D1 residual risk baseline review`                | done/reference; baseline retained as evidence                          | MVP-D1 and AR-D5 closeouts           |

No CI, delivery, or retention review remains an orphan execution queue after
this plan.

## Command And Query Rails

- `RecordCiRetentionReviewCanon`: command owned by the CI retention review
  canon aggregate. It records canonical review disposition and task/closeout
  owner.
- `ClassifyCiRetentionReviewDisposition`: query owned by the review disposition
  read model. It returns `blocked-on-measurement`, `closed`, `reference`,
  `future-task`, or `superseded`.

## TDD Plan

1. Red: add `ci-retention-review-canon.test.mjs` before canon docs exist and
   verify it fails on missing plan/component artifacts.
2. Green: add component guide, user stories, review-board disposition,
   event-lifecycle domain pointer, and buzón analysis.
3. Refactor: keep this slice docs/tooling-only; no runtime retention package
   behavior changes are required.

## ADR Decision

No new ADR is required. Existing governance already states that Planning DB is
the operational queue, command/query rails own executable behavior, and review
documents are rationale/evidence.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: D-REV-CI-RETENTION-CANON
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/ci-retention-review-canon-plan-20260523.md
componentGuides:
  - docs/architecture/components/ci-governance/ci-retention-review-canon-component.md
userStories:
  - docs/architecture/components/ci-governance/ci-retention-review-canon-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/reviews/review-status-board.md
  - docs/planning/status/ai-efficiency-adoption-status.md
  - docs/planning/domains/event-lifecycle-and-retention.md
allowedImplementationSurfaces:
  - buzon/20260523-codex-fowler-ci-retention-review-canon.md
  - docs/.manifest.json
  - docs/architecture/components/ci-governance/ci-retention-review-canon-component.md
  - docs/architecture/components/ci-governance/ci-retention-review-canon-user-stories.md
  - docs/architecture/components/ci-governance/index.md
  - docs/architecture/index.md
  - docs/planning/domains/event-lifecycle-and-retention.md
  - docs/planning/proposals/index.md
  - docs/planning/proposals/mandatory/governance-and-docs/ci-retention-review-canon-plan-20260523.md
  - docs/planning/proposals/portfolio-map-20260403.md
  - docs/planning/reviews/review-status-board.md
  - docs/planning/state/agent-lane-d.md
  - docs/planning/state/execution-workboard.md
  - docs/planning/state/open-task-route.md
  - docs/planning/status/**
  - tools/ci/ci-retention-review-canon.test.mjs
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
commandQueryRails:
  - name: RecordCiRetentionReviewCanon
    type: command
    dddOwner: CI retention review canon aggregate
  - name: ClassifyCiRetentionReviewDisposition
    type: query
    dddOwner: CI retention review disposition read model
domainObjects:
  - name: CiRetentionReviewCanon
    type: planning aggregate
    owner: Engineering / CI Governance / Delivery / Retention
  - name: CiRetentionReviewDisposition
    type: read model
    owner: Engineering / CI Governance / Delivery / Retention
  - name: AiEfficiencyAdoptionWindow
    type: status read model
    owner: Engineering / CI Governance
fowlerSignals:
  - Review-board backlog
  - Measurement drift
  - Duplicate retention semantics
  - Status ambiguity
architectureGuards:
  - node --test tools/ci/ci-retention-review-canon.test.mjs
cypressFlows:
  - N/A - docs, CI governance, and planning semantic guard only
completionGate:
  - node --test tools/ci/ci-retention-review-canon.test.mjs
  - pnpm test:ci-tools
  - pnpm docs:sync
  - pnpm docs:status:generate
  - node scripts/check-feature-mechanization.cjs --feature D-REV-CI-RETENTION-CANON
  - node scripts/check-feature-mechanization.cjs --implementation --feature D-REV-CI-RETENTION-CANON
  - pnpm lint:md:changed
  - pnpm verify:prepush
redGreenCycles:
  - id: ci-retention-review-canon-disposition
    redTest: node --test tools/ci/ci-retention-review-canon.test.mjs
    expectedFailure: CI retention canon plan, component guide, user stories, and buzón analysis do not exist.
    patchSurfaces:
      - tools/ci/ci-retention-review-canon.test.mjs
      - docs/planning/proposals/mandatory/governance-and-docs/ci-retention-review-canon-plan-20260523.md
      - docs/architecture/components/ci-governance/ci-retention-review-canon-component.md
      - docs/architecture/components/ci-governance/ci-retention-review-canon-user-stories.md
      - docs/planning/reviews/review-status-board.md
      - docs/planning/domains/event-lifecycle-and-retention.md
      - buzon/20260523-codex-fowler-ci-retention-review-canon.md
    greenTest: node --test tools/ci/ci-retention-review-canon.test.mjs
symbols:
  - name: requiredFiles
    path: tools/ci/ci-retention-review-canon.test.mjs
    dddOwner: CI retention review canon semantic guard
    cqRails:
      - ClassifyCiRetentionReviewDisposition
    fowlerSignals:
      - Required artifact set
    architectureGuard: node --test tools/ci/ci-retention-review-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs and planning semantic guard only
  - name: readRepoFile
    path: tools/ci/ci-retention-review-canon.test.mjs
    dddOwner: CI retention review canon semantic guard
    cqRails:
      - ClassifyCiRetentionReviewDisposition
    fowlerSignals:
      - Semantic drift guard
    architectureGuard: node --test tools/ci/ci-retention-review-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs and planning semantic guard only
  - name: assertContains
    path: tools/ci/ci-retention-review-canon.test.mjs
    dddOwner: CI retention review canon semantic guard
    cqRails:
      - ClassifyCiRetentionReviewDisposition
    fowlerSignals:
      - Documentation drift guard
    architectureGuard: node --test tools/ci/ci-retention-review-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs and planning semantic guard only
  - name: escapeRegExp
    path: tools/ci/ci-retention-review-canon.test.mjs
    dddOwner: CI retention review canon semantic guard
    cqRails:
      - ClassifyCiRetentionReviewDisposition
    fowlerSignals:
      - Test determinism
    architectureGuard: node --test tools/ci/ci-retention-review-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs and planning semantic guard only
```
