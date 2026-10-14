---
title: Runtime review canon component
status: Active
owner: Architecture / API / Runtime
last_reviewed: 2026-05-23
---

# Runtime Review Canon Component

## Owned Concern

This component owns the semantic disposition of runtime and API integration
reviews after the protected runtime rail closure. It prevents active review
documents from becoming a second backlog, and routes each review finding to a
canonical runtime rail, a closed task, or an explicit future task.

## Public API

- `RecordRuntimeReviewCanon`: command that records the canonical disposition
  for a runtime/API review and links it to the owning task, closeout, or future
  queue.
- `ClassifyRuntimeReviewDisposition`: query that classifies a runtime/API
  review as `closed`, `reference`, `future-task`, or `superseded`.
- `Review status board`: operational read model where active runtime reviews
  expose their disposition and no orphan execution queue remains.
- `Execution runtime domain page`: domain entrypoint that points maintainers to
  the active runtime canon plan and the protected runtime rail closure evidence.
- `Runtime review canon plan`: mandatory planning surface that carries the
  Fowler analysis, allowed surfaces, command/query rails, and TDD evidence for
  this canonization slice.

## Invariants

- Runtime review documents cannot own executable runtime semantics directly.
- Protected runtime behavior remains owned by the route rail catalog and
  application services, not by review prose.
- A review with actionable runtime/API work must link to its governing GitHub issue or
  explicitly state that an existing task/closeout already absorbed it.
- A reference review may stay in the board only when it is named as rationale,
  not as an implicit queue.
- New protected runtime route behavior must reuse the existing command/query
  rail catalog before creating another route, service, mock, or document name.
- The component guide, user stories, review board, and canonical Fowler
  mechanization must stay aligned so docs do not drift from planning state.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> ReviewFinding
  ReviewFinding --> ClosedByRail: existing task and closeout absorb it
  ReviewFinding --> ReferenceRationale: no remaining executable work
  ReviewFinding --> FutureTask: distinct work remains
  ReviewFinding --> Superseded: newer canon replaces it
  ClosedByRail --> ReviewBoardDisposition
  ReferenceRationale --> ReviewBoardDisposition
  FutureTask --> GitHubIssue
  Superseded --> ReviewBoardDisposition
  GitHubIssue --> ReviewBoardDisposition
  ReviewBoardDisposition --> [*]
```

## Consumers

- Runtime/API maintainers deciding whether a review finding requires code.
- Planning stewards routing delivery work through GitHub Issues instead of review
  prose.
- PR reviewers checking that protected runtime changes update rail docs and
  semantic guards together.
- Frontend/API integration reviewers verifying that browser-facing runtime
  gaps are represented as command/query rails before implementation.
- CI and local gates that run `runtime-review-canon.test.mjs`.

## Command And Query Rail

| Rail                               | Type    | DDD owner                             | Surface                                               | Negative check                                                              |
| ---------------------------------- | ------- | ------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------- |
| `RecordRuntimeReviewCanon`         | command | Runtime review canon aggregate        | Governed review disposition plus GitHub issue linkage | Rejects orphan reviews without task, closeout, or explicit reference status |
| `ClassifyRuntimeReviewDisposition` | query   | Runtime review disposition read model | Review board and execution-runtime domain page        | Fails when an active runtime review lacks canonical disposition             |

## Semantic Fitness Function

`tools/ci/runtime-review-canon.test.mjs` validates the semantic contract rather
than file shape. It requires:

- a canonical review-board disposition for runtime/API review inputs;
- a component guide with public API, invariants, transitions, consumers, rails,
  and semantic fitness-function sections;
- user stories for runtime maintainer, API maintainer, and planning steward
  personas;
- canonical Fowler mechanization tokens in the runtime review canon plan;
- execution-runtime domain navigation to the canon plan.

## Current Architecture

```mermaid
flowchart TD
  Reviews[Runtime and API reviews]
  Board[Review status board]
  Rails[Protected runtime rail catalog]
  Tasks[GitHub Issues]
  Closeouts[Runtime closeouts]

  Reviews --> Board
  Board --> Rails
  Board --> Tasks
  Board --> Closeouts
  Rails --> Runtime[Protected runtime API behavior]
  Tasks --> Implementation[Future implementation slices]
  Closeouts --> Evidence[Validation evidence]
```

## Mature-System Comparison

Mature systems separate review intake from executable authority. Reviews are
evidence and rationale; bounded contexts own behavior through command/query
rails, contracts, and application services. This component applies that split
to runtime/API planning so future reviewers can ask one question: "which rail
or governing GitHub issue owns this finding?"

<a id="section-runtime-review-canon-user-stories"></a>

## Runtime Review Canon User Stories

### User Stories

#### US-RUNTIME-CANON-001: Runtime Maintainer Finds The Owning Rail

As a Runtime maintainer, I want each runtime/API review finding to point to the
owning command/query rail or closeout so I do not infer behavior from review
prose.

Acceptance:

- Protected runtime route findings point to the protected runtime rail catalog
  or the AR-C10 closeout.
- Runtime read-surface findings point to TF-C2-B or its successor task.
- The review board states whether the review is `closed`, `reference`,
  `future-task`, or `superseded`.
- Negative evidence fails when a runtime review is marked active without an
  owner, task, or disposition.

#### US-RUNTIME-CANON-002: API Maintainer Avoids Parallel Semantics

As an API maintainer, I want API integration review gaps to reuse existing
runtime rails before new route behavior is designed so the API does not grow
parallel commands or mock-only semantics.

Acceptance:

- API integration gaps name the existing route family before proposing a new
  endpoint.
- New browser-facing runtime behavior must identify command/query ownership.
- Review text cannot authorize a temporary compatibility path by itself.
- Negative evidence fails when a review introduces route intent without a rail.

#### US-RUNTIME-CANON-003: Planning Steward Keeps Reviews Out Of The Backlog

As a Planning steward, I want review documents to be intake and rationale only
so Planning DB remains the operational work queue.

Acceptance:

- Remaining work becomes a GitHub issue before implementation starts.
- Closed findings link to closeouts and validation evidence.
- Reference reviews remain listed only for rationale.
- Negative evidence fails when the review board carries "open critique" with
  no task or explicit disposition.

#### US-RUNTIME-CANON-004: Reviewer Sees Fowler Tradeoffs

As an architecture reviewer, I want the canon analysis to name Fowler signals,
antipatterns, and mature-system comparison so future work repeats the pattern
instead of repeating the drift.

Acceptance:

- The buzón analysis names improved patterns and detected antipatterns.
- The component guide names invariants and transitions.
- Future lessons and opportunities are documented.
- Negative evidence fails when analysis exists without the component contract.

### Scenario Map

```mermaid
flowchart TD
  Finding[Review finding]
  Classifier[ClassifyRuntimeReviewDisposition]
  Closed[Closed by rail or closeout]
  Reference[Reference rationale]
  Future[Future GitHub issue]
  Reject[Invalid orphan review]

  Finding --> Classifier
  Classifier --> Closed
  Classifier --> Reference
  Classifier --> Future
  Classifier --> Reject
```

> Acceptance scope status: Active. Owner: Architecture / API / Runtime.
