---
title: Execution Work Item Template
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-22
planning_type: template
---

# Execution Work Item Template

Use this template when shaping the payload for
`pnpm planning:db:operate task create` or reviewing the bootstrap/export YAML
snapshot that the planning DB can export for Git review.

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

If the work originates in a review, include the review source in the DB task
payload through `pnpm planning:db:operate` and regenerate the local
planning-derived views from the DB source.
