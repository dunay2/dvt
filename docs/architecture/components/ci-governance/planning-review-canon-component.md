---
title: Planning Review Canon Component
status: Active
owner: Product / Architecture / Docs
last_reviewed: 2026-05-24
component_type: governance
---

# Planning Review Canon Component

> Owned concern: this component owns planning review intake semantics: review
> finding classification, DB-first follow-up recording, and board-to-task
> traceability validation.

## Public API

- `ClassifyPlanningReviewIntake(input)`: classifies review material as
  reference context, accepted evidence, executable follow-up, sprint grouping,
  or archive candidate.
- `RecordPlanningReviewFollowUp(input)`: records executable follow-up by
  creating or updating a Planning DB task through the repository command rail.
- `ValidatePlanningReviewBoardTraceability(input)`: validates that the review
  board, sprint board, plan, user stories, and semantic test preserve DB-first
  ownership.

## Invariants

- Review documents are intake and rationale, not task lifecycle authority.
- Sprint board files group concrete review needs; they do not own claim,
  progress, dependency, or evidence state.
- Planning DB is the canonical execution queue for review follow-up.
- Review filenames must follow `review-naming-policy.md`.
- A review finding that needs execution must point to an existing Planning DB
  task or be promoted through `pnpm planning:db:operate task create`.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> ReviewFinding
  ReviewFinding --> Classified: ClassifyPlanningReviewIntake
  Classified --> ReferenceContext
  Classified --> AcceptedEvidence
  Classified --> ExecutableFollowUp
  Classified --> ArchiveCandidate
  ExecutableFollowUp --> PlanningDbTask: RecordPlanningReviewFollowUp
  PlanningDbTask --> Claimed: planning:db:operate claim
  Claimed --> Done: planning:db:operate update
  ReferenceContext --> Traceable: ValidatePlanningReviewBoardTraceability
  AcceptedEvidence --> Traceable: ValidatePlanningReviewBoardTraceability
```

## Consumers

- Review stewards use the component to decide whether a review row is reference,
  evidence, executable work, or archive material.
- Sprint operators use it to keep board files from becoming a second backlog.
- Product planners use DB state, not sprint prose, to select the next work.
- Agents use it to continue from Planning DB after compaction.

## Command And Query Rail

| Rail                                      | Type    | Owner                            | Surface                         |
| ----------------------------------------- | ------- | -------------------------------- | ------------------------------- |
| `ClassifyPlanningReviewIntake`            | query   | Planning review intake catalog   | Plan, component guide, test     |
| `RecordPlanningReviewFollowUp`            | command | Planning review follow-up ledger | Planning DB command rail        |
| `ValidatePlanningReviewBoardTraceability` | query   | Planning board traceability      | CI guard, review board, stories |

## Semantic Fitness Function

`tools/ci/planning-review-canon.test.mjs` validates that planning review
canonization has a plan, component guide, user stories, mailbox analysis, board
notes, and consistent rails.

The test prevents a future regression where review or sprint docs imply
executable work without a Planning DB task.

## Diagrams

```mermaid
flowchart TD
  Review["Review document"]
  Board["Review status board"]
  Sprint["Sprint board grouping"]
  Catalog["PlanningReviewIntake catalog"]
  FollowUp["PlanningReviewFollowUp ledger"]
  DB["Planning DB task"]
  Workboard["Generated workboard views"]
  Guard["Semantic CI guard"]

  Review --> Board
  Board --> Catalog
  Sprint --> Catalog
  Catalog --> FollowUp
  FollowUp --> DB
  DB --> Workboard
  Catalog --> Guard
  FollowUp --> Guard
```

```mermaid
sequenceDiagram
  participant Steward as Review steward
  participant Canon as PlanningReviewCanon
  participant DB as Planning DB
  participant View as Generated views

  Steward->>Canon: Classify review finding
  Canon-->>Steward: Reference, evidence, executable, or archive
  Steward->>DB: Record executable follow-up
  DB->>View: Regenerate workboard/open-task route
```

## Related Docs

- [Planning Review Canon User Stories](./planning-review-canon-user-stories.md)
- [Planning Review Canon Plan 2026-05-24](../../../planning/proposals/mandatory/governance-and-docs/planning-review-canon-plan-20260524.md)
- [Review Status Board](../../../planning/reviews/review-status-board.md)
- [Review Sprint Board](../../../planning/reviews/sprints/index.md)
- [Planning Review Mailbox Analysis](../../../../buzon/20260524-codex-fowler-planning-review-canon.md)
