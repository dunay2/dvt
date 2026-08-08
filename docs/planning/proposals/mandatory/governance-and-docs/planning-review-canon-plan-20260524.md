---
title: Planning Review Canon Plan
status: Superseded
owner: Product / Architecture / Docs
last_reviewed: 2026-07-31
planning_type: proposal
superseded_by: ADR-0061
---

# Planning Review Canon Plan

This historical proposal introduced `GD-REV-PLANNING-CANON`. Its local task
lifecycle, lane, generated workboard, and Planning DB queue decisions are
superseded by
[ADR-0061](../../../../adr/ADR-0061-github-mvp-task-authority-and-planning-db-architecture-boundary.md).

## Retained Outcome

- Review documents provide rationale and evidence; they are not task queues.
- Executable MVP work is represented and tracked in GitHub Issues.
- `tools/ci/planning-review-canon.test.mjs` checks that review follow-up links
  to the GitHub issue authority without recreating local task state.
- Planning DB retains architecture, component, capability, relation,
  command/query rail, feature-mechanization, and architecture-evidence records.

## Retired Outcomes

- Planning DB task creation, claiming, progress, and closeout.
- `ClassifyPlanningReviewIntake` and `RecordPlanningReviewFollowUp`.
- Local lane YAML files and generated workboard/open-route projections.
- Planning DB to GitHub task-status projection.

The current operating procedure is
[GitHub MVP issue workflow](../../../state/github-mvp-issue-workflow.md). Feature
mechanization for current architecture rails is DB-owned and is not duplicated
in this historical document.
