---
title: Execution Work Item Template
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-22
planning_type: template
---

# Execution Work Item Template

Use this template when adding or updating a task entry in the relevant
`docs/planning/state/agent-lane-*.yaml` file.

## Required Fields

- `task_id`: stable ID used across proposals, PRs, and closeouts.
- `objective`: one concrete business or architecture outcome.
- `primary_source`: proposal, review, or gap source that defines the work.
- `domain`: one of the planning domains.
- `roadmap_lane_affected`: exact roadmap lane impacted.
- `dependencies_or_blockers`: explicit upstream prerequisites.
- `status`: `Queued`, `In Progress`, `Review`, `Blocked`, or `Done`.
- `next_slice`: smallest next deliverable.

## Card Skeleton

```yaml
task_id: <ID>
objective: <what success looks like>
primary_source: <relative-doc-link>
domain: <execution-runtime | api-and-admission | planner-and-contracts | event-lifecycle-and-retention | documentation-governance>
roadmap_lane_affected: <lane name>
dependencies_or_blockers: <ids or none>
status: <Queued | In Progress | Review | Blocked | Done>
next_slice: <smallest next shippable slice>
```

## Mapping Rule

If the work originates in a review, include the review source in the relevant
lane YAML task entry and regenerate the local planning-derived views.
