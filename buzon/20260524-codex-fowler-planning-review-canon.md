# Fowler Planning Review Canon Analysis

## Fowler Analysis

The planning review system had clear documents but weak semantic
encapsulation. Review status, sprint grouping, and naming policy each carried a
piece of the workflow. The missing object was the intake model that says when
review material becomes executable work.

The Fowler move is to replace implicit type codes in prose with intention-
revealing states: reference context, accepted evidence, executable follow-up,
sprint grouping, and archive candidate.

## Mature-System Comparison

Mature systems separate intake from execution. Reviews collect rationale,
boards route attention, and the task registry owns state changes. DVT already
has the Planning DB rails; this canon prevents board documents from becoming a
parallel task database.

## Improved Patterns

- Review findings are classified before execution.
- Sprint boards group work but do not own lifecycle state.
- Planning DB remains the unit-of-work authority.
- Naming policy stays tied to discoverability and indexing.

## Antipatterns

- **Board-file backlog:** markdown tables becoming task state.
- **Hidden work queue:** review prose implying executable work without DB task.
- **Naming drift:** moved or renamed reviews losing discoverability.
- **Status ambiguity:** sprint status and task status drifting apart.

## Component Grouping

This belongs under `ci-governance` because the enforcement is a semantic
repository guard, while the domain concern is planning review intake.

Grouped concerns:

- review finding classification;
- Planning DB follow-up recording;
- sprint board grouping rules;
- review naming policy;
- board-to-task traceability.

## Future Lessons

- Do not ask "is there a task?" from review prose; query Planning DB.
- A sprint board can organize review work without owning task state.
- If a review finding needs execution, promote it through the command rail
  before implementation starts.
- Naming policy is part of traceability, not cosmetic cleanup.

## Repetition And Drift

The review board, sprint board, naming policy, and control tower all described
parts of the same behavior. This canon binds them to three rails:
`ClassifyPlanningReviewIntake`, `RecordPlanningReviewFollowUp`, and
`ValidatePlanningReviewBoardTraceability`.

## Applied Pattern

Applied pattern: **DB-First Review Intake with Semantic Fitness Function**.

The pattern keeps reviews useful while stopping them from becoming a second
execution queue.

## Opportunities

After this canon, the remaining open queue is clearer:

1. `cost attribution model` for billing and finance visibility.
2. `projector event-driven invalidation` for scale and backpressure closure.
3. `first enterprise pilot` for product-market validation.
