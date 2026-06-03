---
title: Protected Route Session Gate User Stories
status: Review
owner: Frontend / Runtime Safety
last_reviewed: 2026-05-15
planning_type: user-stories
task_ids:
  - F-27
---

# Protected Route Session Gate User Stories

- `PRSG-1`: as an internal tester, I need protected routes to admit only after
  `/session` and `/workspace/context` succeed in canonical order.
- `PRSG-2`: as an operator, I need missing protected runtime mount (`404
/session`) to produce explicit `runtime_unavailable` guidance.
- `PRSG-3`: as a user, I need missing workspace grant to show a distinct
  workspace access denial instead of login fallback.
- `PRSG-4`: as a security reviewer, I need `401/403` to remain fail-closed and
  never become route admission.
- `PRSG-5`: as a frontend maintainer, I need recovery vocabulary to be
  source-owned and reused by gate/login surfaces.
