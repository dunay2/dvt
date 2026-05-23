---
title: Fowler runtime review canon analysis
status: Review
owner: Codex / Architecture / API / Runtime
last_reviewed: 2026-05-23
planning_type: analysis
---

# Fowler Runtime Review Canon Analysis

## Scope

This analysis covers runtime/API review documents that still appeared as
current, reference, or open critique after protected runtime rail closure. The
goal is not new runtime behavior; it is canonical disposition inside the system
governance model.

## Fowler Analysis

The branch already improved several patterns:

- Protected runtime route semantics moved from prose toward a Published
  Language and source-of-truth rail catalog.
- Route families now have component guides with API, invariants, consumers, and
  compatibility posture.
- Architecture tests validate semantic ownership for protected runtime rails.

The remaining smell was not code size. It was review-board ambiguity:
documents could stay "active" or "open critique" without making clear whether
they were evidence, rationale, closed work, or future Planning DB work.

## Mature-System Comparison

Mature runtime systems keep four surfaces separate:

- reviews for intake and rationale;
- planning tasks for execution ownership;
- component contracts for local API and invariants;
- executable guards for drift prevention.

This repository had the last three for protected runtime rails, but the review
board still let some reviews read like a second queue. The fix is to classify
reviews through `ClassifyRuntimeReviewDisposition` and record the outcome with
`RecordRuntimeReviewCanon`.

## Antipatterns

- Review as backlog: a review marked current can become an implicit task.
- Parallel API semantics: integration reviews can name product gaps without
  first naming the runtime command/query rail.
- Drift by omission: domain navigation can point to old reviews and omit the
  canon layer that resolved them.
- Repetition: the same runtime route closure rationale was present in plans,
  closeouts, and reviews with different emphasis.

## Drift

Code and docs did not disagree on protected runtime behavior; AR-C10 already
closed the route rail catalog. The drift was between review-navigation language
and Planning DB ownership. The review board needed a canonical disposition
section so maintainers do not mine old reviews for hidden work.

## Applied Pattern

- Published Language: runtime review outcomes use `closed`, `reference`,
  `future-task`, and `superseded`.
- Single Source of Truth: executable behavior remains in protected runtime
  rails and application services.
- Separate Ways: review prose no longer owns commands, queries, routes, or
  compatibility paths.
- Semantic Fitness Function: `runtime-review-canon.test.mjs` validates that the
  component guide, user stories, review board, and buzón analysis stay aligned.

## Opportunities

- Reuse this component shape for other review-heavy lanes before they spawn
  duplicate backlog lists.
- Add review-disposition checks to future review-status-board updates when a
  review enters `review` or `in_progress`.
- Keep API integration gap reviews linked to rails before implementing browser
  workflows.

## Future Lessons

- Do not let "reference" mean "maybe work remains"; name the disposition.
- Do not encode runtime behavior in review prose.
- Add the semantic guard before canonizing documents, so the red state proves
  what was missing.
