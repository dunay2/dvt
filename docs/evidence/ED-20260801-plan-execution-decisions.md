---
title: Persisted planner execution decisions in Plan Preview
status: Accepted
date: 2026-08-01
owners:
  - '@dvt/contracts'
  - '@dvt/planner'
  - dvt-api
  - '@dvt/web'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/PlanExecutionDecision.v1.ts
  - packages/@dvt/planner/src/domain/PlanExecutionDecisionProjector.ts
  - apps/api/src/application/services/resolveAuthorizedPreviewSelection.ts
  - apps/web/src/app/components/PlanExecutionDecisionView.tsx
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/planner test
    - pnpm --filter @dvt/planner typecheck
    - pnpm --filter dvt-api test:ci
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api lint
    - pnpm --filter @dvt/web test
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web lint
    - pnpm lint
    - pnpm --filter @dvt/web test:e2e:selected-closure:live
    - pnpm docs:feature-mechanization:implementation
    - pnpm verify:prepush
---

# Summary

The existing `PreviewPlan` rail now persists and exposes the planner's ordered
`RUN`, `SKIP`, and `PARTIAL` decisions in the immutable Plan Preview read model.
The web renders those decisions without deriving or reinterpreting them.

# Decision

- `PlanExecutionDecisionV1` is the shared contract for subject identity,
  outcome, reason, and planner-known included or excluded scope.
- The API derives decision scope from the authorized draft and dbt projection;
  callers cannot submit or widen this scope.
- The planner validates, normalizes, orders, and hashes decision scope before
  projecting deterministic decisions into the execution plan.
- Plan Preview renders the persisted ordered decisions and preserves the
  planner's reason text and partial-scope membership exactly.
- No parallel decision query, mutable decision table, browser inference, or
  second preview rail was introduced.

# Failure posture

Invalid, duplicated, or out-of-graph decision scope fails contract and domain
validation. Missing persisted decisions remain compatible with older plans and
render no fabricated decision evidence.

# DB-first evidence

Planning DB owns the contract, projector, presentation component, parent modal,
their `PreviewPlan` rail, source ownership, relations, tests, and the
`MVP-174-PLAN-DECISION-PREVIEW` feature-mechanization record. GitHub issue `#174`
remains the task authority.
