---
title: Execution Work Item Template
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-07-31
planning_type: template
---

# Execution Work Item Template

Use this template when creating or refining a GitHub Issue for MVP delivery.
Do not mirror the issue into a local lane, workboard, or Planning DB task row.

## Required Fields

- `title`: one concrete business or architecture outcome.
- `source`: proposal, review, or gap source that defines the work.
- `scope`: bounded context and affected product surface.
- `acceptance criteria`: observable outcomes required for closure.
- `dependencies`: linked GitHub Issues or explicit external blockers.
- `architecture impact`: components, capabilities, rails, or contracts affected.
- `validation`: tests and user evidence required before closure.

## Card Skeleton

```markdown
## Outcome

<What success looks like>

## Scope

<Bounded context and product surface>

## Acceptance Criteria

- [ ] <Observable result>

## Architecture Impact

<Components, capabilities, rails, contracts, or none>

## Validation

<Automated and human evidence>
```

## Mapping Rule

If the work originates in a review, link that source from the GitHub Issue.
Update Planning DB only when the implementation changes architecture or
mechanization records.
