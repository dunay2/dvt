---
title: ED-20260329 Lane C RBAC operation-level closeout
status: Accepted
date: 2026-03-29
owners:
  - dvt-api
  - docs
arc_level: ARC-1
breaking: false
evidence_class: critical
code_refs:
  - apps/api/test/integration/protectedRuntime.integration.test.ts
  - apps/api/test/entrypoints/http/signalRunRoute.test.ts
  - docs/runbooks/backend-mvp-control-plane-runbook-20260329.md
  - docs/planning/state/agent-lane-c.yaml
evidence:
  tests:
    - operation-level action matrix is explicit in MVP runbook
    - integration negative coverage proves ACTION_NOT_GRANTED for cancel and signal action splits
    - route-level unit coverage (always-on in CI) proves cancel-vs-signal authorization split and deny-path no-execute behavior
---

# ED-20260329 Lane C RBAC operation-level closeout

## Decision captured

Lane C task `RBAC at operation level` is implemented by locking endpoint-level
authorization boundaries, adding denied-path integration coverage, and proving
always-on deny behavior in route-level unit tests.

## What this evidence proves

1. Operation-level permissions are explicit and documented for runtime routes.
2. `/runs/:runId/cancel` denies callers without `run:cancel`.
3. `/runs/:runId/signal` (PAUSE/RESUME path) denies callers without
   `run:signal`.
4. Runtime remains tenant-scoped and permission-based without introducing new
   feature depth.
5. Route-level authorization deny paths are validated independently of live-DB
   environment gating.

Integration execution note:

- `protectedRuntime.integration` is environment-gated (`DATABASE_URL`/`DVT_PG_URL` required), so
  denied-path integration assertions execute when that lane is enabled.

Execution policy note:

- Route-level deny-path RBAC checks (`signalRunRoute.test.ts`) are the always-on
  CI baseline.
- `protectedRuntime.integration` is required in environments that provide
  live-DB posture (release-candidate/nightly profiles), not as an unconditional
  default lane.

## Validation commands

```bash
pnpm --filter dvt-api test
pnpm --filter dvt-api test:integration
pnpm verify:prepush
```
